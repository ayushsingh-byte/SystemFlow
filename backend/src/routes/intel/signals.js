/**
 * Signal ingestion + query endpoints.
 * POST /api/intel/signals/ingest  — collector pushes readings
 * GET  /api/intel/signals/query   — frontend queries timeseries
 */
const express = require('express');
const router = express.Router();
const intelService = require('../../services/intel/intelService');

// POST /api/intel/signals/ingest
// Body: { node_id, signal, value, timestamp_ms, unit }
router.post('/ingest', async (req, res) => {
  const { node_id, signal, value, timestamp_ms, unit } = req.body;
  if (!node_id || !signal || value === undefined) {
    return res.status(400).json({ error: 'node_id, signal, value required' });
  }
  try {
    await intelService.ingestSignal({ node_id, signal, value, timestamp_ms: timestamp_ms || Date.now(), unit });
    return res.status(202).json({ accepted: true });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/intel/signals/ingest/batch
// Body: { readings: [{ node_id, signal, value, timestamp_ms, unit }] }
router.post('/ingest/batch', async (req, res) => {
  const { readings } = req.body;
  if (!Array.isArray(readings) || readings.length === 0) {
    return res.status(400).json({ error: 'readings array required' });
  }
  try {
    await intelService.ingestBatch(readings);
    return res.status(202).json({ accepted: readings.length });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/intel/signals/query?node_id=x&signal=cpu_usage&from=epoch_ms&to=epoch_ms
router.get('/query', async (req, res) => {
  const { node_id, signal, from, to, step } = req.query;
  if (!node_id || !signal) {
    return res.status(400).json({ error: 'node_id and signal required' });
  }
  try {
    const data = await intelService.querySignal({
      node_id,
      signal,
      from: from ? parseInt(from) : Date.now() - 3600_000,
      to: to ? parseInt(to) : Date.now(),
      step: step || '15s',
    });
    return res.json(data);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/intel/signals/nodes — list all known node IDs
router.get('/nodes', async (req, res) => {
  try {
    const nodes = await intelService.listNodes();
    return res.json({ nodes });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
