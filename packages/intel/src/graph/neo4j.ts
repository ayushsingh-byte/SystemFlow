import neo4j, { Driver } from 'neo4j-driver';
import type { TypedEdge, NodeFamily, EdgeType } from '../types.js';

export interface GraphNode {
  node_id: string;
  type: string;
  family: NodeFamily;
  labels: string[];
}

export class IntelGraphClient {
  private driver: Driver;

  constructor(uri: string, user: string, password: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  /** MERGE a node. Sets type, family, updated_at. */
  async upsertNode(node_id: string, type: string, family: NodeFamily): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `MERGE (n:Node { node_id: $node_id })
         SET n.type = $type, n.family = $family, n.updated_at = timestamp()`,
        { node_id, type, family },
      );
    } finally {
      await session.close();
    }
  }

  /** MERGE a typed edge. Uses dynamic Cypher for the relationship type. */
  async upsertEdge(
    edge: Omit<TypedEdge, 'expected_latency_ms' | 'observed_throughput'> & { confidence?: number },
  ): Promise<void> {
    const session = this.driver.session();
    try {
      // The relationship type must be dynamic — use backtick quoting.
      const cypher = `
        MATCH (a:Node { node_id: $source_node_id })
        MATCH (b:Node { node_id: $target_node_id })
        MERGE (a)-[r:\`${edge.type}\`]->(b)
        SET r.criticality       = $criticality,
            r.failure_propagation = $failure_propagation,
            r.confidence        = $confidence,
            r.discovery_method  = $discovery_method,
            r.updated_at        = timestamp()
      `;
      await session.run(cypher, {
        source_node_id:     edge.source_node_id,
        target_node_id:     edge.target_node_id,
        criticality:        edge.criticality,
        failure_propagation: edge.failure_propagation,
        confidence:         edge.confidence ?? null,
        discovery_method:   edge.discovery_method ?? null,
      });
    } finally {
      await session.close();
    }
  }

  /** Return N-hop neighborhood as { nodes, edges }. Used by the causal engine. */
  async getNeighborhood(
    node_id: string,
    hops = 2,
  ): Promise<{ nodes: GraphNode[]; edges: TypedEdge[] }> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH path = (start:Node { node_id: $node_id })-[*1..${hops}]-(neighbor:Node)
         RETURN path`,
        { node_id },
      );

      const nodeMap = new Map<string, GraphNode>();
      const edgeSet = new Map<string, TypedEdge>();

      for (const record of result.records) {
        const p = record.get('path') as {
          segments: Array<{
            start: { properties: Record<string, unknown>; labels: string[] };
            end:   { properties: Record<string, unknown>; labels: string[] };
            relationship: { type: string; properties: Record<string, unknown> };
          }>;
        };

        for (const seg of p.segments) {
          const startNode  = seg.start;
          const endNode    = seg.end;
          const rel        = seg.relationship;

          for (const n of [startNode, endNode]) {
            const nid = n.properties['node_id'] as string;
            if (!nodeMap.has(nid)) {
              nodeMap.set(nid, {
                node_id: nid,
                type:    (n.properties['type'] as string) ?? '',
                family:  (n.properties['family'] as NodeFamily) ?? 'ComputeWorkload',
                labels:  n.labels,
              });
            }
          }

          const src = startNode.properties['node_id'] as string;
          const tgt = endNode.properties['node_id'] as string;
          const edgeKey = `${src}→${rel.type}→${tgt}`;
          if (!edgeSet.has(edgeKey)) {
            edgeSet.set(edgeKey, this._hydrateEdge(src, tgt, rel.type, rel.properties));
          }
        }
      }

      return {
        nodes: Array.from(nodeMap.values()),
        edges: Array.from(edgeSet.values()),
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Find nodes that have an outgoing edge to node_id (upstream nodes).
   * Used by the causal engine for root-cause tracing.
   */
  async getUpstreamNodes(
    node_id: string,
    max_hops = 3,
  ): Promise<Array<{ node: GraphNode; edge_type: EdgeType; hops: number }>> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH path = (upstream:Node)-[*1..${max_hops}]->(target:Node { node_id: $node_id })
         WITH upstream, relationships(path) AS rels, length(path) AS hops
         RETURN upstream, rels[0] AS first_rel, hops
         ORDER BY hops ASC`,
        { node_id },
      );

      return result.records.map(record => {
        const u        = record.get('upstream') as { properties: Record<string, unknown>; labels: string[] };
        const rel      = record.get('first_rel') as { type: string };
        const hops     = (record.get('hops') as number | { toNumber(): number });
        const hopCount = typeof hops === 'number' ? hops : hops.toNumber();

        return {
          node: {
            node_id: u.properties['node_id'] as string,
            type:    (u.properties['type'] as string) ?? '',
            family:  (u.properties['family'] as NodeFamily) ?? 'ComputeWorkload',
            labels:  u.labels,
          },
          edge_type: rel.type as EdgeType,
          hops: hopCount,
        };
      });
    } finally {
      await session.close();
    }
  }

  /** Find shortest path between two nodes. */
  async shortestPath(
    from_node_id: string,
    to_node_id: string,
  ): Promise<Array<{ node_id: string; edge_type?: EdgeType }>> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (start:Node { node_id: $from }), (end:Node { node_id: $to }),
               path = shortestPath((start)-[*]-(end))
         RETURN nodes(path) AS pathNodes, relationships(path) AS pathRels`,
        { from: from_node_id, to: to_node_id },
      );

      if (result.records.length === 0) return [];

      const record   = result.records[0];
      if (record === undefined) return [];

      const pathNodes = record.get('pathNodes') as Array<{ properties: Record<string, unknown> }>;
      const pathRels  = record.get('pathRels') as Array<{ type: string }>;

      const out: Array<{ node_id: string; edge_type?: EdgeType }> = [];
      for (let i = 0; i < pathNodes.length; i++) {
        const n = pathNodes[i];
        if (n === undefined) continue;
        out.push({
          node_id:   n.properties['node_id'] as string,
          edge_type: i < pathRels.length ? ((pathRels[i] as { type: string } | undefined)?.type as EdgeType | undefined) : undefined,
        });
      }
      return out;
    } finally {
      await session.close();
    }
  }

  /** List all nodes registered in the graph. */
  async listNodes(): Promise<GraphNode[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (n:Node) RETURN n ORDER BY n.node_id`,
      );
      return result.records.map(record => {
        const n = record.get('n') as { properties: Record<string, unknown>; labels: string[] };
        return {
          node_id: n.properties['node_id'] as string,
          type:    (n.properties['type'] as string) ?? '',
          family:  (n.properties['family'] as NodeFamily) ?? 'ComputeWorkload',
          labels:  n.labels,
        };
      });
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private _hydrateEdge(
    source_node_id: string,
    target_node_id: string,
    relType: string,
    props: Record<string, unknown>,
  ): TypedEdge {
    return {
      source_node_id,
      target_node_id,
      type:               (relType as EdgeType),
      criticality:        (props['criticality'] as TypedEdge['criticality']) ?? 'optional',
      expected_latency_ms: { p50: 0, p99: 0 },
      failure_propagation: (props['failure_propagation'] as TypedEdge['failure_propagation']) ?? 'isolated',
      observed_throughput: 0,
      confidence:         (props['confidence'] as number | undefined),
      discovery_method:   (props['discovery_method'] as TypedEdge['discovery_method'] | undefined),
    };
  }
}

export function createGraphClient(
  uri      = process.env['NEO4J_URI']      ?? 'bolt://localhost:7687',
  user     = process.env['NEO4J_USER']     ?? 'neo4j',
  password = process.env['NEO4J_PASSWORD'] ?? 'systemflow_dev',
): IntelGraphClient {
  return new IntelGraphClient(uri, user, password);
}
