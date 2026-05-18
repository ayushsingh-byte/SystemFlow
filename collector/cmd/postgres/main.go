// postgres collector — collects all signals from a PostgreSQL instance.
// Connects via pg_stat_* views and pg_stat_statements extension.
package main

import (
	"context"
	"database/sql"
	"flag"
	"log"
	"time"

	_ "github.com/lib/pq"
	"github.com/systemflow/collector/internal/publisher"
	"github.com/systemflow/collector/internal/signals"
)

func main() {
	nodeID  := flag.String("node-id", "postgresql:default", "unique ID for this PostgreSQL node")
	dsn     := flag.String("dsn", "postgres://localhost:5432/postgres?sslmode=disable", "PostgreSQL DSN")
	brokers := flag.String("brokers", "localhost:9092", "Kafka brokers")
	interval := flag.Duration("interval", 15*time.Second, "collection interval")
	flag.Parse()

	pub := publisher.New([]string{*brokers})
	defer pub.Close()

	db, err := sql.Open("postgres", *dsn)
	if err != nil {
		log.Fatalf("[postgres] failed to open DB: %v", err)
	}
	defer db.Close()

	log.Printf("[postgres] collector started node_id=%s", *nodeID)

	ticker := time.NewTicker(*interval)
	defer ticker.Stop()

	for range ticker.C {
		batch, err := collectAll(db, *nodeID)
		if err != nil {
			log.Printf("[postgres] collect error: %v", err)
			continue
		}
		if err := pub.SendBatch(context.Background(), batch); err != nil {
			log.Printf("[postgres] publish error: %v", err)
		}
	}
}

func collectAll(db *sql.DB, nodeID string) ([]signals.Reading, error) {
	now := time.Now().UnixMilli()
	var batch []signals.Reading

	// ── Connection pool ────────────────────────────────────────────────────
	// SELECT count(*) FROM pg_stat_activity WHERE state = 'active'/'idle'/'idle in transaction'
	batch = append(batch, collectConnections(db, nodeID, now)...)

	// ── Request rate + latency (requires pg_stat_statements) ──────────────
	batch = append(batch, collectStatements(db, nodeID, now)...)

	// ── Error rate ────────────────────────────────────────────────────────
	batch = append(batch, collectErrors(db, nodeID, now)...)

	return batch, nil
}

func collectConnections(db *sql.DB, nodeID string, ts int64) []signals.Reading {
	// TODO: query pg_stat_activity grouped by state
	// SELECT state, count(*) FROM pg_stat_activity GROUP BY state
	// connection_pool_saturation = active_count / (SELECT setting::int FROM pg_settings WHERE name='max_connections')
	return []signals.Reading{
		{NodeID: nodeID, Signal: signals.ConnectionCountActive,    Value: 0, Timestamp: ts, Unit: "count"},
		{NodeID: nodeID, Signal: signals.ConnectionCountWaiting,   Value: 0, Timestamp: ts, Unit: "count"},
		{NodeID: nodeID, Signal: signals.ConnectionCountIdle,      Value: 0, Timestamp: ts, Unit: "count"},
		{NodeID: nodeID, Signal: signals.ConnectionPoolSaturation, Value: 0, Timestamp: ts, Unit: "ratio"},
	}
}

func collectStatements(db *sql.DB, nodeID string, ts int64) []signals.Reading {
	// TODO: query pg_stat_statements for calls/sec, mean_time, stddev_time
	// Requires: CREATE EXTENSION pg_stat_statements;
	return []signals.Reading{
		{NodeID: nodeID, Signal: signals.RequestRate,         Value: 0, Timestamp: ts, Unit: "queries/s"},
		{NodeID: nodeID, Signal: signals.RequestLatencyP50,  Value: 0, Timestamp: ts, Unit: "ms"},
		{NodeID: nodeID, Signal: signals.RequestLatencyP95,  Value: 0, Timestamp: ts, Unit: "ms"},
		{NodeID: nodeID, Signal: signals.RequestLatencyP99,  Value: 0, Timestamp: ts, Unit: "ms"},
	}
}

func collectErrors(db *sql.DB, nodeID string, ts int64) []signals.Reading {
	// TODO: query pg_stat_database for xact_rollback, deadlocks, conflicts
	return []signals.Reading{
		{NodeID: nodeID, Signal: signals.ErrorRate5xx, Value: 0, Timestamp: ts, Unit: "errors/s"},
	}
}
