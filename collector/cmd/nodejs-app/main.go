// nodejs-app collector — receives OTel metrics pushed from the Node.js instrumentation
// library (systemflow-instrument.js) and forwards to Kafka.
//
// The JS library POSTs readings to this collector's HTTP endpoint.
// This decouples the JS runtime from Kafka dependencies.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/systemflow/collector/internal/publisher"
	"github.com/systemflow/collector/internal/signals"
)

func main() {
	listen  := flag.String("listen", ":9100", "HTTP listen address for OTel push receiver")
	brokers := flag.String("brokers", "localhost:9092", "Kafka brokers")
	flag.Parse()

	pub := publisher.New([]string{*brokers})
	defer pub.Close()

	log.Printf("[nodejs-app] OTel receiver started listen=%s", *listen)

	mux := http.NewServeMux()

	// POST /ingest — receives batch readings from the JS instrumentation library
	mux.HandleFunc("/ingest", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST only", http.StatusMethodNotAllowed)
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			http.Error(w, "read error", http.StatusBadRequest)
			return
		}

		var payload struct {
			Readings []struct {
				NodeID      string  `json:"node_id"`
				Signal      string  `json:"signal"`
				Value       float64 `json:"value"`
				TimestampMS int64   `json:"timestamp_ms"`
				Unit        string  `json:"unit"`
			} `json:"readings"`
		}
		if err := json.Unmarshal(body, &payload); err != nil {
			http.Error(w, "json parse error", http.StatusBadRequest)
			return
		}

		batch := make([]signals.Reading, 0, len(payload.Readings))
		for _, r := range payload.Readings {
			ts := r.TimestampMS
			if ts == 0 {
				ts = time.Now().UnixMilli()
			}
			batch = append(batch, signals.Reading{
				NodeID:    r.NodeID,
				Signal:    signals.Name(r.Signal),
				Value:     r.Value,
				Timestamp: ts,
				Unit:      r.Unit,
			})
		}

		if err := pub.SendBatch(context.Background(), batch); err != nil {
			log.Printf("[nodejs-app] publish error: %v", err)
			http.Error(w, "publish error", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusAccepted)
		w.Write([]byte(`{"accepted":true}`))
	})

	// GET /health
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status":"ok","service":"nodejs-app-collector"}`))
	})

	server := &http.Server{
		Addr:         *listen,
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("[nodejs-app] server error: %v", err)
	}
}
