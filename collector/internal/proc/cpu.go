// Package proc provides /proc filesystem parsers for Linux signal collection.
package proc

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// CPUStat holds one snapshot of /proc/stat for a single CPU.
type CPUStat struct {
	User      uint64
	Nice      uint64
	System    uint64
	Idle      uint64
	IOWait    uint64
	IRQ       uint64
	SoftIRQ   uint64
	Steal     uint64
	Guest     uint64
	GuestNice uint64
	Total     uint64 // sum of all fields
}

var (
	prevCPUMu   sync.Mutex
	prevCPUSnap map[string]CPUStat // key: "cpu", "cpu0", "cpu1", ...
	prevCPUTime time.Time
)

// CPUReadings returns:
//   - cpu_usage   (0..100, total CPU busy %)
//   - cpu_steal   (0..100, hypervisor steal %)
//   - cpu_iowait  (0..100, I/O wait %)
func CPUReadings() (usage, steal, iowait float64, err error) {
	snap, err := readCPUStats()
	if err != nil {
		return 0, 0, 0, err
	}

	prevCPUMu.Lock()
	defer prevCPUMu.Unlock()

	prev, hasPrev := prevCPUSnap["cpu"]
	curr := snap["cpu"]
	prevCPUSnap = snap
	prevCPUTime = time.Now()

	if !hasPrev {
		return 0, 0, 0, nil // first call — no delta yet
	}

	deltaTot := float64(curr.Total - prev.Total)
	if deltaTot == 0 {
		return 0, 0, 0, nil
	}

	deltaIdle := float64(curr.Idle - prev.Idle)
	deltaIOWait := float64(curr.IOWait - prev.IOWait)
	deltaSteal := float64(curr.Steal - prev.Steal)

	usage = 100.0 * (1.0 - (deltaIdle+deltaIOWait)/deltaTot)
	steal = 100.0 * deltaSteal / deltaTot
	iowait = 100.0 * deltaIOWait / deltaTot
	return usage, steal, iowait, nil
}

// readCPUStats parses /proc/stat and returns stats per CPU line.
func readCPUStats() (map[string]CPUStat, error) {
	f, err := os.Open("/proc/stat")
	if err != nil {
		return nil, fmt.Errorf("open /proc/stat: %w", err)
	}
	defer f.Close()

	result := make(map[string]CPUStat)
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "cpu") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 8 {
			continue
		}
		name := fields[0]
		var s CPUStat
		vals := []*uint64{&s.User, &s.Nice, &s.System, &s.Idle, &s.IOWait, &s.IRQ, &s.SoftIRQ, &s.Steal}
		for i, v := range vals {
			if i+1 < len(fields) {
				*v, _ = strconv.ParseUint(fields[i+1], 10, 64)
			}
		}
		if len(fields) > 9 {
			s.Guest, _ = strconv.ParseUint(fields[9], 10, 64)
		}
		if len(fields) > 10 {
			s.GuestNice, _ = strconv.ParseUint(fields[10], 10, 64)
		}
		s.Total = s.User + s.Nice + s.System + s.Idle + s.IOWait +
			s.IRQ + s.SoftIRQ + s.Steal + s.Guest + s.GuestNice
		result[name] = s
	}
	return result, scanner.Err()
}
