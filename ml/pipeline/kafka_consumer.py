"""
ML Kafka consumer — reads systemflow.signals topic, pipes through baseline + anomaly engine,
publishes anomaly events to systemflow.anomalies topic.

Run: python -m ml.pipeline.kafka_consumer
"""

from __future__ import annotations

import json
import logging
import os
import signal
import sys
import time
from typing import Optional

from confluent_kafka import Consumer, Producer, KafkaError, KafkaException

from ml.baseline.engine import BaselineEngine
from ml.anomaly.detector import AnomalyDetectorRegistry
from ml.baseline import saturation as sat_module

try:
    from ml.baseline import seasonality as sea_module
except ImportError:
    sea_module = None  # type: ignore[assignment]

try:
    from ml.anomaly import peer_comparison as peer_module
except ImportError:
    peer_module = None  # type: ignore[assignment]

try:
    from ml.signatures import matcher as sig_matcher
except ImportError:
    sig_matcher = None  # type: ignore[assignment]

try:
    from ml.causal import engine as causal_module
    from ml.causal import graph as causal_graph_module
    from ml.causal import correlator as causal_corr_module
except ImportError:
    causal_module = None  # type: ignore[assignment]
    causal_graph_module = None  # type: ignore[assignment]
    causal_corr_module = None  # type: ignore[assignment]

log = logging.getLogger("sf.pipeline")

SIGNALS_TOPIC   = "systemflow.signals"
ANOMALIES_TOPIC = "systemflow.anomalies"

# Singletons
_baseline = BaselineEngine(learning_window_hours=72)
_anomaly  = AnomalyDetectorRegistry()


def run(
    brokers: str = "localhost:9092",
    group_id: str = "sf-ml-pipeline",
    dry_run: bool = False,
) -> None:
    consumer = Consumer({
        "bootstrap.servers": brokers,
        "group.id": group_id,
        "auto.offset.reset": "earliest",
        "enable.auto.commit": True,
        "max.poll.interval.ms": 60_000,
    })
    producer = Producer({"bootstrap.servers": brokers}) if not dry_run else None

    consumer.subscribe([SIGNALS_TOPIC])
    log.info("ML consumer started brokers=%s group=%s", brokers, group_id)

    running = True

    def _stop(sig, frame):
        nonlocal running
        log.info("Shutdown signal received")
        running = False

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    counters = {"consumed": 0, "anomalies": 0, "errors": 0}

    try:
        while running:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                log.error("Kafka error: %s", msg.error())
                counters["errors"] += 1
                continue

            try:
                reading = json.loads(msg.value())
                _process(reading, producer, counters)
                counters["consumed"] += 1
            except Exception as e:
                log.warning("Failed to process message: %s — %s", msg.value()[:200], e)
                counters["errors"] += 1

            # Periodic stats log
            if counters["consumed"] % 1000 == 0 and counters["consumed"] > 0:
                log.info("Stats: %s", counters)

            # Periodic peer comparison (every 300 messages)
            if counters["consumed"] > 0 and counters["consumed"] % 300 == 0:
                _run_peer_comparison(producer)

    finally:
        consumer.close()
        if producer:
            producer.flush()
        log.info("ML consumer stopped. Final stats: %s", counters)


