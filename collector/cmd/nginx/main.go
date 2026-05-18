// nginx collector — collects signals from an NGINX instance.
// Reads stub_status module for connection data; tails access log for latency + errors.
package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/systemflow/collector/internal/publisher"
	"github.com/systemflow/collector/internal/signals"
)

func main() {
	nodeID     := flag.String("node-id", "nginx:default", "unique ID for this NGINX node")
	statusURL  := flag.String("status-url", "http://localhost/nginx_status", "NGINX stub_status URL")
	brokers    := flag.String("brokers", "localhost:9092", "Kafka brokers")
	interval   := flag.Duration("interval", 15*time.Second, "collection interval")
	flag.Parse()

	pub := publisher.New([]string{*brokers})
	defer pub.Close()

	log.Printf("[nginx] collector started node_id=%s", *nodeID)

	ticker := time.NewTicker(*interval)
	defer ticker.Stop()

	for range ticker.C {
		batch, err := collectAll(*statusURL, *nodeID)
		if err != nil {
			log.Printf("[nginx] collect error: %v", err)
			continue
		}
		if err := pub.SendBatch(context.Background(), batch); err != nil {
			log.Printf("[nginx] publish error: %v", err)
		}
	}
}

func collectAll(statusURL, nodeID string) ([]signals.Reading, error) {
	now := time.Now().UnixMilli()
	var batch []signals.Reading

	stub, err := fetchStubStatus(statusURL)
	if err != nil {
		return nil, fmt.Errorf("stub_status: %w", err)
	}
	batch = append(batch, signals.Reading{NodeID: nodeID, Signal: signals.ConnectionCountActive,  Value: float64(stub.active),  Timestamp: now, Unit: "count"})
	batch = append(batch, signals.Reading{NodeID: nodeID, Signal: signals.ConnectionCountWaiting, Value: float64(stub.waiting), Timestamp: now, Unit: "count"})
	batch = append(batch, signals.Reading{NodeID: nodeID, Signal: signals.RequestRate,            Value: float64(stub.requestsPerSec), Timestamp: now, Unit: "req/s"})

	// TODO: tail access log with golines for latency histogram
	// TODO: parse 4xx/5xx counts for error_rate
	batch = append(batch, signals.Reading{NodeID: nodeID, Signal: signals.RequestLatencyP50, Value: 0, Timestamp: now, Unit: "ms"})
	batch = append(batch, signals.Reading{NodeID: nodeID, Signal: signals.RequestLatencyP99, Value: 0, Timestamp: now, Unit: "ms"})
	batch = append(batch, signals.Reading{NodeID: nodeID, Signal: signals.ErrorRate4xx,      Value: 0, Timestamp: now, Unit: "errors/s"})
	batch = append(batch, signals.Reading{NodeID: nodeID, Signal: signals.ErrorRate5xx,      Value: 0, Timestamp: now, Unit: "errors/s"})

	return batch, nil
}

type stubStatus struct {
	active         int
	waiting        int
	requestsPerSec float64
}

func fetchStubStatus(url string) (stubStatus, error) {
	resp, err := http.Get(url)
	if err != nil {
		return stubStatus{}, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return parseStubStatus(string(body)), nil
}

// parseStubStatus parses NGINX stub_status output:
// Active connections: 291
// server accepts handled requests
//  16630948 16630948 31070465
// Reading: 6 Writing: 179 Waiting: 106
func parseStubStatus(body string) stubStatus {
	var s stubStatus
	scanner := bufio.NewScanner(strings.NewReader(body))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "Active connections:") {
			fmt.Sscanf(line, "Active connections: %d", &s.active)
		} else if strings.Contains(line, "Waiting:") {
			parts := strings.Fields(line)
			for i, p := range parts {
				if p == "Waiting:" && i+1 < len(parts) {
					s.waiting, _ = strconv.Atoi(parts[i+1])
				}
			}
		}
	}
	return s
}
