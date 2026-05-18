// SystemFlow — global state hooks (Zustand-like, plain React)

const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

// ---------- store: nodes/edges/sim/metrics/log ----------
function useStoreImpl() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // ── Undo/Redo history ────────────────────────────────────────────────────────
  // history is an array of { nodes, edges } snapshots; historyIndex points to the current snapshot
  const history = useRef([{ nodes: [], edges: [] }]);
  const historyIndex = useRef(0);
  // Track whether we are restoring (to avoid pushing on undo/redo restores)
  const isRestoring = useRef(false);

  // Push a snapshot to history; trims forward history and caps at 50 entries
  const pushHistory = useCallback((ns, es) => {
    if (isRestoring.current) return;
    const snap = { nodes: ns, edges: es };
    // Trim anything after the current index (forward history is discarded on new action)
    history.current = history.current.slice(0, historyIndex.current + 1);
    history.current.push(snap);
    if (history.current.length > 50) {
      history.current = history.current.slice(history.current.length - 50);
    }
    historyIndex.current = history.current.length - 1;
  }, []);

  // Wrap setNodes so every nodes change pushes history (capture current edges via ref)
  const edgesRef = useRef([]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  const nodesRef2 = useRef([]);
  useEffect(() => { nodesRef2.current = nodes; }, [nodes]);

  const setNodesWithHistory = useCallback((updater) => {
    setNodes(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      pushHistory(next, edgesRef.current);
      return next;
    });
  }, [pushHistory]);

  const setEdgesWithHistory = useCallback((updater) => {
    setEdges(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      pushHistory(nodesRef2.current, next);
      return next;
    });
  }, [pushHistory]);

  // Expose canUndo/canRedo as derived values (recomputed on each render via useState trigger)
  const [historyVersion, setHistoryVersion] = useState(0);
  // Bump historyVersion after each push/undo/redo so consumers re-render
  const bumpVersion = useCallback(() => setHistoryVersion(v => v + 1), []);

  const undo = useCallback(() => {
    if (historyIndex.current <= 0) return;
    historyIndex.current -= 1;
    const snap = history.current[historyIndex.current];
    isRestoring.current = true;
    setNodes(snap.nodes);
    setEdges(snap.edges);
    isRestoring.current = false;
    bumpVersion();
  }, [bumpVersion]);

  const redo = useCallback(() => {
    if (historyIndex.current >= history.current.length - 1) return;
    historyIndex.current += 1;
    const snap = history.current[historyIndex.current];
    isRestoring.current = true;
    setNodes(snap.nodes);
    setEdges(snap.edges);
    isRestoring.current = false;
    bumpVersion();
  }, [bumpVersion]);

  const canUndo = historyIndex.current > 0;
  const canRedo = historyIndex.current < history.current.length - 1;
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

  // ── Backend project sync ─────────────────────────────────────────────────────
  const [currentProjectId, setCurrentProjectId] = useState(
    () => localStorage.getItem('sf_project_id') || null
  );
  const [projectName, setProjectNameState] = useState('Untitled project');
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const saveTimerRef = useRef(null);
  const projectNameRef = useRef('Untitled project');
  const currentProjectIdRef = useRef(localStorage.getItem('sf_project_id') || null);

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
    setNodesWithHistory(prev => [...prev, {
      id, type: typeId, x, y,
      label: t.label,
      config: { cpu: 60, memory: 60, maxConn: 1000, timeout: 30, retries: 3 },
    }]);
    return id;
  };
  const removeNode = (id) => {
    // Remove node and its edges atomically: compute both new arrays, push once
    const newNodes = nodesRef2.current.filter(n => n.id !== id);
    const newEdges = edgesRef.current.filter(e => e.from !== id && e.to !== id);
    isRestoring.current = true;
    setNodes(newNodes);
    setEdges(newEdges);
    isRestoring.current = false;
    pushHistory(newNodes, newEdges);
    bumpVersion();
    if (selectedNodeId === id) setSelectedNodeId(null);
  };
  const updateNode = (id, patch) => {
    setNodesWithHistory(prev => prev.map(n => n.id === id ? { ...n, ...patch, config: { ...n.config, ...(patch.config || {}) } } : n));
  };
  const moveNode = (id, x, y) => {
    // moveNode is called on every mouse-move; avoid flooding history — use raw setter
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  };
  const addEdge = (from, to) => {
    if (from === to) return;
    setEdgesWithHistory(prev => prev.some(e => e.from === from && e.to === to) ? prev : [...prev, { id: `e${nextId.current++}`, from, to }]);
  };
  const updateEdge = (id, patch) => {
    setEdgesWithHistory(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };
  const removeEdge = (id) => {
    setEdgesWithHistory(prev => prev.filter(e => e.id !== id));
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
    isRestoring.current = true;
    setNodes(newNodes);
    setEdges(newEdges);
    isRestoring.current = false;
    pushHistory(newNodes, newEdges);
    bumpVersion();
    setSelectedNodeId(null);
  };

  // Load saved canvas and sync nextId so new nodes never collide with loaded IDs
  const resetCanvas = useCallback((ns, es) => {
    if (!ns?.length) return;
    const maxId = Math.max(0, ...ns.map(n => parseInt(n.id.replace(/\D/g, '')) || 0));
    nextId.current = maxId + 1;
    // resetCanvas is called on initial load; seed history with the loaded state
    const safeEs = es || [];
    history.current = [{ nodes: ns, edges: safeEs }];
    historyIndex.current = 0;
    isRestoring.current = true;
    setNodes(ns);
    setEdges(safeEs);
    isRestoring.current = false;
    bumpVersion();
    setSelectedNodeId(null);
  }, [bumpVersion]);

  // Keep refs in sync
  useEffect(() => { projectNameRef.current = projectName; }, [projectName]);
  useEffect(() => { currentProjectIdRef.current = currentProjectId; }, [currentProjectId]);

  const saveToBackend = useCallback(async () => {
    const pid = currentProjectIdRef.current;
    if (!pid || !window.api) return;
    setSaveStatus('saving');
    try {
      await window.api.projects.update(pid, {
        nodes: nodesRef2.current,
        edges: edgesRef.current,
        name: projectNameRef.current,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, []);

  const loadFromBackend = useCallback(async () => {
    if (!window.api || !localStorage.getItem('sf_token')) {
      try {
        const saved = JSON.parse(localStorage.getItem('sf_canvas') || 'null');
        if (saved?.nodes?.length) resetCanvas(saved.nodes, saved.edges || []);
      } catch {}
      return;
    }
    try {
      const storedId = localStorage.getItem('sf_project_id');
      if (storedId) {
        const project = await window.api.projects.get(storedId);
        if (project?.id) {
          setProjectNameState(project.name || 'Untitled project');
          currentProjectIdRef.current = project.id;
          setCurrentProjectId(project.id);
          if (project.nodes?.length || project.edges?.length) {
            resetCanvas(project.nodes || [], project.edges || []);
          }
          return;
        }
      }
      const { projects } = await window.api.projects.list();
      if (projects?.length) {
        const p = projects[0];
        localStorage.setItem('sf_project_id', p.id);
        currentProjectIdRef.current = p.id;
        setCurrentProjectId(p.id);
        setProjectNameState(p.name || 'Untitled project');
        if (p.nodes?.length || p.edges?.length) {
          resetCanvas(p.nodes || [], p.edges || []);
        }
      } else {
        const p = await window.api.projects.create({ name: 'Untitled project', nodes: [], edges: [] });
        if (p?.id) {
          localStorage.setItem('sf_project_id', p.id);
          currentProjectIdRef.current = p.id;
          setCurrentProjectId(p.id);
          setProjectNameState(p.name || 'Untitled project');
        }
      }
    } catch (err) {
      console.warn('[SystemFlow] Backend unavailable, using localStorage:', err.message);
      try {
        const saved = JSON.parse(localStorage.getItem('sf_canvas') || 'null');
        if (saved?.nodes?.length) resetCanvas(saved.nodes, saved.edges || []);
      } catch {}
    }
  }, [resetCanvas]);

  // Auto-save canvas changes to backend (debounced 2s)
  useEffect(() => {
    if (!currentProjectId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveToBackend, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [nodes, edges, saveToBackend, currentProjectId]);

  const setProjectName = useCallback(async (name) => {
    setProjectNameState(name);
    projectNameRef.current = name;
    const pid = currentProjectIdRef.current;
    if (!pid || !window.api) return;
    try { await window.api.projects.update(pid, { name }); } catch {}
  }, []);

  return {
    nodes, setNodes: setNodesWithHistory, edges, setEdges: setEdgesWithHistory,
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
    // Undo/Redo
    undo, redo, canUndo, canRedo,
    // Backend project sync
    currentProjectId, setCurrentProjectId,
    projectName, setProjectName,
    saveStatus, saveToBackend, loadFromBackend,
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
