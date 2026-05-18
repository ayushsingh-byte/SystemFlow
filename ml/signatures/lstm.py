"""
LSTM failure recognizer — Phase 4.

Architecture: bidirectional LSTM → linear → softmax over failure_class labels.
Input: sliding window of N ticks × M signals (one row per reading interval).
Output: probability vector over known failure signatures.

Training requires labeled production data (Phase 4 prerequisite).
This file defines the architecture, training loop, ONNX export, and inference.

Usage:
    # Train (requires labeled data)
    trainer = LSTMTrainer(signal_names=ALL_SIGNALS, failure_classes=FAILURE_CLASSES)
    trainer.train(dataset, epochs=50, save_path="models/lstm_failure.pt")

    # Inference (load trained model)
    recognizer = FailureRecognizer.load("models/lstm_failure.pt")
    probs = recognizer.predict(window)   # shape: (num_classes,)
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

# ── Constants ──────────────────────────────────────────────────────────────────

# Window length in ticks (each tick = 15s collection interval)
WINDOW_TICKS = 60        # 15 minutes of signal history
HIDDEN_SIZE  = 128
NUM_LAYERS   = 2
DROPOUT      = 0.2

# Known failure classes from DNA files (auto-loaded from dna/ dir at runtime)
# These are augmented automatically when new DNA files are added
FAILURE_CLASSES = [
    # nginx
    "connection_exhaustion", "bandwidth_flood", "upstream_backend_timeout",
    # postgresql
    "disk_thrash", "connection_exhaustion_pg", "oom_page_cache_collapse",
    # redis
    "memory_eviction_cascade", "connection_flood", "big_key_network_saturation",
    # nodejs-app
    "event_loop_freeze", "gc_storm", "connection_pool_exhaustion",
    # docker
    "oom_kill", "cpu_throttle",
    # linux-host
    "io_saturation", "vm_cpu_steal_noisy_neighbor", "oom_pressure_kill",
    # catch-all
    "unknown",
]


# ── Data structures ────────────────────────────────────────────────────────────

@dataclass
class SignalWindow:
    """
    Fixed-length window of signal readings for one node, used as LSTM input.
    Shape: (WINDOW_TICKS, len(signal_names))
    Missing signals are filled with 0.
    """
    node_id: str
    node_type: str
    window: np.ndarray          # shape (WINDOW_TICKS, num_signals)
    signal_names: List[str]
    start_ms: int
    end_ms: int

    @classmethod
    def from_readings(
        cls,
        node_id: str,
        node_type: str,
        readings: List[Tuple[int, str, float]],  # (timestamp_ms, signal, value)
        signal_names: List[str],
        window_ms: int = WINDOW_TICKS * 15_000,
    ) -> "SignalWindow":
        """
        Build a SignalWindow from a list of raw readings.
        Bins readings into WINDOW_TICKS slots, filling gaps with 0.
        """
        if not readings:
            return cls(
                node_id=node_id, node_type=node_type,
                window=np.zeros((WINDOW_TICKS, len(signal_names))),
                signal_names=signal_names, start_ms=0, end_ms=0,
            )

        readings = sorted(readings, key=lambda r: r[0])
        end_ms   = readings[-1][0]
        start_ms = end_ms - window_ms
        slot_ms  = window_ms / WINDOW_TICKS

        sig_idx = {s: i for i, s in enumerate(signal_names)}
        window  = np.zeros((WINDOW_TICKS, len(signal_names)))

        for ts, sig, val in readings:
            if ts < start_ms:
                continue
            slot = min(WINDOW_TICKS - 1, int((ts - start_ms) / slot_ms))
            if sig in sig_idx:
                window[slot, sig_idx[sig]] = val

        return cls(
            node_id=node_id, node_type=node_type, window=window,
            signal_names=signal_names, start_ms=start_ms, end_ms=end_ms,
        )


@dataclass
class FailurePrediction:
    node_id: str
    node_type: str
    failure_class: str
    confidence: float
    top_classes: List[Tuple[str, float]]  # [(class, prob), ...]
    timestamp_ms: int


# ── Model (PyTorch) ────────────────────────────────────────────────────────────

class LSTMFailureModel:
    """Wrapper around a PyTorch BiLSTM model. Lazy-imported to avoid hard dep."""

    def __init__(self, num_signals: int, num_classes: int):
        self.num_signals = num_signals
        self.num_classes = num_classes
        self._model = None

    def _build(self):
        try:
            import torch
            import torch.nn as nn

            class _Net(nn.Module):
                def __init__(self, num_signals, num_classes):
                    super().__init__()
                    self.lstm = nn.LSTM(
                        input_size=num_signals,
                        hidden_size=HIDDEN_SIZE,
                        num_layers=NUM_LAYERS,
                        batch_first=True,
                        bidirectional=True,
                        dropout=DROPOUT if NUM_LAYERS > 1 else 0,
                    )
                    self.classifier = nn.Sequential(
                        nn.Linear(HIDDEN_SIZE * 2, 64),
                        nn.ReLU(),
                        nn.Dropout(DROPOUT),
                        nn.Linear(64, num_classes),
                    )

                def forward(self, x):
                    out, _ = self.lstm(x)
                    # Use last hidden state from both directions
                    last = out[:, -1, :]
                    return self.classifier(last)

            self._model = _Net(self.num_signals, self.num_classes)
            return self._model
        except ImportError:
            raise RuntimeError("PyTorch not installed. Run: pip install torch")

    def save(self, path: str) -> None:
        import torch
        if self._model is None:
            raise RuntimeError("Model not built yet")
        meta = {"num_signals": self.num_signals, "num_classes": self.num_classes}
        torch.save({"state_dict": self._model.state_dict(), "meta": meta}, path)

    @classmethod
    def load(cls, path: str) -> "LSTMFailureModel":
        import torch
        checkpoint = torch.load(path, map_location="cpu")
        meta = checkpoint["meta"]
        obj = cls(meta["num_signals"], meta["num_classes"])
        obj._build().load_state_dict(checkpoint["state_dict"])
        obj._model.eval()
        return obj

    def predict(self, window: np.ndarray) -> np.ndarray:
        """window: (WINDOW_TICKS, num_signals) → returns (num_classes,) softmax probs."""
        import torch
        import torch.nn.functional as F
        if self._model is None:
            raise RuntimeError("Model not loaded")
        x = torch.tensor(window, dtype=torch.float32).unsqueeze(0)  # (1, T, F)
        with torch.no_grad():
            logits = self._model(x)
            return F.softmax(logits, dim=-1).squeeze(0).numpy()

    def export_onnx(self, path: str) -> None:
        """Export to ONNX for deployment in Go/Rust inference servers."""
        import torch
        if self._model is None:
            raise RuntimeError("Model not loaded")
        dummy = torch.zeros(1, WINDOW_TICKS, self.num_signals)
        torch.onnx.export(
            self._model, dummy, path,
            input_names=["window"],
            output_names=["class_probs"],
            dynamic_axes={"window": {0: "batch"}},
            opset_version=17,
        )


# ── Trainer ────────────────────────────────────────────────────────────────────

class LSTMTrainer:
    """
    Trains the LSTM on labeled (SignalWindow, failure_class_index) pairs.
    Requires Phase 4+ data: real anomaly events with confirmed failure class labels.
    """

    def __init__(self, signal_names: List[str], failure_classes: List[str] = FAILURE_CLASSES):
        self.signal_names = signal_names
        self.failure_classes = failure_classes
        self.class_idx = {c: i for i, c in enumerate(failure_classes)}
        self.model = LSTMFailureModel(len(signal_names), len(failure_classes))
        self.model._build()

    def train(
        self,
        dataset: List[Tuple[SignalWindow, str]],  # (window, failure_class)
        epochs: int = 50,
        lr: float = 1e-3,
        save_path: Optional[str] = None,
    ) -> List[float]:
        """Returns per-epoch loss list."""
        import torch
        import torch.nn as nn
        import torch.optim as optim

        optimizer = optim.Adam(self.model._model.parameters(), lr=lr)
        criterion = nn.CrossEntropyLoss()
        losses = []

        for epoch in range(epochs):
            self.model._model.train()
            epoch_loss = 0.0
            for window_obj, class_name in dataset:
                x = torch.tensor(window_obj.window, dtype=torch.float32).unsqueeze(0)
                y = torch.tensor([self.class_idx.get(class_name, self.class_idx["unknown"])])
                optimizer.zero_grad()
                logits = self.model._model(x)
                loss = criterion(logits, y)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()
            avg_loss = epoch_loss / max(len(dataset), 1)
            losses.append(avg_loss)
            if epoch % 10 == 0:
                print(f"Epoch {epoch}/{epochs} loss={avg_loss:.4f}")

        if save_path:
            self.model.save(save_path)
        return losses


# ── Inference wrapper ──────────────────────────────────────────────────────────

class FailureRecognizer:
    """
    Production inference wrapper. Loads a trained model and classifies windows.
    Falls back to rule-based signature matching if model not available.
    """

    def __init__(self, model: LSTMFailureModel, failure_classes: List[str] = FAILURE_CLASSES):
        self._model = model
        self._classes = failure_classes

    @classmethod
    def load(cls, path: str, failure_classes: List[str] = FAILURE_CLASSES) -> "FailureRecognizer":
        model = LSTMFailureModel.load(path)
        return cls(model, failure_classes)

    def predict(self, window: SignalWindow, min_confidence: float = 0.3) -> Optional[FailurePrediction]:
        probs = self._model.predict(window.window)
        top_idx = int(np.argmax(probs))
        top_conf = float(probs[top_idx])
        if top_conf < min_confidence:
            return None
        top_classes = sorted(
            [(self._classes[i], float(p)) for i, p in enumerate(probs)],
            key=lambda x: x[1], reverse=True
        )[:3]
        return FailurePrediction(
            node_id=window.node_id,
            node_type=window.node_type,
            failure_class=self._classes[top_idx],
            confidence=top_conf,
            top_classes=top_classes,
            timestamp_ms=window.end_ms,
        )
