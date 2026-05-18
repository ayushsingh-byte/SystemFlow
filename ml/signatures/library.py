"""
Failure signature library — Phase 4.
Loads NodeDNA YAML files and provides signature matching.

BLOCKED BY: Phase 3 (baselines working) + full signal collection from Phase 1.
This module is production-ready for Phase 4 activation.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import yaml


DNA_DIR = Path(__file__).parent.parent.parent / "dna"


@dataclass
class SignalCondition:
    signal: str
    trend: str          # "rising" | "spike" | "falling" | "stable"
    threshold: float = 0.0


@dataclass
class FailureSignature:
    name: str
    description: str
    typical_cause: str
    signal_sequence: List[SignalCondition]
    node_type: str

    def match_score(self, recent_anomalies: List[dict]) -> float:
        """
        Score how well recent_anomalies match this signature.
        Returns 0..1. Only called during Phase 4 after full signal collection.
        """
        if not recent_anomalies or not self.signal_sequence:
            return 0.0

        anomaly_signals = {a["signal"] for a in recent_anomalies}
        matched = sum(
            1 for cond in self.signal_sequence
            if cond.signal in anomaly_signals
        )
        return matched / len(self.signal_sequence)


@dataclass
class NodeDNA:
    type: str
    family: str
    primary_bottleneck: str
    critical_signals: List[str]
    warning_signals: List[str]
    failure_signatures: List[FailureSignature]
    reaction_patterns: List[dict]


class DNARegistry:
    """Loads and caches NodeDNA from YAML files in dna/ directory."""

    def __init__(self, dna_dir: Path = DNA_DIR):
        self._dir = dna_dir
        self._cache: Dict[str, NodeDNA] = {}

    def load(self, node_type: str) -> Optional[NodeDNA]:
        if node_type in self._cache:
            return self._cache[node_type]

        path = self._dir / f"{node_type}.dna.yaml"
        if not path.exists():
            return None

        with open(path) as f:
            raw = yaml.safe_load(f)

        sigs = []
        for sig_raw in raw.get("failure_signatures", []):
            seq = [
                SignalCondition(
                    signal=s.get("signal", ""),
                    trend=s.get("trend", "rising"),
                    threshold=float(s.get("threshold", 0.0)),
                )
                for s in sig_raw.get("signal_sequence", [])
            ]
            sigs.append(FailureSignature(
                name=sig_raw.get("name", ""),
                description=sig_raw.get("description", ""),
                typical_cause=sig_raw.get("typical_cause", ""),
                signal_sequence=seq,
                node_type=node_type,
            ))

        dna = NodeDNA(
            type=raw.get("type", node_type),
            family=raw.get("family", ""),
            primary_bottleneck=raw.get("baseline_behavior", {}).get("primary_bottleneck", ""),
            critical_signals=raw.get("health_signals", {}).get("critical", []),
            warning_signals=raw.get("health_signals", {}).get("warning", []),
            failure_signatures=sigs,
            reaction_patterns=raw.get("reaction_patterns", []),
        )
        self._cache[node_type] = dna
        return dna

    def load_all(self) -> Dict[str, NodeDNA]:
        for path in self._dir.glob("*.dna.yaml"):
            node_type = path.stem.replace(".dna", "")
            self.load(node_type)
        return self._cache

    def match_signatures(
        self,
        node_type: str,
        recent_anomalies: List[dict],
        threshold: float = 0.6,
    ) -> List[Tuple[FailureSignature, float]]:
        """
        Find signatures that match recent anomalies above threshold.
        Returns list of (signature, score) sorted by score desc.
        Phase 4 entry point.
        """
        dna = self.load(node_type)
        if not dna:
            return []

        results = []
        for sig in dna.failure_signatures:
            score = sig.match_score(recent_anomalies)
            if score >= threshold:
                results.append((sig, score))

        return sorted(results, key=lambda x: x[1], reverse=True)
