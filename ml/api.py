"""
ML service FastAPI server.
Exposes baseline + anomaly data to the Node.js backend (baselineService.js).
Run: uvicorn ml.api:app --port 8000 --reload
"""

import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import time

from ml.baseline.engine import BaselineEngine
from ml.anomaly.detector import AnomalyDetectorRegistry, AnomalyResult
from ml.baseline import saturation as sat_module

try:
    from ml.baseline import seasonality as sea_module
except ImportError:
    sea_module = None  # type: ignore[assignment]

try:
    from ml.anomaly import peer_comparison as peer_module
except ImportError:
    peer_module = None  # type: ignore[assignment]

try:
    from ml.signatures import matcher as sig_matcher_module
    from ml.signatures import reaction as sig_reaction_module
except ImportError:
    sig_matcher_module = None  # type: ignore[assignment]
    sig_reaction_module = None  # type: ignore[assignment]

try:
    from ml.causal import engine as causal_module
    from ml.causal import graph as causal_graph_module
    from ml.causal import correlator as causal_corr_module
except ImportError:
    causal_module = None  # type: ignore[assignment]
    causal_graph_module = None  # type: ignore[assignment]
    causal_corr_module = None  # type: ignore[assignment]

# Phase 4 in-memory stores
_signature_matches: List[dict] = []
_reaction_matches: List[dict] = []
MAX_PHASE4_STORE = 500

# Phase 5 in-memory stores
_causal_results: List[dict] = []
MAX_CAUSAL_STORE = 200

log = logging.getLogger("sf.api")

app = FastAPI(title="SystemFlow ML Service", version="0.1.0")

# Singletons — shared across requests (single process, no lock needed for reads)
_baseline_engine = BaselineEngine(learning_window_hours=72)
_anomaly_registry = AnomalyDetectorRegistry()

# In-memory anomaly store — replace with VictoriaMetrics query in Phase 3
_anomaly_store: List[dict] = []
MAX_ANOMALY_STORE = 10_000

# In-memory saturation warning store (Phase 3)
_saturation_warnings: List[dict] = []
MAX_SATURATION_WARNINGS = 500

# Saturation horizon for warnings: 30 minutes
SATURATION_WARN_HORIZON_SEC = 1800


class SignalReading(BaseModel):
    node_id: str
    signal: str
    value: float
    timestamp_ms: Optional[int] = None
    unit: Optional[str] = ""
    node_type: Optional[str] = None


@app.post("/ingest")
async def ingest(reading: SignalReading):
    """Called by Kafka consumer — process one reading through baseline + anomaly."""
    ts = reading.timestamp_ms or int(time.time() * 1000)
    report = _baseline_engine.ingest(reading.node_id, reading.signal, reading.value, ts)
    result = _anomaly_registry.evaluate(report)
    if result:
        _anomaly_store.append({
            "node_id": result.node_id,
            "signal": result.signal,
            "value": result.value,
            "timestamp_ms": result.timestamp_ms,
            "is_anomaly": result.is_anomaly,
            "method": result.method,
            "confidence": result.confidence,
            "deviation_zscore": result.deviation_zscore,
            "description": result.description,
        })
        if len(_anomaly_store) > MAX_ANOMALY_STORE:
            _anomaly_store.pop(0)

    # Phase 3: saturation prediction (best-effort)
    try:
        sat_pred = sat_module.update(reading.node_id, reading.signal, reading.value, ts)
        if sat_pred is not None:
            tts = sat_pred.time_to_saturation_sec
            if tts is not None and 0 <= tts <= SATURATION_WARN_HORIZON_SEC:
                _saturation_warnings.append({
                    "node_id": sat_pred.node_id,
                    "signal": sat_pred.signal,
                    "current_value": sat_pred.current_value,
                    "threshold": sat_pred.threshold,
                    "rate_per_second": sat_pred.rate_per_second,
                    "time_to_saturation_sec": sat_pred.time_to_saturation_sec,
                    "r_squared": sat_pred.r_squared,
                    "timestamp_ms": sat_pred.timestamp_ms,
                })
                if len(_saturation_warnings) > MAX_SATURATION_WARNINGS:
                    _saturation_warnings.pop(0)
    except Exception as exc:
        log.warning("saturation.update error for %s/%s: %s", reading.node_id, reading.signal, exc)

    # Phase 3: seasonality update (best-effort)
    if sea_module is not None:
        try:
            deviation = sea_module.update(reading.node_id, reading.signal, reading.value, ts)
            if deviation is not None and abs(deviation) > 2.0:
                log.debug("Seasonal deviation %.2f for %s/%s", deviation, reading.node_id, reading.signal)
        except Exception as exc:
            log.warning("seasonality.update error for %s/%s: %s", reading.node_id, reading.signal, exc)

    # Phase 3: peer comparison reading ingestion (best-effort)
    if peer_module is not None and reading.node_type:
        try:
            peer_module.add_reading(reading.node_id, reading.node_type, reading.signal, reading.value)
        except Exception as exc:
            log.warning("peer_comparison.add_reading error for %s/%s: %s", reading.node_id, reading.signal, exc)

    # Phase 5: feed correlator (best-effort)
    if causal_corr_module is not None:
        try:
            causal_corr_module.add_reading(reading.node_id, reading.signal, reading.value, ts)
        except Exception as exc:
            log.warning("causal_corr.add_reading error: %s", exc)

    return {"processed": True, "anomaly": result is not None}


