const { v4: uuid } = require('uuid');
const db = require('../db');

const J = JSON.stringify;
const P = JSON.parse;

function rowToProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    nodes: P(row.nodes),
    edges: P(row.edges),
    simConfig: P(row.sim_config),
    tags: P(row.tags),
    isPublic: row.is_public === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertOwner(row, userId) {
  if (!row) {
    const err = new Error('Project not found'); err.status = 404; throw err;
  }
  if (row.user_id !== userId) {
    const err = new Error('Access denied'); err.status = 403; throw err;
  }
}

function createProject(userId, data) {
  const { name, description = '', nodes = [], edges = [], tags = [], isPublic = false, simConfig = {} } = data;
  if (!name?.trim()) {
    const err = new Error('Project name is required'); err.status = 400; throw err;
  }
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO projects (id, user_id, name, description, nodes, edges, sim_config, tags, is_public, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, name.trim(), description, J(nodes), J(edges), J(simConfig), J(tags), isPublic ? 1 : 0, now, now);
  return rowToProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
}

function getProject(projectId, userId) {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  assertOwner(row, userId);
  return rowToProject(row);
}

function updateProject(projectId, userId, data) {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  assertOwner(row, userId);

  const fields = [];
  const vals = [];

  if (data.name !== undefined)        { fields.push('name = ?');        vals.push(data.name.trim()); }
  if (data.description !== undefined) { fields.push('description = ?'); vals.push(data.description); }
  if (data.nodes !== undefined)       { fields.push('nodes = ?');       vals.push(J(data.nodes)); }
  if (data.edges !== undefined)       { fields.push('edges = ?');       vals.push(J(data.edges)); }
  if (data.simConfig !== undefined)   { fields.push('sim_config = ?');  vals.push(J(data.simConfig)); }
  if (data.tags !== undefined)        { fields.push('tags = ?');        vals.push(J(data.tags)); }
  if (data.isPublic !== undefined)    { fields.push('is_public = ?');   vals.push(data.isPublic ? 1 : 0); }

  fields.push('updated_at = ?');
  vals.push(new Date().toISOString());
  vals.push(projectId);

  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  return rowToProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId));
}

function deleteProject(projectId, userId) {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  assertOwner(row, userId);
  db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
  return { message: 'Deleted' };
}

function getUserProjects(userId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const rows = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?').all(userId, limit, offset);
  const { total } = db.prepare('SELECT COUNT(*) as total FROM projects WHERE user_id = ?').get(userId);
  return {
    projects: rows.map(rowToProject),
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

function duplicateProject(projectId, userId) {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  assertOwner(row, userId);
  return createProject(userId, {
    name: `${row.name} (Copy)`,
    description: row.description,
    nodes: P(row.nodes),
    edges: P(row.edges),
    simConfig: P(row.sim_config),
    tags: P(row.tags),
  });
}

module.exports = { createProject, getProject, updateProject, deleteProject, getUserProjects, duplicateProject };
