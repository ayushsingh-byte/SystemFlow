// linux-host collector — collects ALL signals from a Linux host.
// Runs as a systemd service or Docker sidecar on each host being monitored.
package main

import (
	"context"
	"flag"
	"log"
	"os"
	"strings"
	"time"

	"github.com/systemflow/collector/internal/proc"
	"github.com/systemflow/collector/internal/publisher"
	"github.com/systemflow/collector/internal/signals"
)

func main() {
	nodeID   := flag.String("node-id", "", "unique ID for this host node (required)")
	brokers  := flag.String("brokers", "localhost:9092", "comma-separated Kafka brokers")
	interval := flag.Duration("interval", 15*time.Second, "collection interval")
	pingTargets := flag.String("ping-targets", "", "comma-separated hosts for latency probes")
	dnsTarget   := flag.String("dns-target", "google.com", "hostname for DNS resolution time probe")
	tcpProbe    := flag.String("tcp-probe", "8.8.8.8:53", "host:port for TCP handshake time probe")
	provIOPS    := flag.Float64("provisioned-iops", 10000, "provisioned disk IOPS (for saturation %)")
	flag.Parse()

	if *nodeID == "" {
		hostname, _ := os.Hostname()
		*nodeID = "linux-host:" + hostname
	}

	brokerList := strings.Split(*brokers, ",")
	pub := publisher.New(brokerList)
	defer pub.Close()

	netCfg := proc.NetworkConfig{
		PingTargets:    strings.Split(*pingTargets, ","),
		DNSTarget:      *dnsTarget,
		TCPProbeTarget: *tcpProbe,
	}
	diskCfg := proc.DiskConfig{
		ProvisionedIOPS: *provIOPS,
	}

	log.Printf("[linux-host] collector started node_id=%s interval=%s", *nodeID, *interval)

	// Initial CPU snapshot (discarded — establishes delta baseline)
	proc.CPUReadings()
	time.Sleep(500 * time.Millisecond)

	ticker := time.NewTicker(*interval)
	defer ticker.Stop()

	for range ticker.C {
		batch := collectAll(*nodeID, netCfg, diskCfg)
		if err := pub.SendBatch(context.Background(), batch); err != nil {
			log.Printf("[linux-host] publish error: %v", err)
		}
	}
}

