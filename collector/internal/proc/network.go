// Package proc provides /proc filesystem parsers for Linux signal collection.
package proc

import (
	"bufio"
	"context"
	"fmt"
	"math/rand"
	"net"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/icmp"
	"golang.org/x/net/ipv4"
)

// NetworkReadings holds all collected network signals for one measurement interval.
type NetworkReadings struct {
	BandwidthInBytesPerSec   float64
	BandwidthOutBytesPerSec  float64
	BandwidthSaturation      float64 // 0..1
	LatencyP50Ms             float64
	LatencyP95Ms             float64
	LatencyP99Ms             float64
	PacketLossRate           float64 // 0..1
	TCPRetransmitsPerSec     float64
	ConnectionActive         float64
	ConnectionWaiting        float64
	ConnectionIdle           float64
	ConnectionPoolSaturation float64 // 0..1
	DNSResolutionTimeMs      float64
	TCPHandshakeTimeMs       float64
}

// NetworkConfig controls which peers to probe for latency measurements.
type NetworkConfig struct {
	PingTargets    []string          // hostnames or IPs for ICMP/TCP latency
	DNSTarget      string            // hostname to resolve for dns_resolution_time
	TCPProbeTarget string            // "host:port" for tcp_handshake_time
	NICSpeeds      map[string]uint64 // override NIC speed in bits/sec if /sys is unavailable
}

// -----------------------------------------------------------------------
// Previous-snapshot state for delta computations (bandwidth + retransmits)
// -----------------------------------------------------------------------

type netDevSnapshot struct {
	rxBytes uint64
	txBytes uint64
}

type netSnmpSnapshot struct {
	retransSegs uint64
}

var (
	prevNetMu      sync.Mutex
	prevNetDevSnap map[string]netDevSnapshot // key: interface name
	prevNetSnmp    *netSnmpSnapshot
	prevNetTime    time.Time
)

// -----------------------------------------------------------------------
// NetworkReadingsWithConfig collects all network signals and returns them.
// -----------------------------------------------------------------------

