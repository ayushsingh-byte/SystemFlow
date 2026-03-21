import { Node, Edge } from 'reactflow';
import {
  NodeData,
  SimRequest,
  SimulationMetrics,
  MetricPoint,
  NodeMetrics,
  RequestLogEntry,
  TrafficPattern,
  LatencyPercentiles,
  SystemHealthScore,
} from './types';

export type SimulationEventType =
  | 'request_started'
  | 'request_moved'
  | 'request_completed'
  | 'request_failed'
  | 'node_status_changed'
  | 'metrics_updated'
  | 'edge_animated'
  | 'alert';

export interface SimulationEvent {
  type: SimulationEventType;
  requestId?: string;
  nodeId?: string;
  edgeId?: string;
  data?: unknown;
}

type EventListener = (event: SimulationEvent) => void;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

const QUEUE_TYPE_IDS = new Set(['queue', 'kafka', 'broker', 'event-bus', 'rabbitmq', 'sqs', 'pubsub', 'kinesis', 'eventbridge', 'nats']);
const CACHE_TYPE_IDS = new Set(['cache', 'redis', 'memcached', 'elasticache', 'varnish', 'cdn-cache']);
const CDN_TYPE_IDS = new Set(['cdn', 'cloudfront', 'fastly', 'akamai', 'cloudflare-cdn']);
const LB_TYPE_IDS = new Set(['load-balancer', 'alb', 'nlb', 'elb', 'haproxy', 'nginx-lb', 'glb', 'traffic-manager', 'load-balancing-gcp', 'azure-lb']);
const DB_TYPE_IDS = new Set(['database', 'postgresql', 'mysql', 'mongodb', 'cassandra', 'dynamodb', 'aurora', 'rds', 'cosmos-db', 'firestore', 'bigtable', 'spanner', 'redshift', 'bigquery', 'snowflake']);
const RATE_LIMITER_IDS = new Set(['rate-limiter', 'throttle', 'quota']);

interface CircuitState {
  open: boolean;
  openedAt: number;
  failCount: number;
  totalCount: number;
  lastReset: number;
}

export class SimulationEngine {
  private nodes: Map<string, Node<NodeData>> = new Map();
  private edges: Edge[] = [];
  private adjacency: Map<string, string[]> = new Map();

  private activeRequests: Map<string, SimRequest> = new Map();
  private completedRequests: SimRequest[] = [];

  private totalRequests = 0;
  private completedCount = 0;
  private failedCount = 0;
  private allLatencies: number[] = [];
  private recentLatencies: number[] = [];
  private nodeLoad: Map<string, number> = new Map();
  private nodeQueueSize: Map<string, number> = new Map();
  private nodeDropped: Map<string, number> = new Map();
  private nodeMetrics: Map<string, NodeMetrics> = new Map();
  private requestLog: RequestLogEntry[] = [];
  private edgeLoad: Map<string, number> = new Map();

  private timeSeriesData: MetricPoint[] = [];

  private listeners: EventListener[] = [];
  private requestInterval: ReturnType<typeof setInterval> | null = null;
  private metricsInterval: ReturnType<typeof setInterval> | null = null;
  private patternInterval: ReturnType<typeof setInterval> | null = null;

  private trafficRate = 5;
  private baseTrafficRate = 5;
  private failureInjection = false;
  private trafficPattern: TrafficPattern = 'constant';
  private startTime = 0;
  private running = false;
  private paused = false;
  private reqIdCounter = 0;
  private patternPhase = 0;

  private circuitState: Map<string, CircuitState> = new Map();
  private BATCH_THRESHOLD = 1000;

  // Batched node update flushing — prevents per-request setState storms
  private pendingNodeUpdates: Map<string, { status: NodeData['status']; currentLoad: number; queue_size: number; dropped_requests: number }> = new Map();
  private nodeFlushInterval: ReturnType<typeof setInterval> | null = null;

  // Per-edge animation throttle — one emit per edge per 200ms max
  private edgeAnimLastEmit: Map<string, number> = new Map();
  private readonly EDGE_ANIM_THROTTLE_MS = 80;

  // Throttle request log emits — log updates at most every 150ms regardless of req/s
  private requestLogLastEmit = 0;
  private readonly REQUEST_LOG_THROTTLE_MS = 150;

