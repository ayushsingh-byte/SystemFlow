// SystemFlow — global state hooks (Zustand-like, plain React)

const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

// ---------- store: nodes/edges/sim/metrics/log ----------
function useStoreImpl() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [simConfig, setSimConfig] = useState({
    state: "idle",          // idle | running | paused
    rate: 100,              // req/s target
    pattern: "constant",    // constant | ramp | spike | wave | step
    chaos: false,
    chaosMonkey: false,     // auto-kill random nodes periodically
    failScenario: null,     // { id, nodeIds: string[] } forced-fail scenario
    activeProfile: null,    // profile id
    activeTest: null,       // test id
    testProgress: 0,
    testResults: {},        // testId -> {err, lat, pass, reason}
  });
  const [metrics, setMetrics] = useState({
    latency: 0, p50: 0, p95: 0, p99: 0,
    throughput: 0, errorRate: 0, currentRate: 0,
    totalRequests: 0, completedRequests: 0, failedRequests: 0,
    activeRequests: 0,
    latencyHistory: [],
    throughputHistory: [],
    errorHistory: [],
  });
  const [requestLog, setRequestLog] = useState([]);
  const [nodeHealth, setNodeHealth] = useState({}); // id -> {status, load, lat, bottleneck}

  // ── Simulation Intelligence ──────────────────────────────────────────────────
  const [bottleneckNodeId, setBottleneckNodeId] = useState(null);
  const [chaosKilledNodes, setChaosKilledNodes] = useState({}); // id -> { killAt, recoverAt }
  const [simulationHistory, setSimulationHistory] = useState([]); // [{t, metrics, nodeHealth}]
  const [playbackTick, setPlaybackTick] = useState(null);        // null = live
  const [sloTargets, setSloTargets] = useState({ enabled: false, p99: 200, errorRate: 1.0 });
  const [whatIfOverrides, setWhatIfOverrides] = useState({});    // nodeId -> { replicas }
  const [crashedNodes, setCrashedNodes] = useState({});          // nodeId -> { nodeName, crashedAt }
  const [crashAlerts, setCrashAlerts] = useState([]);            // [{ id, nodeId, nodeName, err, lat, time }]

  // Computed: either live data or historical snapshot when scrubbing
  const displayedMetrics    = playbackTick !== null ? (simulationHistory[playbackTick]?.metrics    ?? metrics)    : metrics;
  const displayedNodeHealth = playbackTick !== null ? (simulationHistory[playbackTick]?.nodeHealth ?? nodeHealth) : nodeHealth;

  // Initialize nextId past any IDs already in localStorage to prevent collisions on reload
  const initId = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sf_canvas') || 'null');
      if (saved?.nodes?.length) {
        const maxId = Math.max(...saved.nodes.map(n => parseInt(n.id.replace(/\D/g, '')) || 0));
        return maxId + 1;
      }
    } catch {}
    return 1;
  })();
  let nextId = useRef(initId);

  const addNode = (typeId, x, y) => {
    const t = window.findNodeType(typeId);
    if (!t) return;
    const id = `n${nextId.current++}`;
    setNodes(prev => [...prev, {
      id, type: typeId, x, y,
      label: t.label,
      config: { cpu: 60, memory: 60, maxConn: 1000, timeout: 30, retries: 3 },
    }]);
    return id;
  };
  const removeNode = (id) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };
  const updateNode = (id, patch) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...patch, config: { ...n.config, ...(patch.config || {}) } } : n));
  };
  const moveNode = (id, x, y) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  };
  const addEdge = (from, to) => {
    if (from === to) return;
    setEdges(prev => prev.some(e => e.from === from && e.to === to) ? prev : [...prev, { id: `e${nextId.current++}`, from, to }]);
  };
  const updateEdge = (id, patch) => {
    setEdges(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };
  const removeEdge = (id) => {
    setEdges(prev => prev.filter(e => e.id !== id));
  };
  const loadTemplate = (tmpl) => {
    const base = nextId.current;
    const newNodes = tmpl.nodes.map((n, i) => {
      const t = window.findNodeType(n.type);
      return {
        id: `n${base + i}`, type: n.type, x: n.x, y: n.y,
        label: t?.label || n.type,
        config: { cpu: 60, memory: 60, maxConn: 1000, timeout: 30, retries: 3 },
      };
    });
    const newEdges = tmpl.edges.map(([a, b], i) => ({
      id: `e${base + tmpl.nodes.length + i}`,
      from: newNodes[a].id, to: newNodes[b].id,
    }));
    nextId.current = base + tmpl.nodes.length + tmpl.edges.length + 1;
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNodeId(null);
  };

  // Load saved canvas and sync nextId so new nodes never collide with loaded IDs
  const resetCanvas = useCallback((ns, es) => {
    if (!ns?.length) return;
    const maxId = Math.max(0, ...ns.map(n => parseInt(n.id.replace(/\D/g, '')) || 0));
    nextId.current = maxId + 1;
    setNodes(ns);
    setEdges(es || []);
    setSelectedNodeId(null);
  }, []);

  return {
    nodes, setNodes, edges, setEdges,
    selectedNodeId, setSelectedNodeId,
    simConfig, setSimConfig,
    metrics, setMetrics,
    requestLog, setRequestLog,
    nodeHealth, setNodeHealth,
    // Simulation Intelligence
    bottleneckNodeId, setBottleneckNodeId,
    chaosKilledNodes, setChaosKilledNodes,
    simulationHistory, setSimulationHistory,
    playbackTick, setPlaybackTick,
    sloTargets, setSloTargets,
    whatIfOverrides, setWhatIfOverrides,
    crashedNodes, setCrashedNodes,
    crashAlerts, setCrashAlerts,
    displayedMetrics, displayedNodeHealth,
    addNode, removeNode, updateNode, moveNode, addEdge, updateEdge, removeEdge, loadTemplate, resetCanvas,
  };
}

