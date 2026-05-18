// Package proc provides /proc filesystem parsers for Linux signal collection.
package proc

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

// DiskReadings holds one snapshot of collected disk/IO signals.
type DiskReadings struct {
	IOPSRead             float64 // ops/sec
	IOPSWrite            float64 // ops/sec
	IOPSSaturation       float64 // 0..1 ratio of actual IOPS to provisioned IOPS
	ThroughputReadBytes  float64 // bytes/sec
	ThroughputWriteBytes float64 // bytes/sec
	QueueDepth           float64 // average pending ops (weighted time / elapsed ms)
	CapacityUsed         float64 // 0..1 ratio of used to total bytes across mounted filesystems
	LatencyReadMs        float64 // ms per read op
	LatencyWriteMs       float64 // ms per write op
}

// DiskConfig holds tunable parameters for disk signal collection.
type DiskConfig struct {
	// ProvisionedIOPS is the maximum IOPS expected for saturation computation.
	// Defaults to 10000 if zero.
	ProvisionedIOPS float64
}

// diskStat holds the raw /proc/diskstats counters for one device at one point in time.
type diskStat struct {
	readsCompleted  uint64 // field 4
	sectorsRead     uint64 // field 6
	timeReadingMs   uint64 // field 7
	writesCompleted uint64 // field 8
	sectorsWritten  uint64 // field 10
	timeWritingMs   uint64 // field 11
	weightedTimeMs  uint64 // field 14
}

// diskSnapshot is the aggregate of all included disks at one point in time.
type diskSnapshot struct {
	stat diskStat
	at   time.Time
}

var (
	prevDiskMu   sync.Mutex
	prevDiskSnap *diskSnapshot
)

// isPhysicalDisk returns true for devices we want to include: sda, sdb, nvme0n1, etc.
// Excludes loop*, ram*, sr*, fd*.
func isPhysicalDisk(name string) bool {
	for _, prefix := range []string{"loop", "ram", "sr", "fd"} {
		if strings.HasPrefix(name, prefix) {
			return false
		}
	}
	return true
}

// readDiskStats parses /proc/diskstats and returns the aggregate diskStat
// summed across all physical disks.
func readDiskStats() (diskStat, error) {
	f, err := os.Open("/proc/diskstats")
	if err != nil {
		return diskStat{}, fmt.Errorf("open /proc/diskstats: %w", err)
	}
	defer f.Close()

	var agg diskStat
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		// /proc/diskstats format (space-separated):
		// major minor device reads_completed reads_merged sectors_read time_reading_ms
		//   writes_completed writes_merged sectors_written time_writing_ms
		//   io_in_progress time_doing_io_ms weighted_time_doing_io_ms
		fields := strings.Fields(line)
		if len(fields) < 14 {
			continue
		}
		name := fields[2]
		if !isPhysicalDisk(name) {
			continue
		}

		parse := func(idx int) uint64 {
			v, _ := strconv.ParseUint(fields[idx], 10, 64)
			return v
		}

		agg.readsCompleted += parse(3)
		// fields[4] = reads_merged (not used)
		agg.sectorsRead += parse(5)
		agg.timeReadingMs += parse(6)
		agg.writesCompleted += parse(7)
		// fields[8] = writes_merged (not used)
		agg.sectorsWritten += parse(9)
		agg.timeWritingMs += parse(10)
		// fields[11] = io_in_progress (not used)
		// fields[12] = time_doing_io_ms (not used)
		agg.weightedTimeMs += parse(13)
	}
	return agg, scanner.Err()
}

// skipFSType returns true when a filesystem type should be excluded from
// capacity accounting (pseudo-filesystems, container layers, etc.).
func skipFSType(fstype string) bool {
	switch fstype {
	case "tmpfs", "proc", "sysfs", "devtmpfs", "cgroup", "cgroup2", "overlay",
		"devpts", "mqueue", "hugetlbfs", "pstore", "securityfs", "debugfs",
		"tracefs", "fusectl", "configfs", "binfmt_misc":
		return true
	}
	return false
}