func NetworkReadingsWithConfig(cfg NetworkConfig) (NetworkReadings, error) {
	var r NetworkReadings

	// ── 1. Read /proc/net/dev for bandwidth + packet loss ─────────────────
	devSnap, totalDrop, totalPkts, err := readNetDev()
	if err != nil {
		return r, fmt.Errorf("read /proc/net/dev: %w", err)
	}

	// ── 2. Read /proc/net/snmp for TCP retransmits ────────────────────────
	snmpSnap, err := readNetSnmp()
	if err != nil {
		return r, fmt.Errorf("read /proc/net/snmp: %w", err)
	}

	now := time.Now()

	prevNetMu.Lock()
	prevDev := prevNetDevSnap
	prevSnmp := prevNetSnmp
	elapsed := now.Sub(prevNetTime).Seconds()
	prevNetDevSnap = devSnap
	prevNetSnmp = snmpSnap
	prevNetTime = now
	prevNetMu.Unlock()

	// ── 3. Compute bandwidth deltas ───────────────────────────────────────
	if prevDev != nil && elapsed > 0 {
		var totalRxDelta, totalTxDelta uint64
		for iface, cur := range devSnap {
			if prev, ok := prevDev[iface]; ok {
				if cur.rxBytes >= prev.rxBytes {
					totalRxDelta += cur.rxBytes - prev.rxBytes
				}
				if cur.txBytes >= prev.txBytes {
					totalTxDelta += cur.txBytes - prev.txBytes
				}
			}
		}
		r.BandwidthInBytesPerSec = float64(totalRxDelta) / elapsed
		r.BandwidthOutBytesPerSec = float64(totalTxDelta) / elapsed

		// ── 4. Bandwidth saturation ───────────────────────────────────────
		nicCapBitsPerSec := nicTotalCapacity(devSnap, cfg.NICSpeeds)
		if nicCapBitsPerSec > 0 {
			totalBitsPerSec := (r.BandwidthInBytesPerSec + r.BandwidthOutBytesPerSec) * 8
			r.BandwidthSaturation = clamp01(totalBitsPerSec / float64(nicCapBitsPerSec))
		}
	}

	// ── 5. TCP retransmits per second ─────────────────────────────────────
	if prevSnmp != nil && elapsed > 0 {
		var delta uint64
		if snmpSnap.retransSegs >= prevSnmp.retransSegs {
			delta = snmpSnap.retransSegs - prevSnmp.retransSegs
		}
		r.TCPRetransmitsPerSec = float64(delta) / elapsed
	}

	// ── 6. Packet loss rate ───────────────────────────────────────────────
	if totalPkts > 0 {
		r.PacketLossRate = clamp01(float64(totalDrop) / float64(totalPkts))
	}

	// ── 7. Connection counts from /proc/net/tcp + /proc/net/tcp6 ─────────
	active, waiting, idle, saturation, err := readTCPConnections()
	if err == nil {
		r.ConnectionActive = float64(active)
		r.ConnectionWaiting = float64(waiting)
		r.ConnectionIdle = float64(idle)
		r.ConnectionPoolSaturation = saturation
	}

	// ── 8. Async probes: ICMP latency, DNS resolution, TCP handshake ──────
	var (
		wg         sync.WaitGroup
		latencyRTTs []float64
		latencyMu  sync.Mutex
		dnsMs      float64
		tcpMs      float64
	)

	// ICMP / TCP latency probes
	if len(cfg.PingTargets) > 0 {
		canICMP := hasRawSocketAccess()
		const samplesPerTarget = 5

		for _, target := range cfg.PingTargets {
			target := target
			wg.Add(1)
			go func() {
				defer wg.Done()
				var rtts []float64
				for i := 0; i < samplesPerTarget; i++ {
					var rtt float64
					var probeErr error
					if canICMP {
						rtt, probeErr = pingICMP(target, 2*time.Second)
					} else {
						rtt, probeErr = pingTCPFallback(target, 80, 2*time.Second)
					}
					if probeErr == nil {
						rtts = append(rtts, rtt)
					}
				}
				if len(rtts) > 0 {
					latencyMu.Lock()
					latencyRTTs = append(latencyRTTs, rtts...)
					latencyMu.Unlock()
				}
			}()
		}
	}

	// DNS resolution probe
	if cfg.DNSTarget != "" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ms := measureDNS(cfg.DNSTarget, 2*time.Second)
			latencyMu.Lock()
			dnsMs = ms
			latencyMu.Unlock()
		}()
	}

	// TCP handshake probe
	if cfg.TCPProbeTarget != "" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ms := measureTCPHandshake(cfg.TCPProbeTarget, 2*time.Second)
			latencyMu.Lock()
			tcpMs = ms
			latencyMu.Unlock()
		}()
	}

	wg.Wait()

	// ── 9. Compute percentiles ────────────────────────────────────────────
	if len(latencyRTTs) > 0 {
		sort.Float64s(latencyRTTs)
		r.LatencyP50Ms = percentile(latencyRTTs, 50)
		r.LatencyP95Ms = percentile(latencyRTTs, 95)
		r.LatencyP99Ms = percentile(latencyRTTs, 99)
	}
	r.DNSResolutionTimeMs = dnsMs
	r.TCPHandshakeTimeMs = tcpMs

	return r, nil
}

// -----------------------------------------------------------------------
// /proc/net/dev parser
// -----------------------------------------------------------------------
//
// Format (after two header lines):
//   iface: rx_bytes rx_packets rx_errs rx_drop rx_fifo rx_frame rx_compressed
//           rx_multicast tx_bytes tx_packets tx_errs tx_drop ...
//
// Column indices (0-based, after splitting on whitespace of "iface: rest"):
//   rx_bytes=0, rx_packets=1, rx_errs=2, rx_drop=3
//   tx_bytes=8, tx_drop=11

func readNetDev() (snap map[string]netDevSnapshot, totalDrop, totalPkts uint64, err error) {
	f, err := os.Open("/proc/net/dev")
	if err != nil {
		return nil, 0, 0, fmt.Errorf("open /proc/net/dev: %w", err)
	}
	defer f.Close()

	snap = make(map[string]netDevSnapshot)
	scanner := bufio.NewScanner(f)
	lineNum := 0
	for scanner.Scan() {
		lineNum++
		if lineNum <= 2 {
			continue // skip two header lines
		}
		line := scanner.Text()
		colonIdx := strings.IndexByte(line, ':')
		if colonIdx < 0 {
			continue
		}
		iface := strings.TrimSpace(line[:colonIdx])
		// Skip loopback
		if iface == "lo" || strings.HasPrefix(iface, "lo:") {
			continue
		}
		rest := strings.TrimSpace(line[colonIdx+1:])
		fields := strings.Fields(rest)
		// Need at least 12 fields: rx(0..7) + tx(8..15)
		if len(fields) < 12 {
			continue
		}
		rxBytes, _ := strconv.ParseUint(fields[0], 10, 64)
		rxPkts, _ := strconv.ParseUint(fields[1], 10, 64)
		rxDrop, _ := strconv.ParseUint(fields[3], 10, 64)
		txBytes, _ := strconv.ParseUint(fields[8], 10, 64)
		txPkts, _ := strconv.ParseUint(fields[9], 10, 64)
		txDrop, _ := strconv.ParseUint(fields[11], 10, 64)

		snap[iface] = netDevSnapshot{rxBytes: rxBytes, txBytes: txBytes}
		totalDrop += rxDrop + txDrop
		totalPkts += rxPkts + txPkts
	}
	return snap, totalDrop, totalPkts, scanner.Err()
}

