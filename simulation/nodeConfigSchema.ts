import { NodeData } from './types';

export type FieldType = 'slider' | 'toggle' | 'select' | 'number-input';

export interface ConfigField {
  key: keyof NodeData;
  label: string;
  description: string;
  type: FieldType;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: Array<{ value: string | number | boolean; label: string }>;
}

export interface ConfigSection {
  id: string;
  title: string;
  icon: string;
  color: string;  // accent color for section
  fields: ConfigField[];
}

export type NodeConfigSchema = ConfigSection[];

// ─── SHARED FIELD DEFINITIONS ─────────────────────────────────────────────────
const PERF_FIELDS: ConfigField[] = [
  { key: 'processing_time',  label: 'Base Latency',    description: 'Time to process each request',          type: 'slider',       min: 0,    max: 60000,  step: 1,    unit: 'ms'      },
  { key: 'max_capacity',     label: 'Max Capacity',    description: 'Maximum requests per second',           type: 'slider',       min: 1,    max: 1000000,step: 10,   unit: ' req/s'  },
  { key: 'latency_factor',   label: 'Latency Factor',  description: 'Load amplification on latency (1-10)', type: 'slider',       min: 1,    max: 10,     step: 0.1,  unit: '×'       },
  { key: 'queue_limit',      label: 'Queue Limit',     description: 'Max requests buffered in queue',        type: 'slider',       min: 0,    max: 100000, step: 10,   unit: ' req'    },
];

const RELIABILITY_FIELDS: ConfigField[] = [
  { key: 'failure_rate',     label: 'Failure Rate',    description: 'Base random failure probability',       type: 'slider',       min: 0,    max: 100,    step: 0.5,  unit: '%'       },
  { key: 'retry_count',      label: 'Retry Count',     description: 'Auto-retry on transient failure',       type: 'slider',       min: 0,    max: 10,     step: 1                     },
  { key: 'timeout_ms',       label: 'Timeout',         description: '0 = no timeout',                       type: 'slider',       min: 0,    max: 120000, step: 100,  unit: 'ms'      },
];

const HARDWARE_FIELDS: ConfigField[] = [
  { key: 'cpu_cores',        label: 'CPU Cores',       description: 'vCPUs allocated to this node',         type: 'slider',       min: 1,    max: 256,    step: 1,    unit: ' cores'  },
  { key: 'ram_gb',           label: 'RAM',             description: 'Memory allocated',                     type: 'slider',       min: 1,    max: 1024,   step: 1,    unit: ' GB'     },
  { key: 'network_mbps',     label: 'Network',         description: 'Network bandwidth limit',              type: 'slider',       min: 10,   max: 100000, step: 10,   unit: ' Mbps'   },
];

const CIRCUIT_BREAKER_FIELDS: ConfigField[] = [
  { key: 'circuit_breaker_enabled',   label: 'Circuit Breaker',     description: 'Open circuit on high failure rate', type: 'toggle' },
  { key: 'circuit_breaker_threshold', label: 'CB Threshold',        description: '% failures before circuit opens',  type: 'slider', min: 10, max: 100, step: 5, unit: '%' },
  { key: 'circuit_breaker_timeout',   label: 'CB Timeout',          description: 'Time circuit stays open',          type: 'slider', min: 1000, max: 60000, step: 500, unit: 'ms' },
];

