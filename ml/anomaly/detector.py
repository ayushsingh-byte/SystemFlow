"""
Anomaly detection — per signal, per node instance.

Two-stage:
  Stage 1 (fast): Z-score gate from baseline engine (no model needed)
  Stage 2 (slow): Isolation Forest (scikit-learn) — retrained every 6h

RULE: Models are per (node_id, signal_name). Never a global model.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
from sklearn.ensemble import IsolationForest

from ml.baseline.engine import BaselineReport


@dataclass
class AnomalyResult:
    node_id: str
    signal: str
    value: float
    timestamp_ms: int
    is_anomaly: bool
    method: str           # "zscore" | "isolation_forest" | "rate_of_change"
    confidence: float     # 0..1
    deviation_zscore: float
    baseline_mean: float
    description: str


class SignalAnomalyDetector:
    """
    Anomaly detector for one (node_id, signal) pair.
    Isolation Forest is retrained when enough samples accumulate.
    """

    MIN_SAMPLES_FOR_TRAINING = 100
    RETRAIN_INTERVAL_SEC = 6 * 3600   # 6 hours

    def __init__(self, node_id: str, signal: str):
        self.node_id = node_id
        self.signal = signal
        self._model: Optional[IsolationForest] = None
        self._model_trained_at: float = 0
        self._training_buffer: List[float] = []

    def evaluate(self, report: BaselineReport) -> Optional[AnomalyResult]:
        """
        Returns AnomalyResult if anomalous, None if normal.
        Always runs Z-score gate first (cheap). IF only if gate passes.
        """
        self._training_buffer.append(report.value)

        # Stage 1: Z-score gate
        if report.is_anomalous_zscore:
            return AnomalyResult(
                node_id=self.node_id,
                signal=self.signal,
                value=report.value,
                timestamp_ms=report.timestamp_ms,
                is_anomaly=True,
                method="zscore",
                confidence=min(0.99, abs(report.deviation_zscore) / 6.0),
                deviation_zscore=report.deviation_zscore,
                baseline_mean=report.baseline_mean,
                description=f"{self.signal} is {report.deviation_zscore:.1f}σ from baseline "
                            f"(value={report.value:.3f}, mean={report.baseline_mean:.3f})",
            )

        # Stage 2: rate_of_change anomaly
        if report.rate_of_change is not None and abs(report.rate_of_change) > 0:
            # Sudden large slope change — flag for causal engine even if absolute value is normal
            # Threshold: slope exceeds 3x the baseline mean per minute
            if report.baseline_mean > 0:
                normalized_slope = abs(report.rate_of_change) * 60 / report.baseline_mean
                if normalized_slope > 3.0:
                    return AnomalyResult(
                        node_id=self.node_id,
                        signal=self.signal,
                        value=report.value,
                        timestamp_ms=report.timestamp_ms,
                        is_anomaly=True,
                        method="rate_of_change",
                        confidence=min(0.85, normalized_slope / 10.0),
                        deviation_zscore=report.deviation_zscore,
                        baseline_mean=report.baseline_mean,
                        description=f"{self.signal} rising at {report.rate_of_change:.3f}/s "
                                    f"({normalized_slope:.1f}x baseline rate)",
                    )

        # Stage 3: Isolation Forest (if model is trained and up to date)
        self._maybe_retrain()
        if self._model is not None:
            score = self._model.decision_function([[report.value]])[0]
            # IF score < 0 = anomaly; more negative = more anomalous
            if score < -0.1:
                confidence = min(0.90, -score)
                return AnomalyResult(
                    node_id=self.node_id,
                    signal=self.signal,
                    value=report.value,
                    timestamp_ms=report.timestamp_ms,
                    is_anomaly=True,
                    method="isolation_forest",
                    confidence=confidence,
                    deviation_zscore=report.deviation_zscore,
                    baseline_mean=report.baseline_mean,
                    description=f"{self.signal} anomalous per Isolation Forest "
                                f"(score={score:.3f}, value={report.value:.3f})",
                )

        return None

    def _maybe_retrain(self) -> None:
        now = time.time()
        if (len(self._training_buffer) >= self.MIN_SAMPLES_FOR_TRAINING and
                now - self._model_trained_at > self.RETRAIN_INTERVAL_SEC):
            X = np.array(self._training_buffer[-5000:]).reshape(-1, 1)
            self._model = IsolationForest(contamination=0.05, random_state=42, n_jobs=1)
            self._model.fit(X)
            self._model_trained_at = now


class AnomalyDetectorRegistry:
    """Manages one SignalAnomalyDetector per (node_id, signal) pair."""

    def __init__(self):
        self._detectors: Dict[Tuple[str, str], SignalAnomalyDetector] = {}

    def evaluate(self, report: BaselineReport) -> Optional[AnomalyResult]:
        key = (report.node_id, report.signal)
        if key not in self._detectors:
            self._detectors[key] = SignalAnomalyDetector(report.node_id, report.signal)
        return self._detectors[key].evaluate(report)
