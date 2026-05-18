"""
Reaction pattern detector — Phase 4.

Cross-node: when node A's DNA says 'if disk_iops_saturation > 0.8, then
DB_QUERY callers will see request_latency_p99 increase within 300ms',
this engine checks whether that actually happens.

When confirmed: emits a ReactionPatternMatch (high-confidence causal link).
When expected but NOT observed: emits a ReactionPatternMiss (useful for
discovering new failure modes not yet in the DNA).

Used by the causal engine in Phase 5 to build the causal DAG.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import time

from ml.signatures.library import DNARegistry

@dataclass
class TriggerEvent:
    """A signal on a source node that crossed a reaction pattern trigger threshold."""
    node_id: str
    node_type: str
    signal: str
    value: float
    timestamp_ms: int
    pattern_index: int  # index into dna.reaction_patterns

@dataclass
class ObservedEffect:
    node_id: str
    signal: str
    value: float
    timestamp_ms: int

@dataclass
class ReactionPatternMatch:
    """Confirmed: trigger observed on source, expected effect observed on downstream."""
    trigger: TriggerEvent
    downstream_node_id: str
    edge_type: str
    affected_signal: str
    observed_value: float
    expected_change: str    # "increase" | "decrease" | "spike" | "drop"
    expected_magnitude: str # "small" | "moderate" | "large"
    delay_ms: int           # actual observed delay
    expected_delay_ms: int
    confidence: float
    timestamp_ms: int

@dataclass
class ReactionPatternMiss:
    """Expected effect NOT observed within delay window — may indicate new failure mode."""
    trigger: TriggerEvent
    expected_signal: str
    expected_edge_type: str
    window_ms: int
    timestamp_ms: int


class ReactionPatternEngine:
    """
    Maintains:
    - Active triggers: (source_node_id, pattern_idx) -> TriggerEvent
    - Recent signal readings: (node_id, signal) -> (value, timestamp_ms)

    On each new signal reading:
      1. Check if reading triggers any DNA reaction patterns for this node
      2. Check if reading confirms any pending downstream effects
    """

    def __init__(self, dna_registry: DNARegistry, check_window_sec: int = 30):
        self._dna = dna_registry
        self._check_window_ms = check_window_sec * 1000
        self._node_types: Dict[str, str] = {}
        # Active triggers waiting for downstream confirmation
        # key: (source_node_id, pattern_idx), value: TriggerEvent
        self._pending: Dict[Tuple[str, int], TriggerEvent] = {}
        # Recent readings for downstream effect checking
        # key: (node_id, signal), value: list of (value, ts_ms)
        self._recent_readings: Dict[Tuple[str, str], List[Tuple[float, int]]] = {}
        # Registered graph edges: downstream_node_id -> [(source_node_id, edge_type), ...]
        self._downstream_map: Dict[str, List[Tuple[str, str]]] = {}

    def register_node(self, node_id: str, node_type: str) -> None:
        self._node_types[node_id] = node_type

    def register_edge(self, source_node_id: str, downstream_node_id: str, edge_type: str) -> None:
        """Register that source -> downstream via edge_type (from graph DB)."""
        if downstream_node_id not in self._downstream_map:
            self._downstream_map[downstream_node_id] = []
        self._downstream_map[downstream_node_id].append((source_node_id, edge_type))

    def observe_reading(self, node_id: str, signal: str, value: float,
                        timestamp_ms: int) -> Tuple[List[ReactionPatternMatch], List[ReactionPatternMiss]]:
        """
        Process one new signal reading.
        Returns (matches, misses) from reaction pattern checking.
        """
        # Store reading
        key = (node_id, signal)
        if key not in self._recent_readings:
            self._recent_readings[key] = []
        self._recent_readings[key].append((value, timestamp_ms))
        # Keep last 20 readings per (node, signal)
        if len(self._recent_readings[key]) > 20:
            self._recent_readings[key].pop(0)

        matches: List[ReactionPatternMatch] = []
        misses: List[ReactionPatternMiss] = []

        node_type = self._node_types.get(node_id)

        # Step 1: Check if this reading TRIGGERS any reaction patterns for this node
        if node_type:
            dna = self._dna.load(node_type)
            if dna:
                for i, pattern in enumerate(dna.reaction_patterns):
                    trigger_sig = pattern.get("trigger", {})
                    if trigger_sig.get("signal") != signal:
                        continue
                    threshold = float(trigger_sig.get("value", 0))
                    op = trigger_sig.get("op", ">")
                    triggered = (
                        (op == ">" and value > threshold) or
                        (op == ">=" and value >= threshold) or
                        (op == "<" and value < threshold) or
                        (op == "<=" and value <= threshold)
                    )
                    if triggered:
                        trigger_key = (node_id, i)
                        if trigger_key not in self._pending:
                            self._pending[trigger_key] = TriggerEvent(
                                node_id=node_id, node_type=node_type,
                                signal=signal, value=value,
                                timestamp_ms=timestamp_ms, pattern_index=i,
                            )

        # Step 2: Check if this reading CONFIRMS any pending downstream effects
        upstream_sources = self._downstream_map.get(node_id, [])
        for source_node_id, edge_type in upstream_sources:
            source_type = self._node_types.get(source_node_id)
            if not source_type:
                continue
            dna = self._dna.load(source_type)
            if not dna:
                continue
            for i, pattern in enumerate(dna.reaction_patterns):
                trigger_key = (source_node_id, i)
                if trigger_key not in self._pending:
                    continue
                trigger = self._pending[trigger_key]
                # Evict stale triggers.
                # Use a floor of 30_000 ms so patterns with expected_delay_ms=0
                # (immediate effects) still get a reasonable observation window.
                MIN_WINDOW_MS = 30_000
                max_delay = max(pattern.get("expected_delay_ms", 1000) * 3, MIN_WINDOW_MS)
                if timestamp_ms - trigger.timestamp_ms > max_delay:
                    del self._pending[trigger_key]
                    # Emit miss for each expected effect
                    for effect in pattern.get("expected_downstream_effects", []):
                        if effect.get("edge_type") == edge_type:
                            misses.append(ReactionPatternMiss(
                                trigger=trigger,
                                expected_signal=effect.get("affected_signal", ""),
                                expected_edge_type=edge_type,
                                window_ms=max_delay,
                                timestamp_ms=timestamp_ms,
                            ))
                    continue

                for effect in pattern.get("expected_downstream_effects", []):
                    if (effect.get("edge_type") == edge_type and
                            effect.get("affected_signal") == signal):
                        expected_change = effect.get("expected_change", "increase")
                        prev_readings = self._recent_readings.get((node_id, signal), [])
                        observed_change = self._detect_change(prev_readings, value, expected_change)
                        if observed_change:
                            delay_ms = timestamp_ms - trigger.timestamp_ms
                            matches.append(ReactionPatternMatch(
                                trigger=trigger,
                                downstream_node_id=node_id,
                                edge_type=edge_type,
                                affected_signal=signal,
                                observed_value=value,
                                expected_change=expected_change,
                                expected_magnitude=effect.get("expected_magnitude", "moderate"),
                                delay_ms=delay_ms,
                                expected_delay_ms=pattern.get("expected_delay_ms", 0),
                                confidence=float(pattern.get("confidence", 0.8)),
                                timestamp_ms=timestamp_ms,
                            ))
                            del self._pending[trigger_key]

        return matches, misses

    def _detect_change(
        self,
        prev_readings: List[Tuple[float, int]],
        current_value: float,
        expected_change: str,
    ) -> bool:
        if len(prev_readings) < 2:
            return False
        prev_val = prev_readings[-2][0] if len(prev_readings) >= 2 else prev_readings[0][0]
        delta = current_value - prev_val
        rel_change = abs(delta) / max(abs(prev_val), 1e-6)
        if expected_change in ("increase", "spike"):
            return delta > 0 and rel_change > 0.05  # >5% increase
        elif expected_change in ("decrease", "drop"):
            return delta < 0 and rel_change > 0.05
        return False


# Module-level singleton
_dna = DNARegistry()
_engine = ReactionPatternEngine(_dna)

def register_node(node_id: str, node_type: str) -> None:
    _engine.register_node(node_id, node_type)

def register_edge(source: str, downstream: str, edge_type: str) -> None:
    _engine.register_edge(source, downstream, edge_type)

def observe(node_id: str, signal: str, value: float, timestamp_ms: int):
    return _engine.observe_reading(node_id, signal, value, timestamp_ms)
