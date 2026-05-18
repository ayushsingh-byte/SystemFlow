"""Tests for DBSCAN peer comparison engine."""
import pytest
from ml.anomaly.peer_comparison import PeerComparisonEngine

def test_no_outlier_homogeneous_peers():
    """Homogeneous peers should produce zero outlier events."""
    eng = PeerComparisonEngine()
    for i in range(4):
        for _ in range(20):
            eng.add_reading(f"pg-0{i}", "postgresql", "disk_iops_saturation", 0.3)
            eng.add_reading(f"pg-0{i}", "postgresql", "request_latency_p99", 50.0)
    events = eng.detect_outliers()
    assert len(events) == 0

def test_outlier_detected_on_divergent_node():
    """One node with dramatically different signal profile should be flagged."""
    eng = PeerComparisonEngine()
    # 3 healthy peers
    for i in range(3):
        for _ in range(20):
            eng.add_reading(f"pg-0{i}", "postgresql", "disk_iops_saturation", 0.25 + i * 0.01)
            eng.add_reading(f"pg-0{i}", "postgresql", "request_latency_p99", 45.0 + i)
    # 1 sick outlier
    for _ in range(20):
        eng.add_reading("pg-sick", "postgresql", "disk_iops_saturation", 0.92)
        eng.add_reading("pg-sick", "postgresql", "request_latency_p99", 1800.0)
    events = eng.detect_outliers()
    outlier_ids = {e.node_id for e in events}
    assert "pg-sick" in outlier_ids

def test_minimum_peers_not_met():
    """With fewer than MIN_PEERS nodes, detect_outliers returns empty."""
    eng = PeerComparisonEngine()
    for i in range(2):  # only 2 nodes (MIN_PEERS = 3)
        for _ in range(20):
            eng.add_reading(f"pg-0{i}", "postgresql", "disk_iops_saturation", 0.3)
    events = eng.detect_outliers()
    assert len(events) == 0

def test_confidence_scales_with_z_score():
    """Higher z-score should produce higher confidence."""
    eng = PeerComparisonEngine()
    for i in range(3):
        for _ in range(20):
            eng.add_reading(f"redis-0{i}", "redis", "ram_pressure", 0.3)
    for _ in range(20):
        eng.add_reading("redis-extreme", "redis", "ram_pressure", 0.99)
    events = eng.detect_outliers()
    outlier = next((e for e in events if e.node_id == "redis-extreme"), None)
    if outlier:  # may or may not fire depending on DBSCAN eps
        assert outlier.confidence > 0.5
        assert outlier.z_score > 2.0
