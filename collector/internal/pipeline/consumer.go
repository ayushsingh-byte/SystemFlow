package pipeline

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	kafka "github.com/segmentio/kafka-go"
	"github.com/systemflow/collector/internal/signals"
)

// KafkaConsumer reads signal readings from Kafka topic systemflow.signals and
// fans each validated reading out to:
//  1. VictoriaMetrics  — via vmwriter (Prometheus exposition format)
//  2. ML service       — via HTTP POST to /ingest (JSON)
//
// Both destinations are best-effort: errors are logged but never stop the
// consumer. A rate-of-change synthetic signal is derived from a per-
// (node_id, signal) sliding window of the last 5 readings and published
// alongside the original reading.
type ConsumerConfig struct {
	Brokers      []string
	GroupID      string // default "systemflow-pipeline"
	VMWriteURL   string // e.g. "http://localhost:8428/api/v1/import/prometheus"
	MLServiceURL string // e.g. "http://localhost:8000/ingest"
	WorkerCount  int    // parallel fanout workers, default 4
}

// Consumer wraps a kafka-go Reader and drives the fanout pipeline.
type Consumer struct {
	cfg      ConsumerConfig
	reader   *kafka.Reader
	vmWriter *VMWriter
	mlClient *http.Client

	// rate-of-change cache: key = "node_id\x00signal"
	rocMu    sync.Mutex
	rocCache map[string][]signals.Reading // last ≤5 readings per key

	// metrics (atomic)
	consumedTotal int64
	vmErrorsTotal int64
	mlErrorsTotal int64
}

// NewConsumer constructs a Consumer, applying defaults for unset fields.
func NewConsumer(cfg ConsumerConfig) *Consumer {
	if cfg.GroupID == "" {
		cfg.GroupID = "systemflow-pipeline"
	}
	if cfg.WorkerCount <= 0 {
		cfg.WorkerCount = 4
	}

	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  cfg.Brokers,
		GroupID:  cfg.GroupID,
		Topic:    "systemflow.signals",
		MinBytes: 1,
		MaxBytes: 10 << 20, // 10 MiB
		MaxWait:  500 * time.Millisecond,
	})

	return &Consumer{
		cfg:      cfg,
		reader:   r,
		vmWriter: NewVMWriter(cfg.VMWriteURL),
		mlClient: &http.Client{Timeout: 5 * time.Second},
		rocCache: make(map[string][]signals.Reading),
	}
}

// Run blocks, consuming messages until ctx is cancelled.
// It limits concurrency to cfg.WorkerCount using a semaphore channel.
func (c *Consumer) Run(ctx context.Context) error {
	sem := make(chan struct{}, c.cfg.WorkerCount)
	var wg sync.WaitGroup

	log.Printf("[pipeline] consumer started brokers=%v group=%s vm=%s ml=%s workers=%d",
		c.cfg.Brokers, c.cfg.GroupID, c.cfg.VMWriteURL, c.cfg.MLServiceURL, c.cfg.WorkerCount)

	for {
		msg, err := c.reader.ReadMessage(ctx)
		if err != nil {
			// ctx cancelled — drain in-flight and return.
			if ctx.Err() != nil {
				wg.Wait()
				return nil
			}
			log.Printf("[pipeline] kafka read error: %v", err)
			continue
		}

		atomic.AddInt64(&c.consumedTotal, 1)

		var r signals.Reading
		if err := json.Unmarshal(msg.Value, &r); err != nil {
			log.Printf("[pipeline] invalid JSON (offset=%d): %v", msg.Offset, err)
			continue
		}

		if !isKnownSignal(r.Signal) {
			log.Printf("[pipeline] unknown signal %q — skipping (offset=%d)", r.Signal, msg.Offset)
			continue
		}

		// Acquire semaphore slot, then process in a goroutine.
		sem <- struct{}{}
		wg.Add(1)
		go func(reading signals.Reading) {
			defer wg.Done()
			defer func() { <-sem }()
			c.fanOut(ctx, reading)
		}(r)
	}
}

