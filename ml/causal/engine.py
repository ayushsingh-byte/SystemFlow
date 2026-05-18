"""
Causal inference engine — Phase 5.

Algorithm (backward BFS from symptom):
  1. Start at symptom node S, signal Y
  2. BFS upstream through the causal graph (max 3 hops)
  3. For each upstream node U:
       - Does U have a recent anomaly?
       - Does U's DNA have a reaction pattern triggered by U's anomaly
         that produces Y as a downstream effect on S?
       - Is the timing right? (U's anomaly preceded S's by ≤ 3× expected_delay_ms)
  4. Score each candidate: pattern_confidence × edge_weight × timing_score
  5. Return ranked list

RULE: Never blame a node with no anomaly of its own.
      Symptoms propagate; only nodes with their OWN anomaly can be root causes.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from ml.causal.graph import CausalGraph, CausalNode, GraphEdge, get_graph
from ml.signatures.library import DNARegistry

log = logging.getLogger("sf.causal")

MAX_HOPS = 3
# Maximum ratio of actual_delay / expected_delay before timing penalty kicks in
TIMING_TOLERANCE = 3.0


@dataclass
class AnomalyEvent:
    node_id: str
    signal: str
    value: float
    timestamp_ms: int
    deviation_zscore: float = 0.0
    confidence: float = 0.8


@dataclass
class CausalCandidate:
    """One candidate root cause returned by the engine."""
    node_id: str
    node_type: str
    trigger_signal: str          # the signal on this node that started the chain
    trigger_value: float
    confidence: float            # 0..1 composite score
    propagation_path: List[str]  # [root_node, ..., symptom_node]
    edge_types_traversed: List[str]
    timing_delta_ms: int         # how far upstream anomaly preceded symptom
    expected_delay_ms: int       # from DNA reaction pattern
    pattern_name: str            # which reaction pattern matched
    description: str

    @property
    def is_root_cause(self) -> bool:
        """True if this candidate has no upstream predecessors (it's the origin)."""
        return len(self.propagation_path) == len(set(self.propagation_path))


class CausalEngine:
    """
    Root cause tracer. Requires:
    - A populated CausalGraph (nodes + edges registered)
    - A DNARegistry (to look up reaction patterns)
    - A list of recent AnomalyEvent objects across all nodes
    """

    def __init__(
        self,
        graph: Optional[CausalGraph] = None,
        dna_registry: Optional[DNARegistry] = None,
        max_hops: int = MAX_HOPS,
    ):
        self._graph = graph or get_graph()
        self._dna = dna_registry or DNARegistry()
        self._max_hops = max_hops

    def trace(
        self,
        symptom: AnomalyEvent,
        recent_anomalies: List[AnomalyEvent],
        min_confidence: float = 0.3,
    ) -> List[CausalCandidate]:
        """
        Trace root causes for a symptom anomaly.
        Returns candidates sorted by confidence desc.
        """
        if not recent_anomalies:
            return []

        # Index recent anomalies by node_id for O(1) lookup
        anomaly_index: Dict[str, List[AnomalyEvent]] = {}
        for a in recent_anomalies:
            if a.node_id not in anomaly_index:
                anomaly_index[a.node_id] = []
            anomaly_index[a.node_id].append(a)

        candidates: List[CausalCandidate] = []

        # BFS upstream from symptom node
        upstream_paths = self._graph.bfs_upstream(symptom.node_id, self._max_hops)

        for upstream_node_id, hop_count, path_edges in upstream_paths:
            node = self._graph.get_node(upstream_node_id)
            if node is None:
                continue

            # RULE: skip nodes with no anomaly of their own
            upstream_anomalies = anomaly_index.get(upstream_node_id, [])
            if not upstream_anomalies:
                continue

            # Try to match each upstream anomaly against DNA reaction patterns
            dna = self._dna.load(node.node_type)
            if not dna:
                continue

            for upstream_anomaly in upstream_anomalies:
                for pattern in dna.reaction_patterns:
                    trigger = pattern.get("trigger", {})
                    if trigger.get("signal") != upstream_anomaly.signal:
                        continue

                    # Check trigger threshold
                    threshold = float(trigger.get("value", 0))
                    op = trigger.get("op", ">")
                    if not _eval_op(op, upstream_anomaly.value, threshold):
                        continue

                    # Check if any downstream effect matches the symptom signal
                    matching_effect = None
                    for effect in pattern.get("expected_downstream_effects", []):
                        if effect.get("affected_signal") == symptom.signal:
                            # Also check edge_type matches the path
                            effect_edge_type = effect.get("edge_type", "")
                            path_edge_types = [e.edge_type for e in path_edges]
                            if effect_edge_type in path_edge_types or not path_edges:
                                matching_effect = effect
                                break

                    if matching_effect is None:
                        continue

                    # Timing check
                    timing_delta_ms = symptom.timestamp_ms - upstream_anomaly.timestamp_ms
                    expected_delay = int(pattern.get("expected_delay_ms", 500))

                    if timing_delta_ms < 0:
                        # Upstream anomaly happened AFTER symptom — wrong direction
                        continue

                    timing_score = _timing_score(timing_delta_ms, expected_delay)
                    if timing_score <= 0:
                        continue

                    # Composite confidence
                    pattern_conf = float(pattern.get("confidence", 0.8))
                    edge_weight = _path_weight(path_edges)
                    anomaly_conf = upstream_anomaly.confidence
                    composite = pattern_conf * edge_weight * timing_score * anomaly_conf

                    if composite < min_confidence:
                        continue

                    path_node_ids = [upstream_node_id] + [
                        e.target for e in reversed(path_edges)
                    ]
                    edge_types = [e.edge_type for e in path_edges]

                    description = (
                        f"{upstream_node_id} ({node.node_type}) "
                        f"{upstream_anomaly.signal}={upstream_anomaly.value:.3f} "
                        f"→ reaction pattern '{_pattern_name(pattern)}' "
                        f"→ {symptom.signal} on {symptom.node_id} "
                        f"(Δt={timing_delta_ms}ms, conf={composite:.2f})"
                    )

                    candidates.append(CausalCandidate(
                        node_id=upstream_node_id,
                        node_type=node.node_type,
                        trigger_signal=upstream_anomaly.signal,
                        trigger_value=upstream_anomaly.value,
                        confidence=composite,
                        propagation_path=path_node_ids,
                        edge_types_traversed=edge_types,
                        timing_delta_ms=timing_delta_ms,
                        expected_delay_ms=expected_delay,
                        pattern_name=_pattern_name(pattern),
                        description=description,
                    ))

        # Deduplicate: keep highest-confidence candidate per (node_id, trigger_signal)
        seen: Dict[Tuple[str, str], float] = {}
        unique: List[CausalCandidate] = []
        for c in sorted(candidates, key=lambda x: x.confidence, reverse=True):
            key = (c.node_id, c.trigger_signal)
            if key not in seen:
                seen[key] = c.confidence
                unique.append(c)

        log.info(
            "Causal trace for %s/%s: %d candidates from %d upstream nodes",
            symptom.node_id, symptom.signal, len(unique), len(upstream_paths),
        )
        return unique


# ── Scoring helpers ───────────────────────────────────────────────────────────

def _eval_op(op: str, actual: float, threshold: float) -> bool:
    return {
        ">":  actual > threshold,
        ">=": actual >= threshold,
        "<":  actual < threshold,
        "<=": actual <= threshold,
        "==": actual == threshold,
    }.get(op, False)


def _timing_score(actual_delay_ms: int, expected_delay_ms: int) -> float:
    """
    1.0 if actual ≈ expected, decays toward 0 as ratio grows.
    0.0 if actual_delay > TIMING_TOLERANCE × expected_delay.
    """
    if expected_delay_ms <= 0:
        return 1.0  # pattern says immediate — always accept
    ratio = actual_delay_ms / expected_delay_ms
    if ratio > TIMING_TOLERANCE:
        return 0.0
    # Linear decay: 1.0 at ratio=0, 0.0 at ratio=TIMING_TOLERANCE
    return max(0.0, 1.0 - (ratio - 1.0) / (TIMING_TOLERANCE - 1.0))


def _path_weight(path_edges: List[GraphEdge]) -> float:
    """Product of edge weights along the propagation path. 1.0 for direct connection."""
    if not path_edges:
        return 1.0
    weight = 1.0
    for e in path_edges:
        weight *= e.weight
    return weight


def _pattern_name(pattern: dict) -> str:
    trigger = pattern.get("trigger", {})
    return f"{trigger.get('signal', '?')} {trigger.get('op', '>')} {trigger.get('value', '?')}"


# ── Module-level singleton + convenience API ─────────────────────────────────

_engine = CausalEngine()


def trace(
    symptom_node_id: str,
    symptom_signal: str,
    symptom_value: float,
    symptom_ts_ms: int,
    recent_anomalies: List[AnomalyEvent],
    min_confidence: float = 0.3,
) -> List[CausalCandidate]:
    symptom = AnomalyEvent(
        node_id=symptom_node_id,
        signal=symptom_signal,
        value=symptom_value,
        timestamp_ms=symptom_ts_ms,
    )
    return _engine.trace(symptom, recent_anomalies, min_confidence)


def register_node(node_id: str, node_type: str, family: str = "") -> None:
    from ml.causal.graph import add_node
    add_node(node_id, node_type, family)


def register_edge(
    source: str, target: str, edge_type: str,
    criticality: str = "important",
    failure_propagation: str = "degrades",
    confidence: float = 1.0,
) -> None:
    from ml.causal.graph import add_edge
    add_edge(source, target, edge_type, criticality, failure_propagation, confidence)
