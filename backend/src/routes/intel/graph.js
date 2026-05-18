/**
 * Typed relationship graph endpoints (Neo4j).
 * GET  /api/intel/graph/nodes/:nodeId/neighborhood
 * POST /api/intel/graph/nodes
 * POST /api/intel/graph/edges
 */
const express = require('express');
const router = express.Router();
const graphService = require('../../services/intel/graphService');

// GET neighborhood (2-hop) for causal context
router.get('/nodes/:nodeId/neighborhood', async (req, res) => {
  try {
    const graph = await graphService.getNeighborhood(req.params.nodeId, 2);
    return res.json(graph);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST register a node in the graph DB
router.post('/nodes', async (req, res) => {
  const { node_id, type, family, dna } = req.body;
  if (!node_id || !type) {
    return res.status(400).json({ error: 'node_id and type required' });
  }
  try {
    await graphService.upsertNode({ node_id, type, family, dna });
    return res.status(201).json({ created: node_id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST register a typed edge
router.post('/edges', async (req, res) => {
  const { source, target, type, criticality, failure_propagation } = req.body;
  if (!source || !target || !type) {
    return res.status(400).json({ error: 'source, target, type required' });
  }
  const VALID_EDGE_TYPES = [
    'HTTP_CALL', 'GRPC_CALL', 'DB_QUERY', 'CACHE_LOOKUP',
    'QUEUE_PUBLISH', 'QUEUE_CONSUME', 'FILE_READ', 'FILE_WRITE',
    'DNS_RESOLVE', 'CONTAINER_HOSTS', 'REPLICATES_TO', 'LOAD_BALANCES_TO',
  ];
  if (!VALID_EDGE_TYPES.includes(type)) {
    return res.status(400).json({ error: `invalid edge type. valid: ${VALID_EDGE_TYPES.join(', ')}` });
  }
  try {
    await graphService.upsertEdge({ source, target, type, criticality, failure_propagation });
    return res.status(201).json({ created: `${source}→${target}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
