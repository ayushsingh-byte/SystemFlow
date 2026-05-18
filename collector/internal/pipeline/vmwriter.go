// Package pipeline provides the Kafka consumer and downstream fanout logic for
// the SystemFlow signal pipeline.
package pipeline

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/systemflow/collector/internal/signals"
)

// VMWriter posts readings to VictoriaMetrics via the Prometheus exposition
// format import endpoint (/api/v1/import/prometheus).
type VMWriter struct {
	WriteURL string
	client   *http.Client
}

// NewVMWriter creates a VMWriter that talks to the given writeURL.
// A 5-second per-request timeout is applied.
func NewVMWriter(writeURL string) *VMWriter {
	return &VMWriter{
		WriteURL: writeURL,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// Write sends a single reading to VictoriaMetrics. It retries once on 5xx.
func (w *VMWriter) Write(ctx context.Context, r signals.Reading) error {
	return w.WriteBatch(ctx, []signals.Reading{r})
}

// WriteBatch sends multiple readings in a single HTTP call (more efficient).
// Each reading is serialised as one Prometheus exposition line:
//
//	sf_{signal_name}{node_id="{node_id}",unit="{unit}"} {value} {timestamp_ms}
//
// Signal names have hyphens replaced with underscores and are prefixed with
// "sf_" to identify SystemFlow metrics.
//
// The call retries once on a 5xx response before returning an error.
func (w *VMWriter) WriteBatch(ctx context.Context, readings []signals.Reading) error {
	if len(readings) == 0 {
		return nil
	}

	body := buildPrometheusPayload(readings)
	return w.postWithRetry(ctx, body)
}

// buildPrometheusPayload serialises readings into Prometheus exposition format.
func buildPrometheusPayload(readings []signals.Reading) []byte {
	var buf bytes.Buffer
	for _, r := range readings {
		metricName := "sf_" + strings.ReplaceAll(string(r.Signal), "-", "_")
		// Format: metric{labels} value timestamp_ms
		fmt.Fprintf(&buf, "%s{node_id=%q,unit=%q} %g %d\n",
			metricName,
			r.NodeID,
			r.Unit,
			r.Value,
			r.Timestamp,
		)
	}
	return buf.Bytes()
}

// postWithRetry POSTs payload to the VM import endpoint, retrying once on 5xx.
func (w *VMWriter) postWithRetry(ctx context.Context, payload []byte) error {
	const maxAttempts = 2
	var lastErr error
	for attempt := 0; attempt < maxAttempts; attempt++ {
		lastErr = w.post(ctx, payload)
		if lastErr == nil {
			return nil
		}
		// Only retry if we got a server-side error (5xx); otherwise fail fast.
		if !is5xx(lastErr) {
			return lastErr
		}
	}
	return lastErr
}

// post executes one HTTP POST to the VM import URL.
func (w *VMWriter) post(ctx context.Context, payload []byte) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, w.WriteURL, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("vmwriter: build request: %w", err)
	}
	req.Header.Set("Content-Type", "text/plain")

	resp, err := w.client.Do(req)
	if err != nil {
		return fmt.Errorf("vmwriter: do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		return &vmHTTPError{statusCode: resp.StatusCode}
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("vmwriter: server rejected payload with status %d", resp.StatusCode)
	}
	return nil
}

// vmHTTPError is returned for HTTP-level failures so callers can inspect the
// status code without string matching.
type vmHTTPError struct {
	statusCode int
}

func (e *vmHTTPError) Error() string {
	return fmt.Sprintf("vmwriter: server returned %d", e.statusCode)
}

// is5xx returns true when err was caused by an HTTP 5xx response.
func is5xx(err error) bool {
	if err == nil {
		return false
	}
	var httpErr *vmHTTPError
	// Walk the error chain.
	for {
		if e, ok := err.(*vmHTTPError); ok {
			httpErr = e
			break
		}
		// unwrap one level if possible
		type unwrapper interface{ Unwrap() error }
		if u, ok := err.(unwrapper); ok {
			err = u.Unwrap()
		} else {
			break
		}
	}
	return httpErr != nil && httpErr.statusCode >= 500
}
