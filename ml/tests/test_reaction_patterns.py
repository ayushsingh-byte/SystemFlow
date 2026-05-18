"""
Reaction pattern integration tests — Phase 4.

SPEC REQUIREMENT: For every ReactionPattern in every DNA file, simulate the
trigger → assert the downstream effect is detected.

Total reaction patterns: 18  (nginx:3, postgresql:4, redis:3, nodejs-app:3,
                                docker-container:2, linux-host:3, plus secondary
                                edge effects tested via separate functions).

Each test:
  1. Creates a fresh ReactionPatternEngine fixture.
  2. Registers source node with the correct DNA type.
  3. Registers a downstream node.
  4. Calls register_edge(source, downstream, edge_type).
  5. Fires the trigger via observe_reading (value above threshold).
  6. Seeds one baseline reading on the downstream signal.
  7. Observes an elevated downstream reading (>5% increase relative to baseline).
  8. Asserts matches is non-empty and affected_signal is correct.

NOTE: observe_reading returns (matches, misses). Both are always unpacked.
NOTE: The engine's _detect_change requires len(prev_readings) >= 2.
      We call observe_reading with the baseline value ONCE before the elevated
      reading so the history list has at least two entries at decision time.
"""

import pytest
from ml.signatures.reaction import ReactionPatternEngine
from ml.signatures.library import DNARegistry

BASE_TS = 1_700_010_000_000


@pytest.fixture
def engine():
    """Fresh engine for each test — no shared state."""
    return ReactionPatternEngine(DNARegistry())


# ─────────────────────────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────────────────────────