// Close drains and closes the underlying Kafka reader.
func (c *Consumer) Close() error {
	log.Printf("[pipeline] closing consumer (consumed=%d vm_errors=%d ml_errors=%d)",
		atomic.LoadInt64(&c.consumedTotal),
		atomic.LoadInt64(&c.vmErrorsTotal),
		atomic.LoadInt64(&c.mlErrorsTotal),
	)
	return c.reader.Close()
}

// Metrics returns a snapshot of the internal counters.
func (c *Consumer) Metrics() (consumed, vmErrors, mlErrors int64) {
	return atomic.LoadInt64(&c.consumedTotal),
		atomic.LoadInt64(&c.vmErrorsTotal),
		atomic.LoadInt64(&c.mlErrorsTotal)
}

// fanOut sends reading to VM and ML concurrently, then derives and publishes a
// rate-of-change synthetic reading.
func (c *Consumer) fanOut(ctx context.Context, r signals.Reading) {
	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		if err := c.vmWriter.Write(ctx, r); err != nil {
			atomic.AddInt64(&c.vmErrorsTotal, 1)
			log.Printf("[pipeline] vm write error node=%s signal=%s: %v", r.NodeID, r.Signal, err)
		}
	}()

	go func() {
		defer wg.Done()
		if err := c.postToML(ctx, r); err != nil {
			atomic.AddInt64(&c.mlErrorsTotal, 1)
			log.Printf("[pipeline] ml ingest error node=%s signal=%s: %v", r.NodeID, r.Signal, err)
		}
	}()

	wg.Wait()

	// Derive rate-of-change and publish it (best-effort, same fanout path).
	if roc, ok := c.computeRateOfChange(r); ok {
		c.fanOut(ctx, roc)
	}
}

// postToML sends the reading as JSON to the ML service /ingest endpoint.
func (c *Consumer) postToML(ctx context.Context, r signals.Reading) error {
	payload, err := json.Marshal(map[string]any{
		"node_id":      r.NodeID,
		"signal":       string(r.Signal),
		"value":        r.Value,
		"timestamp_ms": r.Timestamp,
		"unit":         r.Unit,
	})
	if err != nil {
		return fmt.Errorf("ml marshal: %w", err)
	}

	url := strings.TrimRight(c.cfg.MLServiceURL, "/") + "/ingest"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("ml build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.mlClient.Do(req)
	if err != nil {
		return fmt.Errorf("ml do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("ml service returned %d", resp.StatusCode)
	}
	return nil
}

// computeRateOfChange maintains a sliding window of the last 5 readings for
// the (node_id, signal) pair and, when at least 2 data points are available,
// returns a synthesised RateOfChange reading whose value is the least-squares
// slope (Δvalue/Δms) multiplied by 1000 to express the change per second.
//
// Returns (reading, true) when a slope could be computed.
func (c *Consumer) computeRateOfChange(r signals.Reading) (signals.Reading, bool) {
	key := r.NodeID + "\x00" + string(r.Signal)

	c.rocMu.Lock()
	window := append(c.rocCache[key], r)
	if len(window) > 5 {
		window = window[len(window)-5:]
	}
	c.rocCache[key] = window
	c.rocMu.Unlock()

	if len(window) < 2 {
		return signals.Reading{}, false
	}

	// Simple linear regression slope: Σ(xi-x̄)(yi-ȳ) / Σ(xi-x̄)²
	// xi = timestamp_ms, yi = value
	n := float64(len(window))
	var sumX, sumY float64
	for _, w := range window {
		sumX += float64(w.Timestamp)
		sumY += w.Value
	}
	meanX := sumX / n
	meanY := sumY / n

	var num, den float64
	for _, w := range window {
		dx := float64(w.Timestamp) - meanX
		num += dx * (w.Value - meanY)
		den += dx * dx
	}

	if den == 0 {
		return signals.Reading{}, false
	}

	// slope in units/ms → convert to units/s
	slope := (num / den) * 1000

	return signals.Reading{
		NodeID:    r.NodeID,
		Signal:    signals.RateOfChange,
		Value:     slope,
		Timestamp: r.Timestamp,
		Unit:      r.Unit + "/s",
	}, true
}

// isKnownSignal checks whether s appears in signals.AllSignals.
func isKnownSignal(s signals.Name) bool {
	for _, known := range signals.AllSignals {
		if known == s {
			return true
		}
	}
	return false
}
