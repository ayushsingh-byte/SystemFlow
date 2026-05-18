"""
DBSCAN peer comparison — finds nodes that are statistical outliers among their peers.

Algorithm:
1. Group all nodes that have the same node_type (e.g., all 'postgresql' nodes)
2. For each group with >= 3 members: build a feature vector per node
   (mean value over last N readings for each shared signal)
3. Run DBSCAN on the feature matrix
4. Nodes assigned cluster -1 (noise) are peer outliers
5. Emit PeerOutlierEvent for each outlier node

This requires at least MIN_PEERS nodes of same type before running.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

MIN_PEERS = 3            # minimum same-type nodes before DBSCAN runs
MIN_READINGS_PER_NODE = 10  # minimum readings before a node contributes to clustering

@dataclass
class PeerOutlierEvent:
    node_id: str
    node_type: str
    signal: str           # which signal caused the outlier label
    node_value: float     # this node's value for that signal
    peer_mean: float      # mean across all peers
    peer_stddev: float    # stddev across all peers
    z_score: float        # how far this node is from peer mean
    confidence: float     # 0..1
    description: str

class NodeProfile:
    """Accumulates signal readings for one node, computes a feature vector."""
    def __init__(self, node_id: str, node_type: str, window_size: int = 100):
        self.node_id = node_id
        self.node_type = node_type
        self._readings: Dict[str, list] = {}
        self._window_size = window_size

    def add(self, signal: str, value: float) -> None:
        if signal not in self._readings:
            self._readings[signal] = []
        self._readings[signal].append(value)
        if len(self._readings[signal]) > self._window_size:
            self._readings[signal].pop(0)

    def get_mean(self, signal: str) -> Optional[float]:
        readings = self._readings.get(signal, [])
        if len(readings) < MIN_READINGS_PER_NODE:
            return None
        return float(np.mean(readings[-MIN_READINGS_PER_NODE:]))

    def has_enough_data(self, signals: List[str]) -> bool:
        return all(len(self._readings.get(s, [])) >= MIN_READINGS_PER_NODE for s in signals)


class PeerComparisonEngine:
    """
    Maintains NodeProfile per node, runs DBSCAN clustering per node_type group.
    Call `add_reading()` for each incoming signal reading.
    Call `detect_outliers()` periodically (e.g., every 5 minutes) to get PeerOutlierEvents.
    """
    def __init__(self):
        self._profiles: Dict[str, NodeProfile] = {}  # node_id -> NodeProfile
        self._type_registry: Dict[str, str] = {}     # node_id -> node_type

    def register_node(self, node_id: str, node_type: str) -> None:
        if node_id not in self._profiles:
            self._profiles[node_id] = NodeProfile(node_id, node_type)
            self._type_registry[node_id] = node_type

    def add_reading(self, node_id: str, node_type: str, signal: str, value: float) -> None:
        self.register_node(node_id, node_type)
        self._profiles[node_id].add(signal, value)

    def detect_outliers(self, eps: float = 2.0, min_samples: int = 2) -> List[PeerOutlierEvent]:
        """
        Run DBSCAN on each node_type group. Return PeerOutlierEvents for outlier nodes.
        `eps` is in standardized units (2.0 = 2 standard deviations).
        """
        events = []
        # Group by node_type
        by_type: Dict[str, List[str]] = {}
        for node_id, node_type in self._type_registry.items():
            by_type.setdefault(node_type, []).append(node_id)

        for node_type, node_ids in by_type.items():
            if len(node_ids) < MIN_PEERS:
                continue
            events.extend(self._run_dbscan(node_type, node_ids, eps, min_samples))

        return events

    def _run_dbscan(self, node_type: str, node_ids: List[str], eps: float, min_samples: int) -> List[PeerOutlierEvent]:
        # Find common signals (present in ALL nodes of this type)
        # Use the signals that all nodes have at least MIN_READINGS_PER_NODE for
        all_signals_per_node = [
            set(s for s, v in self._profiles[nid]._readings.items() if len(v) >= MIN_READINGS_PER_NODE)
            for nid in node_ids
        ]
        if not all_signals_per_node:
            return []
        common_signals = sorted(set.intersection(*all_signals_per_node))
        if not common_signals:
            return []

        # Filter to nodes that have enough data for all common signals
        eligible = [nid for nid in node_ids if self._profiles[nid].has_enough_data(common_signals)]
        if len(eligible) < MIN_PEERS:
            return []

        # Build feature matrix (rows=nodes, cols=signals)
        X = []
        for nid in eligible:
            row = [self._profiles[nid].get_mean(sig) or 0.0 for sig in common_signals]
            X.append(row)

        X_arr = np.array(X, dtype=float)

        # Standardize
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_arr)

        # DBSCAN
        db = DBSCAN(eps=eps, min_samples=min_samples, metric='euclidean')
        labels = db.fit_predict(X_scaled)

        events = []
        # Compute per-signal peer stats for explanation
        for i, (nid, label) in enumerate(zip(eligible, labels)):
            if label != -1:
                continue  # not an outlier

            # Find the signal this node is most deviant on
            peer_indices = [j for j in range(len(eligible)) if labels[j] != -1]
            if not peer_indices:
                peer_indices = list(range(len(eligible)))

            worst_signal = common_signals[0]
            worst_z = 0.0
            for j, sig in enumerate(common_signals):
                peer_vals = [X_arr[pi][j] for pi in peer_indices if pi != i]
                if not peer_vals:
                    continue
                peer_mean = float(np.mean(peer_vals))
                peer_std = float(np.std(peer_vals)) or 1e-6
                z = abs(X_arr[i][j] - peer_mean) / peer_std
                if z > worst_z:
                    worst_z = z
                    worst_signal = sig

            sig_idx = common_signals.index(worst_signal)
            peer_vals = [X_arr[pi][sig_idx] for pi in peer_indices if pi != i]
            peer_mean = float(np.mean(peer_vals)) if peer_vals else 0.0
            peer_std  = float(np.std(peer_vals))  if peer_vals else 1.0

            events.append(PeerOutlierEvent(
                node_id=nid,
                node_type=node_type,
                signal=worst_signal,
                node_value=X_arr[i][sig_idx],
                peer_mean=peer_mean,
                peer_stddev=peer_std,
                z_score=worst_z,
                confidence=min(0.95, worst_z / 5.0),
                description=(
                    f"{nid} is peer outlier among {len(eligible)} {node_type} nodes: "
                    f"{worst_signal}={X_arr[i][sig_idx]:.3f} vs peer mean {peer_mean:.3f} (z={worst_z:.1f})"
                ),
            ))

        return events


# Module-level singleton
_engine = PeerComparisonEngine()

def add_reading(node_id: str, node_type: str, signal: str, value: float) -> None:
    _engine.add_reading(node_id, node_type, signal, value)

def detect_outliers() -> List[PeerOutlierEvent]:
    return _engine.detect_outliers()

def register_node(node_id: str, node_type: str) -> None:
    _engine.register_node(node_id, node_type)
