"""
What-if simulator — Phase 6.

Forward propagation: given a hypothetical signal change on a source node,
walk the causal graph FORWARD using DNA reaction patterns to predict
downstream signal changes within the expected delay windows.

Example:
    "What if pg-01's disk_iops_saturation goes from 0.3 → 0.9?"
    → DB_QUERY callers (app-01, app-02) will see request_latency_p99 spike
    → Within 300ms, p99 predicted to increase from baseline by 'large' magnitude
    → At current traffic rate, estimated 15% error rate increase on app-01

This does NOT require a running system — works entirely from:
  - CausalGraph edges
  - NodeDNA reaction patterns
  - Current baseline values (if available)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from ml.causal.graph import CausalGraph, get_graph
from ml.signatures.library import DNARegistry

log = logging.getLogger("sf.whatif")

MAGNITUDE_MULTIPLIERS = {
    "small":    1.15,   # +15%
    "moderate": 1.40,   # +40%
    "large":    2.00,   # +100% (double)
}

CHANGE_DIRECTIONS = {
    "increase": 1,
    "spike":    1,
    "decrease": -1,
    "drop":     -1,
}


@dataclass
class WhatIfInput:
    """A hypothetical change to simulate."""
    node_id: str
    signal: str
    hypothetical_value: float   # the new value
    current_value: float        # baseline value before the change
    current_baselines: Dict[str, Dict[str, float]] = field(default_factory=dict)
    # current_baselines: { node_id: { signal: baseline_value } }


@dataclass
class PredictedEffect:
    """One predicted downstream effect from a what-if simulation."""
    source_node_id: str         # where the trigger originates
    downstream_node_id: str     # which node will be affected
    edge_type: str              # how they're connected
    affected_signal: str        # which signal changes
    current_baseline: float     # current value of affected_signal (0 if unknown)
    predicted_value: float      # projected value after change
    change_direction: str       # "increase" | "decrease" | "spike" | "drop"
    magnitude: str              # "small" | "moderate" | "large"
    delay_ms: int               # expected delay before effect appears
    confidence: float           # pattern confidence
    description: str
    hop: int                    # how many graph hops from source


@dataclass
class WhatIfResult:
    input: WhatIfInput
    effects: List[PredictedEffect]
    total_affected_nodes: int
    max_propagation_hops: int
    summary: str


class WhatIfSimulator:
    """
    Forward-propagates a hypothetical signal change through the causal graph.
    Uses DNA reaction patterns to predict downstream effects.
    Supports multi-hop propagation (effects cascade to second-order nodes).
    """

    def __init__(
        self,
        graph: Optional[CausalGraph] = None,
        dna_registry: Optional[DNARegistry] = None,
        max_hops: int = 3,
    ):
        self._graph = graph or get_graph()
        self._dna = dna_registry or DNARegistry()
        self._max_hops = max_hops

    def simulate(self, what_if: WhatIfInput, min_confidence: float = 0.3) -> WhatIfResult:
        """
        Simulate the downstream effects of a hypothetical signal change.
        Performs BFS forward from the source node.
        """
        source_node = self._graph.get_node(what_if.node_id)
        if source_node is None:
            return WhatIfResult(
                input=what_if, effects=[], total_affected_nodes=0,
                max_propagation_hops=0, summary=f"Node {what_if.node_id} not in graph.",
            )

        effects: List[PredictedEffect] = []
        visited_pairs = set()

        # BFS queue: (node_id, signal, value, hop)
        queue: List[Tuple[str, str, float, int]] = [
            (what_if.node_id, what_if.signal, what_if.hypothetical_value, 0)
        ]

        while queue:
            current_node_id, trigger_signal, trigger_value, hop = queue.pop(0)
            if hop >= self._max_hops:
                continue

            current_node = self._graph.get_node(current_node_id)
            if current_node is None:
                continue

            dna = self._dna.load(current_node.node_type)
            if not dna:
                continue

            # Find all matching reaction patterns for this trigger
            for pattern in dna.reaction_patterns:
                trig = pattern.get("trigger", {})
                if trig.get("signal") != trigger_signal:
                    continue

                threshold = float(trig.get("value", 0))
                op = trig.get("op", ">")
                if not _eval_op(op, trigger_value, threshold):
                    continue

                pattern_conf = float(pattern.get("confidence", 0.8))
                if pattern_conf < min_confidence:
                    continue

                expected_delay = int(pattern.get("expected_delay_ms", 500))

                # Propagate to all downstream nodes connected by the expected edge type
                for effect_spec in pattern.get("expected_downstream_effects", []):
                    edge_type = effect_spec.get("edge_type", "")
                    affected_signal = effect_spec.get("affected_signal", "")
                    magnitude = effect_spec.get("expected_magnitude", "moderate")
                    direction = effect_spec.get("expected_change", "increase")

                    # Find downstream nodes connected via this edge type
                    outgoing = self._graph.get_downstream(current_node_id)
                    for edge in outgoing:
                        if edge.edge_type != edge_type:
                            continue

                        pair_key = (current_node_id, edge.target, affected_signal, hop)
                        if pair_key in visited_pairs:
                            continue
                        visited_pairs.add(pair_key)

                        # Estimate predicted value
                        baseline = (
                            what_if.current_baselines
                            .get(edge.target, {})
                            .get(affected_signal, 0.0)
                        )
                        multiplier = MAGNITUDE_MULTIPLIERS.get(magnitude, 1.4)
                        dir_sign = CHANGE_DIRECTIONS.get(direction, 1)
                        if baseline > 0:
                            predicted = baseline * (multiplier if dir_sign > 0 else 1 / multiplier)
                        else:
                            predicted = 0.0  # unknown baseline

                        composite_conf = pattern_conf * edge.weight
                        if composite_conf < min_confidence:
                            continue

                        desc = (
                            f"{current_node_id} ({trigger_signal}={trigger_value:.3f} "
                            f"{'exceeds' if dir_sign > 0 else 'drops below'} threshold {threshold}) "
                            f"→ via {edge_type} → {edge.target}/{affected_signal} "
                            f"expected to {direction} ({magnitude}, ~{expected_delay}ms)"
                        )

                        effects.append(PredictedEffect(
                            source_node_id=current_node_id,
                            downstream_node_id=edge.target,
                            edge_type=edge_type,
                            affected_signal=affected_signal,
                            current_baseline=baseline,
                            predicted_value=predicted,
                            change_direction=direction,
                            magnitude=magnitude,
                            delay_ms=expected_delay,
                            confidence=composite_conf,
                            description=desc,
                            hop=hop + 1,
                        ))

                        # Queue second-order propagation
                        queue.append((edge.target, affected_signal, predicted, hop + 1))

        effects.sort(key=lambda e: e.confidence, reverse=True)
        affected_nodes = len({e.downstream_node_id for e in effects})
        max_hop = max((e.hop for e in effects), default=0)

        summary = self._summarize(what_if, effects, affected_nodes)

        return WhatIfResult(
            input=what_if,
            effects=effects,
            total_affected_nodes=affected_nodes,
            max_propagation_hops=max_hop,
            summary=summary,
        )

    def _summarize(self, w: WhatIfInput, effects: List[PredictedEffect], n_nodes: int) -> str:
        if not effects:
            return (
                f"Changing {w.node_id}/{w.signal} from {w.current_value:.3f} "
                f"to {w.hypothetical_value:.3f} has no predicted downstream effects "
                f"based on current graph and DNA patterns."
            )
        top = effects[0]
        return (
            f"Changing {w.node_id}/{w.signal} from {w.current_value:.3f} "
            f"to {w.hypothetical_value:.3f} is predicted to affect {n_nodes} downstream node(s). "
            f"Most significant: {top.downstream_node_id}/{top.affected_signal} "
            f"expected to {top.change_direction} ({top.magnitude}) "
            f"within {top.delay_ms}ms (confidence={top.confidence:.0%})."
        )


def _eval_op(op: str, actual: float, threshold: float) -> bool:
    return {
        ">":  actual > threshold,
        ">=": actual >= threshold,
        "<":  actual < threshold,
        "<=": actual <= threshold,
        "==": actual == threshold,
    }.get(op, False)


# Module-level singleton
_simulator = WhatIfSimulator()


def simulate(
    node_id: str,
    signal: str,
    hypothetical_value: float,
    current_value: float = 0.0,
    current_baselines: Optional[Dict[str, Dict[str, float]]] = None,
    min_confidence: float = 0.3,
) -> WhatIfResult:
    return _simulator.simulate(
        WhatIfInput(
            node_id=node_id,
            signal=signal,
            hypothetical_value=hypothetical_value,
            current_value=current_value,
            current_baselines=current_baselines or {},
        ),
        min_confidence=min_confidence,
    )
