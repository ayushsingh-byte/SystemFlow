import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  Node, Edge, NodeChange, EdgeChange,
  applyNodeChanges, applyEdgeChanges, addEdge, Connection,
} from 'reactflow';
import { NodeData, SimulationMetrics, SimulationConfig, RequestLogEntry } from '@/simulation/types';
import { getNodeConfig } from '@/utils/nodeRegistry';
import { ADVANCED_PRESETS, AdvancedPresetId } from './presets';

export type { NodeData };

interface EdgeAnimationState {
  [edgeId: string]: { active: boolean; progress: number };
}

interface HistoryEntry {
  nodes: Node<NodeData>[];
  edges: Edge[];
}

interface AppState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  simConfig: SimulationConfig;
  metrics: SimulationMetrics;
  edgeAnimations: EdgeAnimationState;
  edgeLoads: Record<string, number>;
  requestLog: RequestLogEntry[];

  // Canvas history for undo/redo
  _history: HistoryEntry[];
  _historyIndex: number;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  resetCanvas: () => void;
  _pushHistory: () => void;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: NodeData['nodeType'], position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  loadPreset: (preset: 'microservices' | 'simple-web' | 'event-driven' | AdvancedPresetId) => void;
  deleteEdgesForNode: (nodeId: string) => void;
  toggleEdge: (edgeId: string) => void;

  setSimConfig: (config: Partial<SimulationConfig>) => void;
  setMetrics: (metrics: SimulationMetrics) => void;
  setEdgeAnimation: (edgeId: string, active: boolean) => void;
  setEdgeLoad: (edgeId: string, load: number) => void;
  setNodeStatus: (nodeId: string, status: NodeData['status'], currentLoad: number) => void;
  resetNodeStatuses: () => void;
  appendRequestLog: (entry: RequestLogEntry) => void;
  clearRequestLog: () => void;
}

let nodeCounter = 100;

const NEW_NODE_DEFAULTS: Partial<NodeData> = {
  cpu_cores: 4,
  ram_gb: 16,
  network_mbps: 1000,
  circuit_breaker_enabled: false,
  circuit_breaker_threshold: 50,
  circuit_breaker_timeout: 30000,
  cache_hit_rate: 70,
  response_size_kb: 50,
  tls_overhead_ms: 0,
  firewall_enabled: true,
  block_rate: 0,
  allowed_rps: 0,
  enabled: true,
  blocked_edges: [],
};

const makeNode = (
  id: string,
  type: string,
  label: string,
  pos: { x: number; y: number },
  overrides?: Partial<NodeData>
): Node<NodeData> => ({
  id,
  type: 'systemNode',
  position: pos,
  data: {
    label,
    nodeType: type,
    ...getNodeConfig(type).defaults,
    currentLoad: 0,
    status: 'idle',
    queue_limit: 50,
    queue_size: 0,
    latency_factor: 2.0,
    dropped_requests: 0,
    ...NEW_NODE_DEFAULTS,
    ...overrides,
  },
});

const makeEdge = (id: string, source: string, target: string): Edge => ({
  id, source, target, type: 'animatedEdge',
});

