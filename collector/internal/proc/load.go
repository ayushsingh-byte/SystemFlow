package proc

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// LoadReadings returns load averages for 1, 5, and 15 minutes from /proc/loadavg.
func LoadReadings() (avg1, avg5, avg15 float64, err error) {
	data, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return 0, 0, 0, fmt.Errorf("read /proc/loadavg: %w", err)
	}
	// Format: "0.42 0.38 0.35 1/512 12345"
	fields := strings.Fields(string(data))
	if len(fields) < 3 {
		return 0, 0, 0, fmt.Errorf("unexpected /proc/loadavg format")
	}
	avg1, _ = strconv.ParseFloat(fields[0], 64)
	avg5, _ = strconv.ParseFloat(fields[1], 64)
	avg15, _ = strconv.ParseFloat(fields[2], 64)
	return avg1, avg5, avg15, nil
}
