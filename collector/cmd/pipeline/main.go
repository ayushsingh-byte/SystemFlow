// pipeline — reads from systemflow.signals Kafka topic, writes to
// VictoriaMetrics + ML service.
//
// Usage:
//
//	pipeline [flags]
//
// Flags:
//
//	--brokers   comma-separated Kafka broker addresses  (default "localhost:9092")
//	--vm-url    VictoriaMetrics import URL              (default "http://localhost:8428/api/v1/import/prometheus")
//	--ml-url    ML service base URL                     (default "http://localhost:8000")
//	--group-id  Kafka consumer group ID                 (default "systemflow-pipeline")
//	--workers   parallel fanout goroutines              (default 4)
package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/systemflow/collector/internal/pipeline"
)

func main() {
	brokersFlag := flag.String("brokers", "localhost:9092", "comma-separated Kafka broker addresses")
	vmURL := flag.String("vm-url", "http://localhost:8428/api/v1/import/prometheus", "VictoriaMetrics import URL")
	mlURL := flag.String("ml-url", "http://localhost:8000", "ML service base URL")
	groupID := flag.String("group-id", "systemflow-pipeline", "Kafka consumer group ID")
	workers := flag.Int("workers", 4, "number of parallel fanout workers")
	flag.Parse()

	brokers := splitBrokers(*brokersFlag)

	log.Printf("[pipeline] starting  brokers=%v group=%s vm=%s ml=%s workers=%d",
		brokers, *groupID, *vmURL, *mlURL, *workers)

	cfg := pipeline.ConsumerConfig{
		Brokers:      brokers,
		GroupID:      *groupID,
		VMWriteURL:   *vmURL,
		MLServiceURL: *mlURL,
		WorkerCount:  *workers,
	}

	consumer := pipeline.NewConsumer(cfg)

	// Propagate SIGINT / SIGTERM to context so Run can drain gracefully.
	ctx, cancel := context.WithCancel(context.Background())
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigCh
		log.Printf("[pipeline] received signal %s — shutting down", sig)
		cancel()
	}()

	if err := consumer.Run(ctx); err != nil {
		log.Printf("[pipeline] consumer exited with error: %v", err)
	}

	if err := consumer.Close(); err != nil {
		log.Printf("[pipeline] close error: %v", err)
	}

	consumed, vmErrs, mlErrs := consumer.Metrics()
	log.Printf("[pipeline] stopped  consumed=%d vm_errors=%d ml_errors=%d",
		consumed, vmErrs, mlErrs)
}

// splitBrokers splits a comma-separated broker string into a slice,
// trimming whitespace from each entry.
func splitBrokers(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
