/**
 * Core type definitions for the SystemFlow intelligence platform.
 * Every node, edge, signal, and anomaly is typed — no untyped JSON blobs in production paths.
 */

// ── Signal names ─────────────────────────────────────────────────────────────

export type SignalName =
  // Compute
  | 'cpu_usage' | 'cpu_steal' | 'cpu_iowait'
  | 'ram_used' | 'ram_pressure' | 'swap_usage'
  | 'load_avg_1' | 'load_avg_5' | 'load_avg_15'
  // Network
  | 'bandwidth_in' | 'bandwidth_out' | 'bandwidth_saturation'
  | 'network_latency_p50' | 'network_latency_p95' | 'network_latency_p99'
  | 'packet_loss_rate' | 'tcp_retransmits'
  | 'connection_count_active' | 'connection_count_waiting' | 'connection_count_idle'
  | 'connection_pool_saturation' | 'dns_resolution_time' | 'tcp_handshake_time'
  // Storage
  | 'disk_iops_read' | 'disk_iops_write' | 'disk_iops_saturation'
  | 'disk_throughput_read' | 'disk_throughput_write'
  | 'disk_io_wait' | 'disk_queue_depth' | 'disk_capacity_used'
  | 'disk_latency_read' | 'disk_latency_write'
  // Application
  | 'request_rate' | 'request_latency_p50' | 'request_latency_p95' | 'request_latency_p99'
  | 'request_queue_depth'
  | 'error_rate_4xx' | 'error_rate_5xx' | 'error_rate_timeout'
  | 'circuit_breaker_state' | 'gc_pause_time' | 'event_loop_lag'
  | 'thread_pool_saturation' | 'active_sessions'
  // Derived
  | 'rate_of_change' | 'time_to_saturation' | 'seasonal_baseline_deviation';

// ── Resource and bottleneck types ────────────────────────────────────────────

export type ResourceType =
  | 'cpu' | 'memory' | 'disk_io' | 'network' | 'connections' | 'threads';

export type LatencySensitivity = 'low' | 'medium' | 'high' | 'critical';
export type ScaleCharacteristic = 'vertical' | 'horizontal' | 'both';
export type Statefulness = 'stateless' | 'stateful' | 'ephemeral';

// ── Edge types ───────────────────────────────────────────────────────────────

export type EdgeType =
  | 'HTTP_CALL'
  | 'GRPC_CALL'
  | 'DB_QUERY'
  | 'CACHE_LOOKUP'
  | 'QUEUE_PUBLISH'
  | 'QUEUE_CONSUME'
  | 'FILE_READ'
  | 'FILE_WRITE'
  | 'DNS_RESOLVE'
  | 'CONTAINER_HOSTS'
  | 'REPLICATES_TO'
  | 'LOAD_BALANCES_TO';

export const ALL_EDGE_TYPES: EdgeType[] = [
  'HTTP_CALL', 'GRPC_CALL', 'DB_QUERY', 'CACHE_LOOKUP',
  'QUEUE_PUBLISH', 'QUEUE_CONSUME', 'FILE_READ', 'FILE_WRITE',
  'DNS_RESOLVE', 'CONTAINER_HOSTS', 'REPLICATES_TO', 'LOAD_BALANCES_TO',
];

export type EdgeCriticality = 'critical' | 'important' | 'optional';
export type FailurePropagation = 'blocks' | 'degrades' | 'isolated';

export interface TypedEdge {
  source_node_id: string;
  target_node_id: string;
  type: EdgeType;
  criticality: EdgeCriticality;
  expected_latency_ms: { p50: number; p99: number };
  failure_propagation: FailurePropagation;
  observed_throughput: number;
  confidence?: number;          // 0..1 for auto-discovered edges
  discovery_method?: 'manual' | 'otel_trace' | 'log_parse' | 'connection_table';
}

// ── Node DNA ─────────────────────────────────────────────────────────────────

export interface SignalCondition {
  signal: SignalName;
  op: '>' | '<' | '>=' | '<=' | '==' | 'trend_rising' | 'trend_spike';
  value: number;
}

export interface DownstreamEffect {
  edge_type: EdgeType;
  affected_signal: SignalName;
  expected_change: 'increase' | 'decrease' | 'spike' | 'drop';
  expected_magnitude: 'small' | 'moderate' | 'large';
}

export interface ReactionPattern {
  trigger: SignalCondition;
  expected_downstream_effects: DownstreamEffect[];
  expected_delay_ms: number;
  confidence: number;           // 0..1
  description: string;
}

export interface SignalSequenceStep {
  signal: SignalName;
  trend: 'rising' | 'spike' | 'falling' | 'stable';
  threshold?: number;
}

export interface FailureSignature {
  name: string;
  description: string;
  signal_sequence: SignalSequenceStep[];
  typical_cause?: string;
}

export interface BaselineConfig {
  learning_window_hours: number;
  time_awareness: Array<'hour' | 'day' | 'week'>;
  peer_comparison_enabled: boolean;
}

export interface BaselineBehavior {
  primary_bottleneck: ResourceType;
  secondary_bottlenecks: ResourceType[];
  latency_sensitivity: LatencySensitivity;
  memory_pattern: string;
  cpu_pattern: string;
  scale_characteristic: ScaleCharacteristic;
  statefulness: Statefulness;
}

export interface NodeDNA {
  type: string;
  family: NodeFamily;
  version_range?: string;
  baseline_behavior: BaselineBehavior;
  health_signals: {
    critical: SignalName[];
    warning: SignalName[];
    informational: SignalName[];
  };
  reaction_patterns: ReactionPattern[];
  failure_signatures: FailureSignature[];
  supported_edge_types: EdgeType[];
  baseline_config: BaselineConfig;
}

// ── Node families ─────────────────────────────────────────────────────────────

export type NodeFamily =
  | 'StatelessHttpWorker'
  | 'RelationalDatabase'
  | 'InMemoryStore'
  | 'MessageBroker'
  | 'ContainerOrchestrator'
  | 'ComputeWorkload'
  | 'StorageSystem'
  | 'ApplicationRuntime';

// ── Health report ─────────────────────────────────────────────────────────────

export type HealthLevel = 'healthy' | 'degraded' | 'critical' | 'unknown';

export interface SignalReading {
  node_id: string;
  signal: SignalName;
  value: number;
  timestamp_ms: number;
  unit: string;
}

export interface HealthReport {
  node_id: string;
  level: HealthLevel;
  timestamp_ms: number;
  triggered_signals: Array<{
    signal: SignalName;
    value: number;
    severity: 'critical' | 'warning';
    reason: string;
  }>;
  matched_signature?: FailureSignature;
}

// ── Anomaly ───────────────────────────────────────────────────────────────────

export interface AnomalyEvent {
  node_id: string;
  signal: SignalName;
  value: number;
  timestamp_ms: number;
  deviation_zscore: number;
  confidence: number;
  description: string;
}

// ── Causal result ─────────────────────────────────────────────────────────────

export interface CausalCandidate {
  node_id: string;
  signal: SignalName;
  confidence: number;
  propagation_path: string[];
  edge_types_traversed: EdgeType[];
  timing_delta_ms: number;
  description: string;
}