// -----------------------------------------------------------------------
// /sys/class/net/<iface>/speed — NIC capacity in Mb/s
// -----------------------------------------------------------------------

func readNICSpeedBits(iface string) (uint64, bool) {
	path := fmt.Sprintf("/sys/class/net/%s/speed", iface)
	data, err := os.ReadFile(path)
	if err != nil {
		return 0, false
	}
	mbps, err := strconv.ParseUint(strings.TrimSpace(string(data)), 10, 64)
	if err != nil || mbps == 0 {
		return 0, false
	}
	// Convert Mb/s → bits/s
	return mbps * 1_000_000, true
}

// nicTotalCapacity sums NIC speeds (bits/sec) across all non-loopback interfaces.
func nicTotalCapacity(devSnap map[string]netDevSnapshot, overrides map[string]uint64) uint64 {
	var total uint64
	for iface := range devSnap {
		if speed, ok := overrides[iface]; ok {
			total += speed
			continue
		}
		if speed, ok := readNICSpeedBits(iface); ok {
			total += speed
		}
	}
	return total
}

// -----------------------------------------------------------------------
// /proc/net/snmp parser — TcpRetransSegs
// -----------------------------------------------------------------------
//
// Format: alternating header/value lines, e.g.:
//   Tcp: RtoAlgorithm RtoMin ... RetransSegs ...
//   Tcp: 1 200 ...   <value>  ...

func readNetSnmp() (*netSnmpSnapshot, error) {
	f, err := os.Open("/proc/net/snmp")
	if err != nil {
		return nil, fmt.Errorf("open /proc/net/snmp: %w", err)
	}
	defer f.Close()

	snap := &netSnmpSnapshot{}
	scanner := bufio.NewScanner(f)

	var tcpHeaders []string
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "Tcp:") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		if tcpHeaders == nil {
			// First Tcp: line is the header
			tcpHeaders = fields[1:]
		} else {
			// Second Tcp: line has values
			values := fields[1:]
			for i, hdr := range tcpHeaders {
				if hdr == "RetransSegs" && i < len(values) {
					snap.retransSegs, _ = strconv.ParseUint(values[i], 10, 64)
					break
				}
			}
			break
		}
	}
	return snap, scanner.Err()
}

// -----------------------------------------------------------------------
// /proc/net/tcp + /proc/net/tcp6 — connection state counts
// -----------------------------------------------------------------------
//
// Column 3 (0-indexed) in each data row is the hex connection state:
//   01 = ESTABLISHED
//   06 = TIME_WAIT
//   0A = LISTEN
//   0B = CLOSE_WAIT
//   08 = CLOSE
//
// active  = ESTABLISHED
// waiting = LISTEN
// idle    = TIME_WAIT + CLOSE_WAIT

func readTCPConnections() (active, waiting, idle int, saturation float64, err error) {
	for _, path := range []string{"/proc/net/tcp", "/proc/net/tcp6"} {
		a, w, i, parseErr := parseTCPFile(path)
		if parseErr != nil {
			// Non-fatal: one of the two files might not exist (e.g. no IPv6)
			continue
		}
		active += a
		waiting += w
		idle += i
	}

	// connection_pool_saturation = ESTABLISHED / (ESTABLISHED + TIME_WAIT + CLOSE_WAIT)
	// idle = TIME_WAIT + CLOSE_WAIT
	denom := active + idle
	if denom > 0 {
		saturation = clamp01(float64(active) / float64(denom))
	}
	return active, waiting, idle, saturation, nil
}

func parseTCPFile(path string) (active, waiting, idle int, err error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, 0, 0, err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	firstLine := true
	for scanner.Scan() {
		if firstLine {
			firstLine = false
			continue // skip header
		}
		fields := strings.Fields(scanner.Text())
		// Column 3 (0-indexed) is the hex state
		if len(fields) < 4 {
			continue
		}
		stateHex := strings.ToUpper(fields[3])
		switch stateHex {
		case "01": // ESTABLISHED
			active++
		case "0A": // LISTEN
			waiting++
		case "06", "0B": // TIME_WAIT, CLOSE_WAIT
			idle++
		// 08 = CLOSE — not counted in any bucket
		}
	}
	return active, waiting, idle, scanner.Err()
}

