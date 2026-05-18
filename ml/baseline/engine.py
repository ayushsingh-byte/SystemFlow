"""
Per-instance baseline engine.

RULE: One baseline per (node_id, signal_name). Never shared across nodes.
Each baseline is time-aware: separate buckets per hour-of-day and day-of-week.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple


@dataclass
class BaselineBucket:
    """Rolling stats for one (node_id, signal, hour_of_day, day_of_week) bucket."""
    count: int = 0
    mean: float = 0.0
    m2: float = 0.0        # Welford's online variance accumulator
    ewma: float = 0.0      # exponentially weighted moving average
    ewma_alpha: float = 0.1

    def update(self, value: float) -> None:
        self.count += 1
        # Welford online mean + variance
        delta = value - self.mean
        self.mean += delta / self.count
        delta2 = value - self.mean
        self.m2 += delta * delta2
        # EWMA
        if self.count == 1:
            self.ewma = value
        else:
            self.ewma = self.ewma_alpha * value + (1 - self.ewma_alpha) * self.ewma

    @property
    def variance(self) -> float:
        return self.m2 / self.count if self.count > 1 else 0.0

    @property
    def stddev(self) -> float:
        return self.variance ** 0.5

    def deviation(self, value: float) -> float:
        """Z-score: how many stddevs is value from baseline mean."""
        if self.count < 10:
            return 0.0
        # Use a minimum stddev floor (1% of mean, min 0.001) so perfectly
        # stable baselines still produce meaningful Z-scores on spikes.
        effective_stddev = max(self.stddev, abs(self.mean) * 0.01, 0.001)
        return (value - self.mean) / effective_stddev


# Key: (node_id, signal_name, hour_of_day 0-23, day_of_week 0-6)
BucketKey = Tuple[str, str, int, int]


class BaselineEngine:
    """
    Maintains per-instance, time-aware baselines for all signals.
    Thread-safety: single writer assumed (Kafka consumer is sequential per partition).
    """

    def __init__(self, learning_window_hours: int = 72):
        self.learning_window_hours = learning_window_hours
        self._buckets: Dict[BucketKey, BaselineBucket] = defaultdict(BaselineBucket)
        # Recent readings for rate_of_change computation
        self._recent: Dict[Tuple[str, str], deque] = defaultdict(lambda: deque(maxlen=10))

    def ingest(self, node_id: str, signal: str, value: float, timestamp_ms: int) -> "BaselineReport":
        """Process one reading. Returns baseline context for this reading."""
        ts_sec = timestamp_ms / 1000
        import datetime
        dt = datetime.datetime.fromtimestamp(ts_sec, tz=datetime.timezone.utc)
        key = (node_id, signal, dt.hour, dt.weekday())

        bucket = self._buckets[key]
        deviation = bucket.deviation(value)
        bucket.update(value)

        # Rate of change (d/dt) — slope over recent readings
        recent_key = (node_id, signal)
        self._recent[recent_key].append((timestamp_ms, value))
        roc = self._compute_rate_of_change(recent_key)

        return BaselineReport(
            node_id=node_id,
            signal=signal,
            value=value,
            timestamp_ms=timestamp_ms,
            baseline_mean=bucket.mean,
            baseline_stddev=bucket.stddev,
            deviation_zscore=deviation,
            ewma=bucket.ewma,
            rate_of_change=roc,
            sample_count=bucket.count,
        )

    def _compute_rate_of_change(self, key: Tuple[str, str]) -> Optional[float]:
        """Linear slope (units/sec) over the last N readings."""
        pts = list(self._recent[key])
        if len(pts) < 2:
            return None
        t0, v0 = pts[0]
        t1, v1 = pts[-1]
        dt_sec = (t1 - t0) / 1000.0
        if dt_sec == 0:
            return None
        return (v1 - v0) / dt_sec


@dataclass
class BaselineReport:
    node_id: str
    signal: str
    value: float
    timestamp_ms: int
    baseline_mean: float
    baseline_stddev: float
    deviation_zscore: float
    ewma: float
    rate_of_change: Optional[float]
    sample_count: int

    @property
    def is_anomalous_zscore(self) -> bool:
        """Fast gate: flag if >3 standard deviations from baseline mean."""
        return abs(self.deviation_zscore) > 3.0 and self.sample_count >= 30