def _process(reading: dict, producer: Optional[Producer], counters: dict) -> None:
    node_id    = reading.get("node_id", "")
    signal_key = reading.get("signal", "")
    value      = float(reading.get("value", 0))
    ts_ms      = int(reading.get("timestamp_ms") or (time.time() * 1000))
    node_type  = reading.get("node_type")

    if not node_id or not signal_key:
        return

    # Run through baseline engine
    report = _baseline.ingest(node_id, signal_key, value, ts_ms)

    # Run through anomaly detector
    result = _anomaly.evaluate(report)

    if result and result.is_anomaly:
        counters["anomalies"] += 1
        event = {
            "node_id":          result.node_id,
            "signal":           result.signal,
            "value":            result.value,
            "timestamp_ms":     result.timestamp_ms,
            "method":           result.method,
            "confidence":       result.confidence,
            "deviation_zscore": result.deviation_zscore,
            "baseline_mean":    result.baseline_mean,
            "description":      result.description,
        }
        log.info("ANOMALY %s/%s conf=%.2f z=%.1f: %s",
                 node_id, signal_key, result.confidence, result.deviation_zscore, result.description)

        if producer:
            producer.produce(
                ANOMALIES_TOPIC,
                key=f"{node_id}:{signal_key}".encode(),
                value=json.dumps(event).encode(),
            )
            producer.poll(0)

    # Phase 4: signature matching
    if sig_matcher is not None and result and result.is_anomaly:
        try:
            match = sig_matcher.add_anomaly(
                node_id=node_id,
                node_type=reading.get("node_type"),
                signal=signal_key,
                value=value,
                timestamp_ms=ts_ms,
                confidence=result.confidence,
            )
            if match is not None:
                log.info("SIGNATURE MATCH %s → '%s' score=%.2f signals=%s",
                         node_id, match.signature.name, match.match_score, match.matched_signals)
                if producer:
                    sig_event = {
                        "node_id": match.node_id,
                        "node_type": match.node_type,
                        "signature_name": match.signature.name,
                        "match_score": match.match_score,
                        "matched_signals": match.matched_signals,
                        "typical_cause": match.signature.typical_cause,
                        "timestamp_ms": match.timestamp_ms,
                        "method": "signature_match",
                        "description": match.description,
                    }
                    producer.produce(
                        "systemflow.anomalies",
                        key=f"{node_id}:signature:{match.signature.name}".encode(),
                        value=json.dumps(sig_event).encode(),
                    )
        except Exception as exc:
            log.warning("sig_matcher error for %s/%s: %s", node_id, signal_key, exc)

    # Phase 3: saturation prediction (best-effort)
    try:
        sat_pred = sat_module.update(node_id, signal_key, value, ts_ms)
        if sat_pred is not None:
            tts = sat_pred.time_to_saturation_sec
            if tts is not None and 0 <= tts < 1800:
                log.info(
                    "SATURATION WARNING %s/%s tts=%.0fs rate=%.4f/s r2=%.2f",
                    node_id, signal_key, tts, sat_pred.rate_per_second, sat_pred.r_squared,
                )
    except Exception as exc:
        log.warning("sat_module.update error for %s/%s: %s", node_id, signal_key, exc)

    # Phase 3: peer comparison reading ingestion (best-effort)
    if peer_module is not None and node_type:
        try:
            peer_module.add_reading(node_id, node_type, signal_key, value)
        except Exception as exc:
            log.warning("peer_module.add_reading error for %s/%s: %s", node_id, signal_key, exc)

    # Phase 5: feed correlator (best-effort)
    if causal_corr_module is not None:
        try:
            causal_corr_module.add_reading(node_id, signal_key, value, ts_ms)
        except Exception as exc:
            log.warning("causal_corr.add_reading error: %s", exc)

    # Phase 5: if anomaly, trigger causal trace (best-effort)
    if causal_module is not None and result and result.is_anomaly:
        try:
            # We don't have recent_anomalies list here — use empty list for now.
            # Full causal tracing is triggered from the API endpoint by the frontend.
            # This is just a log hint.
            log.debug("Causal trace available for %s/%s — call /causal/trace with recent anomalies",
                      node_id, signal_key)
        except Exception:
            pass


def _run_peer_comparison(producer: Optional[Producer]) -> None:
    """Periodic peer comparison — runs every 300 consumed messages."""
    if peer_module is None:
        return
    try:
        outliers = peer_module.detect_outliers()
        for e in outliers:
            log.info(
                "PEER OUTLIER %s/%s z=%.2f conf=%.2f: %s",
                e.node_id, e.signal, e.z_score, e.confidence, e.description,
            )
            if producer:
                event = {
                    "node_id":    e.node_id,
                    "node_type":  e.node_type,
                    "signal":     e.signal,
                    "value":      e.node_value,
                    "timestamp_ms": int(time.time() * 1000),
                    "method":     "peer_comparison",
                    "confidence": e.confidence,
                    "z_score":    e.z_score,
                    "peer_mean":  e.peer_mean,
                    "peer_stddev": e.peer_stddev,
                    "description": e.description,
                }
                producer.produce(
                    ANOMALIES_TOPIC,
                    key=f"{e.node_id}:{e.signal}".encode(),
                    value=json.dumps(event).encode(),
                )
        if producer and outliers:
            producer.poll(0)
    except Exception as exc:
        log.warning("peer_module.detect_outliers error: %s", exc)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    )
    run(
        brokers=os.getenv("KAFKA_BROKERS", "localhost:9092"),
        group_id=os.getenv("KAFKA_GROUP_ID", "sf-ml-pipeline"),
        dry_run=os.getenv("DRY_RUN", "").lower() in ("1", "true"),
    )
