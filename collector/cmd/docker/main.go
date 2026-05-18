// docker collector — collects signals from Docker containers via Docker Engine API.
// Runs on the host, one instance per host, collects all containers.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"time"

	"github.com/systemflow/collector/internal/publisher"
	"github.com/systemflow/collector/internal/signals"
)

func main() {
	nodePrefix := flag.String("node-prefix", "docker", "prefix for container node IDs")
	dockerSock := flag.String("docker-sock", "/var/run/docker.sock", "Docker socket path")
	brokers    := flag.String("brokers", "localhost:9092", "Kafka brokers")
	interval   := flag.Duration("interval", 15*time.Second, "collection interval")
	flag.Parse()

	pub := publisher.New([]string{*brokers})
	defer pub.Close()

	client := dockerClient(*dockerSock)
	log.Printf("[docker] collector started prefix=%s", *nodePrefix)

	ticker := time.NewTicker(*interval)
	defer ticker.Stop()

	for range ticker.C {
		containers, err := listContainers(client)
		if err != nil {
			log.Printf("[docker] list containers error: %v", err)
			continue
		}
		for _, c := range containers {
			nodeID := fmt.Sprintf("%s:%s", *nodePrefix, c.Name)
			batch, err := collectContainer(client, c.ID, nodeID)
			if err != nil {
				log.Printf("[docker] stats error container=%s: %v", c.Name, err)
				continue
			}
			if err := pub.SendBatch(context.Background(), batch); err != nil {
				log.Printf("[docker] publish error: %v", err)
			}
		}
	}
}

// ── Docker API client (Unix socket) ──────────────────────────────────────────

func dockerClient(sockPath string) *http.Client {
	return &http.Client{
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return (&net.Dialer{}).DialContext(ctx, "unix", sockPath)
			},
		},
		Timeout: 10 * time.Second,
	}
}

type container struct {
	ID   string
	Name string
}

func listContainers(client *http.Client) ([]container, error) {
	resp, err := client.Get("http://localhost/v1.43/containers/json")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var raw []struct {
		Id    string   `json:"Id"`
		Names []string `json:"Names"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}

	result := make([]container, 0, len(raw))
	for _, c := range raw {
		name := c.Id[:12]
		if len(c.Names) > 0 {
			name = c.Names[0][1:] // strip leading /
		}
		result = append(result, container{ID: c.Id, Name: name})
	}
	return result, nil
}

// dockerStats holds the subset of /containers/{id}/stats we care about.
type dockerStats struct {
	CPUStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
		OnlineCPUs     int    `json:"online_cpus"`
	} `json:"cpu_stats"`
	PreCPUStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
	} `json:"precpu_stats"`
	MemoryStats struct {
		Usage uint64 `json:"usage"`
		Limit uint64 `json:"limit"`
		Stats struct {
			Cache uint64 `json:"cache"`
		} `json:"stats"`
	} `json:"memory_stats"`
	Networks map[string]struct {
		RxBytes uint64 `json:"rx_bytes"`
		TxBytes uint64 `json:"tx_bytes"`
	} `json:"networks"`
	BlkioStats struct {
		IoServiceBytesRecursive []struct {
			Op    string `json:"op"`
			Value uint64 `json:"value"`
		} `json:"io_service_bytes_recursive"`
	} `json:"blkio_stats"`
}

var prevStats = map[string]dockerStats{}

func collectContainer(client *http.Client, containerID, nodeID string) ([]signals.Reading, error) {
	resp, err := client.Get(fmt.Sprintf("http://localhost/v1.43/containers/%s/stats?stream=false", containerID))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var stats dockerStats
	if err := json.Unmarshal(body, &stats); err != nil {
		return nil, err
	}

	ts := time.Now().UnixMilli()
	var batch []signals.Reading

	// ── CPU usage % ──────────────────────────────────────────────────────────
	cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
	sysDelta  := float64(stats.CPUStats.SystemCPUUsage - stats.PreCPUStats.SystemCPUUsage)
	numCPU := float64(stats.CPUStats.OnlineCPUs)
	if numCPU == 0 { numCPU = 1 }
	cpuPct := 0.0
	if sysDelta > 0 {
		cpuPct = (cpuDelta / sysDelta) * numCPU * 100.0
	}
	batch = append(batch, signals.Reading{NodeID: nodeID, Signal: signals.CPUUsage, Value: cpuPct, Timestamp: ts, Unit: "percent"})

	// ── Memory ───────────────────────────────────────────────────────────────
	// RSS = usage - cache (Docker reports page cache in memory.usage)
	rss := float64(stats.MemoryStats.Usage - stats.MemoryStats.Stats.Cache)
	batch = append(batch, signals.Reading{NodeID: nodeID, Signal: signals.RAMUsed, Value: rss, Timestamp: ts, Unit: "bytes"})

	// Memory pressure = rss / limit
	if stats.MemoryStats.Limit > 0 {
		pressure := rss / float64(stats.MemoryStats.Limit)
		batch = append(batch, signals.Reading{NodeID: nodeID, Signal: signals.RAMPressure, Value: pressure, Timestamp: ts, Unit: "ratio"})
	}

	// ── Network I/O ───────────────────────────────────────────────────────────
	var totalRx, totalTx uint64
	for _, iface := range stats.Networks {
		totalRx += iface.RxBytes
		totalTx += iface.TxBytes
	}
	prev, hasPrev := prevStats[containerID]
	if hasPrev {
		prevRx := uint64(0)
		prevTx := uint64(0)
		for _, iface := range prev.Networks {
			prevRx += iface.RxBytes
			prevTx += iface.TxBytes
		}
		// Approximate 15s interval — actual elapsed time improves this
		intervalSec := 15.0
		batch = append(batch,
			signals.Reading{NodeID: nodeID, Signal: signals.BandwidthIn,  Value: float64(totalRx-prevRx) / intervalSec, Timestamp: ts, Unit: "bytes/s"},
			signals.Reading{NodeID: nodeID, Signal: signals.BandwidthOut, Value: float64(totalTx-prevTx) / intervalSec, Timestamp: ts, Unit: "bytes/s"},
		)
	}

	// ── Block I/O ─────────────────────────────────────────────────────────────
	var readBytes, writeBytes uint64
	for _, entry := range stats.BlkioStats.IoServiceBytesRecursive {
		switch entry.Op {
		case "Read":  readBytes += entry.Value
		case "Write": writeBytes += entry.Value
		}
	}
	if hasPrev {
		prevRead, prevWrite := uint64(0), uint64(0)
		for _, e := range prev.BlkioStats.IoServiceBytesRecursive {
			switch e.Op {
			case "Read":  prevRead += e.Value
			case "Write": prevWrite += e.Value
			}
		}
		intervalSec := 15.0
		batch = append(batch,
			signals.Reading{NodeID: nodeID, Signal: signals.DiskThroughputRead,  Value: float64(readBytes-prevRead) / intervalSec,   Timestamp: ts, Unit: "bytes/s"},
			signals.Reading{NodeID: nodeID, Signal: signals.DiskThroughputWrite, Value: float64(writeBytes-prevWrite) / intervalSec, Timestamp: ts, Unit: "bytes/s"},
		)
	}

	prevStats[containerID] = stats
	return batch, nil
}
