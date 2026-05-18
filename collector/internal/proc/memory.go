package proc

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// MemReadings returns ram_used (bytes), ram_pressure (0..1 PSI ratio), swap_usage (bytes).
func MemReadings() (ramUsed, ramPressure, swapUsage float64, err error) {
	info, err := readMemInfo()
	if err != nil {
		return 0, 0, 0, err
	}

	// ram_used = MemTotal - MemAvailable (accurate free memory accounting)
	total := info["MemTotal"] * 1024
	avail := info["MemAvailable"] * 1024
	ramUsed = float64(total - avail)

	// swap_usage = SwapTotal - SwapFree
	swapTotal := info["SwapTotal"] * 1024
	swapFree := info["SwapFree"] * 1024
	swapUsage = float64(swapTotal - swapFree)

	// ram_pressure from PSI (Pressure Stall Information) — Linux 4.20+
	ramPressure, _ = readPSIMemory() // non-fatal if unavailable

	return ramUsed, ramPressure, swapUsage, nil
}

// readMemInfo parses /proc/meminfo → map[field]kB_value.
func readMemInfo() (map[string]uint64, error) {
	f, err := os.Open("/proc/meminfo")
	if err != nil {
		return nil, fmt.Errorf("open /proc/meminfo: %w", err)
	}
	defer f.Close()

	result := make(map[string]uint64)
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		// Format: "MemTotal:       16384000 kB"
		colon := strings.IndexByte(line, ':')
		if colon < 0 {
			continue
		}
		key := strings.TrimSpace(line[:colon])
		rest := strings.TrimSpace(line[colon+1:])
		// strip " kB" suffix
		rest = strings.Fields(rest)[0]
		val, _ := strconv.ParseUint(rest, 10, 64)
		result[key] = val
	}
	return result, scanner.Err()
}

// readPSIMemory reads /proc/pressure/memory and returns the some10 (10-second avg) value.
// PSI some = fraction of time at least one task was stalled (0..1).
// Returns 0 if file unavailable (older kernels).
func readPSIMemory() (float64, error) {
	f, err := os.Open("/proc/pressure/memory")
	if err != nil {
		return 0, nil // PSI not available — not an error
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		// Format: "some avg10=0.00 avg60=0.00 avg300=0.00 total=0"
		if !strings.HasPrefix(line, "some") {
			continue
		}
		fields := strings.Fields(line)
		for _, f := range fields {
			if strings.HasPrefix(f, "avg10=") {
				val, err := strconv.ParseFloat(strings.TrimPrefix(f, "avg10="), 64)
				if err == nil {
					return val / 100.0, nil // convert percent to 0..1 ratio
				}
			}
		}
	}
	return 0, nil
}
