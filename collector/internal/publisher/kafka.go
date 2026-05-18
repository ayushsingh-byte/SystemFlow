// Package publisher writes signal readings to Kafka topic systemflow.signals.
package publisher

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/systemflow/collector/internal/signals"
)

const topic = "systemflow.signals"

// Publisher sends signal readings to Kafka.
type Publisher struct {
	writer *kafka.Writer
}

func New(brokers []string) *Publisher {
	return &Publisher{
		writer: &kafka.Writer{
			Addr:         kafka.TCP(brokers...),
			Topic:        topic,
			Balancer:     &kafka.LeastBytes{},
			BatchTimeout: 10 * time.Millisecond,
			RequiredAcks: kafka.RequireOne,
		},
	}
}

// Send publishes a single reading. Validates signal name against AllSignals registry.
func (p *Publisher) Send(ctx context.Context, r signals.Reading) error {
	if !isKnownSignal(r.Signal) {
		return fmt.Errorf("unknown signal %q — add to signals.AllSignals first", r.Signal)
	}
	b, err := json.Marshal(r)
	if err != nil {
		return err
	}
	return p.writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(string(r.NodeID) + ":" + string(r.Signal)),
		Value: b,
	})
}

// SendBatch publishes multiple readings in one round-trip.
func (p *Publisher) SendBatch(ctx context.Context, readings []signals.Reading) error {
	msgs := make([]kafka.Message, 0, len(readings))
	for _, r := range readings {
		if !isKnownSignal(r.Signal) {
			return fmt.Errorf("unknown signal %q", r.Signal)
		}
		b, _ := json.Marshal(r)
		msgs = append(msgs, kafka.Message{
			Key:   []byte(string(r.NodeID) + ":" + string(r.Signal)),
			Value: b,
		})
	}
	return p.writer.WriteMessages(ctx, msgs...)
}

func (p *Publisher) Close() error { return p.writer.Close() }

func isKnownSignal(s signals.Name) bool {
	for _, known := range signals.AllSignals {
		if known == s {
			return true
		}
	}
	return false
}