func collectAll(nodeID string, netCfg proc.NetworkConfig, diskCfg proc.DiskConfig) []signals.Reading {
	ts := time.Now().UnixMilli()
	var batch []signals.Reading

	// ── Compute ────────────────────────────────────────────────────────────
	if usage, steal, iowait, err := proc.CPUReadings(); err == nil {
		batch = append(batch,
			signals.Reading{NodeID: nodeID, Signal: signals.CPUUsage,  Value: usage,  Timestamp: ts, Unit: "percent"},
			signals.Reading{NodeID: nodeID, Signal: signals.CPUSteal,  Value: steal,  Timestamp: ts, Unit: "percent"},
			signals.Reading{NodeID: nodeID, Signal: signals.CPUIoWait, Value: iowait, Timestamp: ts, Unit: "percent"},
			signals.Reading{NodeID: nodeID, Signal: signals.DiskIOWait, Value: iowait, Timestamp: ts, Unit: "percent"},
		)
	} else {
		log.Printf("[linux-host] cpu error: %v", err)
	}

	if ramUsed, ramPressure, swapUsage, err := proc.MemReadings(); err == nil {
		batch = append(batch,
			signals.Reading{NodeID: nodeID, Signal: signals.RAMUsed,     Value: ramUsed,     Timestamp: ts, Unit: "bytes"},
			signals.Reading{NodeID: nodeID, Signal: signals.RAMPressure, Value: ramPressure, Timestamp: ts, Unit: "ratio"},
			signals.Reading{NodeID: nodeID, Signal: signals.SwapUsage,   Value: swapUsage,   Timestamp: ts, Unit: "bytes"},
		)
	} else {
		log.Printf("[linux-host] memory error: %v", err)
	}

	if avg1, avg5, avg15, err := proc.LoadReadings(); err == nil {
		batch = append(batch,
			signals.Reading{NodeID: nodeID, Signal: signals.LoadAvg1,  Value: avg1,  Timestamp: ts, Unit: "load"},
			signals.Reading{NodeID: nodeID, Signal: signals.LoadAvg5,  Value: avg5,  Timestamp: ts, Unit: "load"},
			signals.Reading{NodeID: nodeID, Signal: signals.LoadAvg15, Value: avg15, Timestamp: ts, Unit: "load"},
		)
	} else {
		log.Printf("[linux-host] load error: %v", err)
	}

	// ── Network (includes latency probes — may take up to 2s) ─────────────
	if net, err := proc.NetworkReadingsWithConfig(netCfg); err == nil {
		batch = append(batch,
			signals.Reading{NodeID: nodeID, Signal: signals.BandwidthIn,              Value: net.BandwidthInBytesPerSec,   Timestamp: ts, Unit: "bytes/s"},
			signals.Reading{NodeID: nodeID, Signal: signals.BandwidthOut,             Value: net.BandwidthOutBytesPerSec,  Timestamp: ts, Unit: "bytes/s"},
			signals.Reading{NodeID: nodeID, Signal: signals.BandwidthSaturation,      Value: net.BandwidthSaturation,      Timestamp: ts, Unit: "ratio"},
			signals.Reading{NodeID: nodeID, Signal: signals.NetworkLatencyP50,        Value: net.LatencyP50Ms,             Timestamp: ts, Unit: "ms"},
			signals.Reading{NodeID: nodeID, Signal: signals.NetworkLatencyP95,        Value: net.LatencyP95Ms,             Timestamp: ts, Unit: "ms"},
			signals.Reading{NodeID: nodeID, Signal: signals.NetworkLatencyP99,        Value: net.LatencyP99Ms,             Timestamp: ts, Unit: "ms"},
			signals.Reading{NodeID: nodeID, Signal: signals.PacketLossRate,           Value: net.PacketLossRate,           Timestamp: ts, Unit: "ratio"},
			signals.Reading{NodeID: nodeID, Signal: signals.TCPRetransmits,           Value: net.TCPRetransmitsPerSec,     Timestamp: ts, Unit: "count/s"},
			signals.Reading{NodeID: nodeID, Signal: signals.ConnectionCountActive,    Value: net.ConnectionActive,         Timestamp: ts, Unit: "count"},
			signals.Reading{NodeID: nodeID, Signal: signals.ConnectionCountWaiting,   Value: net.ConnectionWaiting,        Timestamp: ts, Unit: "count"},
			signals.Reading{NodeID: nodeID, Signal: signals.ConnectionCountIdle,      Value: net.ConnectionIdle,           Timestamp: ts, Unit: "count"},
			signals.Reading{NodeID: nodeID, Signal: signals.ConnectionPoolSaturation, Value: net.ConnectionPoolSaturation, Timestamp: ts, Unit: "ratio"},
			signals.Reading{NodeID: nodeID, Signal: signals.DNSResolutionTime,        Value: net.DNSResolutionTimeMs,      Timestamp: ts, Unit: "ms"},
			signals.Reading{NodeID: nodeID, Signal: signals.TCPHandshakeTime,         Value: net.TCPHandshakeTimeMs,       Timestamp: ts, Unit: "ms"},
		)
	} else {
		log.Printf("[linux-host] network error: %v", err)
	}

	// ── Disk / IO ──────────────────────────────────────────────────────────
	if disk, err := proc.DiskReadingsWithConfig(diskCfg); err == nil {
		batch = append(batch,
			signals.Reading{NodeID: nodeID, Signal: signals.DiskIOPSRead,        Value: disk.IOPSRead,             Timestamp: ts, Unit: "ops/s"},
			signals.Reading{NodeID: nodeID, Signal: signals.DiskIOPSWrite,       Value: disk.IOPSWrite,            Timestamp: ts, Unit: "ops/s"},
			signals.Reading{NodeID: nodeID, Signal: signals.DiskIOPSSaturation,  Value: disk.IOPSSaturation,       Timestamp: ts, Unit: "ratio"},
			signals.Reading{NodeID: nodeID, Signal: signals.DiskThroughputRead,  Value: disk.ThroughputReadBytes,  Timestamp: ts, Unit: "bytes/s"},
			signals.Reading{NodeID: nodeID, Signal: signals.DiskThroughputWrite, Value: disk.ThroughputWriteBytes, Timestamp: ts, Unit: "bytes/s"},
			signals.Reading{NodeID: nodeID, Signal: signals.DiskQueueDepth,      Value: disk.QueueDepth,           Timestamp: ts, Unit: "count"},
			signals.Reading{NodeID: nodeID, Signal: signals.DiskCapacityUsed,    Value: disk.CapacityUsed,         Timestamp: ts, Unit: "ratio"},
			signals.Reading{NodeID: nodeID, Signal: signals.DiskLatencyRead,     Value: disk.LatencyReadMs,        Timestamp: ts, Unit: "ms"},
			signals.Reading{NodeID: nodeID, Signal: signals.DiskLatencyWrite,    Value: disk.LatencyWriteMs,       Timestamp: ts, Unit: "ms"},
		)
	} else {
		log.Printf("[linux-host] disk error: %v", err)
	}

	return batch
}
