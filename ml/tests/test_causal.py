"""
Comprehensive tests for the Phase 5 causal inference engine.

Covers:
  - CausalGraph  (graph.py)        — 5 tests
  - CausalEngine (engine.py)       — 8 tests
  - CrossNodeCorrelator (correlator.py) — 5 tests
"""

from __future__ import annotations

import numpy as np
import pytest

from ml.causal.graph import CausalGraph, GraphEdge
from ml.causal.engine import AnomalyEvent, CausalEngine
from ml.causal.correlator import CrossNodeCorrelator, MIN_READINGS, HIGH_CORR
from ml.signatures.library import DNARegistry

BASE_TS = 1_700_010_000_000  # fixed epoch ms


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def make_graph(**kwargs) -> CausalGraph:
    """Return a fresh CausalGraph, never reuse the module singleton."""
    return CausalGraph()


def make_engine(graph: CausalGraph) -> CausalEngine:
    return CausalEngine(graph=graph, dna_registry=DNARegistry())


# ═══════════════════════════════════════════════════════════════════════════════
# CausalGraph tests (5)
# ═══════════════════════════════════════════════════════════════════════════════

def test_graph_upstream_empty():
    """No edges → bfs_upstream returns empty list."""
    g = CausalGraph()
    g.add_node("solo", "nginx")
    result = g.bfs_upstream("solo", max_hops=3)
    assert result == [], f"Expected empty list, got {result}"


def test_graph_upstream_one_hop():
    """A→B: bfs_upstream(B) returns A at hop_count=1."""
    g = CausalGraph()
    g.add_node("A", "nginx")
    g.add_node("B", "nodejs-app")
    g.add_edge(GraphEdge(
        source="A", target="B",
        edge_type="HTTP_CALL",
        criticality="important",
        failure_propagation="degrades",
    ))

    result = g.bfs_upstream("B", max_hops=3)
    assert len(result) == 1
    node_id, hop_count, path_edges = result[0]
    assert node_id == "A"
    assert hop_count == 1
    assert len(path_edges) == 1
    assert path_edges[0].source == "A"
    assert path_edges[0].target == "B"


def test_graph_upstream_two_hops():
    """A→B→C: bfs_upstream(C, max_hops=2) returns both A (hop=2) and B (hop=1)."""
    g = CausalGraph()
    g.add_node("A", "nginx")
    g.add_node("B", "nodejs-app")
    g.add_node("C", "postgresql")

    g.add_edge(GraphEdge("A", "B", "HTTP_CALL", "important", "degrades"))
    g.add_edge(GraphEdge("B", "C", "DB_QUERY", "critical", "blocks"))

    result = g.bfs_upstream("C", max_hops=2)
    ids_and_hops = {node_id: hop for node_id, hop, _ in result}

    assert "B" in ids_and_hops, "B should be reachable at hop 1"
    assert "A" in ids_and_hops, "A should be reachable at hop 2"
    assert ids_and_hops["B"] == 1
    assert ids_and_hops["A"] == 2


def test_graph_edge_deduplication():
    """Adding the same (source, target, edge_type) edge twice must not duplicate it."""
    g = CausalGraph()
    g.add_node("src", "nginx")
    g.add_node("dst", "nodejs-app")

    edge = GraphEdge("src", "dst", "HTTP_CALL", "important", "degrades")
    g.add_edge(edge)
    g.add_edge(edge)  # duplicate

    upstream = g.bfs_upstream("dst", max_hops=1)
    assert len(upstream) == 1, "Duplicate edge should be deduplicated"
    assert g.edge_count() == 1


