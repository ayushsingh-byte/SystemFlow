/**
 * Signature + reaction pattern endpoints — Phase 4.
 * GET /api/intel/signatures/matches     — recent signature matches
 * GET /api/intel/signatures/reactions   — recent reaction pattern matches
 * POST /api/intel/signatures/register   — register node with type for matching
 * POST /api/intel/signatures/edge       — register a typed edge for reaction detection
 */
const express = require('express');
const router = express.Router();
const http = require('http');

const ML_BASE = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const mlGet = (path) => new Promise((resolve, reject) => {
  http.get(`${ML_BASE}${path}`, res => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
  }).on('error', err => { const e = new Error(`ML unreachable: ${err.message}`); e.status = 503; reject(e); });
});

const mlPost = (path, body) => new Promise((resolve, reject) => {
  const payload = JSON.stringify(body);
  const url = new URL(`${ML_BASE}${path}`);
  const req = http.request({
    hostname: url.hostname, port: url.port || 8000, path: url.pathname,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
  }, res => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
  });
  req.on('error', reject); req.write(payload); req.end();
});

// GET /api/intel/signatures/matches
router.get('/matches', async (req, res) => {
  try { return res.json(await mlGet('/signatures/matches')); }
  catch (err) { return res.status(err.status || 500).json({ error: err.message }); }
});

// GET /api/intel/signatures/reactions
router.get('/reactions', async (req, res) => {
  try { return res.json(await mlGet('/signatures/reactions')); }
  catch (err) { return res.status(err.status || 500).json({ error: err.message }); }
});

// POST /api/intel/signatures/register — { node_id, node_type }
router.post('/register', async (req, res) => {
  const { node_id, node_type } = req.body;
  if (!node_id || !node_type) return res.status(400).json({ error: 'node_id and node_type required' });
  try { return res.json(await mlPost('/signatures/register', { node_id, node_type })); }
  catch (err) { return res.status(err.status || 500).json({ error: err.message }); }
});

// POST /api/intel/signatures/edge — { source, downstream, edge_type }
router.post('/edge', async (req, res) => {
  const { source, downstream, edge_type } = req.body;
  if (!source || !downstream || !edge_type) return res.status(400).json({ error: 'source, downstream, edge_type required' });
  try { return res.json(await mlPost('/signatures/edge', { source, downstream, edge_type })); }
  catch (err) { return res.status(err.status || 500).json({ error: err.message }); }
});

module.exports = router;