const PRESETS: Record<string, { nodes: Node<NodeData>[]; edges: Edge[] }> = {
  'simple-web': {
    nodes: [
      makeNode('u1', 'user', 'Users', { x: 60, y: 240 }),
      makeNode('gw1', 'api-gateway', 'API Gateway', { x: 280, y: 240 }),
      makeNode('be1', 'backend', 'Web Server', { x: 500, y: 140 }),
      makeNode('be2', 'backend', 'App Server', { x: 500, y: 340 }),
      makeNode('db1', 'database', 'PostgreSQL', { x: 720, y: 240 }),
    ],
    edges: [
      makeEdge('e1', 'u1', 'gw1'),
      makeEdge('e2', 'gw1', 'be1'),
      makeEdge('e3', 'gw1', 'be2'),
      makeEdge('e4', 'be1', 'db1'),
      makeEdge('e5', 'be2', 'db1'),
    ],
  },
  microservices: {
    nodes: [
      makeNode('u1', 'user', 'Clients', { x: 40, y: 300 }),
      makeNode('cdn1', 'cdn', 'CDN', { x: 220, y: 160 }),
      makeNode('gw1', 'api-gateway', 'API Gateway', { x: 220, y: 300 }),
      makeNode('lb1', 'load-balancer', 'Load Balancer', { x: 420, y: 300 }),
      makeNode('ms1', 'microservice', 'Auth Service', { x: 620, y: 140 }),
      makeNode('ms2', 'microservice', 'User Service', { x: 620, y: 280 }),
      makeNode('ms3', 'microservice', 'Order Service', { x: 620, y: 420 }),
      makeNode('cache1', 'cache', 'Redis', { x: 840, y: 160 }),
      makeNode('db1', 'database', 'Users DB', { x: 840, y: 300 }),
      makeNode('q1', 'queue', 'Event Queue', { x: 840, y: 440 }),
    ],
    edges: [
      makeEdge('e1', 'u1', 'cdn1'),
      makeEdge('e2', 'u1', 'gw1'),
      makeEdge('e3', 'gw1', 'lb1'),
      makeEdge('e4', 'lb1', 'ms1'),
      makeEdge('e5', 'lb1', 'ms2'),
      makeEdge('e6', 'lb1', 'ms3'),
      makeEdge('e7', 'ms1', 'cache1'),
      makeEdge('e8', 'ms2', 'db1'),
      makeEdge('e9', 'ms3', 'q1'),
    ],
  },
  'event-driven': {
    nodes: [
      makeNode('u1', 'user', 'Producers', { x: 60, y: 260 }),
      makeNode('rl1', 'rate-limiter', 'Rate Limiter', { x: 260, y: 260 }),
      makeNode('br1', 'broker', 'Kafka Broker', { x: 460, y: 260 }),
      makeNode('ms1', 'microservice', 'Consumer A', { x: 660, y: 140 }),
      makeNode('ms2', 'microservice', 'Consumer B', { x: 660, y: 380 }),
      makeNode('db1', 'database', 'Analytics DB', { x: 860, y: 140 }),
      makeNode('db2', 'database', 'Events DB', { x: 860, y: 380 }),
    ],
    edges: [
      makeEdge('e1', 'u1', 'rl1'),
      makeEdge('e2', 'rl1', 'br1'),
      makeEdge('e3', 'br1', 'ms1'),
      makeEdge('e4', 'br1', 'ms2'),
      makeEdge('e5', 'ms1', 'db1'),
      makeEdge('e6', 'ms2', 'db2'),
    ],
  },
};

const defaultHealthScore = {
  score: 100,
  grade: 'A' as const,
  bottleneck: null,
  suggestions: [],
};

const emptyMetrics: SimulationMetrics = {
  totalRequests: 0, completedRequests: 0, failedRequests: 0,
  avgLatency: 0, percentiles: { p50: 0, p95: 0, p99: 0 },
  throughput: 0, errorRate: 0, timeSeriesData: [], nodeMetrics: {},
  healthScore: defaultHealthScore,
};

const initialNodes = ADVANCED_PRESETS.ecommerce.nodes;
const initialEdges = ADVANCED_PRESETS.ecommerce.edges;
const initialHistory: HistoryEntry[] = [{ nodes: initialNodes, edges: initialEdges }];

