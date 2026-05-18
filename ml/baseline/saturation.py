"""
Time-to-saturation predictor.

For each (node_id, signal) pair, maintains a sliding window of recent readings
and fits a linear regression to project when the signal will cross a saturation threshold.

Emits `time_to_saturation` and `rate_of_change` signals back to the pipeline.
"""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple

import numpy as np


# Signals that have a natural saturation boundary at 1.0 (ratios)
RATIO_SIGNALS = {
    "cpu_usage",           # 0..100 (treated as 0..100%, saturate at 95%)
    "ram_pressure",        # 0..1
    "bandwidth_saturation",
    "connection_pool_saturation",
    "disk_iops_saturation",
    "disk_capacity_used",
    "thread_pool_saturation",
}

# Default saturation thresholds per signal (value at which node is "saturated")
DEFAULT_THRESHOLDS: Dict[str, float] = {
    "cpu_usage":                 90.0,
    "ram_pressure":              0.90,
    "bandwidth_saturation":      0.85,
    "connection_pool_saturation": 0.90,
    "disk_iops_saturation":      0.85,
    "disk_capacity_used":        0.90,
    "thread_pool_saturation":    0.90,
    "ram_used":                  None,   # need capacity info — skip
    "disk_queue_depth":          50.0,
    "request_queue_depth":       500.0,
    "event_loop_lag":            100.0,  # ms
    "gc_pause_time":             50.0,   # ms
}

# Minimum readings before we'll make a prediction
MIN_READINGS = 5
# Sliding window size
WINDOW_SIZE = 20
# Minimum slope (per second) required to bother predicting
MIN_SLOPE = 1e-6


@dataclass
class SaturationPrediction:
    node_id: str
    signal: str
    current_value: float
    threshold: float
    rate_per_second: float      # slope from linear regression
    time_to_saturation_sec: Optional[float]  # None = already saturated or no trend
    r_squared: float            # goodness of fit (0..1)
    timestamp_ms: int


class SaturationPredictor:
    """
    Maintains a sliding window per (node_id, signal) and runs linear regression
    to predict time_to_saturation.
    """

    def __init__(self, window_size: int = WINDOW_SIZE):
        self._windows: Dict[Tuple[str, str], deque] = {}
        self._window_size = window_size

    def update(self, node_id: str, signal: str, value: float, timestamp_ms: int) -> Optional[SaturationPrediction]:
        """
        Add one reading and return a SaturationPrediction if signal is trending toward threshold.
        Returns None if: not enough data, no clear trend, or signal already saturated.
        """
        threshold = DEFAULT_THRESHOLDS.get(signal)
        if threshold is None:
            return None  # no known saturation point for this signal

        key = (node_id, signal)
        if key not in self._windows:
            self._windows[key] = deque(maxlen=self._window_size)
        self._windows[key].append((timestamp_ms, value))

        pts = list(self._windows[key])
        if len(pts) < MIN_READINGS:
            return None

        ts_arr = np.array([p[0] for p in pts], dtype=float) / 1000.0  # convert to seconds
        val_arr = np.array([p[1] for p in pts], dtype=float)

        # Normalise timestamps to avoid floating point issues
        t0 = ts_arr[0]
        ts_norm = ts_arr - t0

        # Linear regression via least squares
        A = np.vstack([ts_norm, np.ones(len(ts_norm))]).T
        result = np.linalg.lstsq(A, val_arr, rcond=None)
        slope, intercept = result[0]

        # Goodness of fit
        predicted = slope * ts_norm + intercept
        ss_res = float(np.sum((val_arr - predicted) ** 2))
        ss_tot = float(np.sum((val_arr - val_arr.mean()) ** 2))
        r_squared = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0

        # Only predict if trend is clearly upward and fit is reasonable
        if slope < MIN_SLOPE or r_squared < 0.4:
            return None

        now_sec = timestamp_ms / 1000.0
        t_now_norm = now_sec - t0
        current_predicted = slope * t_now_norm + intercept

        if current_predicted >= threshold:
            # Already saturated
            return SaturationPrediction(
                node_id=node_id, signal=signal, current_value=value,
                threshold=threshold, rate_per_second=slope,
                time_to_saturation_sec=0.0, r_squared=r_squared,
                timestamp_ms=timestamp_ms,
            )

        # Project: how many seconds until slope * t + intercept = threshold?
        # t = (threshold - current_predicted) / slope
        delta_sec = (threshold - current_predicted) / slope

        return SaturationPrediction(
            node_id=node_id, signal=signal, current_value=value,
            threshold=threshold, rate_per_second=slope,
            time_to_saturation_sec=delta_sec, r_squared=r_squared,
            timestamp_ms=timestamp_ms,
        )

    def get_urgent(self, warn_horizon_sec: float = 1800.0) -> list[SaturationPrediction]:
        """
        Returns all (node_id, signal) pairs predicted to saturate within warn_horizon_sec.
        Useful for proactive alerting.
        """
        urgent = []
        now_ms = int(time.time() * 1000)
        for key, window in self._windows.items():
            if not window:
                continue
            last_ts, last_val = window[-1]
            pred = self.update(key[0], key[1], last_val, last_ts)
            if pred and pred.time_to_saturation_sec is not None:
                if 0 < pred.time_to_saturation_sec <= warn_horizon_sec:
                    urgent.append(pred)
        return sorted(urgent, key=lambda p: p.time_to_saturation_sec or float("inf"))


# Module-level singleton
_predictor = SaturationPredictor()


def update(node_id: str, signal: str, value: float, timestamp_ms: int) -> Optional[SaturationPrediction]:
    return _predictor.update(node_id, signal, value, timestamp_ms)


def get_urgent(warn_horizon_sec: float = 1800.0) -> list[SaturationPrediction]:
    return _predictor.get_urgent(warn_horizon_sec)
