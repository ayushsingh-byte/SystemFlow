/**
 * Auto-discovery routes — infer typed edges from correlated signal readings.
 * POST /api/intel/discovery/analyze — submit a batch of readings, get candidate edges
 * POST /api/intel/discovery/persist — persist candidates above a confidence threshold
 */
const express = require('express');
const router = express.Router();
const graphService = require('../../services/intel/graphService');

// POST /api/intel/discovery/analyze
// Body: { readings: SignalReading[], min_confidence: number (optional, default 0.5) }
router.post('/analyze', async (req, res) => {
  const { readings, min_confidence = 0.5 } = req.body;
  if (!Array.isArray(readings) || readings.length === 0) {
    return res.status(400).json({ error: 'readings array required' });
  }
  try {
    const candidates = analyzeReadings(readings, min_confidence);
    return res.json({ candidates, count: candidates.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/intel/discovery/persist
// Body: { edges: DiscoveredEdge[], min_confidence: number }
router.post('/persist', async (req, res) => {
  const { edges, min_confidence = 0.55 } = req.body;
  if (!Array.isArray(edges)) {
    return res.status(400).json({ error: 'edges array required' });
  }
  const toSave = edges.filter(e => e.confidence >= min_confidence);
  let saved = 0;
  for (const e of toSave) {
    try {
      await graphService.upsertEdge({
        source: e.source,
        target: e.target,
        type: e.type,
        criticality: 'important',
        failure_propagation: 'degrades',
      });
      saved++;
    } catch (err) {
      console.error('[discovery] upsert edge error:', err.message);
    }
  }
  return res.json({ saved, total: toSave.length });
});

// ── Heuristic auto-discovery (JS port of tracer.ts logic) ───────────────────

function analyzeReadings(readings, minConf) {
  // Group by node_id
  const byNode = new Map();
  for (const r of readings) {
    if (!byNode.has(r.node_id)) byNode.set(r.node_id, []);
    byNode.get(r.node_id).push(r);
  }

  const getVal = (nodeReadings, signal) =>
    nodeReadings.find(r => r.signal === signal)?.value ?? 0;

  const nodes = [...byNode.entries()];
  const candidates = [];
  const seen = new Set();

  for (let i = 0; i < nodes.length; i++) {
    const [nodeA, readingsA] = nodes[i];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const [nodeB, readingsB] = nodes[j];

      // Rule 1: A has high request_latency_p99 + B (db-type signal) has disk_iops_saturation
      const aLatency = getVal(readingsA, 'request_latency_p99');
      const bDiskSat = getVal(readingsB, 'disk_iops_saturation');
      if (aLatency > 200 && bDiskSat > 0.5) {
        const key = `${nodeA}:DB_QUERY:${nodeB}`;
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push({ source: nodeA, target: nodeB, type: 'DB_QUERY', confidence: 0.60,
            reason: `${nodeA} latency ${aLatency}ms while ${nodeB} disk IOPS sat ${(bDiskSat*100).toFixed(0)}%` });
        }
      }

      // Rule 2: A has high latency + B has connection_pool_saturation (cache-type)
      const bPoolSat = getVal(readingsB, 'connection_pool_saturation');
      if (aLatency > 100 && bPoolSat > 0.7) {
        const key = `${nodeA}:CACHE_LOOKUP:${nodeB}`;
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push({ source: nodeA, target: nodeB, type: 'CACHE_LOOKUP', confidence: 0.65,
            reason: `${nodeA} latency ${aLatency}ms while ${nodeB} pool sat ${(bPoolSat*100).toFixed(0)}%` });
        }
      }

      // Rule 3: A (LB-type) high connection_count_active + B has request_queue_depth
      const aConnActive = getVal(readingsA, 'connection_count_active');
      const bQueueDepth = getVal(readingsB, 'request_queue_depth');
      if (aConnActive > 100 && bQueueDepth > 50) {
        const key = `${nodeA}:LOAD_BALANCES_TO:${nodeB}`;
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push({ source: nodeA, target: nodeB, type: 'LOAD_BALANCES_TO', confidence: 0.70,
            reason: `${nodeA} ${aConnActive} active conns routing to ${nodeB} (queue depth ${bQueueDepth})` });
        }
      }

      // Rule 4: A bandwidth_out ≈ B bandwidth_in (within 25%)
      const aBwOut = getVal(readingsA, 'bandwidth_out');
      const bBwIn  = getVal(readingsB, 'bandwidth_in');
      if (aBwOut > 10000 && bBwIn > 10000) {
        const ratio = Math.min(aBwOut, bBwIn) / Math.max(aBwOut, bBwIn);
        if (ratio > 0.75) {
          const key = `${nodeA}:HTTP_CALL:${nodeB}`;
          if (!seen.has(key)) {
            seen.add(key);
            candidates.push({ source: nodeA, target: nodeB, type: 'HTTP_CALL', confidence: 0.55,
              reason: `${nodeA} bw_out ${(aBwOut/1024).toFixed(0)}KB/s ≈ ${nodeB} bw_in ${(bBwIn/1024).toFixed(0)}KB/s (ratio ${ratio.toFixed(2)})` });
          }
        }
      }
    }
  }

  return candidates.filter(c => c.confidence >= minConf);
}

module.exports = router;
