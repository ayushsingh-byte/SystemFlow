import type { SignalReading, TypedEdge, EdgeType } from '../types.js';
import type { IntelGraphClient } from '../graph/neo4j.js';
import type { DNALoader } from '../dna/loader.js';

export interface DiscoveredEdge {
  source: string;
  target: string;
  type: EdgeType;
  confidence: number;
  reason: string;
}

/** Map keyed by node_id → list of readings for that node. */
type NodeReadingMap = Map<string, SignalReading[]>;

export class RelationshipDiscoverer {
  constructor(
    private graph: IntelGraphClient,
    private dna: DNALoader,
  ) {}

  /**
   * Analyze a batch of concurrent signal readings across multiple nodes.
   * Returns candidate edges inferred from correlated signals.
   *
   * Rules:
   * 1. Node A: rising `request_latency_p99`  +  Node B (RelationalDatabase): rising `disk_iops_saturation`
   *    → candidate DB_QUERY  A→B  (conf 0.60)
   *
   * 2. Node A: rising `request_latency_p99`  +  Node B (InMemoryStore): rising `connection_pool_saturation`
   *    → candidate CACHE_LOOKUP  A→B  (conf 0.65)
   *
   * 3. Node A (StatelessHttpWorker): high `connection_count_active`  +  Node B (ApplicationRuntime): rising `request_queue_depth`
   *    → candidate LOAD_BALANCES_TO  A→B  (conf 0.70)
   *
   * 4. Node A: high `bandwidth_out`  +  Node B: matching `bandwidth_in` (within 20 %)
   *    → candidate HTTP_CALL or GRPC_CALL  A→B  (conf 0.55)
   */
  async analyzeReadings(readings: SignalReading[]): Promise<DiscoveredEdge[]> {
    // Group by node_id
    const byNode: NodeReadingMap = new Map();
    for (const r of readings) {
      const list = byNode.get(r.node_id);
      if (list !== undefined) {
        list.push(r);
      } else {
        byNode.set(r.node_id, [r]);
      }
    }

    const nodeIds = Array.from(byNode.keys());
    const discovered: DiscoveredEdge[] = [];
    const seen = new Set<string>();

    // Helper: get signal value for a node (0 if absent)
    const getVal = (nodeReadings: SignalReading[], signal: string): number => {
      const r = nodeReadings.find(x => x.signal === signal);
      return r !== undefined ? r.value : 0;
    };

    // Fetch DNA family for each node present in the graph
    const familyCache = new Map<string, string | null>();
    const getFamily = async (nodeId: string): Promise<string | null> => {
      if (familyCache.has(nodeId)) return familyCache.get(nodeId) ?? null;
      try {
        const nodes = await this.graph.listNodes();
        const found = nodes.find(n => n.node_id === nodeId);
        const family = found !== undefined ? found.family : null;
        // Cache for all nodes in one shot
        for (const n of nodes) {
          familyCache.set(n.node_id, n.family);
        }
        if (!familyCache.has(nodeId)) familyCache.set(nodeId, null);
        return family;
      } catch {
        familyCache.set(nodeId, null);
        return null;
      }
    };

    const emit = (edge: DiscoveredEdge): void => {
      const key = `${edge.source}→${edge.type}→${edge.target}`;
      if (!seen.has(key)) {
        seen.add(key);
        discovered.push(edge);
      }
    };

    // Pre-fetch all families in parallel
    await Promise.all(nodeIds.map(id => getFamily(id)));

    // Evaluate all ordered pairs (A, B) where A ≠ B
    for (let i = 0; i < nodeIds.length; i++) {
      const idA = nodeIds[i];
      if (idA === undefined) continue;
      const readingsA = byNode.get(idA) ?? [];

      for (let j = 0; j < nodeIds.length; j++) {
        if (i === j) continue;
        const idB = nodeIds[j];
        if (idB === undefined) continue;
        const readingsB = byNode.get(idB) ?? [];

        const familyA = familyCache.get(idA) ?? null;
        const familyB = familyCache.get(idB) ?? null;

        const latP99A         = getVal(readingsA, 'request_latency_p99');
        const diskIopsB       = getVal(readingsB, 'disk_iops_saturation');
        const connPoolSatB    = getVal(readingsB, 'connection_pool_saturation');
        const connCountA      = getVal(readingsA, 'connection_count_active');
        const queueDepthB     = getVal(readingsB, 'request_queue_depth');
        const bwOutA          = getVal(readingsA, 'bandwidth_out');
        const bwInB           = getVal(readingsB, 'bandwidth_in');

        // Rule 1: A has rising request_latency_p99 AND B (RelationalDatabase) has rising disk_iops_saturation
        if (
          latP99A > 0 &&
          diskIopsB > 0 &&
          familyB === 'RelationalDatabase'
        ) {
          emit({
            source:     idA,
            target:     idB,
            type:       'DB_QUERY',
            confidence: 0.60,
            reason:     `Node ${idA} has rising request_latency_p99 (${latP99A}) while RelationalDatabase ${idB} has rising disk_iops_saturation (${diskIopsB})`,
          });
        }

        // Rule 2: A has rising request_latency_p99 AND B (InMemoryStore) has rising connection_pool_saturation
        if (
          latP99A > 0 &&
          connPoolSatB > 0 &&
          familyB === 'InMemoryStore'
        ) {
          emit({
            source:     idA,
            target:     idB,
            type:       'CACHE_LOOKUP',
            confidence: 0.65,
            reason:     `Node ${idA} has rising request_latency_p99 (${latP99A}) while InMemoryStore ${idB} has rising connection_pool_saturation (${connPoolSatB})`,
          });
        }

        // Rule 3: A (StatelessHttpWorker) has high connection_count_active AND B (ApplicationRuntime) has rising request_queue_depth
        if (
          connCountA > 0 &&
          queueDepthB > 0 &&
          familyA === 'StatelessHttpWorker' &&
          familyB === 'ApplicationRuntime'
        ) {
          emit({
            source:     idA,
            target:     idB,
            type:       'LOAD_BALANCES_TO',
            confidence: 0.70,
            reason:     `StatelessHttpWorker ${idA} has high connection_count_active (${connCountA}) while ApplicationRuntime ${idB} has rising request_queue_depth (${queueDepthB})`,
          });
        }

        // Rule 4: A has high bandwidth_out AND B has matching bandwidth_in (within 20 %)
        if (bwOutA > 0 && bwInB > 0) {
          const diff = Math.abs(bwOutA - bwInB);
          const larger = Math.max(bwOutA, bwInB);
          if (larger > 0 && diff / larger <= 0.20) {
            // Prefer GRPC_CALL if both nodes look like app-runtime types, else HTTP_CALL
            const edgeType: EdgeType =
              familyA === 'ApplicationRuntime' && familyB === 'ApplicationRuntime'
                ? 'GRPC_CALL'
                : 'HTTP_CALL';

            emit({
              source:     idA,
              target:     idB,
              type:       edgeType,
              confidence: 0.55,
              reason:     `Node ${idA} bandwidth_out (${bwOutA}) matches Node ${idB} bandwidth_in (${bwInB}) within 20 %`,
            });
          }
        }
      }
    }

    return discovered;
  }

