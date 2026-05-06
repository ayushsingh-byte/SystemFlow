const express = require('express');
const router = express.Router();
const simulationController = require('../controllers/simulationController');
const authMiddleware = require('../middleware/auth');

// All simulation routes require authentication
router.use(authMiddleware);

// POST /api/simulations — save a simulation result
router.post('/', simulationController.save);

// GET /api/simulations/project/:projectId/stats — aggregate stats for a project
// NOTE: This route MUST be defined before /:id to avoid "stats" being treated as an id
router.get('/project/:projectId/stats', simulationController.stats);

// GET /api/simulations/project/:projectId — paginated history for a project
router.get('/project/:projectId', simulationController.history);

// GET /api/simulations/:id — get a single simulation
router.get('/:id', simulationController.getOne);

// DELETE /api/simulations/:id — delete a simulation
router.delete('/:id', simulationController.delete);

module.exports = router;