// -----------------------------------------------------------------------
// ICMP ping (requires CAP_NET_RAW or root)
// -----------------------------------------------------------------------

func pingICMP(host string, timeout time.Duration) (float64, error) {
	// Resolve to IPv4 address
	addrs, err := net.LookupHost(host)
	if err != nil {
		return 0, fmt.Errorf("lookup %s: %w", host, err)
	}
	var target string
	for _, a := range addrs {
		ip := net.ParseIP(a)
		if ip == nil {
			continue
		}
		if ip.To4() != nil {
			target = a
			break
		}
		// TODO: support IPv6 ICMP (protocol "ip6:ipv6-icmp", type ipv6.ICMPTypeEchoRequest)
	}
	if target == "" {
		return 0, fmt.Errorf("no IPv4 address for %s", host)
	}

	conn, err := icmp.ListenPacket("ip4:icmp", "0.0.0.0")
	if err != nil {
		return 0, fmt.Errorf("icmp listen: %w", err)
	}
	defer conn.Close()

	if err := conn.SetDeadline(time.Now().Add(timeout)); err != nil {
		return 0, err
	}

	id := rand.Intn(0xffff) + 1 // avoid 0
	seq := rand.Intn(0xffff) + 1

	msg := icmp.Message{
		Type: ipv4.ICMPTypeEcho,
		Code: 0,
		Body: &icmp.Echo{
			ID:   id,
			Seq:  seq,
			Data: []byte("systemflow-ping"),
		},
	}
	wb, err := msg.Marshal(nil)
	if err != nil {
		return 0, err
	}

	dst := &net.IPAddr{IP: net.ParseIP(target)}
	start := time.Now()
	if _, err := conn.WriteTo(wb, dst); err != nil {
		return 0, fmt.Errorf("icmp write: %w", err)
	}

	rb := make([]byte, 1500)
	for {
		n, _, err := conn.ReadFrom(rb)
		if err != nil {
			return 0, fmt.Errorf("icmp read: %w", err)
		}
		rm, err := icmp.ParseMessage(1 /* ProtocolICMP */, rb[:n])
		if err != nil {
			continue
		}
		if rm.Type != ipv4.ICMPTypeEchoReply {
			continue
		}
		echo, ok := rm.Body.(*icmp.Echo)
		if !ok || echo.ID != id || echo.Seq != seq {
			continue
		}
		return float64(time.Since(start).Microseconds()) / 1000.0, nil
	}
}

// pingTCPFallback dials TCP to port on host to estimate latency when ICMP is unavailable.
func pingTCPFallback(host string, port int, timeout time.Duration) (float64, error) {
	addr := net.JoinHostPort(host, strconv.Itoa(port))
	start := time.Now()
	conn, err := net.DialTimeout("tcp", addr, timeout)
	if err != nil {
		return 0, err
	}
	conn.Close()
	return float64(time.Since(start).Microseconds()) / 1000.0, nil
}

// hasRawSocketAccess checks whether the process can open an ICMP raw socket.
func hasRawSocketAccess() bool {
	conn, err := icmp.ListenPacket("ip4:icmp", "0.0.0.0")
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

// -----------------------------------------------------------------------
// DNS resolution timing
// -----------------------------------------------------------------------

func measureDNS(hostname string, timeout time.Duration) float64 {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	r := &net.Resolver{}
	start := time.Now()
	_, err := r.LookupHost(ctx, hostname)
	if err != nil {
		return 0
	}
	return float64(time.Since(start).Microseconds()) / 1000.0
}

// -----------------------------------------------------------------------
// TCP handshake timing
// -----------------------------------------------------------------------

func measureTCPHandshake(addr string, timeout time.Duration) float64 {
	start := time.Now()
	conn, err := net.DialTimeout("tcp", addr, timeout)
	if err != nil {
		return 0
	}
	conn.Close()
	return float64(time.Since(start).Microseconds()) / 1000.0
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

// percentile returns the p-th percentile (0..100) of a sorted slice.
func percentile(sorted []float64, p float64) float64 {
	if len(sorted) == 0 {
		return 0
	}
	if len(sorted) == 1 {
		return sorted[0]
	}
	idx := p / 100.0 * float64(len(sorted)-1)
	lo := int(idx)
	hi := lo + 1
	if hi >= len(sorted) {
		return sorted[len(sorted)-1]
	}
	frac := idx - float64(lo)
	return sorted[lo]*(1-frac) + sorted[hi]*frac
}

// clamp01 clamps v to [0, 1].
func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}