@app.get("/saturation")
async def get_saturation(horizon_minutes: int = 30):
    """Returns all signals predicted to saturate within horizon_minutes."""
    urgent = sat_module.get_urgent(warn_horizon_sec=horizon_minutes * 60)
    return {
        "predictions": [
            {
                "node_id": p.node_id,
                "signal": p.signal,
                "current_value": p.current_value,
                "threshold": p.threshold,
                "rate_per_second": p.rate_per_second,
                "time_to_saturation_sec": p.time_to_saturation_sec,
                "r_squared": p.r_squared,
            }
            for p in urgent
        ]
    }


@app.post("/peer/register")
async def register_peer(body: dict):
    """Register a node with a type for peer comparison. Body: {"node_id": "...", "node_type": "..."}"""
    if peer_module is None:
        raise HTTPException(status_code=503, detail="peer_comparison module not available")
    node_id = body.get("node_id")
    node_type = body.get("node_type")
    if not node_id or not node_type:
        raise HTTPException(status_code=400, detail="node_id and node_type required")
    peer_module.register_node(node_id, node_type)
    return {"registered": node_id}


@app.get("/peer/outliers")
async def get_peer_outliers():
    """Returns current peer outlier events."""
    if peer_module is None:
        raise HTTPException(status_code=503, detail="peer_comparison module not available")
    events = peer_module.detect_outliers()
    return {
        "outliers": [
            {
                "node_id": e.node_id,
                "node_type": e.node_type,
                "signal": e.signal,
                "node_value": e.node_value,
                "peer_mean": e.peer_mean,
                "peer_stddev": e.peer_stddev,
                "z_score": e.z_score,
                "confidence": e.confidence,
                "description": e.description,
            }
            for e in events
        ]
    }


@app.get("/baseline/{node_id}/{signal}")
async def get_baseline(node_id: str, signal: str):
    """Return current baseline stats for a (node_id, signal) pair."""
    # Pull from last known bucket — simplified for Phase 1/2
    # Phase 3: add time-awareness, return all bucket stats
    import datetime
    now = datetime.datetime.utcnow()
    key = (node_id, signal, now.hour, now.weekday())
    bucket = _baseline_engine._buckets.get(key)
    if not bucket or bucket.count == 0:
        raise HTTPException(status_code=404, detail="No baseline data yet for this signal")
    return {
        "node_id": node_id,
        "signal": signal,
        "mean": bucket.mean,
        "stddev": bucket.stddev,
        "ewma": bucket.ewma,
        "sample_count": bucket.count,
        "hour_of_day": now.hour,
        "day_of_week": now.weekday(),
    }


@app.get("/anomalies/{node_id}")
async def get_anomalies(node_id: str, limit: int = 50):
    """Return recent anomalies for a node."""
    node_anomalies = [a for a in _anomaly_store if a["node_id"] == node_id]
    return {"anomalies": node_anomalies[-limit:]}


@app.get("/signatures/matches")
async def get_signature_matches(limit: int = 50):
    """Recent failure signature matches (Phase 4)."""
    return {"matches": _signature_matches[-limit:]}


@app.get("/signatures/reactions")
async def get_reaction_matches(limit: int = 50):
    """Recent confirmed reaction pattern matches (Phase 4)."""
    return {"matches": _reaction_matches[-limit:]}


@app.post("/signatures/register")
async def register_signature_node(body: dict):
    """Register node + type for signature matching and reaction detection."""
    node_id = body.get("node_id")
    node_type = body.get("node_type")
    if not node_id or not node_type:
        raise HTTPException(status_code=400, detail="node_id and node_type required")
    if sig_matcher_module:
        sig_matcher_module.register_node(node_id, node_type)
    if sig_reaction_module:
        sig_reaction_module.register_node(node_id, node_type)
    return {"registered": node_id}


