const { v4: uuid } = require('uuid');
const db = require('../db');

const J = JSON.stringify;
const P = JSON.parse;

function rowToSim(row, includeLog = true) {
  if (!row) return null;
  const out = {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    config: P(row.config),
    metrics: P(row.metrics),
    duration: row.duration,
    status: row.status,
    createdAt: row.created_at,
  };
  if (includeLog) out.requestLog = P(row.request_log);
  return out;
}

function saveSimulation(userId, projectId, data) {
  const { config = {}, metrics = {}, requestLog = [], duration = 0, status = 'completed' } = data;

  if (projectId) {
    const project = db.prepare('SELECT user_id FROM projects WHERE id = ?').get(projectId);
    if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }
    if (project.user_id !== userId) { const e = new Error('Access denied'); e.status = 403; throw e; }
  }

  const id = uuid();
  const capped = Array.isArray(requestLog) ? requestLog.slice(0, 500) : [];
  db.prepare(`
    INSERT INTO simulations (id, project_id, user_id, config, metrics, request_log, duration, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, projectId || null, userId, J(config), J(metrics), J(capped), duration, status);

  return rowToSim(db.prepare('SELECT * FROM simulations WHERE id = ?').get(id));
}

function getSimulationHistory(projectId, userId, page = 1, limit = 20) {
  const project = db.prepare('SELECT user_id FROM projects WHERE id = ?').get(projectId);
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }
  if (project.user_id !== userId) { const e = new Error('Access denied'); e.status = 403; throw e; }

  const offset = (page - 1) * limit;
  const rows = db.prepare(`
    SELECT id, project_id, user_id, config, metrics, duration, status, created_at
    FROM simulations WHERE project_id = ? AND user_id = ?
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(projectId, userId, limit, offset);
  const { total } = db.prepare('SELECT COUNT(*) as total FROM simulations WHERE project_id = ? AND user_id = ?').get(projectId, userId);

  return { simulations: rows.map(r => rowToSim(r, false)), total, page, pages: Math.ceil(total / limit) };
}

function getSimulation(simId, userId) {
  const row = db.prepare('SELECT * FROM simulations WHERE id = ?').get(simId);
  if (!row) { const e = new Error('Simulation not found'); e.status = 404; throw e; }
  if (row.user_id !== userId) { const e = new Error('Access denied'); e.status = 403; throw e; }
  return rowToSim(row);
}

function deleteSimulation(simId, userId) {
  const row = db.prepare('SELECT user_id FROM simulations WHERE id = ?').get(simId);
  if (!row) { const e = new Error('Simulation not found'); e.status = 404; throw e; }
  if (row.user_id !== userId) { const e = new Error('Access denied'); e.status = 403; throw e; }
  db.prepare('DELETE FROM simulations WHERE id = ?').run(simId);
  return { message: 'Deleted' };
}

function getSimulationStats(projectId, userId) {
  const project = db.prepare('SELECT user_id FROM projects WHERE id = ?').get(projectId);
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }
  if (project.user_id !== userId) { const e = new Error('Access denied'); e.status = 403; throw e; }

  const rows = db.prepare('SELECT metrics, duration FROM simulations WHERE project_id = ? AND user_id = ?').all(projectId, userId);
  if (!rows.length) return { totalRuns: 0, totalRequests: 0, avgLatency: 0, avgErrorRate: 0, avgThroughput: 0, totalDuration: 0 };

  let totalRequests = 0, latSum = 0, errSum = 0, tpSum = 0, totalDuration = 0;
  for (const r of rows) {
    const m = P(r.metrics);
    totalRequests += m.totalRequests || 0;
    latSum += m.avgLatency || 0;
    errSum += m.errorRate || 0;
    tpSum += m.throughput || 0;
    totalDuration += r.duration || 0;
  }
  const n = rows.length;
  return { totalRuns: n, totalRequests, avgLatency: latSum / n, avgErrorRate: errSum / n, avgThroughput: tpSum / n, totalDuration };
}

module.exports = { saveSimulation, getSimulationHistory, getSimulation, deleteSimulation, getSimulationStats };
