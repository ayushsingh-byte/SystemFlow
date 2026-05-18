/**
 * Causal inference endpoints — Phase 5.
 * POST /api/intel/causal/trace             — root cause trace for a symptom
 * POST /api/intel/causal/register/node     — register node in causal graph
 * POST /api/intel/causal/register/edge     — register edge in causal graph
 * GET  /api/intel/causal/results           — recent trace results
 * GET  /api/intel/causal/correlations      — cross-node signal correlations
 */
const express = require('express');
const router = express.Router();
const http = require('http');

const ML_BASE = process.env.ML_SERVICE_URL || 'http://localhost:8000';

function mlGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`${ML_BASE}${path}`, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`ML parse error: ${e.message}`)); }
      });
    }).on('error', err => {
      const e = new Error(`ML service unreachable: ${err.message}`);
      e.status = 503;
      reject(e);
    });
  });
}

function mlPost(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url = new URL(`${ML_BASE}${path}`);
    const req = http.request({
      hostname: url.hostname,
      port: url.port || 8000,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// POST /api/intel/causal/trace
router.post('/trace', async (req, res) => {
  try {
    const data = await mlPost('/causal/trace', req.body);
    return res.json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/intel/causal/register/node
router.post('/register/node', async (req, res) => {
  const { node_id, node_type, family } = req.body;
  if (!node_id) {
    return res.status(400).json({ error: 'node_id required' });
  }
  try {
    const data = await mlPost('/causal/register/node', { node_id, node_type, family });
    return res.json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/intel/causal/register/edge
router.post('/register/edge', async (req, res) => {
  const { source, target, edge_type, criticality, failure_propagation, confidence } = req.body;
  if (!source || !target || !edge_type) {
    return res.status(400).json({ error: 'source, target, edge_type required' });
  }
  try {
    const data = await mlPost('/causal/register/edge', {
      source, target, edge_type, criticality, failure_propagation, confidence,
    });
    return res.json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/intel/causal/results?limit=20
router.get('/results', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  try {
    const data = await mlGet(`/causal/results?limit=${limit}`);
    return res.json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/intel/causal/correlations?min_r=0.75
router.get('/correlations', async (req, res) => {
  const min_r = parseFloat(req.query.min_r) || 0.75;
  try {
    const data = await mlGet(`/causal/correlations?min_r=${min_r}`);
    return res.json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