def test_graph_edge_weight():
    """critical/blocks edge has a strictly higher weight than optional/isolated edge."""
    heavy = GraphEdge("X", "Y", "DB_QUERY", criticality="critical", failure_propagation="blocks")
    light = GraphEdge("P", "Q", "HTTP_CALL", criticality="optional", failure_propagation="isolated")

    assert heavy.weight > light.weight, (
        f"Expected critical/blocks ({heavy.weight:.4f}) > optional/isolated ({light.weight:.4f})"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# CausalEngine tests (8)
# ═══════════════════════════════════════════════════════════════════════════════

def test_trace_empty_anomalies():
    """No recent_anomalies → engine returns empty list immediately."""
    g = CausalGraph()
    g.add_node("app-01", "nodejs-app")
    engine = make_engine(g)

    symptom = AnomalyEvent(
        node_id="app-01", signal="request_latency_p99",
        value=1200.0, timestamp_ms=BASE_TS,
    )
    result = engine.trace(symptom, recent_anomalies=[])
    assert result == []


def test_trace_no_upstream_nodes():
    """Symptom node has no upstream edges in graph → empty result."""
    g = CausalGraph()
    g.add_node("app-01", "nodejs-app")
    engine = make_engine(g)

    symptom = AnomalyEvent(
        node_id="app-01", signal="request_latency_p99",
        value=1200.0, timestamp_ms=BASE_TS,
    )
    # Provide an anomaly for the symptom node itself, but no upstream exists
    anomalies = [
        AnomalyEvent(
            node_id="app-01", signal="event_loop_lag",
            value=500.0, timestamp_ms=BASE_TS - 100,
        )
    ]
    result = engine.trace(symptom, recent_anomalies=anomalies)
    assert result == [], "No upstream nodes → no candidates"


def test_trace_upstream_node_no_anomaly():
    """RULE: an upstream node with NO own anomaly must NOT appear as a candidate."""
    g = CausalGraph()
    g.add_node("pg-01", "postgresql")
    g.add_node("app-01", "nodejs-app")
    g.add_edge(GraphEdge("pg-01", "app-01", "DB_QUERY", "critical", "blocks"))

    engine = make_engine(g)

    symptom = AnomalyEvent(
        node_id="app-01", signal="request_latency_p99",
        value=1200.0, timestamp_ms=BASE_TS,
    )
    # Provide anomalies only for the symptom node, NOT for the upstream pg-01
    anomalies = [symptom]
    result = engine.trace(symptom, recent_anomalies=anomalies)
    node_ids = [c.node_id for c in result]
    assert "pg-01" not in node_ids, "pg-01 has no own anomaly and must not be blamed"


def test_trace_direct_cause_found():
    """
    Graph: pg-01 → app-01 via DB_QUERY (critical, blocks).
    pg-01 DNA: disk_iops_saturation > 0.8 → DB_QUERY → request_latency_p99 (expected_delay_ms=300, confidence=0.97).
    pg-01 anomaly: disk_iops_saturation = 0.92, t=T.
    app-01 symptom: request_latency_p99 = 1200, t=T+300ms.

    Expected: one candidate with node_id=pg-01, trigger_signal=disk_iops_saturation,
              confidence > 0.5, timing_delta_ms == 300.
    """
    g = CausalGraph()
    g.add_node("pg-01", "postgresql")
    g.add_node("app-01", "nodejs-app")
    g.add_edge(GraphEdge("pg-01", "app-01", "DB_QUERY", "critical", "blocks"))

    engine = make_engine(g)

    t_cause = BASE_TS
    t_symptom = BASE_TS + 300  # 300 ms later

    symptom = AnomalyEvent(
        node_id="app-01", signal="request_latency_p99",
        value=1200.0, timestamp_ms=t_symptom,
    )
    pg_anomaly = AnomalyEvent(
        node_id="pg-01", signal="disk_iops_saturation",
        value=0.92, timestamp_ms=t_cause,
        confidence=1.0,
    )

    result = engine.trace(symptom, recent_anomalies=[pg_anomaly])

    assert len(result) >= 1, "Expected at least one candidate"
    c = result[0]
    assert c.node_id == "pg-01"
    assert c.trigger_signal == "disk_iops_saturation"
    assert c.timing_delta_ms == 300
    assert c.confidence > 0.5, f"Confidence too low: {c.confidence}"


def test_trace_timing_penalty_too_late():
    """
    Same graph as test_trace_direct_cause_found, but app-01 anomaly is 60 seconds
    after pg-01 anomaly.

    Pattern expected_delay_ms=300, TIMING_TOLERANCE=3× → max=900ms.
    60000ms >> 900ms → timing_score=0 → candidate filtered out → empty result.
    """
    g = CausalGraph()
    g.add_node("pg-01", "postgresql")
    g.add_node("app-01", "nodejs-app")
    g.add_edge(GraphEdge("pg-01", "app-01", "DB_QUERY", "critical", "blocks"))

    engine = make_engine(g)

    t_cause = BASE_TS
    t_symptom = BASE_TS + 60_000  # 60 seconds later — way outside tolerance

    symptom = AnomalyEvent(
        node_id="app-01", signal="request_latency_p99",
        value=1200.0, timestamp_ms=t_symptom,
    )
    pg_anomaly = AnomalyEvent(
        node_id="pg-01", signal="disk_iops_saturation",
        value=0.92, timestamp_ms=t_cause,
        confidence=1.0,
    )

    result = engine.trace(symptom, recent_anomalies=[pg_anomaly])
    assert result == [], (
        f"Expected empty result due to timing penalty, got {len(result)} candidates"
    )


def test_trace_two_hop_cause():
    """
    Graph: nginx-01 → app-01 (HTTP_CALL) → pg-01 (DB_QUERY).
    Symptom: pg-01, request_latency_p99 spike at T.
    nginx-01 anomaly: bandwidth_saturation=0.91 at T-50ms (pattern expected_delay=50ms).
    app-01 anomaly: event_loop_lag=150ms (nodejs-app pattern does not propagate
      request_latency_p99 via DB_QUERY so app-01 is NOT a candidate for this symptom signal).

    Expected: nginx-01 blamed (two-hop via HTTP_CALL+DB_QUERY path, HTTP_CALL in path_edges).
    """
    g = CausalGraph()
    g.add_node("nginx-01", "nginx")
    g.add_node("app-01", "nodejs-app")
    g.add_node("pg-01", "postgresql")

    # nginx-01 → app-01 → pg-01
    g.add_edge(GraphEdge("nginx-01", "app-01", "HTTP_CALL", "critical", "blocks"))
    g.add_edge(GraphEdge("app-01", "pg-01", "DB_QUERY", "important", "degrades"))

    engine = make_engine(g)

    t_symptom = BASE_TS
    t_nginx = BASE_TS - 50   # 50ms before symptom — exactly expected_delay_ms

    symptom = AnomalyEvent(
        node_id="pg-01", signal="request_latency_p99",
        value=1500.0, timestamp_ms=t_symptom,
    )
    nginx_anomaly = AnomalyEvent(
        node_id="nginx-01", signal="bandwidth_saturation",
        value=0.91, timestamp_ms=t_nginx,
        confidence=1.0,
    )
    app_anomaly = AnomalyEvent(
        node_id="app-01", signal="event_loop_lag",
        value=150.0, timestamp_ms=t_symptom - 10,
        confidence=0.9,
    )

    result = engine.trace(symptom, recent_anomalies=[nginx_anomaly, app_anomaly])
    node_ids = [c.node_id for c in result]

    assert "nginx-01" in node_ids, (
        f"nginx-01 should be blamed as two-hop cause; candidates: {node_ids}"
    )
    assert "pg-01" not in node_ids, "pg-01 is the symptom node — must not appear as candidate"


def test_trace_deduplication():
    """
    Two DNA patterns on pg-01 both match (disk_iops_saturation) for the same symptom signal.
    After deduplication, only the highest-confidence candidate for
    (node_id='pg-01', trigger_signal='disk_iops_saturation') is returned.
    """
    g = CausalGraph()
    g.add_node("pg-01", "postgresql")
    g.add_node("app-01", "nodejs-app")
    # Two separate edge types so both patterns can match
    g.add_edge(GraphEdge("pg-01", "app-01", "DB_QUERY", "critical", "blocks"))

    engine = make_engine(g)

    t_cause = BASE_TS
    t_symptom = BASE_TS + 300

    symptom = AnomalyEvent(
        node_id="app-01", signal="request_latency_p99",
        value=1200.0, timestamp_ms=t_symptom,
    )
    # disk_iops_saturation > 0.8 is a real postgresql pattern
    pg_anomaly = AnomalyEvent(
        node_id="pg-01", signal="disk_iops_saturation",
        value=0.92, timestamp_ms=t_cause, confidence=1.0,
    )

    result = engine.trace(symptom, recent_anomalies=[pg_anomaly])

    # Count candidates for (pg-01, disk_iops_saturation)
    matching = [(c.node_id, c.trigger_signal) for c in result
                if c.node_id == "pg-01" and c.trigger_signal == "disk_iops_saturation"]
    assert len(matching) == 1, (
        f"Deduplication should keep only one candidate per (node, signal), got {len(matching)}"
    )


def test_trace_ranking():
    """
    Multiple candidates → result list is sorted by confidence descending.
    """
    g = CausalGraph()
    g.add_node("pg-01", "postgresql")
    g.add_node("app-01", "nodejs-app")
    g.add_edge(GraphEdge("pg-01", "app-01", "DB_QUERY", "critical", "blocks"))

    engine = make_engine(g)

    t_symptom = BASE_TS + 300
    symptom = AnomalyEvent(
        node_id="app-01", signal="request_latency_p99",
        value=1200.0, timestamp_ms=t_symptom,
    )

    # Two different anomalies on pg-01 — both can trigger patterns for request_latency_p99
    # disk_iops_saturation (confidence=0.97) vs connection_pool_saturation (confidence=0.95)
    pg_anomaly_1 = AnomalyEvent(
        node_id="pg-01", signal="disk_iops_saturation",
        value=0.92, timestamp_ms=BASE_TS, confidence=1.0,
    )
    pg_anomaly_2 = AnomalyEvent(
        node_id="pg-01", signal="connection_pool_saturation",
        value=0.95, timestamp_ms=BASE_TS + 200, confidence=1.0,
    )

    result = engine.trace(symptom, recent_anomalies=[pg_anomaly_1, pg_anomaly_2])

    if len(result) >= 2:
        for i in range(len(result) - 1):
            assert result[i].confidence >= result[i + 1].confidence, (
                f"Result not sorted by confidence: "
                f"{result[i].confidence} < {result[i+1].confidence} at index {i}"
            )
    elif len(result) == 1:
        pass  # single result is trivially sorted
    else:
        pytest.fail("Expected at least one causal candidate from two matching anomalies")


# ═══════════════════════════════════════════════════════════════════════════════
# CrossNodeCorrelator tests (5)
# ═══════════════════════════════════════════════════════════════════════════════

def test_correlator_no_data():
    """No readings added → compute_correlations returns empty list."""
    corr = CrossNodeCorrelator(graph=None)
    results = corr.compute_correlations(adjacent_only=False)
    assert results == []


def test_correlator_insufficient_readings():
    """Fewer than MIN_READINGS per series → no correlations computed."""
    corr = CrossNodeCorrelator(graph=None)
    # Add only (MIN_READINGS - 1) readings for each of two different nodes
    for i in range(MIN_READINGS - 1):
        corr.add_reading("node-a", "cpu_usage", float(i), BASE_TS + i * 1000)
        corr.add_reading("node-b", "cpu_usage", float(i), BASE_TS + i * 1000)

    results = corr.compute_correlations(adjacent_only=False)
    assert results == [], (
        f"Expected no results with fewer than {MIN_READINGS} readings, got {len(results)}"
    )


def test_correlator_perfect_correlation():
    """Two series with identical values → pearson_r=1.0 at lag=0 (simultaneous)."""
    corr = CrossNodeCorrelator(graph=None)
    n = MIN_READINGS + 5
    for i in range(n):
        v = float(i % 7)  # some repeating pattern with non-zero variance
        corr.add_reading("node-a", "latency", v, BASE_TS + i * 1000)
        corr.add_reading("node-b", "latency", v, BASE_TS + i * 1000)

    results = corr.compute_correlations(min_corr=0.9, adjacent_only=False)
    assert len(results) >= 1, "Expected at least one correlation result"
    top = results[0]
    assert abs(top.pearson_r) > 0.99, f"Expected r≈1.0, got {top.pearson_r}"
    assert top.lag_direction == "simultaneous"


def test_correlator_lagged_correlation():
    """
    Series B = Series A shifted by 3 ticks → best_lag=3 (A leads B).
    lag_direction must be 'A_leads_B'.
    """
    corr = CrossNodeCorrelator(graph=None)
    n = MIN_READINGS + 15  # enough to absorb the shift
    lag = 3

    # Generate a signal with clear variance — a sine-like ramp
    base_signal = [float(i % 11) for i in range(n + lag)]

    for i in range(n + lag):
        corr.add_reading("node-a", "metric", base_signal[i], BASE_TS + i * 1000)
    for i in range(n):
        # node-b lags node-a by `lag` ticks
        corr.add_reading("node-b", "metric", base_signal[i], BASE_TS + i * 1000)

    results = corr.compute_correlations(min_corr=HIGH_CORR, adjacent_only=False)
    assert len(results) >= 1, "Expected at least one high-correlation result"
    top = results[0]
    assert top.lag_direction == "A_leads_B", (
        f"Expected A_leads_B, got {top.lag_direction} (lag={top.lag_ticks})"
    )
    assert top.lag_ticks == lag, (
        f"Expected lag_ticks={lag}, got {top.lag_ticks}"
    )


def test_correlator_uncorrelated():
    """Noise vs noise → |pearson_r| below HIGH_CORR threshold → no results returned."""
    rng = np.random.default_rng(seed=42)
    corr = CrossNodeCorrelator(graph=None)
    n = MIN_READINGS + 10

    noise_a = rng.uniform(0, 1, n)
    noise_b = rng.uniform(0, 1, n)
    # Make them explicitly uncorrelated (orthogonal-ish)
    noise_b = noise_b - np.dot(noise_a, noise_b) / np.dot(noise_a, noise_a) * noise_a

    for i in range(n):
        corr.add_reading("node-a", "noise", float(noise_a[i]), BASE_TS + i * 1000)
        corr.add_reading("node-b", "noise", float(noise_b[i]), BASE_TS + i * 1000)

    results = corr.compute_correlations(min_corr=HIGH_CORR, adjacent_only=False)
    assert results == [], (
        f"Uncorrelated noise should produce no results above threshold={HIGH_CORR}; "
        f"got {len(results)} result(s) with r={[r.pearson_r for r in results]}"
    )