  updateGraph(nodes: Node<NodeData>[], edges: Edge[]) {
    this.nodes.clear();
    this.adjacency.clear();
    for (const n of nodes) {
      this.nodes.set(n.id, n);
      this.adjacency.set(n.id, []);
    }
    for (const e of edges) {
      const targets = this.adjacency.get(e.source) || [];
      if (!targets.includes(e.target)) targets.push(e.target);
      this.adjacency.set(e.source, targets);
    }
    this.edges = edges;
  }

  setTrafficRate(rate: number) {
    this.trafficRate = Math.max(1, Math.min(1000000, rate));
    this.baseTrafficRate = this.trafficRate;
    if (this.running && !this.paused) this.restartRequestInterval();
  }

  setFailureInjection(enabled: boolean) { this.failureInjection = enabled; }
  setTrafficPattern(p: TrafficPattern) { this.trafficPattern = p; }

  on(listener: EventListener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private emit(event: SimulationEvent) {
    for (const l of this.listeners) l(event);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.startTime = Date.now();
    this.patternPhase = 0;
    // Discard any stale updates left by post-stop in-flight callbacks from the previous run
    this.pendingNodeUpdates.clear();
    this.restartRequestInterval();
    this.startMetrics();
    this.startPatternEngine();
    this.startNodeFlush();
  }

  pause() {
    this.paused = true;
    this.stopRequestInterval();
    this.stopPatternEngine();
    this.stopNodeFlush();
  }

  resume() {
    if (!this.running) return;
    this.paused = false;
    this.restartRequestInterval();
    this.startPatternEngine();
    this.startNodeFlush();
  }

  stop() {
    this.running = false;
    this.paused = false;
    this.stopRequestInterval();
    this.stopMetrics();
    this.stopPatternEngine();

    this.stopNodeFlush();
    this.pendingNodeUpdates.clear();
    this.edgeAnimLastEmit.clear();

    this.activeRequests.clear();
    this.completedRequests = [];
    this.nodeLoad.clear();
    this.nodeQueueSize.clear();
    this.nodeDropped.clear();
    this.nodeMetrics.clear();
    this.edgeLoad.clear();
    this.allLatencies = [];
    this.recentLatencies = [];
    this.requestLog = [];
    this.totalRequests = 0;
    this.completedCount = 0;
    this.failedCount = 0;
    this.reqIdCounter = 0;
    this.patternPhase = 0;
    this.trafficRate = this.baseTrafficRate;
    this.timeSeriesData = [];
    this.circuitState.clear();

    for (const [id] of this.nodes) {
      this.emit({ type: 'node_status_changed', nodeId: id, data: { status: 'idle', currentLoad: 0, queue_size: 0, dropped_requests: 0 } });
    }
    this.emitMetrics();
  }

  private isBatchMode(): boolean {
    return this.trafficRate >= this.BATCH_THRESHOLD;
  }

  private restartRequestInterval() {
    this.stopRequestInterval();
    if (this.isBatchMode()) {
      // Batch mode: 100ms tick, spawn batch
      this.requestInterval = setInterval(() => {
        const batchSize = Math.round(this.trafficRate * 0.1);
        for (let i = 0; i < Math.min(batchSize, 5000); i++) {
          this.spawnRequest();
        }
      }, 100);
    } else {
      const ms = Math.max(20, 1000 / this.trafficRate);
      this.requestInterval = setInterval(() => this.spawnRequest(), ms);
    }
  }

  private stopRequestInterval() {
    if (this.requestInterval) { clearInterval(this.requestInterval); this.requestInterval = null; }
  }

  private startMetrics() {
    this.metricsInterval = setInterval(() => this.updateMetrics(), 1000);
  }

  private stopMetrics() {
    if (this.metricsInterval) { clearInterval(this.metricsInterval); this.metricsInterval = null; }
  }

  private startPatternEngine() {
    this.patternInterval = setInterval(() => this.updatePattern(), 500);
  }

  private stopPatternEngine() {
    if (this.patternInterval) { clearInterval(this.patternInterval); this.patternInterval = null; }
  }

  private startNodeFlush() {
    this.stopNodeFlush();
    this.nodeFlushInterval = setInterval(() => this.flushNodeUpdates(), 120);
  }

  private stopNodeFlush() {
    if (this.nodeFlushInterval) { clearInterval(this.nodeFlushInterval); this.nodeFlushInterval = null; }
  }

  // Queue a node update keeping the PEAK (highest) load seen during the flush window.
  // This prevents the race where a fast request increments then decrements before the
  // flush fires — the node would appear permanently idle even while processing.
  private queueNodeUpdate(
    nodeId: string,
    status: NodeData['status'],
    currentLoad: number,
    queue_size: number,
    dropped_requests: number,
  ) {
    const existing = this.pendingNodeUpdates.get(nodeId);
    if (!existing || currentLoad > existing.currentLoad) {
      this.pendingNodeUpdates.set(nodeId, { status, currentLoad, queue_size, dropped_requests });
    }
  }

  private flushNodeUpdates() {
    if (this.pendingNodeUpdates.size === 0) return;
    // Emit peak-load states collected since last flush
    for (const [nodeId, data] of this.pendingNodeUpdates) {
      this.emit({ type: 'node_status_changed', nodeId, data });
    }
    this.pendingNodeUpdates.clear();
    // Immediately requeue the ACTUAL current load for every node so the next flush
    // corrects any "peak overestimates" back to real values (idle nodes return to idle).
    for (const [nodeId, node] of this.nodes) {
      const load = this.nodeLoad.get(nodeId) || 0;
      const util = node.data.max_capacity > 0 ? load / node.data.max_capacity : 0;
      const status: NodeData['status'] =
        load === 0 ? 'idle' :
        util >= 1.0 ? 'overloaded' :
        util >= 0.7 ? 'stressed' : 'healthy';
      this.pendingNodeUpdates.set(nodeId, {
        status, currentLoad: load,
        queue_size: this.nodeQueueSize.get(nodeId) || 0,
        dropped_requests: this.nodeDropped.get(nodeId) || 0,
      });
    }
  }

  // Adaptive throttle: at low req/s every packet must be visible;
  // at high req/s we suppress to avoid React setState storms.
  private getEdgeThrottleMs(): number {
    if (this.trafficRate < 30)   return 0;    // always show at low rates
    if (this.trafficRate < 150)  return 60;
    if (this.trafficRate < 600)  return 120;
    return 250;
  }

  private emitEdgeAnimated(edgeId: string, requestId: string) {
    const throttle = this.getEdgeThrottleMs();
    if (throttle === 0) {
      this.emit({ type: 'edge_animated', edgeId, requestId });
      return;
    }
    const now = Date.now();
    if ((now - (this.edgeAnimLastEmit.get(edgeId) || 0)) >= throttle) {
      this.edgeAnimLastEmit.set(edgeId, now);
      this.emit({ type: 'edge_animated', edgeId, requestId });
    }
  }

  private updatePattern() {
    this.patternPhase += 0.1;
    const base = this.baseTrafficRate;
    let rate = base;
    switch (this.trafficPattern) {
      case 'ramp':
        rate = base * (0.2 + (this.patternPhase / 20));
        break;
      case 'spike':
        rate = (Math.floor(this.patternPhase / 3) % 2 === 0) ? base * 3 : base * 0.3;
        break;
      case 'wave':
        rate = base * (0.5 + 0.5 * Math.sin(this.patternPhase));
        break;
      case 'step': {
        // Step up every 30 ticks (patternPhase increments by 0.1 every 500ms = 6 per 30s)
        const stepLevel = Math.floor(this.patternPhase / 6) + 1;
        rate = base * stepLevel;
        break;
      }
    }
    const clamped = Math.max(1, Math.min(1000000, rate));
    // Only restart the interval when rate changes by at least 5% — prevents
    // constant interval teardown/recreation that causes burst-then-gap behaviour
    if (Math.abs(clamped - this.trafficRate) > Math.max(1, this.trafficRate * 0.05)) {
      this.trafficRate = clamped;
      this.restartRequestInterval();
    }
  }

  private findUserNodes(): string[] {
    const r: string[] = [];
    for (const [id, n] of this.nodes) {
      if (n.data.nodeType === 'user') r.push(id);
    }
    return r;
  }

  private buildPath(startId: string): string[] {
    const visited = new Set<string>();
    const path = [startId];
    let current = startId;
    while (true) {
      const neighbors = (this.adjacency.get(current) || []).filter(n => !visited.has(n));
      if (neighbors.length === 0) break;
      // Load balancer: pick least loaded downstream
      const node = this.nodes.get(current);
      let next: string;
      if (node && LB_TYPE_IDS.has(node.data.nodeType) && neighbors.length > 1) {
        next = neighbors.reduce((best, nid) => {
          return (this.nodeLoad.get(nid) || 0) < (this.nodeLoad.get(best) || 0) ? nid : best;
        }, neighbors[0]);
      } else {
        next = neighbors[Math.floor(Math.random() * neighbors.length)];
      }
      visited.add(current);
      path.push(next);
      current = next;
    }
    return path;
  }

  private spawnRequest() {
    const userNodes = this.findUserNodes();
    if (userNodes.length === 0) return;
    const startNode = userNodes[Math.floor(Math.random() * userNodes.length)];
    const path = this.buildPath(startNode);
    if (path.length < 2) return;

    const id = `req-${++this.reqIdCounter}`;
    const req: SimRequest = {
      id, path, currentNodeIndex: 0,
      startTime: Date.now(), totalLatency: 0,
      failed: false, completed: false,
      isResponse: false,
    };
    this.activeRequests.set(id, req);
    this.totalRequests++;
    this.processRequestAtNode(req);
  }

  private processRequestAtNode(req: SimRequest) {
    if (!this.running || req.completed || req.failed) return;
    const nodeId = req.path[req.currentNodeIndex];
    const node = this.nodes.get(nodeId);
    if (!node) { this.completeRequest(req); return; }

    const data = node.data;
    const nodeType = data.nodeType;

    // ─── DISABLED NODE: fail immediately ─────────────────────────────────────
    if (data.enabled === false) {
      this.decrementLoad(nodeId);
      this.failRequest(req, nodeId, 'node_offline');
      return;
    }

    // ─── FIREWALL/WAF BLOCK ───────────────────────────────────────────────────
    if ((data.firewall_enabled !== false) && (data.block_rate ?? 0) > 0) {
      if (Math.random() * 100 < (data.block_rate ?? 0)) {
        this.decrementLoad(nodeId);
        this.failRequest(req, nodeId, 'firewall_blocked');
        return;
      }
    }

    // ─── CIRCUIT BREAKER CHECK ────────────────────────────────────────────────
    if (data.circuit_breaker_enabled) {
      const cb = this.circuitState.get(nodeId) || { open: false, openedAt: 0, failCount: 0, totalCount: 0, lastReset: Date.now() };
      // Reset counters every 60 seconds to allow recovery
      if (Date.now() - cb.lastReset > 60000) {
        cb.failCount = 0;
        cb.totalCount = 0;
        cb.lastReset = Date.now();
        this.circuitState.set(nodeId, cb);
      }
      if (cb.open) {
        const timeout = data.circuit_breaker_timeout ?? 30000;
        if (Date.now() - cb.openedAt < timeout) {
          // Circuit open — fast fail
          this.decrementLoad(nodeId);
          this.failRequest(req, nodeId, 'circuit_open');
          return;
        }
        // Half-open — allow one through
        cb.open = false;
        this.circuitState.set(nodeId, cb);
      }
    }

    // ─── CDN: 60% chance absorb + complete immediately ───────────────────────
    if (CDN_TYPE_IDS.has(nodeType)) {
      const hitRate = data.cache_hit_rate !== undefined ? data.cache_hit_rate / 100 : 0.60;
      if (Math.random() < hitRate) {
        req.totalLatency += data.processing_time || 5;
        this.completeRequest(req);
        return;
      }
    }

    // ─── CACHE: configurable hit rate → skip to next node ────────────────────
    if (CACHE_TYPE_IDS.has(nodeType)) {
      const hitRate = data.cache_hit_rate !== undefined ? data.cache_hit_rate / 100 : 0.70;
      if (Math.random() < hitRate) {
        req.totalLatency += data.processing_time || 5;
        req.currentNodeIndex++;
        if (req.currentNodeIndex >= req.path.length) {
          this.completeRequest(req);
          return;
        }
        const nextNodeId = req.path[req.currentNodeIndex];
        const edge = this.edges.find(e => e.source === nodeId && e.target === nextNodeId);
        if (edge) {
          this.incrementEdgeLoad(edge.id);
          this.emitEdgeAnimated(edge.id, req.id);
        }
        this.processRequestAtNode(req);
        return;
      }
    }

    const load = (this.nodeLoad.get(nodeId) || 0) + 1;
    this.nodeLoad.set(nodeId, load);
    const capacity = data.max_capacity;

    // ─── RATE LIMITER: hard block above capacity, return 429 ─────────────────
    if (RATE_LIMITER_IDS.has(nodeType) && load > capacity) {
      this.decrementLoad(nodeId);
      this.failRequest(req, nodeId, 'rate_limited_429');
      return;
    }

    // ─── QUEUE/KAFKA/BROKER: buffer latency, never drop ───────────────────────
    if (QUEUE_TYPE_IDS.has(nodeType)) {
      const queueLatency = data.processing_time || 80;
      setTimeout(() => {
        if (!this.running) return;
        this.decrementLoad(nodeId);
        this.updateNodeStatus(nodeId);
        req.totalLatency += queueLatency;
        this.updateNodeMetric(nodeId, 'latency', queueLatency);
        req.currentNodeIndex++;
        if (req.currentNodeIndex >= req.path.length) {
          this.completeRequest(req);
          return;
        }
        const nextNodeId = req.path[req.currentNodeIndex];
        const edge = this.edges.find(e => e.source === nodeId && e.target === nextNodeId);
        if (edge) {
          this.incrementEdgeLoad(edge.id);
          this.emitEdgeAnimated(edge.id, req.id);
        }
        this.processRequestAtNode(req);
      }, queueLatency);
      const utilization = load / capacity;
      const status: NodeData['status'] =
        utilization >= 1.0 ? 'overloaded' :
        utilization >= 0.7 ? 'stressed' : 'healthy';
      this.queueNodeUpdate(nodeId, status, load, this.nodeQueueSize.get(nodeId) || 0, this.nodeDropped.get(nodeId) || 0);
      return;
    }

    // ─── DATABASE: high latency_factor ───────────────────────────────────────
    const baseLat = data.processing_time;
    const latencyFactor = DB_TYPE_IDS.has(nodeType) ? 4 : (data.latency_factor ?? 2.0);
    const utilization = load / capacity;

    // Queue simulation
    const queueLimit = data.queue_limit ?? 50;
    const overflow = Math.max(0, load - capacity);
    let queueSize = this.nodeQueueSize.get(nodeId) || 0;
    if (overflow > 0) {
      queueSize = Math.min(queueSize + overflow, queueLimit + 10);
      this.nodeQueueSize.set(nodeId, queueSize);
      if (queueSize > queueLimit) {
        // Drop request
        const dropped = (this.nodeDropped.get(nodeId) || 0) + 1;
        this.nodeDropped.set(nodeId, dropped);
        this.decrementLoad(nodeId);
        this.updateNodeStatus(nodeId);
        this.failRequest(req, nodeId, 'queue_overflow');
        return;
      }
    }

    const status: NodeData['status'] =
      utilization >= 1.0 ? 'overloaded' :
      utilization >= 0.7 ? 'stressed' : 'healthy';

    this.queueNodeUpdate(nodeId, status, load, queueSize, this.nodeDropped.get(nodeId) || 0);
    this.updateNodeMetric(nodeId, 'load', load);

    // Legacy capacity overflow check (very high overload)
    if (load > capacity * 1.5 && !QUEUE_TYPE_IDS.has(nodeType)) {
      this.decrementLoad(nodeId);
      this.failRequest(req, nodeId, 'capacity_overflow');
      return;
    }

    // ─── Real latency formula ─────────────────────────────────────────────────
    const tlsOverhead = data.tls_overhead_ms ?? 0;
    const effectiveLatency = baseLat + utilization * latencyFactor * baseLat + tlsOverhead;

    // ─── Real error rate formula ──────────────────────────────────────────────
    let baseErrorRate = data.failure_rate;
    if (this.failureInjection) baseErrorRate = Math.min(100, baseErrorRate * 2.5 + 20);
    let errorRate = baseErrorRate;
    if (load > capacity) {
      errorRate = baseErrorRate + ((load - capacity) / capacity) * 50;
      errorRate = Math.min(errorRate, 95);
    }

    const timeoutMs = data.timeout_ms > 0 ? data.timeout_ms : Infinity;

    // Timeout check
    if (effectiveLatency > timeoutMs) {
      setTimeout(() => {
        if (!this.running) return;
        this.decrementLoad(nodeId);
        this.updateNodeStatus(nodeId);
        // Update circuit breaker on timeout failure
        if (data.circuit_breaker_enabled) {
          this.recordCircuitBreakerFailure(nodeId, data);
        }
        this.failRequest(req, nodeId, 'timeout');
      }, timeoutMs);
      return;
    }

    setTimeout(() => {
      if (!this.running) return;
      this.decrementLoad(nodeId);
      // Drain queue on completion
      const qs = this.nodeQueueSize.get(nodeId) || 0;
      if (qs > 0) this.nodeQueueSize.set(nodeId, Math.max(0, qs - 1));
      this.updateNodeStatus(nodeId);
      req.totalLatency += effectiveLatency;
      this.updateNodeMetric(nodeId, 'latency', effectiveLatency);

      if (Math.random() * 100 < errorRate) {
        const retries = data.retry_count || 0;
        if (retries > 0 && !req.failed) {
          data.retry_count = retries - 1;
          setTimeout(() => this.processRequestAtNode(req), 50);
          data.retry_count = retries;
          return;
        }
        // Update circuit breaker on failure
        if (data.circuit_breaker_enabled) {
          this.recordCircuitBreakerFailure(nodeId, data);
        }
        this.failRequest(req, nodeId, 'failure_rate');
        return;
      }

      req.currentNodeIndex++;
      if (req.currentNodeIndex >= req.path.length) {
        this.completeRequest(req);
        // Spawn response flow
        if (!req.isResponse) {
          this.spawnResponseRequest(req);
        }
        return;
      }

      const nextNodeId = req.path[req.currentNodeIndex];
      const edge = this.edges.find(e => e.source === nodeId && e.target === nextNodeId);
      if (edge) {
        this.incrementEdgeLoad(edge.id);
        this.emitEdgeAnimated(edge.id, req.id);
      }
      this.processRequestAtNode(req);
    }, effectiveLatency);
  }

  private recordCircuitBreakerFailure(nodeId: string, data: NodeData) {
    const cb = this.circuitState.get(nodeId) || { open: false, openedAt: 0, failCount: 0, totalCount: 0, lastReset: Date.now() };
    cb.failCount++;
    cb.totalCount++;
    const threshold = data.circuit_breaker_threshold ?? 50;
    if (cb.totalCount >= 10 && (cb.failCount / cb.totalCount) * 100 >= threshold) {
      cb.open = true;
      cb.openedAt = Date.now();
    }
    this.circuitState.set(nodeId, cb);
  }

  private spawnResponseRequest(originalReq: SimRequest) {
    const responsePath = [...originalReq.path].reverse();
    if (responsePath.length >= 2) {
      const responseReq: SimRequest = {
        id: `res-${originalReq.id}`,
        path: responsePath,
        currentNodeIndex: 0,
        startTime: Date.now(),
        totalLatency: 0,
        failed: false,
        completed: false,
        isResponse: true,
      };
      this.activeRequests.set(responseReq.id, responseReq);
      this.processResponseRequest(responseReq);
    }
  }

  private processResponseRequest(req: SimRequest) {
    if (!this.running || req.completed || req.failed) return;
    const nodeId = req.path[req.currentNodeIndex];
    const node = this.nodes.get(nodeId);
    if (!node) {
      req.completed = true;
      this.activeRequests.delete(req.id);
      return;
    }

    const data = node.data;
    // Response latency is 30% of normal processing time, scaled by response size
    const responseSizeKb = data.response_size_kb ?? 50;
    const sizeLatencyFactor = Math.max(1, responseSizeKb / 50); // 50KB is baseline
    const responseLatency = (data.processing_time * 0.3) * sizeLatencyFactor;

    const load = (this.nodeLoad.get(nodeId) || 0) + 1;
    this.nodeLoad.set(nodeId, load);
    this.updateNodeStatus(nodeId);

    setTimeout(() => {
      if (!this.running) return;
      this.decrementLoad(nodeId);
      this.updateNodeStatus(nodeId);
      req.totalLatency += responseLatency;

      // Animate edge
      req.currentNodeIndex++;
      if (req.currentNodeIndex >= req.path.length) {
        req.completed = true;
        this.activeRequests.delete(req.id);
        return;
      }

      const nextNodeId = req.path[req.currentNodeIndex];
      const prevNodeId = req.path[req.currentNodeIndex - 1];
      // For response path, find the edge in reverse direction
      const edge = this.edges.find(e =>
        (e.source === nextNodeId && e.target === prevNodeId) ||
        (e.source === prevNodeId && e.target === nextNodeId)
      );
      if (edge) {
        this.incrementEdgeLoad(edge.id);
        this.emitEdgeAnimated(edge.id, req.id);
      }
      this.processResponseRequest(req);
    }, Math.max(1, responseLatency));
  }

  private incrementEdgeLoad(edgeId: string) {
    this.edgeLoad.set(edgeId, (this.edgeLoad.get(edgeId) || 0) + 1);
  }

  private decrementLoad(nodeId: string) {
    this.nodeLoad.set(nodeId, Math.max(0, (this.nodeLoad.get(nodeId) || 0) - 1));
  }

  private updateNodeStatus(nodeId: string) {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    const load = this.nodeLoad.get(nodeId) || 0;
    const util = load / node.data.max_capacity;
    const status: NodeData['status'] =
      load === 0 ? 'idle' :
      util >= 1.0 ? 'overloaded' :
      util >= 0.7 ? 'stressed' : 'healthy';
    const queueSize = this.nodeQueueSize.get(nodeId) || 0;
    const dropped = this.nodeDropped.get(nodeId) || 0;
    this.queueNodeUpdate(nodeId, status, load, queueSize, dropped);
  }

  private updateNodeMetric(nodeId: string, type: 'load' | 'latency', value: number) {
    const m = this.nodeMetrics.get(nodeId) || {
      nodeId, requestsHandled: 0, requestsFailed: 0, avgLatency: 0, peakLoad: 0,
      queueDepth: 0, droppedRequests: 0, throughput: 0, errorRate: 0,
    };
    if (type === 'load') {
      m.peakLoad = Math.max(m.peakLoad, value);
      m.queueDepth = this.nodeQueueSize.get(nodeId) || 0;
      m.droppedRequests = this.nodeDropped.get(nodeId) || 0;
    } else {
      m.requestsHandled++;
      m.avgLatency = (m.avgLatency * (m.requestsHandled - 1) + value) / m.requestsHandled;
    }
    this.nodeMetrics.set(nodeId, m);
  }

  private failRequest(req: SimRequest, nodeId: string, reason: string) {
    req.failed = true;
    req.failedAt = nodeId;
    req.failReason = reason;
    req.completed = true;
    this.activeRequests.delete(req.id);
    this.completedRequests.push(req);
    this.failedCount++;
    this.recentLatencies.push(req.totalLatency);
    this.allLatencies.push(req.totalLatency);
    if (this.allLatencies.length > 1000) this.allLatencies.shift();

    const nm = this.nodeMetrics.get(nodeId);
    if (nm) { nm.requestsFailed++; this.nodeMetrics.set(nodeId, nm); }

    this.addToRequestLog(req);
    this.emit({ type: 'request_failed', requestId: req.id, nodeId, data: { reason } });
  }

  private completeRequest(req: SimRequest) {
    req.completed = true;
    this.activeRequests.delete(req.id);
    this.completedRequests.push(req);
    this.completedCount++;
    this.recentLatencies.push(req.totalLatency);
    this.allLatencies.push(req.totalLatency);
    if (this.allLatencies.length > 1000) this.allLatencies.shift();
    if (!req.isResponse) {
      this.addToRequestLog(req);
    }
    this.emit({ type: 'request_completed', requestId: req.id, data: { latency: req.totalLatency } });
  }

  private addToRequestLog(req: SimRequest) {
    const entry: RequestLogEntry = {
      id: req.id,
      timestamp: Date.now(),
      path: [...req.path],
      latency: Math.round(req.totalLatency),
      status: req.failed ? 'failed' : 'success',
      failedAt: req.failedAt,
      failReason: req.failReason,
    };
    this.requestLog = [entry, ...this.requestLog].slice(0, 200);
    // Throttle UI log updates — no more than once per 150ms to avoid setState storms
    const now = Date.now();
    if (now - this.requestLogLastEmit >= this.REQUEST_LOG_THROTTLE_MS) {
      this.requestLogLastEmit = now;
      this.emit({ type: 'request_moved', requestId: req.id, data: { log: entry } });
    }
  }

  private computePercentiles(): LatencyPercentiles {
    if (this.allLatencies.length === 0) return { p50: 0, p95: 0, p99: 0 };
    const sorted = [...this.allLatencies].sort((a, b) => a - b);
    return {
      p50: Math.round(percentile(sorted, 50)),
      p95: Math.round(percentile(sorted, 95)),
      p99: Math.round(percentile(sorted, 99)),
    };
  }

  private computeHealthScore(avgLatency: number, errorRate: number): SystemHealthScore {
    let score = 100;
    const suggestions: string[] = [];
    let bottleneck: string | null = null;
    let worstProduct = 0;
    let hasCache = false;
    let lbDownstreamCount = 0;

    for (const [nodeId, node] of this.nodes) {
      const load = this.nodeLoad.get(nodeId) || 0;
      const capacity = node.data.max_capacity;
      const utilization = capacity > 0 ? load / capacity : 0;
      const nodeType = node.data.nodeType;

      if (CACHE_TYPE_IDS.has(nodeType) || CDN_TYPE_IDS.has(nodeType)) hasCache = true;

      if (LB_TYPE_IDS.has(nodeType)) {
        const downstream = (this.adjacency.get(nodeId) || []).length;
        if (downstream > lbDownstreamCount) lbDownstreamCount = downstream;
      }

      if (utilization >= 1.0) {
        score -= 20;
        suggestions.push(`Scale ${node.data.label} (overloaded)`);
      } else if (utilization >= 0.7) {
        score -= 10;
        if (utilization > 0.9) {
          suggestions.push(`Scale ${node.data.label} (utilization ${Math.round(utilization * 100)}%)`);
        }
      }

      const nm = this.nodeMetrics.get(nodeId);
      if (nm) {
        const product = nm.avgLatency * load;
        if (product > worstProduct) {
          worstProduct = product;
          bottleneck = nodeId;
        }
      }
    }

    // Error rate penalty: -1 per 1% errorRate
    score -= errorRate;

    // Latency penalty: -5 per ms above 500ms
    if (avgLatency > 500) {
      score -= (avgLatency - 500) * 0.005;
    }

    if (errorRate > 10) {
      suggestions.push('Check failure rates — error rate is high');
    }

    if (!hasCache) {
      suggestions.push('Add a cache layer to reduce backend load');
    }

    if (lbDownstreamCount > 3) {
      suggestions.push('Good load distribution across downstream nodes');
    }

    score = Math.max(0, Math.min(100, score));
    const grade: SystemHealthScore['grade'] =
      score >= 90 ? 'A' :
      score >= 75 ? 'B' :
      score >= 60 ? 'C' :
      score >= 40 ? 'D' : 'F';

    return { score: Math.round(score), grade, bottleneck, suggestions };
  }

  private updateMetrics() {
    if (!this.running) return;
    const elapsed = (Date.now() - this.startTime) / 1000;
    const recent = this.recentLatencies.slice(-200);
    const avgLatency = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
    const errorRate = this.totalRequests > 0 ? (this.failedCount / this.totalRequests) * 100 : 0;
    const throughput = elapsed > 0 ? this.completedCount / elapsed : 0;
    const percentiles = this.computePercentiles();

    const point: MetricPoint = {
      time: Math.floor(elapsed),
      latency: Math.round(avgLatency),
      p95: percentiles.p95,
      throughput: Math.round(throughput * 10) / 10,
      errorRate: Math.round(errorRate * 10) / 10,
      activeRequests: this.activeRequests.size,
    };

    const newSeries = [...this.timeSeriesData, point];
    this.timeSeriesData = newSeries.length > 60 ? newSeries.slice(-60) : newSeries;

    this.emitMetrics(avgLatency, percentiles, throughput, errorRate);
  }

  private emitMetrics(
    avgLatency = 0,
    percentiles: LatencyPercentiles = { p50: 0, p95: 0, p99: 0 },
    throughput = 0,
    errorRate = 0,
  ) {
    const nodeMetricsObj: Record<string, NodeMetrics> = {};
    for (const [k, v] of this.nodeMetrics) nodeMetricsObj[k] = { ...v };

    const healthScore = this.computeHealthScore(avgLatency, errorRate);

    const metrics: SimulationMetrics = {
      totalRequests: this.totalRequests,
      completedRequests: this.completedCount,
      failedRequests: this.failedCount,
      avgLatency,
      percentiles,
      throughput,
      errorRate,
      timeSeriesData: [...this.timeSeriesData],
      nodeMetrics: nodeMetricsObj,
      healthScore,
    };

    const edgeLoads = Object.fromEntries(this.edgeLoad);

    this.emit({ type: 'metrics_updated', data: { ...metrics, edgeLoads } });
  }

  getRequestLog(): RequestLogEntry[] {
    return [...this.requestLog];
  }

  getCurrentTrafficRate(): number {
    return this.trafficRate;
  }
}

export const simulationEngine = new SimulationEngine();
