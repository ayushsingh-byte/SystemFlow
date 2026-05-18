/**
 * Saturation prediction endpoints — proxy to Python ML service.
 * GET /api/intel/saturation          — signals predicted to saturate within N minutes
 * GET /api/intel/saturation/peers    — peer comparison outlier events
 * POST /api/intel/saturation/register — register a node with its DNA type for peer comparison
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

// GET /api/intel/saturation?horizon_minutes=30
router.get('/', async (req, res) => {
  const horizon = parseInt(req.query.horizon_minutes) || 30;
  try {
    const data = await mlGet(`/saturation?horizon_minutes=${horizon}`);
    return res.json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/intel/saturation/peers
router.get('/peers', async (req, res) => {
  try {
    const data = await mlGet('/peer/outliers');
    return res.json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/intel/saturation/register
// Body: { node_id, node_type }
router.post('/register', async (req, res) => {
  const { node_id, node_type } = req.body;
  if (!node_id || !node_type) {
    return res.status(400).json({ error: 'node_id and node_type required' });
  }
  try {
    const data = await mlPost('/peer/register', { node_id, node_type });
    return res.json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
