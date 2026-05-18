"""
Integration tests for baseline engine + anomaly detector.
Run: python -m pytest ml/tests/ -v
"""
import pytest
import time
from ml.baseline.engine import BaselineEngine
from ml.anomaly.detector import AnomalyDetectorRegistry


@pytest.fixture
def eng():
    return BaselineEngine(learning_window_hours=72)


@pytest.fixture
def registry():
    return AnomalyDetectorRegistry()


def test_baseline_accumulates(eng):
    for i in range(20):
        r = eng.ingest("node-1", "cpu_usage", 30.0 + i * 0.1, int(time.time() * 1000) + i * 15000)
    assert r.sample_count == 20
    assert 30.0 <= r.baseline_mean <= 32.0


def test_no_anomaly_on_stable(eng, registry):
    """Stable readings should not trigger anomaly detection."""
    results = []
    for i in range(50):
        r = eng.ingest("pg-01", "disk_iops_saturation", 0.3, int(time.time() * 1000) + i * 15000)
        result = registry.evaluate(r)
        results.append(result)
    # After warmup, stable 0.3 values should not be anomalous
    anomalies = [r for r in results[30:] if r is not None]
    assert len(anomalies) == 0, f"Unexpected anomalies on stable signal: {anomalies}"


def test_zscore_anomaly_on_spike(eng, registry):
    """A sudden spike far from baseline should trigger Z-score gate."""
    # Use fixed epoch at hour midpoint to avoid hour-boundary bucket splits.
    # 1_700_010_000_000 ms = 2023-11-14 ~14:20 UTC (well away from any boundary).
    BASE_TS = 1_700_010_000_000
    for i in range(50):
        eng.ingest("pg-02", "disk_iops_saturation", 0.3, BASE_TS + i * 15_000)
    r = eng.ingest("pg-02", "disk_iops_saturation", 0.95, BASE_TS + 51 * 15_000)
    result = registry.evaluate(r)
    assert result is not None
    assert result.is_anomaly
    assert result.method == "zscore"
    assert result.deviation_zscore > 3.0


def test_rate_of_change_anomaly(eng, registry):
    """Rapidly rising signal should trigger rate_of_change anomaly."""
    ts = int(time.time() * 1000)
    # Establish gentle baseline (slow growth ~1KB/s)
    for i in range(10):
        eng.ingest("redis-01", "ram_used", 1_000_000 + i * 1_000, ts + i * 15_000)
    # Inject rapid growth: +500MB every 15s (huge slope vs baseline).
    # Capture FIRST anomaly — later readings dilute baseline_mean and lower normalized_slope.
    first_anomaly = None
    for i in range(5):
        r = eng.ingest("redis-01", "ram_used",
                       1_010_000 + (i + 1) * 500_000_000,
                       ts + (10 + i) * 15_000)
        candidate = registry.evaluate(r)
        if candidate is not None and first_anomaly is None:
            first_anomaly = candidate

    assert first_anomaly is not None, "Expected anomaly on rapid ram_used growth, got None"
    assert first_anomaly.is_anomaly
    assert first_anomaly.method in ("rate_of_change", "zscore")


def test_per_instance_isolation(eng):
    """Baseline for node-A must not affect node-B."""
    ts = int(time.time() * 1000)
    for i in range(30):
        eng.ingest("node-A", "cpu_usage", 80.0, ts + i * 15000)
        eng.ingest("node-B", "cpu_usage", 10.0, ts + i * 15000)
    r_a = eng.ingest("node-A", "cpu_usage", 80.5, ts + 30 * 15000)
    r_b = eng.ingest("node-B", "cpu_usage", 10.5, ts + 30 * 15000)
    # Both should have their own separate baselines
    assert r_a.baseline_mean > 70.0
    assert r_b.baseline_mean < 20.0


def test_time_bucket_separation(eng):
    """Hour-of-day buckets must accumulate separately."""
    base_ts = 1_700_000_000_000  # fixed epoch for reproducibility
    one_hour_ms = 3_600_000
    # Ingest 10 readings at hour=0, value=50
    for i in range(10):
        eng.ingest("svc-01", "request_rate", 50.0, base_ts + i * 1000)
    # Ingest 10 readings at hour=6, value=200
    for i in range(10):
        eng.ingest("svc-01", "request_rate", 200.0, base_ts + 6 * one_hour_ms + i * 1000)
    # The two buckets should have different means
    import datetime
    dt0 = datetime.datetime.fromtimestamp(base_ts / 1000, tz=datetime.timezone.utc)
    dt6 = datetime.datetime.fromtimestamp((base_ts + 6 * one_hour_ms) / 1000, tz=datetime.timezone.utc)
    key0 = ("svc-01", "request_rate", dt0.hour, dt0.weekday())
    key6 = ("svc-01", "request_rate", dt6.hour, dt6.weekday())
    bucket0 = eng._buckets.get(key0)
    bucket6 = eng._buckets.get(key6)
    assert bucket0 is not None and bucket6 is not None
    assert abs(bucket0.mean - 50.0) < 1.0
    assert abs(bucket6.mean - 200.0) < 1.0