// diskCapacityUsed walks /proc/mounts, calls syscall.Statfs on each real mount,
// and returns a weighted-average used/total ratio across all qualifying mounts.
func diskCapacityUsed() (float64, error) {
	f, err := os.Open("/proc/mounts")
	if err != nil {
		return 0, fmt.Errorf("open /proc/mounts: %w", err)
	}
	defer f.Close()

	var totalBytes, usedBytes uint64
	seen := make(map[string]bool) // avoid double-counting bind mounts to same device

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		// Format: device mountpoint fstype options dump pass
		fields := strings.Fields(line)
		if len(fields) < 3 {
			continue
		}
		mountpoint := fields[1]
		fstype := fields[2]

		if skipFSType(fstype) {
			continue
		}
		if seen[mountpoint] {
			continue
		}
		seen[mountpoint] = true

		var st syscall.Statfs_t
		if err := syscall.Statfs(mountpoint, &st); err != nil {
			// Non-fatal: skip inaccessible mounts (e.g. network FS temporarily down).
			continue
		}
		if st.Blocks == 0 {
			continue
		}

		blockSize := uint64(st.Bsize)
		total := st.Blocks * blockSize
		avail := st.Bavail * blockSize
		used := total - avail

		totalBytes += total
		usedBytes += used
	}
	if err := scanner.Err(); err != nil {
		return 0, err
	}
	if totalBytes == 0 {
		return 0, nil
	}
	return float64(usedBytes) / float64(totalBytes), nil
}

// DiskReadingsWithConfig collects all disk/IO signals and returns them in a
// DiskReadings struct. On the first call it stores a baseline snapshot and
// returns zero values for rate-based signals. Subsequent calls compute deltas
// against the previous snapshot.
//
// Note: disk_io_wait is intentionally absent — it is returned by CPUReadings
// (iowait field) so the two callers share a single /proc/stat parse.
func DiskReadingsWithConfig(cfg DiskConfig) (DiskReadings, error) {
	if cfg.ProvisionedIOPS <= 0 {
		cfg.ProvisionedIOPS = 10000
	}

	curr, err := readDiskStats()
	if err != nil {
		return DiskReadings{}, err
	}
	now := time.Now()

	capacity, err := diskCapacityUsed()
	if err != nil {
		// Non-fatal: return what we can, capacity will be 0.
		capacity = 0
	}

	prevDiskMu.Lock()
	defer prevDiskMu.Unlock()

	if prevDiskSnap == nil {
		// First call — store baseline, return zeros for delta-based signals.
		prevDiskSnap = &diskSnapshot{stat: curr, at: now}
		return DiskReadings{CapacityUsed: capacity}, nil
	}

	prev := prevDiskSnap
	elapsedSec := now.Sub(prev.at).Seconds()
	elapsedMs := now.Sub(prev.at).Milliseconds()

	// Update snapshot before computing to avoid stale data on error.
	prevDiskSnap = &diskSnapshot{stat: curr, at: now}

	if elapsedSec <= 0 {
		return DiskReadings{CapacityUsed: capacity}, nil
	}

	// --- Deltas ---
	dReadsCompleted := curr.readsCompleted - prev.stat.readsCompleted
	dWritesCompleted := curr.writesCompleted - prev.stat.writesCompleted
	dSectorsRead := curr.sectorsRead - prev.stat.sectorsRead
	dSectorsWritten := curr.sectorsWritten - prev.stat.sectorsWritten
	dTimeReadingMs := curr.timeReadingMs - prev.stat.timeReadingMs
	dTimeWritingMs := curr.timeWritingMs - prev.stat.timeWritingMs
	dWeightedTimeMs := curr.weightedTimeMs - prev.stat.weightedTimeMs

	// --- IOPS ---
	iopsRead := float64(dReadsCompleted) / elapsedSec
	iopsWrite := float64(dWritesCompleted) / elapsedSec
	totalIOPS := iopsRead + iopsWrite

	// --- Saturation (clamp to 1.0) ---
	iopsSaturation := totalIOPS / cfg.ProvisionedIOPS
	if iopsSaturation > 1.0 {
		iopsSaturation = 1.0
	}

	// --- Throughput (512 bytes per sector) ---
	throughputRead := float64(dSectorsRead) * 512.0 / elapsedSec
	throughputWrite := float64(dSectorsWritten) * 512.0 / elapsedSec

	// --- Queue depth (weighted time ms / elapsed ms) ---
	var queueDepth float64
	if elapsedMs > 0 {
		queueDepth = float64(dWeightedTimeMs) / float64(elapsedMs)
	}

	// --- Latency (ms per op) ---
	var latencyRead, latencyWrite float64
	if dReadsCompleted > 0 {
		latencyRead = float64(dTimeReadingMs) / float64(dReadsCompleted)
	}
	if dWritesCompleted > 0 {
		latencyWrite = float64(dTimeWritingMs) / float64(dWritesCompleted)
	}

	return DiskReadings{
		IOPSRead:             iopsRead,
		IOPSWrite:            iopsWrite,
		IOPSSaturation:       iopsSaturation,
		ThroughputReadBytes:  throughputRead,
		ThroughputWriteBytes: throughputWrite,
		QueueDepth:           queueDepth,
		CapacityUsed:         capacity,
		LatencyReadMs:        latencyRead,
		LatencyWriteMs:       latencyWrite,
	}, nil
}
