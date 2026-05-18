"""
LLM explanation layer — Phase 6.

Takes structured intelligence findings (causal candidates, anomalies,
saturation warnings, peer outliers) and produces a plain-English narrative
via the Claude API.

RULE: DO NOT train a custom LLM. Use Claude API only.
RULE: Structured findings → narrative. Never make up facts not in the findings.

Usage:
    explainer = IntelExplainer()
    narrative = explainer.explain(findings)
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

log = logging.getLogger("sf.llm")

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 1024

SYSTEM_PROMPT = """\
You are an expert SRE embedded in SystemFlow, an infrastructure intelligence platform.
You receive structured analysis findings and produce a concise, actionable plain-English explanation.

Rules:
- 2-4 paragraphs maximum. No bullet points. No markdown headers.
- State the root cause first, propagation chain second, recommended action third.
- Reference specific node names, signal names, and values from the findings.
- If confidence is below 0.5, say so explicitly ("preliminary analysis suggests…").
- Never mention the word "algorithm" or "model". Write as if you personally diagnosed it.
- If no candidates found, say what was observed and what's still unknown.
- Tone: calm, precise, senior engineer speaking to another engineer.
"""


@dataclass
class IntelFindings:
    """Structured findings from all intelligence layers — input to the explainer."""
    symptom_node_id: str
    symptom_signal: str
    symptom_value: float
    symptom_timestamp_ms: int

    # From causal engine (Phase 5)
    causal_candidates: List[Dict[str, Any]] = field(default_factory=list)

    # From signature matcher (Phase 4)
    signature_matches: List[Dict[str, Any]] = field(default_factory=list)

    # From saturation predictor (Phase 3)
    saturation_warnings: List[Dict[str, Any]] = field(default_factory=list)

    # From peer comparison (Phase 3)
    peer_outliers: List[Dict[str, Any]] = field(default_factory=list)

    # From reaction pattern engine (Phase 4)
    reaction_matches: List[Dict[str, Any]] = field(default_factory=list)

    # Context: node type of the symptom node
    symptom_node_type: str = ""


@dataclass
class ExplanationResult:
    narrative: str           # plain English, 2-4 paragraphs
    root_cause_node: str     # best candidate node_id or "" if unknown
    confidence: float        # top candidate confidence or 0.0
    recommended_action: str  # extracted from narrative
    model_used: str
    input_tokens: int
    output_tokens: int


class IntelExplainer:
    """
    Wraps Claude API to produce plain-English infrastructure diagnostics.
    Lazy-imports anthropic so the module loads even without the SDK installed.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = MODEL):
        self._api_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        self._model = model
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                import anthropic
                if not self._api_key or self._api_key == "your-key-here":
                    raise RuntimeError("ANTHROPIC_API_KEY not configured")
                self._client = anthropic.Anthropic(api_key=self._api_key)
            except ImportError:
                raise RuntimeError("anthropic SDK not installed. Run: pip install anthropic")
        return self._client

    def explain(self, findings: IntelFindings) -> ExplanationResult:
        """
        Generate a plain-English explanation for the given findings.
        Raises RuntimeError if API key not configured.
        """
        prompt = self._build_prompt(findings)
        client = self._get_client()

        message = client.messages.create(
            model=self._model,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        narrative = message.content[0].text.strip()
        top_candidate = findings.causal_candidates[0] if findings.causal_candidates else {}

        return ExplanationResult(
            narrative=narrative,
            root_cause_node=top_candidate.get("node_id", ""),
            confidence=top_candidate.get("confidence", 0.0),
            recommended_action=self._extract_action(narrative),
            model_used=self._model,
            input_tokens=message.usage.input_tokens,
            output_tokens=message.usage.output_tokens,
        )

    def _build_prompt(self, f: IntelFindings) -> str:
        lines = [
            f"SYMPTOM: {f.symptom_node_id} ({f.symptom_node_type}) "
            f"shows {f.symptom_signal}={f.symptom_value:.3f}",
            "",
        ]

        if f.causal_candidates:
            lines.append("CAUSAL ANALYSIS (root cause candidates, highest confidence first):")
            for i, c in enumerate(f.causal_candidates[:3], 1):
                lines.append(
                    f"  {i}. {c.get('node_id')} ({c.get('node_type')}) — "
                    f"trigger: {c.get('trigger_signal')}={c.get('trigger_value', 0):.3f}, "
                    f"confidence={c.get('confidence', 0):.2f}, "
                    f"delay={c.get('timing_delta_ms', 0)}ms, "
                    f"path={' → '.join(c.get('propagation_path', []))}"
                )
        else:
            lines.append("CAUSAL ANALYSIS: No root cause identified yet.")

        if f.signature_matches:
            lines.append("")
            lines.append("FAILURE SIGNATURES MATCHED:")
            for m in f.signature_matches[:2]:
                lines.append(
                    f"  - {m.get('signature_name')} on {m.get('node_id')} "
                    f"(score={m.get('match_score', 0):.2f}): {m.get('description', '')}"
                )

        if f.saturation_warnings:
            lines.append("")
            lines.append("SATURATION WARNINGS (predicted within 30 min):")
            for w in f.saturation_warnings[:3]:
                tts = w.get("time_to_saturation_sec", 0)
                lines.append(
                    f"  - {w.get('node_id')}/{w.get('signal')}: "
                    f"currently {w.get('current_value', 0):.3f}, "
                    f"threshold {w.get('threshold', 0):.3f}, "
                    f"ETA {tts/60:.1f} min"
                )

        if f.peer_outliers:
            lines.append("")
            lines.append("PEER COMPARISON OUTLIERS:")
            for p in f.peer_outliers[:2]:
                lines.append(
                    f"  - {p.get('node_id')}: {p.get('signal')} = {p.get('node_value', 0):.3f} "
                    f"vs peer mean {p.get('peer_mean', 0):.3f} (z={p.get('z_score', 0):.1f})"
                )

        if f.reaction_matches:
            lines.append("")
            lines.append("CONFIRMED REACTION CHAINS:")
            for r in f.reaction_matches[:2]:
                lines.append(
                    f"  - {r.get('trigger_node_id', '?')} → {r.get('affected_signal')} "
                    f"on {r.get('downstream_node_id', '?')} "
                    f"via {r.get('edge_type')} (Δt={r.get('delay_ms', 0)}ms)"
                )

        lines += [
            "",
            "Based on the above findings, provide a 2-4 paragraph plain-English explanation "
            "of what happened, why, and what the on-call engineer should do right now.",
        ]

        return "\n".join(lines)

    @staticmethod
    def _extract_action(narrative: str) -> str:
        """Best-effort extraction of the recommended action from the narrative."""
        sentences = [s.strip() for s in narrative.replace("\n", " ").split(".") if s.strip()]
        action_keywords = ["should", "recommend", "suggest", "check", "restart",
                           "scale", "add", "reduce", "investigate", "look at"]
        for sentence in reversed(sentences):
            lower = sentence.lower()
            if any(kw in lower for kw in action_keywords):
                return sentence + "."
        return sentences[-1] + "." if sentences else ""


# ── Fallback explainer (no API key required) ─────────────────────────────────

class RuleBasedExplainer:
    """
    Template-based explanation for when the Claude API is unavailable.
    Produces a structured but less fluent narrative from the findings alone.
    Used as fallback in the API endpoint.
    """

    def explain(self, findings: IntelFindings) -> ExplanationResult:
        parts = []

        if findings.causal_candidates:
            top = findings.causal_candidates[0]
            parts.append(
                f"Root cause identified: {top.get('node_id')} ({top.get('node_type')}) "
                f"shows {top.get('trigger_signal')}={top.get('trigger_value', 0):.3f}, "
                f"which exceeds its known threshold. "
                f"This propagated via {' → '.join(top.get('propagation_path', []))} "
                f"causing {findings.symptom_signal} on {findings.symptom_node_id} "
                f"(confidence={top.get('confidence', 0):.0%}, delay={top.get('timing_delta_ms', 0)}ms). "
                f"{top.get('description', '')}"
            )
        else:
            parts.append(
                f"Anomaly detected: {findings.symptom_node_id} shows "
                f"{findings.symptom_signal}={findings.symptom_value:.3f}. "
                f"Root cause not yet identified — insufficient upstream data or no matching patterns."
            )

        if findings.saturation_warnings:
            w = findings.saturation_warnings[0]
            tts = w.get("time_to_saturation_sec", 0)
            parts.append(
                f"Warning: {w.get('node_id')}/{w.get('signal')} "
                f"will reach saturation in approximately {tts/60:.1f} minutes "
                f"at current growth rate."
            )

        if findings.signature_matches:
            m = findings.signature_matches[0]
            parts.append(
                f"Failure signature '{m.get('signature_name')}' matched "
                f"(score={m.get('match_score', 0):.0%}). "
                f"Likely cause: {m.get('typical_cause', 'see DNA documentation')}."
            )

        narrative = " ".join(parts)
        top = findings.causal_candidates[0] if findings.causal_candidates else {}

        return ExplanationResult(
            narrative=narrative,
            root_cause_node=top.get("node_id", ""),
            confidence=top.get("confidence", 0.0),
            recommended_action="Check the root cause node and its DNA failure signature for remediation steps.",
            model_used="rule_based",
            input_tokens=0,
            output_tokens=0,
        )


def explain(findings: IntelFindings) -> ExplanationResult:
    """
    Module-level convenience: tries Claude API first, falls back to rule-based.
    Never raises — always returns an ExplanationResult.
    """
    try:
        return IntelExplainer().explain(findings)
    except RuntimeError as e:
        log.warning("Claude API unavailable (%s) — using rule-based explainer", e)
        return RuleBasedExplainer().explain(findings)
    except Exception as e:
        log.error("Explainer error: %s", e)
        return RuleBasedExplainer().explain(findings)
