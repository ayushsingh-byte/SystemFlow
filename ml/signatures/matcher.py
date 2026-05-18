"""
Failure signature matcher — Phase 4.

Runs against a sliding window of recent anomaly events per node.
When a set of anomalies matches a known failure signature (score >= threshold),
emits a FailureSignatureMatch event.

Called by the Kafka consumer on every new anomaly event.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from collections import deque
import time

from ml.signatures.library import DNARegistry, FailureSignature

WINDOW_SEC = 300           # 5-minute sliding window
MIN_MATCH_SCORE = 0.60     # minimum signature match score to emit event

@dataclass
class RecentAnomaly:
    node_id: str
    signal: str
    value: float
    timestamp_ms: int
    confidence: float

@dataclass
class FailureSignatureMatch:
    node_id: str
    node_type: str
    signature: FailureSignature    # matched signature object
    match_score: float             # 0..1
    matched_signals: List[str]     # which signals contributed to match
    anomalies: List[RecentAnomaly] # the anomaly events in the window
    timestamp_ms: int
    description: str

class SignatureMatcher:
    """
    Per-node sliding window of recent anomalies.
    On each new anomaly: check all signatures for this node's DNA type.
    """
    def __init__(self, dna_registry: DNARegistry, window_sec: int = WINDOW_SEC):
        self._dna = dna_registry
        self._window_sec = window_sec
        # node_id -> deque of RecentAnomaly (sorted by timestamp)
        self._windows: Dict[str, deque] = {}
        # node_id -> node_type (registered separately)
        self._node_types: Dict[str, str] = {}

    def register_node(self, node_id: str, node_type: str) -> None:
        self._node_types[node_id] = node_type

    def add_anomaly(self, anomaly: RecentAnomaly) -> Optional[FailureSignatureMatch]:
        """
        Add one anomaly to the node's window and check for signature matches.
        Returns a FailureSignatureMatch if a signature is matched, else None.
        """
        node_id = anomaly.node_id
        if node_id not in self._windows:
            self._windows[node_id] = deque()

        self._windows[node_id].append(anomaly)

        # Evict anomalies outside the time window
        cutoff_ms = anomaly.timestamp_ms - self._window_sec * 1000
        while self._windows[node_id] and self._windows[node_id][0].timestamp_ms < cutoff_ms:
            self._windows[node_id].popleft()

        node_type = self._node_types.get(node_id)
        if not node_type:
            return None

        return self._check_signatures(node_id, node_type)

    def _check_signatures(self, node_id: str, node_type: str) -> Optional[FailureSignatureMatch]:
        """Find the best-matching signature for this node's current anomaly window."""
        dna = self._dna.load(node_type)
        if not dna or not dna.failure_signatures:
            return None

        recent = list(self._windows.get(node_id, []))
        if not recent:
            return None

        # Build a list of dicts for match_score (compatible with library.py)
        anomaly_dicts = [{"signal": a.signal, "value": a.value} for a in recent]

        best_sig = None
        best_score = 0.0

        for sig in dna.failure_signatures:
            score = sig.match_score(anomaly_dicts)
            if score > best_score:
                best_score = score
                best_sig = sig

        if best_score < MIN_MATCH_SCORE or best_sig is None:
            return None

        matched_signals = [
            step.signal for step in best_sig.signal_sequence
            if any(a.signal == step.signal for a in recent)
        ]

        return FailureSignatureMatch(
            node_id=node_id,
            node_type=node_type,
            signature=best_sig,
            match_score=best_score,
            matched_signals=matched_signals,
            anomalies=list(recent),
            timestamp_ms=int(time.time() * 1000),
            description=(
                f"{node_id} matches '{best_sig.name}' "
                f"(score={best_score:.2f}, signals={matched_signals}): "
                f"{best_sig.description}"
            ),
        )

    def get_window(self, node_id: str) -> List[RecentAnomaly]:
        return list(self._windows.get(node_id, []))


# Module-level singleton
_registry = DNARegistry()
_matcher = SignatureMatcher(_registry)

def register_node(node_id: str, node_type: str) -> None:
    _matcher.register_node(node_id, node_type)

def add_anomaly(node_id: str, node_type: Optional[str], signal: str, value: float,
                timestamp_ms: int, confidence: float) -> Optional[FailureSignatureMatch]:
    if node_type:
        _matcher.register_node(node_id, node_type)
    anomaly = RecentAnomaly(node_id=node_id, signal=signal, value=value,
                             timestamp_ms=timestamp_ms, confidence=confidence)
    return _matcher.add_anomaly(anomaly)