const StoreCtx = createContext(null);
function StoreProvider({ children }) {
  const store = useStoreImpl();
  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>;
}
const useStore = () => useContext(StoreCtx);

// ---------- UI store ----------
function useUIImpl() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [bottomOpen, setBottomOpen] = useState(true);
  const [rightTab, setRightTab] = useState("config");
  const [ribbonTab, setRibbonTab] = useState("simulate");
  const [showProfile, setShowProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showHighTraffic, setShowHighTraffic] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [tourStep, setTourStep] = useState(-1);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [showInterview, setShowInterview] = useState(false);

  return {
    leftOpen, setLeftOpen, rightOpen, setRightOpen, bottomOpen, setBottomOpen,
    rightTab, setRightTab, ribbonTab, setRibbonTab,
    showProfile, setShowProfile, showHelp, setShowHelp,
    showHighTraffic, setShowHighTraffic,
    showPremium, setShowPremium,
    tourStep, setTourStep,
    heatmapMode, setHeatmapMode,
    showInterview, setShowInterview,
  };
}
const UICtx = createContext(null);
function UIProvider({ children }) {
  const ui = useUIImpl();
  return <UICtx.Provider value={ui}>{children}</UICtx.Provider>;
}
const useUI = () => useContext(UICtx);

// ---------- auth store ----------
function useAuthImpl() {
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem('sf_current_user') || 'null'); } catch { return null; }
  })();
  const [user, setUser] = useState(stored || { name: "Guest", email: "guest@systemflow.dev", avatar: null, initials: "G" });
  const [isPremium, setPremium] = useState(!!(stored?.isPremium));

  const signOut = useCallback(() => {
    localStorage.removeItem('sf_current_user');
    window.location.href = '/login.html';
  }, []);

  const setUserPersist = useCallback((updater) => {
    setUser(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        const s = JSON.parse(localStorage.getItem('sf_current_user') || '{}');
        localStorage.setItem('sf_current_user', JSON.stringify({ ...s, ...next }));
      } catch {}
      return next;
    });
  }, []);

  const setPremiumPersist = useCallback((val) => {
    setPremium(val);
    try {
      const s = JSON.parse(localStorage.getItem('sf_current_user') || '{}');
      localStorage.setItem('sf_current_user', JSON.stringify({ ...s, isPremium: val }));
    } catch {}
  }, []);

  return { user, setUser: setUserPersist, isPremium, setPremium: setPremiumPersist, signOut };
}
const AuthCtx = createContext(null);
function AuthProvider({ children }) {
  const a = useAuthImpl();
  return <AuthCtx.Provider value={a}>{children}</AuthCtx.Provider>;
}
const useAuth = () => useContext(AuthCtx);

window.StoreProvider = StoreProvider;
window.UIProvider = UIProvider;
window.AuthProvider = AuthProvider;
window.useStore = useStore;
window.useUI = useUI;
window.useAuth = useAuth;