def _assert_match(matches, affected_signal):
    """Common assertion: at least one match, correct affected signal."""
    assert matches, f"Expected a ReactionPatternMatch for '{affected_signal}' but got none"
    assert any(m.affected_signal == affected_signal for m in matches), (
        f"Expected affected_signal='{affected_signal}', "
        f"got: {[m.affected_signal for m in matches]}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# nginx  (3 reaction patterns)
# ─────────────────────────────────────────────────────────────────────────────

def test_nginx_bandwidth_saturation_causes_request_latency(engine):
    """bandwidth_saturation > 0.85 on nginx → HTTP_CALL → request_latency_p99 increase"""
    engine.register_node("nginx-src", "nginx")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("nginx-src", "app-ds", "HTTP_CALL")

    # Fire trigger
    engine.observe_reading("nginx-src", "bandwidth_saturation", 0.92, BASE_TS)

    # Seed baseline on downstream signal (first reading — populates history)
    engine.observe_reading("app-ds", "request_latency_p99", 100.0, BASE_TS + 10)

    # Elevated reading: 60% increase (classified as "spike" / satisfies "increase" expectation)
    matches, _ = engine.observe_reading("app-ds", "request_latency_p99", 160.0, BASE_TS + 60)
    _assert_match(matches, "request_latency_p99")


def test_nginx_bandwidth_saturation_causes_timeout(engine):
    """bandwidth_saturation > 0.85 on nginx → HTTP_CALL → error_rate_timeout increase"""
    engine.register_node("nginx-src", "nginx")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("nginx-src", "app-ds", "HTTP_CALL")

    engine.observe_reading("nginx-src", "bandwidth_saturation", 0.90, BASE_TS)
    engine.observe_reading("app-ds", "error_rate_timeout", 0.02, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "error_rate_timeout", 0.05, BASE_TS + 60)
    _assert_match(matches, "error_rate_timeout")


def test_nginx_connection_count_causes_error_5xx(engine):
    """connection_count_active > 0.9 on nginx → HTTP_CALL → error_rate_5xx spike"""
    engine.register_node("nginx-src", "nginx")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("nginx-src", "app-ds", "HTTP_CALL")

    engine.observe_reading("nginx-src", "connection_count_active", 0.95, BASE_TS)
    engine.observe_reading("app-ds", "error_rate_5xx", 0.01, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "error_rate_5xx", 0.25, BASE_TS + 110)
    _assert_match(matches, "error_rate_5xx")


def test_nginx_request_queue_depth_causes_latency(engine):
    """request_queue_depth > 100 on nginx → HTTP_CALL → request_latency_p99 increase"""
    engine.register_node("nginx-src", "nginx")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("nginx-src", "app-ds", "HTTP_CALL")

    engine.observe_reading("nginx-src", "request_queue_depth", 150.0, BASE_TS)
    engine.observe_reading("app-ds", "request_latency_p99", 80.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "request_latency_p99", 200.0, BASE_TS + 210)
    _assert_match(matches, "request_latency_p99")


# ─────────────────────────────────────────────────────────────────────────────
# postgresql  (4 reaction patterns)
# ─────────────────────────────────────────────────────────────────────────────

def test_postgresql_disk_iops_saturation_causes_latency(engine):
    """disk_iops_saturation > 0.8 on postgresql → DB_QUERY → request_latency_p99 spike"""
    engine.register_node("pg-src", "postgresql")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("pg-src", "app-ds", "DB_QUERY")

    engine.observe_reading("pg-src", "disk_iops_saturation", 0.85, BASE_TS)
    engine.observe_reading("app-ds", "request_latency_p99", 50.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "request_latency_p99", 800.0, BASE_TS + 310)
    _assert_match(matches, "request_latency_p99")


def test_postgresql_disk_iops_saturation_causes_queue_depth(engine):
    """disk_iops_saturation > 0.8 on postgresql → DB_QUERY → request_queue_depth increase"""
    engine.register_node("pg-src", "postgresql")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("pg-src", "app-ds", "DB_QUERY")

    engine.observe_reading("pg-src", "disk_iops_saturation", 0.88, BASE_TS)
    engine.observe_reading("app-ds", "request_queue_depth", 10.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "request_queue_depth", 80.0, BASE_TS + 310)
    _assert_match(matches, "request_queue_depth")


def test_postgresql_connection_pool_saturation_causes_error_5xx(engine):
    """connection_pool_saturation > 0.9 on postgresql → DB_QUERY → error_rate_5xx spike"""
    engine.register_node("pg-src", "postgresql")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("pg-src", "app-ds", "DB_QUERY")

    engine.observe_reading("pg-src", "connection_pool_saturation", 0.95, BASE_TS)
    engine.observe_reading("app-ds", "error_rate_5xx", 0.01, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "error_rate_5xx", 0.30, BASE_TS + 110)
    _assert_match(matches, "error_rate_5xx")


def test_postgresql_connection_pool_saturation_causes_latency(engine):
    """connection_pool_saturation > 0.9 on postgresql → DB_QUERY → request_latency_p99 increase"""
    engine.register_node("pg-src", "postgresql")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("pg-src", "app-ds", "DB_QUERY")

    engine.observe_reading("pg-src", "connection_pool_saturation", 0.94, BASE_TS)
    engine.observe_reading("app-ds", "request_latency_p99", 40.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "request_latency_p99", 220.0, BASE_TS + 110)
    _assert_match(matches, "request_latency_p99")


def test_postgresql_disk_io_wait_causes_latency(engine):
    """disk_io_wait > 30 on postgresql → DB_QUERY → request_latency_p99 increase"""
    engine.register_node("pg-src", "postgresql")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("pg-src", "app-ds", "DB_QUERY")

    engine.observe_reading("pg-src", "disk_io_wait", 45.0, BASE_TS)
    engine.observe_reading("app-ds", "request_latency_p99", 60.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "request_latency_p99", 180.0, BASE_TS + 510)
    _assert_match(matches, "request_latency_p99")


def test_postgresql_ram_pressure_causes_disk_iops_read(engine):
    """ram_pressure > 0.8 on postgresql → DB_QUERY → disk_iops_read increase"""
    engine.register_node("pg-src", "postgresql")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("pg-src", "app-ds", "DB_QUERY")

    engine.observe_reading("pg-src", "ram_pressure", 0.85, BASE_TS)
    engine.observe_reading("app-ds", "disk_iops_read", 1000.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "disk_iops_read", 4500.0, BASE_TS + 1010)
    _assert_match(matches, "disk_iops_read")


# ─────────────────────────────────────────────────────────────────────────────
# redis  (3 reaction patterns)
# ─────────────────────────────────────────────────────────────────────────────

def test_redis_ram_pressure_causes_latency(engine):
    """ram_pressure > 0.9 on redis → CACHE_LOOKUP → request_latency_p99 spike"""
    engine.register_node("redis-src", "redis")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("redis-src", "app-ds", "CACHE_LOOKUP")

    engine.observe_reading("redis-src", "ram_pressure", 0.93, BASE_TS)
    engine.observe_reading("app-ds", "request_latency_p99", 3.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "request_latency_p99", 50.0, BASE_TS + 60)
    _assert_match(matches, "request_latency_p99")


def test_redis_ram_pressure_causes_error_5xx(engine):
    """ram_pressure > 0.9 on redis → CACHE_LOOKUP → error_rate_5xx increase"""
    engine.register_node("redis-src", "redis")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("redis-src", "app-ds", "CACHE_LOOKUP")

    engine.observe_reading("redis-src", "ram_pressure", 0.95, BASE_TS)
    engine.observe_reading("app-ds", "error_rate_5xx", 0.01, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "error_rate_5xx", 0.08, BASE_TS + 60)
    _assert_match(matches, "error_rate_5xx")


def test_redis_connection_pool_saturation_causes_error_5xx(engine):
    """connection_pool_saturation > 0.95 on redis → CACHE_LOOKUP → error_rate_5xx spike"""
    engine.register_node("redis-src", "redis")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("redis-src", "app-ds", "CACHE_LOOKUP")

    engine.observe_reading("redis-src", "connection_pool_saturation", 0.97, BASE_TS)
    engine.observe_reading("app-ds", "error_rate_5xx", 0.00, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "error_rate_5xx", 0.35, BASE_TS + 20)
    _assert_match(matches, "error_rate_5xx")


def test_redis_bandwidth_saturation_causes_latency(engine):
    """bandwidth_saturation > 0.8 on redis → CACHE_LOOKUP → request_latency_p99 increase"""
    engine.register_node("redis-src", "redis")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("redis-src", "app-ds", "CACHE_LOOKUP")

    engine.observe_reading("redis-src", "bandwidth_saturation", 0.88, BASE_TS)
    engine.observe_reading("app-ds", "request_latency_p99", 4.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "request_latency_p99", 12.0, BASE_TS + 40)
    _assert_match(matches, "request_latency_p99")


# ─────────────────────────────────────────────────────────────────────────────
# nodejs-app  (3 reaction patterns)
# ─────────────────────────────────────────────────────────────────────────────

def test_nodejs_event_loop_lag_causes_latency(engine):
    """event_loop_lag > 100ms on nodejs-app → HTTP_CALL → request_latency_p99 spike"""
    engine.register_node("node-src", "nodejs-app")
    engine.register_node("client-ds", "nginx")
    engine.register_edge("node-src", "client-ds", "HTTP_CALL")

    engine.observe_reading("node-src", "event_loop_lag", 150.0, BASE_TS)
    engine.observe_reading("client-ds", "request_latency_p99", 50.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("client-ds", "request_latency_p99", 500.0, BASE_TS + 10)
    _assert_match(matches, "request_latency_p99")


def test_nodejs_event_loop_lag_causes_timeout(engine):
    """event_loop_lag > 100ms on nodejs-app → HTTP_CALL → error_rate_timeout increase"""
    engine.register_node("node-src", "nodejs-app")
    engine.register_node("client-ds", "nginx")
    engine.register_edge("node-src", "client-ds", "HTTP_CALL")

    engine.observe_reading("node-src", "event_loop_lag", 200.0, BASE_TS)
    engine.observe_reading("client-ds", "error_rate_timeout", 0.01, BASE_TS + 10)
    matches, _ = engine.observe_reading("client-ds", "error_rate_timeout", 0.07, BASE_TS + 10)
    _assert_match(matches, "error_rate_timeout")


def test_nodejs_gc_pause_causes_latency(engine):
    """gc_pause_time > 50ms on nodejs-app → HTTP_CALL → request_latency_p99 spike"""
    engine.register_node("node-src", "nodejs-app")
    engine.register_node("client-ds", "nginx")
    engine.register_edge("node-src", "client-ds", "HTTP_CALL")

    engine.observe_reading("node-src", "gc_pause_time", 80.0, BASE_TS)
    engine.observe_reading("client-ds", "request_latency_p99", 60.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("client-ds", "request_latency_p99", 350.0, BASE_TS + 10)
    _assert_match(matches, "request_latency_p99")


def test_nodejs_gc_pause_causes_timeout(engine):
    """gc_pause_time > 50ms on nodejs-app → HTTP_CALL → error_rate_timeout increase"""
    engine.register_node("node-src", "nodejs-app")
    engine.register_node("client-ds", "nginx")
    engine.register_edge("node-src", "client-ds", "HTTP_CALL")

    engine.observe_reading("node-src", "gc_pause_time", 90.0, BASE_TS)
    engine.observe_reading("client-ds", "error_rate_timeout", 0.01, BASE_TS + 10)
    matches, _ = engine.observe_reading("client-ds", "error_rate_timeout", 0.04, BASE_TS + 10)
    _assert_match(matches, "error_rate_timeout")


def test_nodejs_request_queue_depth_causes_error_5xx(engine):
    """request_queue_depth > 500 on nodejs-app → HTTP_CALL → error_rate_5xx spike"""
    engine.register_node("node-src", "nodejs-app")
    engine.register_node("client-ds", "nginx")
    engine.register_edge("node-src", "client-ds", "HTTP_CALL")

    engine.observe_reading("node-src", "request_queue_depth", 600.0, BASE_TS)
    engine.observe_reading("client-ds", "error_rate_5xx", 0.01, BASE_TS + 10)
    matches, _ = engine.observe_reading("client-ds", "error_rate_5xx", 0.20, BASE_TS + 110)
    _assert_match(matches, "error_rate_5xx")


# ─────────────────────────────────────────────────────────────────────────────
# docker-container  (2 reaction patterns)
# ─────────────────────────────────────────────────────────────────────────────

def test_docker_ram_pressure_causes_error_5xx(engine):
    """ram_pressure > 0.95 on docker-container → HTTP_CALL → error_rate_5xx spike"""
    engine.register_node("docker-src", "docker-container")
    engine.register_node("client-ds", "nginx")
    engine.register_edge("docker-src", "client-ds", "HTTP_CALL")

    engine.observe_reading("docker-src", "ram_pressure", 0.97, BASE_TS)
    engine.observe_reading("client-ds", "error_rate_5xx", 0.01, BASE_TS + 10)
    matches, _ = engine.observe_reading("client-ds", "error_rate_5xx", 0.40, BASE_TS + 10)
    _assert_match(matches, "error_rate_5xx")


def test_docker_cpu_steal_causes_latency(engine):
    """cpu_steal > 0.3 on docker-container → HTTP_CALL → request_latency_p99 increase"""
    engine.register_node("docker-src", "docker-container")
    engine.register_node("client-ds", "nginx")
    engine.register_edge("docker-src", "client-ds", "HTTP_CALL")

    engine.observe_reading("docker-src", "cpu_steal", 0.35, BASE_TS)
    engine.observe_reading("client-ds", "request_latency_p99", 100.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("client-ds", "request_latency_p99", 250.0, BASE_TS + 60)
    _assert_match(matches, "request_latency_p99")


# ─────────────────────────────────────────────────────────────────────────────
# linux-host  (3 reaction patterns)
# ─────────────────────────────────────────────────────────────────────────────

def test_linuxhost_disk_io_wait_causes_disk_latency_read(engine):
    """disk_io_wait > 20 on linux-host → FILE_READ → disk_latency_read increase"""
    engine.register_node("host-src", "linux-host")
    engine.register_node("pg-ds", "postgresql")
    engine.register_edge("host-src", "pg-ds", "FILE_READ")

    engine.observe_reading("host-src", "disk_io_wait", 35.0, BASE_TS)
    engine.observe_reading("pg-ds", "disk_latency_read", 5.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("pg-ds", "disk_latency_read", 40.0, BASE_TS + 510)
    _assert_match(matches, "disk_latency_read")


def test_linuxhost_disk_io_wait_causes_disk_latency_write(engine):
    """disk_io_wait > 20 on linux-host → FILE_WRITE → disk_latency_write increase"""
    engine.register_node("host-src", "linux-host")
    engine.register_node("pg-ds", "postgresql")
    engine.register_edge("host-src", "pg-ds", "FILE_WRITE")

    engine.observe_reading("host-src", "disk_io_wait", 28.0, BASE_TS)
    engine.observe_reading("pg-ds", "disk_latency_write", 8.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("pg-ds", "disk_latency_write", 60.0, BASE_TS + 510)
    _assert_match(matches, "disk_latency_write")


def test_linuxhost_disk_io_wait_causes_db_latency(engine):
    """disk_io_wait > 20 on linux-host → DB_QUERY → request_latency_p99 increase"""
    engine.register_node("host-src", "linux-host")
    engine.register_node("pg-ds", "postgresql")
    engine.register_edge("host-src", "pg-ds", "DB_QUERY")

    engine.observe_reading("host-src", "disk_io_wait", 40.0, BASE_TS)
    engine.observe_reading("pg-ds", "request_latency_p99", 30.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("pg-ds", "request_latency_p99", 500.0, BASE_TS + 510)
    _assert_match(matches, "request_latency_p99")


def test_linuxhost_cpu_steal_causes_latency(engine):
    """cpu_steal > 0.1 on linux-host → HTTP_CALL → request_latency_p99 increase"""
    engine.register_node("host-src", "linux-host")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("host-src", "app-ds", "HTTP_CALL")

    engine.observe_reading("host-src", "cpu_steal", 0.15, BASE_TS)
    engine.observe_reading("app-ds", "request_latency_p99", 80.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "request_latency_p99", 250.0, BASE_TS + 110)
    _assert_match(matches, "request_latency_p99")


def test_linuxhost_bandwidth_saturation_causes_network_latency(engine):
    """bandwidth_saturation > 0.9 on linux-host → HTTP_CALL → network_latency_p99 spike"""
    engine.register_node("host-src", "linux-host")
    engine.register_node("app-ds", "nodejs-app")
    engine.register_edge("host-src", "app-ds", "HTTP_CALL")

    engine.observe_reading("host-src", "bandwidth_saturation", 0.95, BASE_TS)
    engine.observe_reading("app-ds", "network_latency_p99", 10.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("app-ds", "network_latency_p99", 200.0, BASE_TS + 110)
    _assert_match(matches, "network_latency_p99")


def test_linuxhost_bandwidth_saturation_causes_cache_latency(engine):
    """bandwidth_saturation > 0.9 on linux-host → CACHE_LOOKUP → request_latency_p99 increase"""
    engine.register_node("host-src", "linux-host")
    engine.register_node("redis-ds", "redis")
    engine.register_edge("host-src", "redis-ds", "CACHE_LOOKUP")

    engine.observe_reading("host-src", "bandwidth_saturation", 0.93, BASE_TS)
    engine.observe_reading("redis-ds", "request_latency_p99", 2.0, BASE_TS + 10)
    matches, _ = engine.observe_reading("redis-ds", "request_latency_p99", 15.0, BASE_TS + 110)
    _assert_match(matches, "request_latency_p99")
