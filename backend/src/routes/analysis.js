const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const authMiddleware = require('../middleware/auth');
const { analysisLimiter } = require('../middleware/rateLimit');

// All analysis routes require authentication and are rate-limited
router.use(authMiddleware);
router.use(analysisLimiter);

// POST /api/analysis/analyze — analyze nodes + edges directly from body
router.post('/analyze', analysisController.analyze);

// GET /api/analysis/project/:projectId — load project and analyze its topology
router.get('/project/:projectId', analysisController.analyzeProject);

module.exports = router;
