// nodeType is now a flexible string to support the 141-type registry
// Use NODE_REGISTRY from utils/nodeRegistry.ts for validation & defaults

export interface NodeData {
  label: string;
  nodeType: string;             // any id from NODE_REGISTRY or custom
  processing_time: number;      // ms
  max_capacity: number;         // req/s
  failure_rate: number;         // 0-100 %
  timeout_ms: number;           // 0 = no timeout
  retry_count: number;          // auto-retry attempts
  currentLoad: number;          // live
  status: 'idle' | 'healthy' | 'stressed' | 'overloaded' | 'failed';
  queue_limit: number;          // max queue depth (e.g. 50)
  queue_size: number;           // current queue depth (dynamic)
  latency_factor: number;       // how much load amplifies latency (e.g. 2.0)
  dropped_requests: number;     // requests dropped due to queue overflow

  // Hardware resources
  cpu_cores?: number;          // 1-256, affects capacity multiplier
  ram_gb?: number;             // 1-1024, affects queue_limit
  network_mbps?: number;       // 10-100000, affects throughput cap

  // Reliability
  circuit_breaker_enabled?: boolean;
  circuit_breaker_threshold?: number;   // % failures to open circuit (default 50)
  circuit_breaker_timeout?: number;     // ms to stay open before half-open

  // Cache / Response
  cache_hit_rate?: number;       // 0-100% for cache nodes
  response_size_kb?: number;     // affects response load (default 50)
  tls_overhead_ms?: number;      // extra ms for TLS (default 0)

  // Firewall / Security
  firewall_enabled?: boolean;
  block_rate?: number;           // 0-100% of traffic to block
  allowed_rps?: number;          // explicit rate limit override

  // Node enable/disable
  enabled?: boolean;             // false = node is fully disabled/offline

  // Edge blocking (stored per-node for simplicity)
  blocked_edges?: string[];      // edge IDs that are blocked/disabled
}

export type TrafficPattern = 'constant' | 'ramp' | 'spike' | 'wave' | 'step';

export interface SimRequest {
  id: string;
  path: string[];
  currentNodeIndex: number;
  startTime: number;
  totalLatency: number;
  failed: boolean;
  failedAt?: string;
  failReason?: string;
  completed: boolean;
  isResponse?: boolean;
}

export interface RequestLogEntry {
  id: string;
  timestamp: number;
  path: string[];
  latency: number;
  status: 'success' | 'failed';
  failedAt?: string;
  failReason?: string;
}

export interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
}

export interface NodeMetrics {
  nodeId: string;
  requestsHandled: number;
  requestsFailed: number;
  avgLatency: number;
  peakLoad: number;
  queueDepth: number;
  droppedRequests: number;
  throughput: number;
  errorRate: number;
}

export interface SystemHealthScore {
  score: number;           // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  bottleneck: string | null;  // nodeId of worst bottleneck
  suggestions: string[];
}

export interface SimulationMetrics {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  avgLatency: number;
  percentiles: LatencyPercentiles;
  throughput: number;
  errorRate: number;
  timeSeriesData: MetricPoint[];
  nodeMetrics: Record<string, NodeMetrics>;
  healthScore: SystemHealthScore;
}

export interface MetricPoint {
  time: number;
  latency: number;
  p95: number;
  throughput: number;
  errorRate: number;
  activeRequests: number;
}

export interface SimulationConfig {
  trafficRate: number;
  failureInjection: boolean;
  trafficPattern: TrafficPattern;
  running: boolean;
  paused: boolean;
  elapsedSeconds: number;
}

export interface TestProfile {
  id: string;
  name: string;
  description: string;
  trafficRate: number;
  pattern: TrafficPattern;
  durationSeconds: number;
  failureInjection: boolean;
}

export const TEST_PROFILES: TestProfile[] = [
  { id: 'smoke',       name: 'Smoke Test',       description: 'Minimal load — verify basic flow',        trafficRate: 5,      pattern: 'constant', durationSeconds: 30,   failureInjection: false },
  { id: 'load',        name: 'Load Test',         description: 'Sustained moderate traffic',              trafficRate: 100,    pattern: 'constant', durationSeconds: 120,  failureInjection: false },
  { id: 'stress',      name: 'Stress Test',       description: 'Ramp to breaking point',                 trafficRate: 500,    pattern: 'ramp',     durationSeconds: 180,  failureInjection: false },
  { id: 'spike',       name: 'Spike Test',        description: 'Sudden burst of traffic',                trafficRate: 1000,   pattern: 'spike',    durationSeconds: 60,   failureInjection: false },
  { id: 'chaos',       name: 'Chaos Test',        description: 'High load + random failures injected',   trafficRate: 200,    pattern: 'wave',     durationSeconds: 120,  failureInjection: true  },
  { id: 'million',     name: '1M RPS Flood',      description: 'Extreme throughput — max stress',        trafficRate: 10000,  pattern: 'constant', durationSeconds: 60,   failureInjection: false },
  { id: 'soak',        name: 'Soak Test',         description: 'Low load over extended period',          trafficRate: 20,     pattern: 'constant', durationSeconds: 600,  failureInjection: false },
  { id: 'breakpoint',  name: 'Breakpoint Test',   description: 'Ramp until system breaks',               trafficRate: 2000,   pattern: 'ramp',     durationSeconds: 300,  failureInjection: false },
];
