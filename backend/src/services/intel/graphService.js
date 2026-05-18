/**
 * Graph service — typed relationship graph via Neo4j.
 * Nodes carry DNA type. Edges carry typed semantics (HTTP_CALL, DB_QUERY, etc.)
 */
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'systemflow_dev'
  )
);

/**
 * Upsert a node in the graph. MERGE on node_id to avoid duplicates.
 */
async function upsertNode({ node_id, type, family, dna }) {
  const session = driver.session();
  try {
    await session.run(
      `MERGE (n:InfraNode {node_id: $node_id})
       SET n.type = $type,
           n.family = $family,
           n.dna_type = $type,
           n.updated_at = datetime()
       RETURN n`,
      { node_id, type, family: family || null }
    );
  } finally {
    await session.close();
  }
}

/**
 * Upsert a typed edge between two nodes.
 * Edge type must be one of the 12 valid EdgeTypes.
 */
async function upsertEdge({ source, target, type, criticality, failure_propagation }) {
  const session = driver.session();
  try {
    // Dynamic relationship type requires template — safe because type is validated in route layer
    await session.run(
      `MATCH (a:InfraNode {node_id: $source})
       MATCH (b:InfraNode {node_id: $target})
       MERGE (a)-[r:${type}]->(b)
       SET r.criticality = $criticality,
           r.failure_propagation = $failure_propagation,
           r.updated_at = datetime()
       RETURN r`,
      { source, target, criticality: criticality || 'important', failure_propagation: failure_propagation || 'degrades' }
    );
  } finally {
    await session.close();
  }
}

/**
 * Return N-hop neighborhood of a node — used by causal engine for context.
 * Returns { nodes: [], edges: [] } in a format the frontend can render.
 */
async function getNeighborhood(node_id, hops = 2) {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH path = (start:InfraNode {node_id: $node_id})-[*1..${hops}]-(neighbor)
       RETURN path`,
      { node_id }
    );

    const nodes = new Map();
    const edges = [];

    for (const record of result.records) {
      const path = record.get('path');
      for (const seg of path.segments) {
        const s = seg.start.properties;
        const e = seg.end.properties;
        const r = seg.relationship;
        if (!nodes.has(s.node_id)) nodes.set(s.node_id, s);
        if (!nodes.has(e.node_id)) nodes.set(e.node_id, e);
        edges.push({
          source: s.node_id,
          target: e.node_id,
          type: r.type,
          criticality: r.properties.criticality,
          failure_propagation: r.properties.failure_propagation,
        });
      }
    }

    return { nodes: [...nodes.values()], edges };
  } finally {
    await session.close();
  }
}

async function close() { await driver.close(); }

module.exports = { upsertNode, upsertEdge, getNeighborhood, close };