  /**
   * Persist discovered edges above a confidence threshold to the graph.
   * Skips edges that already exist with higher or equal confidence.
   * Returns the count of edges actually written.
   */
  async persistDiscovered(
    edges: DiscoveredEdge[],
    minConfidence = 0.50,
  ): Promise<number> {
    const eligible = edges.filter(e => e.confidence >= minConfidence);

    // Fetch existing neighborhood for each involved source node to check pre-existing edges
    const existingByKey = new Map<string, number>();
    const sourceIds = [...new Set(eligible.map(e => e.source))];

    for (const srcId of sourceIds) {
      try {
        const { edges: existingEdges } = await this.graph.getNeighborhood(srcId, 1);
        for (const ex of existingEdges) {
          const key = `${ex.source_node_id}→${ex.type}→${ex.target_node_id}`;
          existingByKey.set(key, ex.confidence ?? 0);
        }
      } catch {
        // Node may not exist yet — proceed without pre-existing data
      }
    }

    let written = 0;
    for (const edge of eligible) {
      const key = `${edge.source}→${edge.type}→${edge.target}`;
      const existingConf = existingByKey.get(key) ?? -1;
      if (edge.confidence <= existingConf) continue;

      const typedEdge: Omit<TypedEdge, 'expected_latency_ms' | 'observed_throughput'> & { confidence?: number } = {
        source_node_id:     edge.source,
        target_node_id:     edge.target,
        type:               edge.type,
        criticality:        'optional',
        failure_propagation: 'isolated',
        confidence:         edge.confidence,
        discovery_method:   'connection_table',
      };

      try {
        await this.graph.upsertEdge(typedEdge);
        written++;
      } catch {
        // Best-effort — skip failed upserts silently
      }
    }

    return written;
  }
}
