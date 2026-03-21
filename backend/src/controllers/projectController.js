const projectService = require('../services/projectService');

/**
 * POST /api/projects
 */
async function create(req, res) {
  try {
    const { name, description, nodes, edges, tags, isPublic, thumbnail } = req.body;
    const project = await projectService.createProject(req.user.id, {
      name,
      description,
      nodes,
      edges,
      tags,
      isPublic,
      thumbnail,
    });
    return res.status(201).json(project);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * GET /api/projects/:id
 */
async function getOne(req, res) {
  try {
    const project = await projectService.getProject(req.params.id, req.user.id);
    return res.status(200).json(project);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * PUT /api/projects/:id
 */
async function update(req, res) {
  try {
    const { name, description, nodes, edges, tags, isPublic, thumbnail } = req.body;
    const project = await projectService.updateProject(req.params.id, req.user.id, {
      name,
      description,
      nodes,
      edges,
      tags,
      isPublic,
      thumbnail,
    });
    return res.status(200).json(project);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * DELETE /api/projects/:id
 */
async function deleteProject(req, res) {
  try {
    await projectService.deleteProject(req.params.id, req.user.id);
    return res.status(200).json({ message: 'Deleted' });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * GET /api/projects
 */
async function list(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await projectService.getUserProjects(req.user.id, page, limit);
    return res.status(200).json({
      projects: result.projects,
      total: result.total,
      page: result.page,
      pages: result.pages,
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * POST /api/projects/:id/duplicate
 */
async function duplicate(req, res) {
  try {
    const project = await projectService.duplicateProject(req.params.id, req.user.id);
    return res.status(201).json(project);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = {
  create,
  getOne,
  update,
  delete: deleteProject,
  list,
  duplicate,
};
