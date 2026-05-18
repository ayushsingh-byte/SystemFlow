"""
Signature matcher tests — Phase 4.

Each test covers one failure signature from one DNA file.
Simulates the signal_sequence anomalies for a signature and asserts the matcher fires.

Total: 17 tests across 6 node types.
"""

import pytest
import time
from ml.signatures.matcher import SignatureMatcher, RecentAnomaly
from ml.signatures.library import DNARegistry

BASE_TS = 1_700_010_000_000  # fixed epoch ms  (2023-11-14 ~14:20 UTC)


@pytest.fixture
def matcher():
    return SignatureMatcher(DNARegistry())


# ─────────────────────────────────────────────────────────────────────────────
# nginx  (3 signatures)
# ─────────────────────────────────────────────────────────────────────────────

def test_nginx_connection_exhaustion(matcher):
    """Simulates connection_exhaustion: connection_count_active + error_rate_5xx + request_latency_p99"""
    matcher.register_node("nginx-test", "nginx")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("connection_count_active", 0.93),
        ("error_rate_5xx",          0.12),
        ("request_latency_p99",     850.0),
    ]:
        anomaly = RecentAnomaly(
            node_id="nginx-test", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.9,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "connection_exhaustion signature should match"
    assert result.signature.name == "connection_exhaustion"
    assert result.match_score >= 0.6


def test_nginx_bandwidth_flood(matcher):
    """Simulates bandwidth_flood: bandwidth_saturation + network_latency_p99 + error_rate_timeout"""
    matcher.register_node("nginx-bw", "nginx")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("bandwidth_saturation",  0.91),
        ("network_latency_p99",   500.0),
        ("error_rate_timeout",    0.08),
    ]:
        anomaly = RecentAnomaly(
            node_id="nginx-bw", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.9,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "bandwidth_flood signature should match"
    assert result.signature.name == "bandwidth_flood"
    assert result.match_score >= 0.6


def test_nginx_upstream_backend_timeout(matcher):
    """Simulates upstream_backend_timeout: connection_count_waiting + request_queue_depth + error_rate_timeout"""
    matcher.register_node("nginx-upstream", "nginx")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("connection_count_waiting", 150.0),
        ("request_queue_depth",      120.0),
        ("error_rate_timeout",       0.05),
    ]:
        anomaly = RecentAnomaly(
            node_id="nginx-upstream", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.85,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "upstream_backend_timeout signature should match"
    assert result.signature.name == "upstream_backend_timeout"
    assert result.match_score >= 0.6


# ─────────────────────────────────────────────────────────────────────────────
# postgresql  (3 signatures)
# ─────────────────────────────────────────────────────────────────────────────

def test_postgresql_disk_thrash(matcher):
    """Simulates disk_thrash: disk_iops_saturation + disk_queue_depth + request_latency_p99"""
    matcher.register_node("pg-test", "postgresql")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("disk_iops_saturation", 0.92),
        ("disk_queue_depth",     15.0),
        ("request_latency_p99",  1200.0),
    ]:
        anomaly = RecentAnomaly(
            node_id="pg-test", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.9,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "disk_thrash signature should match"
    assert result.signature.name == "disk_thrash"
    assert result.match_score >= 0.6


def test_postgresql_connection_exhaustion(matcher):
    """Simulates connection_exhaustion: connection_pool_saturation + error_rate_5xx"""
    matcher.register_node("pg-conn", "postgresql")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("connection_pool_saturation", 0.97),
        ("error_rate_5xx",             0.15),
    ]:
        anomaly = RecentAnomaly(
            node_id="pg-conn", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.95,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "postgresql connection_exhaustion signature should match"
    assert result.signature.name == "connection_exhaustion"
    assert result.match_score >= 0.6


def test_postgresql_oom_page_cache_collapse(matcher):
    """Simulates oom_page_cache_collapse: ram_pressure + swap_usage + disk_iops_read"""
    matcher.register_node("pg-oom", "postgresql")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("ram_pressure",    0.93),
        ("swap_usage",      0.40),
        ("disk_iops_read",  9500.0),
    ]:
        anomaly = RecentAnomaly(
            node_id="pg-oom", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.88,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "oom_page_cache_collapse signature should match"
    assert result.signature.name == "oom_page_cache_collapse"
    assert result.match_score >= 0.6


# ─────────────────────────────────────────────────────────────────────────────
# redis  (3 signatures)
# ─────────────────────────────────────────────────────────────────────────────

def test_redis_memory_eviction_cascade(matcher):
    """Simulates memory_eviction_cascade: ram_used + ram_pressure + request_latency_p99"""
    matcher.register_node("redis-evict", "redis")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("ram_used",            0.97),
        ("ram_pressure",        0.95),
        ("request_latency_p99", 12.0),
    ]:
        anomaly = RecentAnomaly(
            node_id="redis-evict", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.95,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "memory_eviction_cascade signature should match"
    assert result.signature.name == "memory_eviction_cascade"
    assert result.match_score >= 0.6


def test_redis_connection_flood(matcher):
    """Simulates connection_flood: connection_count_active + error_rate_5xx"""
    matcher.register_node("redis-flood", "redis")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("connection_count_active", 0.97),
        ("error_rate_5xx",          0.20),
    ]:
        anomaly = RecentAnomaly(
            node_id="redis-flood", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.92,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "connection_flood signature should match"
    assert result.signature.name == "connection_flood"
    assert result.match_score >= 0.6


def test_redis_big_key_network_saturation(matcher):
    """Simulates big_key_network_saturation: bandwidth_saturation + request_latency_p99"""
    matcher.register_node("redis-bigkey", "redis")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("bandwidth_saturation",  0.87),
        ("request_latency_p99",   18.0),
    ]:
        anomaly = RecentAnomaly(
            node_id="redis-bigkey", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.85,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "big_key_network_saturation signature should match"
    assert result.signature.name == "big_key_network_saturation"
    assert result.match_score >= 0.6


# ─────────────────────────────────────────────────────────────────────────────
# nodejs-app  (3 signatures)
# ─────────────────────────────────────────────────────────────────────────────

def test_nodejs_event_loop_freeze(matcher):
    """Simulates event_loop_freeze: event_loop_lag + request_queue_depth + request_latency_p99"""
    matcher.register_node("node-freeze", "nodejs-app")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("event_loop_lag",      600.0),
        ("request_queue_depth", 250.0),
        ("request_latency_p99", 3000.0),
    ]:
        anomaly = RecentAnomaly(
            node_id="node-freeze", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.97,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "event_loop_freeze signature should match"
    assert result.signature.name == "event_loop_freeze"
    assert result.match_score >= 0.6


def test_nodejs_gc_storm(matcher):
    """Simulates gc_storm: gc_pause_time + ram_used + event_loop_lag"""
    matcher.register_node("node-gc", "nodejs-app")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("gc_pause_time",   85.0),
        ("ram_used",        0.88),
        ("event_loop_lag",  200.0),
    ]:
        anomaly = RecentAnomaly(
            node_id="node-gc", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.90,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "gc_storm signature should match"
    assert result.signature.name == "gc_storm"
    assert result.match_score >= 0.6


def test_nodejs_connection_pool_exhaustion(matcher):
    """Simulates connection_pool_exhaustion: connection_pool_saturation + error_rate_5xx"""
    matcher.register_node("node-pool", "nodejs-app")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("connection_pool_saturation", 0.97),
        ("error_rate_5xx",             0.18),
    ]:
        anomaly = RecentAnomaly(
            node_id="node-pool", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.88,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "connection_pool_exhaustion signature should match"
    assert result.signature.name == "connection_pool_exhaustion"
    assert result.match_score >= 0.6


# ─────────────────────────────────────────────────────────────────────────────
# docker-container  (2 signatures)
# ─────────────────────────────────────────────────────────────────────────────

def test_docker_oom_kill(matcher):
    """Simulates oom_kill: ram_pressure + ram_used + error_rate_5xx"""
    matcher.register_node("docker-oom", "docker-container")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("ram_pressure",  0.97),
        ("ram_used",      0.99),
        ("error_rate_5xx", 0.25),
    ]:
        anomaly = RecentAnomaly(
            node_id="docker-oom", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.95,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "oom_kill signature should match"
    assert result.signature.name == "oom_kill"
    assert result.match_score >= 0.6


def test_docker_cpu_throttle(matcher):
    """Simulates cpu_throttle: cpu_steal + request_latency_p99"""
    matcher.register_node("docker-cpu", "docker-container")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("cpu_steal",          0.30),
        ("request_latency_p99", 480.0),
    ]:
        anomaly = RecentAnomaly(
            node_id="docker-cpu", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.88,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "cpu_throttle signature should match"
    assert result.signature.name == "cpu_throttle"
    assert result.match_score >= 0.6


# ─────────────────────────────────────────────────────────────────────────────
# linux-host  (3 signatures)
# ─────────────────────────────────────────────────────────────────────────────

def test_linuxhost_io_saturation(matcher):
    """Simulates io_saturation: disk_iops_saturation + disk_queue_depth + disk_io_wait"""
    matcher.register_node("host-io", "linux-host")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("disk_iops_saturation", 0.93),
        ("disk_queue_depth",     22.0),
        ("disk_io_wait",         45.0),
    ]:
        anomaly = RecentAnomaly(
            node_id="host-io", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.92,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "io_saturation signature should match"
    assert result.signature.name == "io_saturation"
    assert result.match_score >= 0.6


def test_linuxhost_vm_cpu_steal_noisy_neighbor(matcher):
    """Simulates vm_cpu_steal_noisy_neighbor: cpu_steal + load_avg_1 + request_latency_p99"""
    matcher.register_node("host-steal", "linux-host")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("cpu_steal",          0.18),
        ("load_avg_1",         7.5),
        ("request_latency_p99", 320.0),
    ]:
        anomaly = RecentAnomaly(
            node_id="host-steal", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.85,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "vm_cpu_steal_noisy_neighbor signature should match"
    assert result.signature.name == "vm_cpu_steal_noisy_neighbor"
    assert result.match_score >= 0.6


def test_linuxhost_oom_pressure_kill(matcher):
    """Simulates oom_pressure_kill: ram_pressure + swap_usage"""
    matcher.register_node("host-oom", "linux-host")
    ts = BASE_TS
    result = None
    for sig, val in [
        ("ram_pressure", 0.97),
        ("swap_usage",   0.55),
    ]:
        anomaly = RecentAnomaly(
            node_id="host-oom", signal=sig, value=val,
            timestamp_ms=ts, confidence=0.93,
        )
        ts += 1000
        result = matcher.add_anomaly(anomaly)

    assert result is not None, "oom_pressure_kill signature should match"
    assert result.signature.name == "oom_pressure_kill"
    assert result.match_score >= 0.6
