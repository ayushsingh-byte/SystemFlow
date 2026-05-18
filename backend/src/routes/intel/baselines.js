/**
 * Baseline query endpoints — proxy to Python ML service.
 * GET /api/intel/baselines/:nodeId/:signal
 * GET /api/intel/baselines/:nodeId/anomalies
 */
const express = require('express');
const router = express.Router();
const baselineService = require('../../services/intel/baselineService');

// GET current baseline for one signal
router.get('/:nodeId/:signal', async (req, res) => {
  try {
    const b = await baselineService.getBaseline(req.params.nodeId, req.params.signal);
    return res.json(b);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET recent anomalies for a node (all signals)
router.get('/:nodeId/anomalies', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  try {
    const anomalies = await baselineService.getAnomalies(req.params.nodeId, limit);
    return res.json({ anomalies });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