// ─── NODE-TYPE SPECIFIC SCHEMAS ────────────────────────────────────────────────
export const NODE_CONFIG_SCHEMAS: Record<string, NodeConfigSchema> = {

  // CLIENT TYPES — no performance tuning, just traffic source info
  'user': [
    { id: 'traffic', title: '🚦 Traffic Source', icon: '🚦', color: '#00d4ff', fields: [
      { key: 'max_capacity',    label: 'Max Concurrent Users', description: 'Simultaneous active users', type: 'slider', min: 1, max: 10000000, step: 100, unit: ' users' },
      { key: 'response_size_kb', label: 'Expected Response Size', description: 'Typical response payload', type: 'slider', min: 1, max: 10240, step: 1, unit: ' KB' },
    ]},
    { id: 'node', title: '⚙ Node', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Node Active', description: 'Disable to stop all traffic from this source', type: 'toggle' },
    ]},
  ],

  'mobile-client': [
    { id: 'traffic', title: '📱 Mobile Traffic', icon: '📱', color: '#00d4ff', fields: [
      { key: 'max_capacity',     label: 'Concurrent Sessions', description: 'Active mobile sessions', type: 'slider', min: 1, max: 10000000, step: 100, unit: ' sessions' },
      { key: 'network_mbps',     label: 'Avg Connection Speed', description: 'Mobile network bandwidth', type: 'slider', min: 1, max: 1000, step: 1, unit: ' Mbps' },
      { key: 'response_size_kb', label: 'Response Size', description: 'Typical API response size', type: 'slider', min: 1, max: 2048, step: 1, unit: ' KB' },
    ]},
    { id: 'node', title: '⚙ Node', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Node Active', description: 'Disable to simulate all mobile clients offline', type: 'toggle' },
    ]},
  ],

  // NETWORK / GATEWAY TYPES
  'api-gateway': [
    { id: 'perf', title: '⚡ Performance', icon: '⚡', color: '#00d4ff', fields: PERF_FIELDS },
    { id: 'reliability', title: '🛡 Reliability', icon: '🛡', color: '#10b981', fields: RELIABILITY_FIELDS },
    { id: 'hw', title: '💻 Resources', icon: '💻', color: '#8b5cf6', fields: HARDWARE_FIELDS },
    { id: 'security', title: '🔒 Security', icon: '🔒', color: '#ef4444', fields: [
      { key: 'tls_overhead_ms', label: 'TLS Overhead', description: 'Added latency for TLS termination', type: 'slider', min: 0, max: 50, step: 1, unit: 'ms' },
      { key: 'allowed_rps',     label: 'Rate Limit Override', description: 'Hard cap on incoming RPS (0 = unlimited)', type: 'slider', min: 0, max: 1000000, step: 100, unit: ' rps' },
    ]},
    { id: 'cb', title: '⚡ Circuit Breaker', icon: '⚡', color: '#f59e0b', fields: CIRCUIT_BREAKER_FIELDS },
    { id: 'node', title: '⚙ Node Control', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Node Online', description: 'Take node offline (all traffic dropped)', type: 'toggle' },
    ]},
  ],

  'load-balancer': [
    { id: 'perf', title: '⚡ Performance', icon: '⚡', color: '#3b82f6', fields: [
      { key: 'processing_time', label: 'Routing Latency',  description: 'Overhead to route each request',        type: 'slider', min: 0, max: 100,    step: 0.5, unit: 'ms'     },
      { key: 'max_capacity',    label: 'Max Throughput',   description: 'Max requests per second to distribute', type: 'slider', min: 1, max: 1000000, step: 100, unit: ' req/s' },
      { key: 'queue_limit',     label: 'Connection Queue', description: 'Max pending connections',               type: 'slider', min: 0, max: 100000, step: 100, unit: ' conn'  },
    ]},
    { id: 'hw', title: '💻 Resources', icon: '💻', color: '#8b5cf6', fields: HARDWARE_FIELDS },
    { id: 'reliability', title: '🛡 Reliability', icon: '🛡', color: '#10b981', fields: [
      { key: 'failure_rate',   label: 'Failure Rate',   description: 'LB itself fails this % of the time', type: 'slider', min: 0, max: 20, step: 0.1, unit: '%' },
      { key: 'timeout_ms',     label: 'Upstream Timeout', description: 'Timeout waiting for backend', type: 'slider', min: 0, max: 30000, step: 100, unit: 'ms' },
    ]},
    { id: 'node', title: '⚙ Node Control', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Node Online', description: 'Take LB offline', type: 'toggle' },
    ]},
  ],

  'cdn': [
    { id: 'cache', title: '📦 Cache Behavior', icon: '📦', color: '#00d4ff', fields: [
      { key: 'cache_hit_rate',  label: 'Cache Hit Rate',  description: 'Percentage of requests served from cache', type: 'slider', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'processing_time', label: 'CDN Latency',     description: 'Latency for a cache HIT response',         type: 'slider', min: 1, max: 200,  step: 1, unit: 'ms' },
    ]},
    { id: 'perf', title: '⚡ Performance', icon: '⚡', color: '#3b82f6', fields: [
      { key: 'max_capacity',    label: 'Edge Capacity',   description: 'Max RPS this CDN edge can serve', type: 'slider', min: 1000, max: 10000000, step: 1000, unit: ' req/s' },
      { key: 'network_mbps',    label: 'Edge Bandwidth',  description: 'Total outbound bandwidth',        type: 'slider', min: 1000, max: 1000000, step: 1000, unit: ' Mbps'  },
    ]},
    { id: 'node', title: '⚙ Node Control', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Node Online', description: 'Simulate CDN outage', type: 'toggle' },
    ]},
  ],

  'rate-limiter': [
    { id: 'limits', title: '🚦 Rate Limits', icon: '🚦', color: '#f59e0b', fields: [
      { key: 'max_capacity',  label: 'Requests Allowed',  description: 'Max RPS before 429 responses',  type: 'slider', min: 1, max: 1000000, step: 10, unit: ' req/s' },
      { key: 'allowed_rps',   label: 'Burst Allowance',   description: 'Short-term burst above the limit (0 = strict)', type: 'slider', min: 0, max: 100000, step: 10, unit: ' req/s' },
      { key: 'processing_time', label: 'Check Latency',   description: 'Overhead of rate-limit check',  type: 'slider', min: 0, max: 20,  step: 0.5, unit: 'ms' },
    ]},
    { id: 'node', title: '⚙ Node Control', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Node Online', description: 'Disable = all traffic passes through unchecked', type: 'toggle' },
    ]},
  ],

  // SECURITY NODES
  'firewall': [
    { id: 'filter', title: '🧱 Firewall Rules', icon: '🧱', color: '#ef4444', fields: [
      { key: 'block_rate',      label: 'Block Rate',       description: '% of traffic blocked by firewall rules', type: 'slider', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'processing_time', label: 'Inspection Time',  description: 'Latency for packet inspection', type: 'slider', min: 0, max: 50, step: 1, unit: 'ms' },
      { key: 'max_capacity',    label: 'Throughput',       description: 'Max inspected packets per second', type: 'slider', min: 100, max: 10000000, step: 100, unit: ' pkt/s' },
    ]},
    { id: 'hw', title: '💻 Resources', icon: '💻', color: '#8b5cf6', fields: HARDWARE_FIELDS },
    { id: 'node', title: '⚙ Node Control', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Firewall Active', description: 'Disable to bypass firewall entirely', type: 'toggle' },
      { key: 'firewall_enabled', label: 'Rules Enforced', description: 'Toggle enforcement of block rules', type: 'toggle' },
    ]},
  ],

  'waf': [
    { id: 'filter', title: '🛡 WAF Configuration', icon: '🛡', color: '#ef4444', fields: [
      { key: 'block_rate',      label: 'Malicious Traffic %', description: 'Percentage of traffic detected as malicious', type: 'slider', min: 0, max: 50, step: 0.5, unit: '%' },
      { key: 'processing_time', label: 'Deep Inspection Latency', description: 'Added latency for WAF inspection', type: 'slider', min: 1, max: 100, step: 1, unit: 'ms' },
      { key: 'max_capacity',    label: 'Inspection Capacity',    description: 'Max requests inspected per second', type: 'slider', min: 100, max: 1000000, step: 100, unit: ' req/s' },
    ]},
    { id: 'node', title: '⚙ Node Control', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'WAF Active', description: 'Disable to simulate WAF bypass', type: 'toggle' },
    ]},
  ],

  'circuit-breaker': [
    { id: 'cb', title: '⚡ Circuit Breaker', icon: '⚡', color: '#f59e0b', fields: [
      { key: 'circuit_breaker_threshold', label: 'Trip Threshold',  description: 'Failure % that opens the circuit', type: 'slider', min: 1, max: 100, step: 1, unit: '%' },
      { key: 'circuit_breaker_timeout',   label: 'Open Duration',   description: 'How long circuit stays open before retry', type: 'slider', min: 1000, max: 120000, step: 1000, unit: 'ms' },
      { key: 'processing_time',           label: 'Check Overhead',  description: 'Latency of circuit state check', type: 'slider', min: 0, max: 10, step: 0.5, unit: 'ms' },
    ]},
    { id: 'reliability', title: '🛡 Reliability', icon: '🛡', color: '#10b981', fields: RELIABILITY_FIELDS },
    { id: 'node', title: '⚙ Node Control', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Node Active', description: 'Disable to simulate persistent circuit open', type: 'toggle' },
      { key: 'circuit_breaker_enabled', label: 'Auto-Trip', description: 'Allow circuit to auto-open on failures', type: 'toggle' },
    ]},
  ],

  // COMPUTE NODES
  'microservice': [
    { id: 'perf',        title: '⚡ Performance',    icon: '⚡', color: '#8b5cf6', fields: PERF_FIELDS },
    { id: 'reliability', title: '🛡 Reliability',    icon: '🛡', color: '#10b981', fields: RELIABILITY_FIELDS },
    { id: 'hw',          title: '💻 Resources',      icon: '💻', color: '#3b82f6', fields: HARDWARE_FIELDS },
    { id: 'cb',          title: '⚡ Circuit Breaker', icon: '⚡', color: '#f59e0b', fields: CIRCUIT_BREAKER_FIELDS },
    { id: 'response',    title: '📤 Response',        icon: '📤', color: '#00d4ff', fields: [
      { key: 'response_size_kb', label: 'Response Size', description: 'Average size of response payload', type: 'slider', min: 1, max: 102400, step: 1, unit: ' KB' },
      { key: 'tls_overhead_ms',  label: 'TLS Overhead',  description: 'TLS encryption overhead per request', type: 'slider', min: 0, max: 20, step: 1, unit: 'ms' },
    ]},
    { id: 'node', title: '⚙ Node Control', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Node Online', description: 'Take service offline', type: 'toggle' },
    ]},
  ],

  'backend': [
    { id: 'perf',        title: '⚡ Performance',    icon: '⚡', color: '#8b5cf6', fields: PERF_FIELDS },
    { id: 'reliability', title: '🛡 Reliability',    icon: '🛡', color: '#10b981', fields: RELIABILITY_FIELDS },
    { id: 'hw',          title: '💻 Resources',      icon: '💻', color: '#3b82f6', fields: HARDWARE_FIELDS },
    { id: 'cb',          title: '⚡ Circuit Breaker', icon: '⚡', color: '#f59e0b', fields: CIRCUIT_BREAKER_FIELDS },
    { id: 'node', title: '⚙ Node Control', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Node Online', description: 'Take server offline', type: 'toggle' },
    ]},
  ],

  // DATABASE NODES
  'database': [
    { id: 'perf', title: '⚡ Query Performance', icon: '⚡', color: '#f59e0b', fields: [
      { key: 'processing_time',  label: 'Avg Query Time',   description: 'Time for a typical query',         type: 'slider', min: 1, max: 60000, step: 1,   unit: 'ms'     },
      { key: 'max_capacity',     label: 'Max Connections',  description: 'Connection pool size',             type: 'slider', min: 1, max: 50000, step: 10,  unit: ' conn'  },
      { key: 'latency_factor',   label: 'Load Multiplier',  description: 'How much load degrades queries',   type: 'slider', min: 1, max: 20,    step: 0.5, unit: '×'      },
      { key: 'queue_limit',      label: 'Connection Queue', description: 'Max waiting connections',          type: 'slider', min: 0, max: 10000, step: 10,  unit: ' conn'  },
    ]},
    { id: 'hw', title: '💻 Server Resources', icon: '💻', color: '#3b82f6', fields: [
      { key: 'cpu_cores',    label: 'CPU Cores',  description: 'Database server vCPUs',     type: 'slider', min: 1, max: 128,  step: 1, unit: ' cores' },
      { key: 'ram_gb',       label: 'RAM',        description: 'Buffer pool / working set', type: 'slider', min: 1, max: 3072, step: 1, unit: ' GB'    },
      { key: 'network_mbps', label: 'Network',    description: 'Storage network bandwidth', type: 'slider', min: 10, max: 100000, step: 10, unit: ' Mbps' },
    ]},
    { id: 'reliability', title: '🛡 Reliability', icon: '🛡', color: '#10b981', fields: [
      { key: 'failure_rate',   label: 'Failure Rate',    description: 'Query failure rate under normal load', type: 'slider', min: 0, max: 100,   step: 0.5, unit: '%'  },
      { key: 'timeout_ms',     label: 'Query Timeout',   description: 'Max query execution time',            type: 'slider', min: 0, max: 120000, step: 100, unit: 'ms' },
      { key: 'retry_count',    label: 'Retry Attempts',  description: 'Retries on deadlock/timeout',         type: 'slider', min: 0, max: 5,      step: 1              },
    ]},
    { id: 'response', title: '📤 Data Transfer', icon: '📤', color: '#00d4ff', fields: [
      { key: 'response_size_kb', label: 'Avg Result Set Size', description: 'Typical query result payload', type: 'slider', min: 1, max: 102400, step: 10, unit: ' KB' },
    ]},
    { id: 'node', title: '⚙ Node Control', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Database Online', description: 'Simulate database outage', type: 'toggle' },
    ]},
  ],

  // CACHE
  'cache': [
    { id: 'cache', title: '💾 Cache Config', icon: '💾', color: '#00d4ff', fields: [
      { key: 'cache_hit_rate',  label: 'Hit Rate',        description: '% of requests served from cache memory', type: 'slider', min: 0, max: 100, step: 1, unit: '%' },
      { key: 'processing_time', label: 'Read Latency',    description: 'Latency for a cache read',               type: 'slider', min: 0, max: 100,   step: 0.5, unit: 'ms' },
      { key: 'max_capacity',    label: 'Max Throughput',  description: 'Max cache operations per second',        type: 'slider', min: 100, max: 10000000, step: 100, unit: ' ops/s' },
    ]},
    { id: 'hw', title: '💻 Resources', icon: '💻', color: '#8b5cf6', fields: [
      { key: 'ram_gb',       label: 'Memory',   description: 'Cache store size',       type: 'slider', min: 1, max: 3072, step: 1, unit: ' GB'   },
      { key: 'network_mbps', label: 'Network',  description: 'Network bandwidth',      type: 'slider', min: 100, max: 100000, step: 100, unit: ' Mbps' },
    ]},
    { id: 'reliability', title: '🛡 Reliability', icon: '🛡', color: '#10b981', fields: [
      { key: 'failure_rate',  label: 'Eviction Rate',    description: 'Cache miss due to eviction',  type: 'slider', min: 0, max: 50, step: 0.5, unit: '%' },
    ]},
    { id: 'node', title: '⚙ Node Control', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Cache Online', description: 'Simulate cache outage (cold cache)', type: 'toggle' },
    ]},
  ],

  // MESSAGING
  'queue': [
    { id: 'queue', title: '📨 Queue Config', icon: '📨', color: '#ec4899', fields: [
      { key: 'queue_limit',     label: 'Queue Depth',     description: 'Max messages buffered before drop',    type: 'slider', min: 100, max: 10000000, step: 100, unit: ' msg'   },
      { key: 'processing_time', label: 'Enqueue Latency', description: 'Time to accept and persist a message', type: 'slider', min: 0, max: 500, step: 1, unit: 'ms' },
      { key: 'max_capacity',    label: 'Ingest Rate',     description: 'Max messages per second',              type: 'slider', min: 100, max: 10000000, step: 100, unit: ' msg/s' },
    ]},
    { id: 'hw', title: '💻 Resources', icon: '💻', color: '#8b5cf6', fields: HARDWARE_FIELDS },
    { id: 'reliability', title: '🛡 Reliability', icon: '🛡', color: '#10b981', fields: RELIABILITY_FIELDS },
    { id: 'node', title: '⚙ Node Control', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Queue Online', description: 'Simulate queue unavailability', type: 'toggle' },
    ]},
  ],

  'broker': [
    { id: 'broker', title: '🔀 Broker Config', icon: '🔀', color: '#ec4899', fields: [
      { key: 'queue_limit',     label: 'Max Topic Backlog', description: 'Max messages before back-pressure',   type: 'slider', min: 1000, max: 100000000, step: 1000, unit: ' msg' },
      { key: 'processing_time', label: 'Publish Latency',   description: 'Time to publish a message',          type: 'slider', min: 0, max: 200, step: 1, unit: 'ms'  },
      { key: 'max_capacity',    label: 'Throughput',         description: 'Max messages per second',            type: 'slider', min: 1000, max: 10000000, step: 1000, unit: ' msg/s' },
    ]},
    { id: 'hw', title: '💻 Resources', icon: '💻', color: '#8b5cf6', fields: HARDWARE_FIELDS },
    { id: 'reliability', title: '🛡 Reliability', icon: '🛡', color: '#10b981', fields: RELIABILITY_FIELDS },
    { id: 'node', title: '⚙ Node Control', icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Broker Online', description: 'Simulate broker partition/failure', type: 'toggle' },
    ]},
  ],

  // DEFAULT fallback — used for any node type not explicitly defined
  '__default__': [
    { id: 'perf',        title: '⚡ Performance',    icon: '⚡', color: '#00d4ff', fields: PERF_FIELDS },
    { id: 'reliability', title: '🛡 Reliability',    icon: '🛡', color: '#10b981', fields: RELIABILITY_FIELDS },
    { id: 'hw',          title: '💻 Resources',      icon: '💻', color: '#8b5cf6', fields: HARDWARE_FIELDS },
    { id: 'cb',          title: '⚡ Circuit Breaker', icon: '⚡', color: '#f59e0b', fields: CIRCUIT_BREAKER_FIELDS },
    { id: 'node',        title: '⚙ Node Control',    icon: '⚙', color: '#636e7b', fields: [
      { key: 'enabled', label: 'Node Online', description: 'Take node offline', type: 'toggle' },
      { key: 'response_size_kb', label: 'Response Size', description: 'Response payload size', type: 'slider', min: 1, max: 102400, step: 1, unit: ' KB' },
    ]},
  ],
};

export function getNodeConfigSchema(nodeType: string): NodeConfigSchema {
  return NODE_CONFIG_SCHEMAS[nodeType] ?? NODE_CONFIG_SCHEMAS['__default__'];
}
