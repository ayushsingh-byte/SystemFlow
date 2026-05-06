const analysisService = require('../services/analysisService');
const projectService = require('../services/projectService');

/**
 * POST /api/analysis/analyze
 * Analyze topology from provided nodes and edges in the request body
 */
async function analyze(req, res) {
  try {
    const { nodes, edges } = req.body;

    if (!Array.isArray(nodes)) {
      return res.status(400).json({ error: 'nodes must be an array' });
    }
    if (!Array.isArray(edges)) {
      return res.status(400).json({ error: 'edges must be an array' });
    }

    const result = analysisService.analyzeTopology(nodes, edges);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * GET /api/analysis/project/:projectId
 * Load a project and analyze its topology
 */
async function analyzeProject(req, res) {
  try {
    const project = await projectService.getProject(req.params.projectId, req.user.id);
    const result = analysisService.analyzeTopology(project.nodes || [], project.edges || []);

    return res.status(200).json({
      projectId: project.id,
      projectName: project.name,
      ...result,
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = {
  analyze,
  analyzeProject,
};
