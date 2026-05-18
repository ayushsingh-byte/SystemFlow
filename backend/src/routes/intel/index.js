/**
 * Intel API routes — new intelligence platform endpoints.
 * Mounted at /api/intel — completely isolated from existing routes.
 * Does NOT modify any existing route files.
 */
const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/auth');

const signalRoutes      = require('./signals');
const graphRoutes       = require('./graph');
const baselineRoutes    = require('./baselines');
const discoveryRoutes   = require('./discovery');
const saturationRoutes  = require('./saturation');
const signatureRoutes   = require('./signatures');
const causalRoutes      = require('./causal');

// All intel endpoints require auth
router.use(authenticate);

router.use('/signals',    signalRoutes);
router.use('/graph',      graphRoutes);
router.use('/baselines',  baselineRoutes);
router.use('/discovery',  discoveryRoutes);
router.use('/saturation', saturationRoutes);
router.use('/signatures', signatureRoutes);
router.use('/causal',     causalRoutes);

// Health check for the intel subsystem
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    subsystem: 'intel',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