export const useStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    nodes: initialNodes,
    edges: initialEdges,
    selectedNodeId: null,

    simConfig: {
      trafficRate: 5,
      failureInjection: false,
      trafficPattern: 'constant',
      running: false,
      paused: false,
      elapsedSeconds: 0,
    },

    metrics: emptyMetrics,
    edgeAnimations: {},
    edgeLoads: {},
    requestLog: [],

    _history: initialHistory,
    _historyIndex: 0,

    _pushHistory: () =>
      set((s) => {
        let history = s._history;
        let idx = s._historyIndex;
        // Truncate forward history
        if (idx < history.length - 1) {
          history = history.slice(0, idx + 1);
        }
        // Push current state
        history = [...history, { nodes: [...s.nodes], edges: [...s.edges] }];
        // Keep last 50 entries
        if (history.length > 50) history = history.slice(-50);
        idx = history.length - 1;
        return { _history: history, _historyIndex: idx };
      }),

    undo: () =>
      set((s) => {
        if (s._historyIndex <= 0) return s;
        const newIdx = s._historyIndex - 1;
        const entry = s._history[newIdx];
        return {
          _historyIndex: newIdx,
          nodes: entry.nodes,
          edges: entry.edges,
        };
      }),

    redo: () =>
      set((s) => {
        if (s._historyIndex >= s._history.length - 1) return s;
        const newIdx = s._historyIndex + 1;
        const entry = s._history[newIdx];
        return {
          _historyIndex: newIdx,
          nodes: entry.nodes,
          edges: entry.edges,
        };
      }),

    canUndo: () => get()._historyIndex > 0,
    canRedo: () => get()._historyIndex < get()._history.length - 1,

    resetCanvas: () => {
      get()._pushHistory();
      set({ nodes: [], edges: [], selectedNodeId: null });
    },

    onNodesChange: (changes) => {
      const hasDeletion = changes.some(c => c.type === 'remove');
      if (hasDeletion) get()._pushHistory();
      set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) }));
    },

    onEdgesChange: (changes) =>
      set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

    onConnect: (connection) => {
      get()._pushHistory();
      set((s) => ({
        edges: addEdge({ ...connection, id: `e-${Date.now()}`, type: 'animatedEdge' }, s.edges),
      }));
    },

    addNode: (type, position) => {
      get()._pushHistory();
      const id = `${type}-${++nodeCounter}`;
      const cfg = getNodeConfig(type);
      const newNode: Node<NodeData> = {
        id,
        type: 'systemNode',
        position,
        data: {
          label: `${cfg.label}`,
          nodeType: type,
          ...cfg.defaults,
          currentLoad: 0,
          status: 'idle',
          queue_limit: 50,
          queue_size: 0,
          latency_factor: 2.0,
          dropped_requests: 0,
          ...NEW_NODE_DEFAULTS,
        },
      };
      set((s) => ({ nodes: [...s.nodes, newNode] }));
    },

    updateNodeData: (nodeId, data) =>
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        ),
      })),

    deleteNode: (nodeId) => {
      get()._pushHistory();
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== nodeId),
        edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
      }));
    },

    duplicateNode: (nodeId) => {
      get()._pushHistory();
      set((s) => {
        const node = s.nodes.find((n) => n.id === nodeId);
        if (!node) return s;
        const id = `${node.data.nodeType}-${++nodeCounter}`;
        const dup: Node<NodeData> = {
          ...node, id,
          position: { x: node.position.x + 40, y: node.position.y + 40 },
          selected: false,
        };
        return { nodes: [...s.nodes, dup] };
      });
    },

    selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

    loadPreset: (preset) => {
      get()._pushHistory();
      const data = ADVANCED_PRESETS[preset] ?? PRESETS[preset as keyof typeof PRESETS];
      if (!data) return;
      set(() => ({
        nodes: data.nodes,
        edges: data.edges,
        selectedNodeId: null,
        requestLog: [],
        metrics: emptyMetrics,
        edgeLoads: {},
      }));
    },

    deleteEdgesForNode: (nodeId) =>
      set((s) => ({
        edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      })),

    toggleEdge: (edgeId) =>
      set((s) => {
        // Toggle edge by adding/removing from blocked_edges on source node
        // For simplicity, remove the edge entirely to "block" it, or find associated node
        const edge = s.edges.find(e => e.id === edgeId);
        if (!edge) return s;
        const sourceNode = s.nodes.find(n => n.id === edge.source);
        if (!sourceNode) return s;
        const blocked = sourceNode.data.blocked_edges ?? [];
        const isBlocked = blocked.includes(edgeId);
        const newBlocked = isBlocked
          ? blocked.filter(id => id !== edgeId)
          : [...blocked, edgeId];
        return {
          nodes: s.nodes.map(n =>
            n.id === edge.source
              ? { ...n, data: { ...n.data, blocked_edges: newBlocked } }
              : n
          ),
        };
      }),

    setSimConfig: (config) =>
      set((s) => ({ simConfig: { ...s.simConfig, ...config } })),

    setMetrics: (metrics) => set({ metrics }),

    setEdgeAnimation: (edgeId, active) =>
      set((s) => ({
        edgeAnimations: { ...s.edgeAnimations, [edgeId]: { active, progress: 0 } },
      })),

    setEdgeLoad: (edgeId, load) =>
      set((s) => ({
        edgeLoads: { ...s.edgeLoads, [edgeId]: load },
      })),

    setNodeStatus: (nodeId, status, currentLoad) =>
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, status, currentLoad } } : n
        ),
      })),

    resetNodeStatuses: () =>
      set((s) => ({
        nodes: s.nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            status: 'idle' as const,
            currentLoad: 0,
            queue_size: 0,
            dropped_requests: 0,
            enabled: true,
          },
        })),
        edgeAnimations: {},
        edgeLoads: {},
      })),

    appendRequestLog: (entry) =>
      set((s) => ({ requestLog: [entry, ...s.requestLog].slice(0, 300) })),

    clearRequestLog: () => set({ requestLog: [] }),
  }))
);