@app.post("/signatures/edge")
async def register_reaction_edge(body: dict):
    """Register a typed edge for reaction pattern tracking."""
    source = body.get("source")
    downstream = body.get("downstream")
    edge_type = body.get("edge_type")
    if not source or not downstream or not edge_type:
        raise HTTPException(status_code=400, detail="source, downstream, edge_type required")
    if sig_reaction_module:
        sig_reaction_module.register_edge(source, downstream, edge_type)
    return {"registered": f"{source}→{downstream}:{edge_type}"}


@app.post("/causal/trace")
async def causal_trace(body: dict):
    """Trace root causes for a symptom. Phase 5."""
    if causal_module is None:
        raise HTTPException(503, "causal module not available")
    node_id = body.get("node_id")
    signal = body.get("signal")
    value = float(body.get("value", 0))
    ts_ms = int(body.get("timestamp_ms") or int(time.time() * 1000))
    raw_anomalies = body.get("recent_anomalies", [])

    from ml.causal.engine import AnomalyEvent as CausalAnomalyEvent
    anomalies = [
        CausalAnomalyEvent(
            node_id=a["node_id"], signal=a["signal"],
            value=float(a["value"]),
            timestamp_ms=int(a.get("timestamp_ms", ts_ms)),
            confidence=float(a.get("confidence", 0.8)),
        )
        for a in raw_anomalies if "node_id" in a and "signal" in a
    ]

    candidates = causal_module.trace(node_id, signal, value, ts_ms, anomalies)
    result = {
        "symptom_node": node_id,
        "symptom_signal": signal,
        "candidates": [
            {
                "node_id": c.node_id,
                "node_type": c.node_type,
                "trigger_signal": c.trigger_signal,
                "trigger_value": c.trigger_value,
                "confidence": c.confidence,
                "propagation_path": c.propagation_path,
                "edge_types_traversed": c.edge_types_traversed,
                "timing_delta_ms": c.timing_delta_ms,
                "expected_delay_ms": c.expected_delay_ms,
                "pattern_name": c.pattern_name,
                "description": c.description,
            }
            for c in candidates
        ],
    }
    _causal_results.append({**result, "timestamp_ms": ts_ms})
    if len(_causal_results) > MAX_CAUSAL_STORE:
        _causal_results.pop(0)
    return result


@app.post("/causal/register/node")
async def causal_register_node(body: dict):
    """Register a node in the causal graph. Phase 5."""
    if causal_graph_module is None:
        raise HTTPException(503, "causal module not available")
    node_id = body.get("node_id")
    node_type = body.get("node_type", "")
    family = body.get("family", "")
    if not node_id:
        raise HTTPException(400, "node_id required")
    causal_graph_module.add_node(node_id, node_type, family)
    # Also register for signature matching and reaction tracking
    if sig_matcher_module:
        sig_matcher_module.register_node(node_id, node_type)
    if sig_reaction_module:
        sig_reaction_module.register_node(node_id, node_type)
    return {"registered": node_id}


@app.post("/causal/register/edge")
async def causal_register_edge(body: dict):
    """Register an edge in the causal graph. Phase 5."""
    if causal_graph_module is None:
        raise HTTPException(503, "causal module not available")
    source = body.get("source")
    target = body.get("target")
    edge_type = body.get("edge_type")
    if not source or not target or not edge_type:
        raise HTTPException(400, "source, target, edge_type required")
    causal_graph_module.add_edge(
        source=source, target=target, edge_type=edge_type,
        criticality=body.get("criticality", "important"),
        failure_propagation=body.get("failure_propagation", "degrades"),
        confidence=float(body.get("confidence", 1.0)),
    )
    # Also register in reaction engine
    if sig_reaction_module:
        sig_reaction_module.register_edge(source, target, edge_type)
    return {"registered": f"{source}→{target}:{edge_type}"}


@app.get("/causal/results")
async def causal_results(limit: int = 20):
    """Recent causal trace results. Phase 5."""
    return {"results": _causal_results[-limit:]}


@app.get("/causal/correlations")
async def causal_correlations(min_r: float = 0.75):
    """Cross-node signal correlations. Phase 5."""
    if causal_corr_module is None:
        raise HTTPException(503, "causal module not available")
    corrs = causal_corr_module.compute()
    return {
        "correlations": [
            {
                "node_a": c.node_a, "signal_a": c.signal_a,
                "node_b": c.node_b, "signal_b": c.signal_b,
                "pearson_r": c.pearson_r, "lag_ticks": c.lag_ticks,
                "lag_direction": c.lag_direction,
                "confidence": c.confidence,
                "description": c.description,
            }
            for c in corrs if abs(c.pearson_r) >= min_r
        ]
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "ml",
        "buckets": len(_baseline_engine._buckets),
        "phase4_sig_matches": len(_signature_matches),
        "phase4_reaction_matches": len(_reaction_matches),
    }
