"""Tests for time-to-saturation predictor."""
import time
import pytest
from ml.baseline.saturation import SaturationPredictor


def test_no_prediction_on_stable():
    pred = SaturationPredictor()
    ts = int(time.time() * 1000)
    result = None
    for i in range(20):
        result = pred.update("pg-01", "disk_iops_saturation", 0.3, ts + i * 15_000)
    assert result is None  # flat slope → no prediction


def test_predicts_when_trending_up():
    pred = SaturationPredictor()
    ts = int(time.time() * 1000)
    result = None
    for i in range(20):
        value = 0.3 + i * 0.02   # linear: 0.30 → 0.68
        result = pred.update("pg-01", "disk_iops_saturation", value, ts + i * 15_000)
    assert result is not None, "Expected prediction on upward trend"
    assert result.time_to_saturation_sec is not None
    assert result.time_to_saturation_sec > 0
    assert result.rate_per_second > 0
    assert result.r_squared > 0.9


def test_already_saturated_returns_zero():
    pred = SaturationPredictor()
    ts = int(time.time() * 1000)
    # Rising signal that has already crossed threshold
    result = None
    for i in range(20):
        value = 0.5 + i * 0.03   # crosses 0.85 threshold at reading 12
        result = pred.update("redis-01", "ram_pressure", value, ts + i * 15_000)
    # Final value is 0.5 + 19*0.03 = 1.07, well above threshold 0.90
    assert result is not None
    assert result.time_to_saturation_sec == 0.0


def test_unknown_signal_returns_none():
    pred = SaturationPredictor()
    ts = int(time.time() * 1000)
    for i in range(20):
        result = pred.update("nginx-01", "network_latency_p50", 10.0 + i, ts + i * 15_000)
    # network_latency_p50 not in DEFAULT_THRESHOLDS → always None
    assert result is None


def test_poor_fit_skipped():
    """Random noise should not produce a prediction (r² < 0.4)."""
    import random
    random.seed(42)
    pred = SaturationPredictor()
    ts = int(time.time() * 1000)
    result = None
    for i in range(20):
        # Noisy values with no trend
        result = pred.update("svc-01", "cpu_usage", random.uniform(20, 80), ts + i * 15_000)
    # Should not predict on noisy data
    assert result is None


def test_separate_instances_independent():
    """Two SaturationPredictor instances should not share state."""
    pred1 = SaturationPredictor()
    pred2 = SaturationPredictor()
    ts = int(time.time() * 1000)
    for i in range(20):
        pred1.update("node-A", "disk_iops_saturation", 0.3 + i * 0.02, ts + i * 15_000)
    # pred2 has no data — should return None
    result = pred2.update("node-A", "disk_iops_saturation", 0.5, ts + 21 * 15_000)
    assert result is None
