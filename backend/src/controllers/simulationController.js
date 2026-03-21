const simulationService = require('../services/simulationService');

/**
 * POST /api/simulations
 */
async function save(req, res) {
  try {
    const { projectId, name, config, metrics, requestLog, duration, status } = req.body;
    const simulation = await simulationService.saveSimulation(req.user.id, projectId, {
      name,
      config,
      metrics,
      requestLog,
      duration,
      status,
    });
    return res.status(201).json(simulation);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * GET /api/simulations/project/:projectId
 */
async function history(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await simulationService.getSimulationHistory(
      req.params.projectId,
      req.user.id,
      page,
      limit
    );
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * GET /api/simulations/:id
 */
async function getOne(req, res) {
  try {
    const simulation = await simulationService.getSimulation(req.params.id, req.user.id);
    return res.status(200).json(simulation);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * DELETE /api/simulations/:id
 */
async function deleteSimulation(req, res) {
  try {
    await simulationService.deleteSimulation(req.params.id, req.user.id);
    return res.status(200).json({ message: 'Deleted' });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * GET /api/simulations/project/:projectId/stats
 */
async function stats(req, res) {
  try {
    const result = await simulationService.getSimulationStats(
      req.params.projectId,
      req.user.id
    );
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = {
  save,
  history,
  getOne,
  delete: deleteSimulation,
  stats,
};
