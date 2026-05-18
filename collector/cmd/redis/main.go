// redis collector — collects signals from a Redis instance via INFO and LATENCY commands.
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/systemflow/collector/internal/publisher"
	"github.com/systemflow/collector/internal/signals"
)

func main() {
	nodeID   := flag.String("node-id", "redis:default", "unique ID for this Redis node")
	addr     := flag.String("addr", "localhost:6379", "Redis address")
	password := flag.String("password", "", "Redis password")
	brokers  := flag.String("brokers", "localhost:9092", "Kafka brokers")
	interval := flag.Duration("interval", 15*time.Second, "collection interval")
	flag.Parse()

	pub := publisher.New([]string{*brokers})
	defer pub.Close()

	rdb := redis.NewClient(&redis.Options{Addr: *addr, Password: *password})
	defer rdb.Close()

	log.Printf("[redis] collector started node_id=%s", *nodeID)

	ticker := time.NewTicker(*interval)
	defer ticker.Stop()

	for range ticker.C {
		batch, err := collectAll(rdb, *nodeID)
		if err != nil {
			log.Printf("[redis] collect error: %v", err)
			continue
		}
		if err := pub.SendBatch(context.Background(), batch); err != nil {
			log.Printf("[redis] publish error: %v", err)
		}
	}
}

func collectAll(rdb *redis.Client, nodeID string) ([]signals.Reading, error) {
	ctx := context.Background()
	now := time.Now().UnixMilli()

	info, err := rdb.Info(ctx, "all").Result()
	if err != nil {
		return nil, fmt.Errorf("INFO failed: %w", err)
	}

	fields := parseInfo(info)
	var batch []signals.Reading

	add := func(sig signals.Name, key, unit string) {
		if v, ok := fields[key]; ok {
			if f, err := strconv.ParseFloat(v, 64); err == nil {
				batch = append(batch, signals.Reading{NodeID: nodeID, Signal: sig, Value: f, Timestamp: now, Unit: unit})
			}
		}
	}

	// Memory
	add(signals.RAMUsed, "used_memory_rss", "bytes")

	// Connections
	add(signals.ConnectionCountActive, "connected_clients", "count")
	if maxClients, ok := fields["maxclients"]; ok {
		if connClients, ok2 := fields["connected_clients"]; ok2 {
			mc, _ := strconv.ParseFloat(maxClients, 64)
			cc, _ := strconv.ParseFloat(connClients, 64)
			if mc > 0 {
				batch = append(batch, signals.Reading{NodeID: nodeID, Signal: signals.ConnectionPoolSaturation, Value: cc / mc, Timestamp: now, Unit: "ratio"})
			}
		}
	}
	add(signals.ErrorRate5xx, "rejected_connections", "count/s") // approximation

	// Request rate
	add(signals.RequestRate, "instantaneous_ops_per_sec", "ops/s")

	// Latency — requires LATENCY HISTORY or LATENCY LATEST
	latency, err := rdb.Do(ctx, "LATENCY", "LATEST").Slice()
	if err == nil && len(latency) > 0 {
		// LATENCY LATEST returns [event_name, ts, latency_ms, max_latency_ms]
		// Parse the first event's latest latency as p99 approximation
		if entry, ok := latency[0].([]interface{}); ok && len(entry) >= 3 {
			if latMs, ok := entry[2].(int64); ok {
				batch = append(batch, signals.Reading{NodeID: nodeID, Signal: signals.RequestLatencyP99, Value: float64(latMs), Timestamp: now, Unit: "ms"})
			}
		}
	}

	return batch, nil
}

// parseInfo parses Redis INFO output into a key→value map.
func parseInfo(info string) map[string]string {
	result := make(map[string]string)
	for _, line := range strings.Split(info, "\r\n") {
		if strings.HasPrefix(line, "#") || line == "" {
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) == 2 {
			result[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
		}
	}
	return result
}
