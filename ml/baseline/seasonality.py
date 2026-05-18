"""
STL seasonality decomposition for time-aware baseline deviation.

Produces `seasonal_baseline_deviation` — how much the current value deviates
from what the seasonal pattern predicts for this time of day/week.

Uses statsmodels STL decomposition (weekly seasonality, 15-min granularity = 672 periods).
Falls back to hour-of-day bucket deviation from the baseline engine if insufficient data.
"""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass
from typing import Dict, Optional, Tuple
import numpy as np

# Target: at least 2 full day cycles before STL is useful
MIN_POINTS_FOR_STL = 200

@dataclass
class SeasonalDeviation:
    node_id: str
    signal: str
    value: float
    expected: float       # seasonally-expected value
    residual: float       # value - expected
    deviation: float      # residual / residual_stddev (similar to Z-score)
    timestamp_ms: int
    method: str           # "stl" | "bucket_fallback"


class SeasonalAnalyzer:
    """
    Maintains a ring buffer of (timestamp_ms, value) per (node_id, signal).
    Runs STL when enough data is available; falls back to bucket mean otherwise.
    """

    def __init__(self, period_points: int = 96):
        """
        period_points: number of readings in one seasonal period.
        Default 96 = 24 hours at 15-min intervals.
        For hourly data, use 24. For 1-min data, use 1440.
        """
        self._period = period_points
        self._buffers: Dict[Tuple[str, str], deque] = {}
        # Fallback: hour-of-day bucket means (same as baseline engine but simpler)
        self._bucket_means: Dict[Tuple[str, str, int], list] = {}

    def update(self, node_id: str, signal: str, value: float, timestamp_ms: int) -> SeasonalDeviation:
        """Add one reading and return the seasonal deviation for it."""
        import datetime
        key = (node_id, signal)
        if key not in self._buffers:
            self._buffers[key] = deque(maxlen=self._period * 4)  # 4 full cycles
        self._buffers[key].append((timestamp_ms, value))

        # Fallback bucket for this hour
        dt = datetime.datetime.fromtimestamp(timestamp_ms / 1000, tz=datetime.timezone.utc)
        bucket_key = (node_id, signal, dt.hour)
        if bucket_key not in self._bucket_means:
            self._bucket_means[bucket_key] = []
        self._bucket_means[bucket_key].append(value)
        if len(self._bucket_means[bucket_key]) > 200:
            self._bucket_means[bucket_key].pop(0)

        pts = list(self._buffers[key])
        if len(pts) >= MIN_POINTS_FOR_STL:
            return self._stl_deviation(node_id, signal, value, timestamp_ms, pts)
        else:
            return self._bucket_deviation(node_id, signal, value, timestamp_ms, bucket_key)

    def _stl_deviation(self, node_id, signal, value, ts_ms, pts) -> SeasonalDeviation:
        try:
            from statsmodels.tsa.seasonal import STL
            values = np.array([p[1] for p in pts], dtype=float)
            stl = STL(values, period=self._period, robust=True)
            result = stl.fit()
            # The residual for the latest point
            residual = float(result.resid[-1])
            expected = float(result.trend[-1] + result.seasonal[-1])
            resid_std = float(np.std(result.resid)) or 1e-6
            deviation = residual / resid_std
            return SeasonalDeviation(
                node_id=node_id, signal=signal, value=value,
                expected=expected, residual=residual,
                deviation=deviation, timestamp_ms=ts_ms, method="stl",
            )
        except Exception:
            # statsmodels not available or STL failed — fall back
            import datetime
            dt = datetime.datetime.fromtimestamp(ts_ms / 1000, tz=datetime.timezone.utc)
            bucket_key = (node_id, signal, dt.hour)
            return self._bucket_deviation(node_id, signal, value, ts_ms, bucket_key)

    def _bucket_deviation(self, node_id, signal, value, ts_ms, bucket_key) -> SeasonalDeviation:
        hist = self._bucket_means.get(bucket_key, [])
        if len(hist) < 5:
            return SeasonalDeviation(
                node_id=node_id, signal=signal, value=value,
                expected=value, residual=0.0, deviation=0.0,
                timestamp_ms=ts_ms, method="bucket_fallback",
            )
        arr = np.array(hist[:-1], dtype=float)  # exclude current reading
        expected = float(arr.mean())
        std = float(arr.std()) or 1e-6
        residual = value - expected
        deviation = residual / std
        return SeasonalDeviation(
            node_id=node_id, signal=signal, value=value,
            expected=expected, residual=residual,
            deviation=deviation, timestamp_ms=ts_ms, method="bucket_fallback",
        )


_analyzer = SeasonalAnalyzer()

def update(node_id: str, signal: str, value: float, timestamp_ms: int) -> SeasonalDeviation:
    return _analyzer.update(node_id, signal, value, timestamp_ms)
