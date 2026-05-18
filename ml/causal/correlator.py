"""
Cross-node temporal correlation engine — Phase 5.

Finds pairs of (node_A, signal_X) and (node_B, signal_Y) that are strongly
correlated across time, where node_A and node_B are adjacent in the causal graph.

High cross-node correlation on adjacent nodes + temporal lag = candidate causal link.
Used to discover causal relationships not yet in DNA reaction patterns.
"""

from __future__ import annotations

import logging
from collections import deque
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np

log = logging.getLogger("sf.correlator")

WINDOW_SIZE   = 60     # readings in correlation window
MIN_READINGS  = 20     # minimum before computing correlation
HIGH_CORR     = 0.75   # threshold to flag as correlated
MAX_LAG_TICKS = 10     # maximum lag in ticks (ticks × interval = max causal delay)


@dataclass
class CorrelationResult:
    node_a: str
    signal_a: str
    node_b: str
    signal_b: str
    pearson_r: float
    lag_ticks: int          # positive = A leads B (A is likely cause)
    lag_direction: str      # "A_leads_B" | "B_leads_A" | "simultaneous"
    confidence: float       # abs(pearson_r) normalized
    is_adjacent: bool       # True if nodes share a graph edge
    description: str


class CrossNodeCorrelator:
    """
    Maintains sliding windows of signal readings per (node_id, signal).
    Periodically computes pairwise Pearson correlation with lag sweep
    for all pairs that share a graph edge.
    """

    def __init__(self, graph=None, window_size: int = WINDOW_SIZE):
        self._window_size = window_size
        self._graph = graph  # CausalGraph or None
        # (node_id, signal) → deque of (timestamp_ms, value)
        self._series: Dict[Tuple[str, str], deque] = {}

    def add_reading(self, node_id: str, signal: str, value: float, timestamp_ms: int) -> None:
        key = (node_id, signal)
        if key not in self._series:
            self._series[key] = deque(maxlen=self._window_size)
        self._series[key].append((timestamp_ms, value))

    def compute_correlations(
        self,
        min_corr: float = HIGH_CORR,
        adjacent_only: bool = True,
    ) -> List[CorrelationResult]:
        """
        Compute pairwise correlations with lag sweep.
        If adjacent_only=True, only considers node pairs connected in the graph.
        Returns results with |pearson_r| >= min_corr.
        """
        results = []
        keys = list(self._series.keys())

        for i in range(len(keys)):
            for j in range(i + 1, len(keys)):
                node_a, sig_a = keys[i]
                node_b, sig_b = keys[j]

                if node_a == node_b:
                    continue  # same node, not cross-node

                # Check adjacency
                is_adjacent = self._are_adjacent(node_a, node_b)
                if adjacent_only and not is_adjacent:
                    continue

                result = self._correlate(node_a, sig_a, node_b, sig_b, is_adjacent, min_corr)
                if result is not None:
                    results.append(result)

        return sorted(results, key=lambda r: abs(r.pearson_r), reverse=True)

    def _are_adjacent(self, node_a: str, node_b: str) -> bool:
        if self._graph is None:
            return True  # no graph → assume all pairs are candidates
        edges_a = self._graph.get_downstream(node_a)
        for e in edges_a:
            if e.target == node_b:
                return True
        edges_b = self._graph.get_downstream(node_b)
        for e in edges_b:
            if e.target == node_a:
                return True
        return False

    def _correlate(
        self,
        node_a: str, sig_a: str,
        node_b: str, sig_b: str,
        is_adjacent: bool,
        min_corr: float,
    ) -> Optional[CorrelationResult]:
        series_a = list(self._series.get((node_a, sig_a), []))
        series_b = list(self._series.get((node_b, sig_b), []))

        if len(series_a) < MIN_READINGS or len(series_b) < MIN_READINGS:
            return None

        vals_a = np.array([v for _, v in series_a], dtype=float)
        vals_b = np.array([v for _, v in series_b], dtype=float)

        # Align to same length
        n = min(len(vals_a), len(vals_b))
        vals_a = vals_a[-n:]
        vals_b = vals_b[-n:]

        # Sweep lag: compute Pearson r at each lag
        best_r = 0.0
        best_lag = 0

        for lag in range(-MAX_LAG_TICKS, MAX_LAG_TICKS + 1):
            if lag == 0:
                a_slice, b_slice = vals_a, vals_b
            elif lag > 0:
                # A leads B by `lag` ticks
                a_slice = vals_a[:n - lag]
                b_slice = vals_b[lag:]
            else:
                # B leads A
                a_slice = vals_a[-lag:]
                b_slice = vals_b[:n + lag]

            if len(a_slice) < MIN_READINGS:
                continue

            r = self._pearson(a_slice, b_slice)
            if abs(r) > abs(best_r):
                best_r = r
                best_lag = lag

        if abs(best_r) < min_corr:
            return None

        if best_lag > 0:
            lag_dir = "A_leads_B"
        elif best_lag < 0:
            lag_dir = "B_leads_A"
        else:
            lag_dir = "simultaneous"

        description = (
            f"({node_a}/{sig_a}) ↔ ({node_b}/{sig_b}): "
            f"r={best_r:.3f} lag={best_lag} ticks ({lag_dir})"
        )

        return CorrelationResult(
            node_a=node_a, signal_a=sig_a,
            node_b=node_b, signal_b=sig_b,
            pearson_r=best_r,
            lag_ticks=best_lag,
            lag_direction=lag_dir,
            confidence=abs(best_r),
            is_adjacent=is_adjacent,
            description=description,
        )

    @staticmethod
    def _pearson(a: np.ndarray, b: np.ndarray) -> float:
        if len(a) != len(b) or len(a) == 0:
            return 0.0
        std_a = float(np.std(a))
        std_b = float(np.std(b))
        if std_a == 0 or std_b == 0:
            return 0.0
        return float(np.corrcoef(a, b)[0, 1])


# Module-level singleton
_correlator = CrossNodeCorrelator()


def add_reading(node_id: str, signal: str, value: float, timestamp_ms: int) -> None:
    _correlator.add_reading(node_id, signal, value, timestamp_ms)


def compute() -> List[CorrelationResult]:
    return _correlator.compute_correlations()


def set_graph(graph) -> None:
    _correlator._graph = graph
