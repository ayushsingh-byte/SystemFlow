// SystemFlow — Canvas with pan/zoom, animated edges, node spring entry

const { useState: useStateC, useRef: useRefC, useEffect: useEffectC, useMemo: useMemoC, useCallback: useCallbackC } = React;

const API_BASE = 'http://localhost:4000';

// Infer connection protocol from node types
function inferProtocol(fromType, toType) {
  const kafkaLike = ['kafka', 'rabbitmq', 'sqs', 'pubsub', 'nats', 'pulsar', 'kinesis', 'eventbridge'];
  const dbLike    = ['sql', 'nosql', 'mongo', 'cassandra', 'dynamo', 'cockroach', 'neo4j', 'redis', 'memcached', 'influx', 'clickhouse', 'bigquery', 'aws-rds', 'aws-dynamo', 'vectordb', 'influx'];
  const grpcLike  = ['server', 'k8s', 'pod', 'mesh', 'sidecar', 'inference', 'llm', 'embed', 'rag'];
  const iotLike   = ['client-iot', 'iot'];
  if (kafkaLike.includes(fromType) || kafkaLike.includes(toType)) return 'Kafka';
  if (iotLike.includes(fromType) || iotLike.includes(toType)) return 'MQTT';
  if (dbLike.includes(toType)) return 'TCP';
  if (grpcLike.includes(fromType) && grpcLike.includes(toType)) return 'gRPC';
  if (fromType && (fromType.startsWith('client-') || fromType.startsWith('fe-'))) return 'HTTPS';
  return 'HTTP';
}

function Canvas() {
  const store = window.useStore();
  const ui    = window.useUI();
  const { nodes, edges, selectedNodeId, setSelectedNodeId, displayedNodeHealth: nodeHealth,
          addNode, moveNode, addEdge, removeNode, removeEdge, updateNode, setNodes, setEdges,
          simConfig, resetCanvas, crashAlerts, setCrashAlerts, crashedNodes } = store;
  const { heatmapMode, setHeatmapMode } = ui;

  // ── Invalid connection detection (computed from edges + nodes) ───────────────
  const invalidEdgeMap = useMemoC(() => {
    if (!window.checkEdgeValidity) return {};
    const map = {};
    edges.forEach(e => {
      const fromNode = nodes.find(n => n.id === e.from);
      const toNode   = nodes.find(n => n.id === e.to);
      const v = window.checkEdgeValidity(fromNode, toNode);
      if (v) map[e.id] = v;
    });
    return map;
  }, [edges, nodes]);

  const invalidTargetIds = useMemoC(() => {
    const s = new Set();
    Object.keys(invalidEdgeMap).forEach(eid => {
      const e = edges.find(x => x.id === eid);
      if (e) s.add(e.to);
    });
    return s;
  }, [invalidEdgeMap, edges]);

  // Override health status for nodes with invalid incoming connections
  const effectiveNodeHealth = useMemoC(() => {
    if (invalidTargetIds.size === 0) return nodeHealth;
    const result = { ...nodeHealth };
    invalidTargetIds.forEach(id => {
      result[id] = { ...(nodeHealth[id] || { load: 0, lat: 0, tput: 0, err: "0.0" }), status: 'misconfigured' };
    });
    return result;
  }, [nodeHealth, invalidTargetIds]);

  // ── Connection alert toasts ──────────────────────────────────────────────────
  const [connAlerts, setConnAlerts] = useStateC([]);
  const prevInvalidRef = useRefC(new Set());
  useEffectC(() => {
    const currentIds = new Set(Object.keys(invalidEdgeMap));
    const newIds = [...currentIds].filter(id => !prevInvalidRef.current.has(id));
    newIds.forEach(eid => {
      const e = edges.find(x => x.id === eid);
      const v = invalidEdgeMap[eid];
      if (!e || !v) return;
      const alertId = `conn-${eid}`;
      setConnAlerts(a => [...a.slice(-3), { id: alertId, eid,
        fromLabel: nodes.find(n => n.id === e.from)?.label || '?',
        toLabel:   nodes.find(n => n.id === e.to)?.label   || '?',
        severity: v.severity, reason: v.reason, fix: v.fix,
      }]);
      setTimeout(() => setConnAlerts(a => a.filter(x => x.id !== alertId)), 12000);
    });
    prevInvalidRef.current = currentIds;
  }, [invalidEdgeMap]);

  // Crashed node detail modal: separate dismissed state so closing doesn't deselect node
  const [crashModalDismissed, setCrashModalDismissed] = useStateC(false);
  // Reset dismissed flag whenever user selects a different node
  const prevSelectedRef = useRefC(selectedNodeId);
  useEffectC(() => {
    if (selectedNodeId !== prevSelectedRef.current) {
      setCrashModalDismissed(false);
      prevSelectedRef.current = selectedNodeId;
    }
  }, [selectedNodeId]);

  const crashedSelectedNode = !crashModalDismissed && selectedNodeId && effectiveNodeHealth[selectedNodeId]?.status === "crashed"
    ? nodes.find(n => n.id === selectedNodeId)
    : null;
  const crashedSelectedHealth = crashedSelectedNode ? effectiveNodeHealth[crashedSelectedNode.id] : null;
  const crashedSelectedInfo   = crashedSelectedNode ? crashedNodes[crashedSelectedNode.id] : null;

  // Stable ref to latest nodes — lets useCallbackC([]) handlers read fresh data without re-closing
  const nodesRef = useRefC(nodes);
  useEffectC(() => { nodesRef.current = nodes; }, [nodes]);

  // ---- Auto-load saved canvas on mount (uses resetCanvas to sync nextId) ----
  useEffectC(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sf_canvas') || 'null');
      if (saved && saved.nodes && saved.nodes.length > 0) {
        resetCanvas(saved.nodes, saved.edges);
      }
    } catch {}
  }, []);

  // ---- Auto-save canvas on change ----
  useEffectC(() => {
    if (nodes.length === 0 && edges.length === 0) return;
    try { localStorage.setItem('sf_canvas', JSON.stringify({ nodes, edges })); } catch {}
  }, [nodes, edges]);

  const stageRef = useRefC();
  const worldRef = useRefC();

  // viewport: pan x/y + zoom scale
  const [view, setView] = useStateC({ x: 0, y: 0, k: 1 });
  const viewRef = useRefC(view);
  useEffectC(() => { viewRef.current = view; }, [view]);

  const [drag, setDrag] = useStateC(null);     // node drag
  const [pending, setPending] = useStateC(null); // edge in progress
  const [pendingPos, setPendingPos] = useStateC(null);
  const [panning, setPanning] = useStateC(null); // canvas pan
  const [ctxMenu, setCtxMenu] = useStateC(null);

  // helper: convert client coords -> world coords (accounting for pan/zoom)
  const toWorld = (clientX, clientY) => {
    const r = stageRef.current.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - r.left - v.x) / v.k,
      y: (clientY - r.top - v.y) / v.k,
    };
  };

  // ---- Drop from palette ----
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; };
  const onDrop = (e) => {
    e.preventDefault();
    const typeId = e.dataTransfer.getData("application/sf-node-type");
    if (!typeId) return;
    const w = toWorld(e.clientX, e.clientY);
    addNode(typeId, w.x - 80, w.y - 30);
  };

  // ---- Event-delegated node/handle interaction (stable — empty deps + nodesRef) ----
  const onContainerMouseDown = useCallbackC((e) => {
    const handleEl = e.target.closest('[data-handle]');
    const nodeEl = e.target.closest('[data-node-id]');
    if (!nodeEl) return;
    const id = nodeEl.dataset.nodeId;
    if (handleEl) {
      e.stopPropagation();
      setPending(id);
      setPendingPos(toWorld(e.clientX, e.clientY));
      return;
    }
    if (e.button !== 0) return;
    const n = nodesRef.current.find(n => n.id === id);
    if (!n) return;
    const w = toWorld(e.clientX, e.clientY);
    setDrag({ id, dx: w.x - n.x, dy: w.y - n.y });
    setSelectedNodeId(id);
    setCtxMenu(null);
  }, []);

  const onContainerContextMenu = useCallbackC((e) => {
    const nodeEl = e.target.closest('[data-node-id]');
    if (!nodeEl) return;
    e.preventDefault();
    e.stopPropagation();
    const id = nodeEl.dataset.nodeId;
    setSelectedNodeId(id);
    setCtxMenu({ x: e.clientX, y: e.clientY, id });
  }, []);

  // Imperative hover — no React state, no re-renders
  const onContainerMouseOver = useCallbackC((e) => {
    const nodeEl = e.target.closest('[data-node-id]');
    if (nodeEl) nodeEl.classList.add('hovered');
  }, []);
  const onContainerMouseOut = useCallbackC((e) => {
    const nodeEl = e.target.closest('[data-node-id]');
    if (nodeEl) nodeEl.classList.remove('hovered');
  }, []);

  // Refs that mirror mutable interaction state — always current, no closure staleness
  const pendingRef  = useRefC(null);
  const dragRef     = useRefC(null);
  const panningRef  = useRefC(null);
  const addEdgeRef  = useRefC(addEdge);
  const moveNodeRef = useRefC(moveNode);
  useEffectC(() => { pendingRef.current  = pending;  }, [pending]);
  useEffectC(() => { dragRef.current     = drag;     }, [drag]);
  useEffectC(() => { panningRef.current  = panning;  }, [panning]);
  useEffectC(() => { addEdgeRef.current  = addEdge;  }, [addEdge]);
  useEffectC(() => { moveNodeRef.current = moveNode; }, [moveNode]);

  // ---- Pan: click/drag anywhere on canvas that isn't a node or handle ----
  const onStageMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("[data-node-id]") || e.target.classList.contains("handle")) return;
    setPanning({ startX: e.clientX, startY: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y });
    setSelectedNodeId(null);
    setCtxMenu(null);
  };

  // ---- Zoom ----
  const onWheel = (e) => {
    e.preventDefault();
    const r = stageRef.current.getBoundingClientRect();
    const v = viewRef.current;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newK = Math.max(0.25, Math.min(2.5, v.k * factor));
    // zoom toward cursor
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    const nx = cx - (cx - v.x) * (newK / v.k);
    const ny = cy - (cy - v.y) * (newK / v.k);
    setView({ x: nx, y: ny, k: newK });
  };

  // ---- Single permanent global handler (refs = no effect-timing race) ----
  useEffectC(() => {
    const onMove = (e) => {
      const dr = dragRef.current;
      const p  = pendingRef.current;
      const pa = panningRef.current;
      if (dr) {
        const w = toWorld(e.clientX, e.clientY);
        moveNodeRef.current(dr.id, w.x - dr.dx, w.y - dr.dy);
      }
      if (p)  setPendingPos(toWorld(e.clientX, e.clientY));
      if (pa) setView(v => ({ ...v, x: pa.vx + (e.clientX - pa.startX), y: pa.vy + (e.clientY - pa.startY) }));
    };
    const onUp = (e) => {
      const p = pendingRef.current;
      if (p) {
        const tgt = document.elementFromPoint(e.clientX, e.clientY);
        const nodeEl = tgt?.closest("[data-node-id]");
        if (nodeEl && nodeEl.dataset.nodeId !== p) {
          addEdgeRef.current(p, nodeEl.dataset.nodeId);
        }
      }
      setDrag(null);
      setPending(null);
      setPendingPos(null);
      setPanning(null);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };
  }, []); // empty deps — registered once, refs always current

  useEffectC(() => {
    if (!ctxMenu) return;
    const close = (e) => {
      if (e.target.closest('.context-menu')) return;
      setCtxMenu(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [ctxMenu]);

  // ---- Keyboard ----
  useEffectC(() => {
    const onKey = (e) => {
      const inField = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
      if (inField) return;
      if ((e.key === "Backspace" || e.key === "Delete") && selectedNodeId) {
        removeNode(selectedNodeId);
      } else if (e.key === "f" || e.key === "F") {
        fit();
      } else if (e.key === "0") {
        setView({ x: 0, y: 0, k: 1 });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedNodeId]);

  // ---- Fit-to-content ----
  const fit = () => {
    if (nodes.length === 0 || !stageRef.current) { setView({ x: 0, y: 0, k: 1 }); return; }
    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const maxX = Math.max(...xs) + 170, maxY = Math.max(...ys) + 80;
    const r = stageRef.current.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const padding = 60;
    const scaleX = (r.width - padding * 2) / Math.max(1, maxX - minX);
    const scaleY = (r.height - padding * 2) / Math.max(1, maxY - minY);
    const k = Math.min(1.5, Math.min(scaleX, scaleY));
    const w = maxX - minX, h = maxY - minY;
    const x = (r.width - w * k) / 2 - minX * k;
    const y = (r.height - h * k) / 2 - minY * k;
    setView({ x, y, k });
  };

  const transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`;
  const cursor = panning ? "grabbing" : drag ? "grabbing" : "default";

  return (
    <div
      className="canvas-area"
      ref={stageRef}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseDown={onStageMouseDown}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
      style={{ cursor }}
    >
      {/* Animated grid that follows pan/zoom */}
      <div
        className="world-grid"
        style={{
          backgroundPosition: `${view.x}px ${view.y}px`,
          backgroundSize: `${22 * view.k}px ${22 * view.k}px`,
        }}
      />

      {/* SVG layer for edges — pointer-events:none so HTML nodes above receive all mouse events */}
      <svg className="canvas-svg" width="100%" height="100%" style={{ overflow: "visible", pointerEvents: "none" }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="rgba(14,165,233,0.85)" />
          </marker>
          <marker id="arrow-invalid" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="rgba(248,113,113,0.95)" />
          </marker>
          <linearGradient id="edge-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#6366f1" stopOpacity="0.7"/>
            <stop offset="1" stopColor="#0ea5e9" stopOpacity="0.7"/>
          </linearGradient>
        </defs>
        <g ref={worldRef} style={{ transform, transformOrigin: "0 0" }}>
          {edges.map(e => {
            const a = nodes.find(n => n.id === e.from);
            const b = nodes.find(n => n.id === e.to);
            if (!a || !b) return null;
            // Skip degenerate edges (same-position nodes produce looping artifacts)
            if (Math.abs((a.x + 160) - b.x) < 4 && Math.abs(a.y - b.y) < 4) return null;
            const fromCrashed = effectiveNodeHealth[a.id]?.status === "crashed";
            const isInvalid   = !!invalidEdgeMap[e.id];
            return <EdgeView key={e.id} edge={e} from={a} to={b} running={simConfig.state === "running"} highlight={selectedNodeId === e.from || selectedNodeId === e.to} fromCrashed={fromCrashed} invalid={isInvalid} />;
          })}
          {pending && pendingPos && (() => {
            const a = nodes.find(n => n.id === pending);
            if (!a) return null;
            const ax = a.x + 160, ay = a.y + 30;
            // Skip if user hasn't dragged far enough — avoids a tiny loop artifact at the handle
            const dist = Math.hypot(pendingPos.x - ax, pendingPos.y - ay);
            if (dist < 12) return null;
            return <path d={`M${ax},${ay} C${ax + 60},${ay} ${pendingPos.x - 60},${pendingPos.y} ${pendingPos.x},${pendingPos.y}`} stroke="var(--cyan)" strokeWidth="2" strokeDasharray="4 4" fill="none" />;
          })()}
        </g>
      </svg>

      {/* HTML nodes in world space — event delegation keeps SysNode callbacks stable */}
      <div
        className="canvas-nodes"
        style={{ transform, transformOrigin: "0 0" }}
        onMouseDown={onContainerMouseDown}
        onContextMenu={onContainerContextMenu}
        onMouseOver={onContainerMouseOver}
        onMouseOut={onContainerMouseOut}
      >
        {nodes.map(n => (
          <SysNode
            key={n.id}
            node={n}
            health={effectiveNodeHealth[n.id]}
            selected={selectedNodeId === n.id}
            running={simConfig.state === "running"}
            heatmapMode={heatmapMode}
          />
        ))}
      </div>

      {nodes.length === 0 && (
        <div className="canvas-empty">
          <div className="canvas-empty-glow" />
          <h2>Start your system</h2>
          <p>Drag a node from the left palette, or hit <kbd>T</kbd> to load a template.</p>
          <div className="empty-hints">
            <span>· scroll to zoom</span>
            <span>· drag empty space to pan</span>
            <span>· right-click for menu</span>
          </div>
        </div>
      )}

      {/* Floating zoom controls */}
      <div className="canvas-controls">
        <button title="Zoom in" onClick={() => setView(v => ({ ...v, k: Math.min(2.5, v.k * 1.2) }))}>{window.SVG.plus}</button>
        <div className="zoom-readout">{Math.round(view.k * 100)}%</div>
        <button title="Zoom out" onClick={() => setView(v => ({ ...v, k: Math.max(0.25, v.k / 1.2) }))}>{window.SVG.minus}</button>
        <button title="Fit canvas (F)" onClick={fit}>{window.SVG.fit}</button>
        <div className="ctrl-divider" />
        <button title="Reset view" className="ctrl-btn-text" onClick={() => setView({ x: 0, y: 0, k: 1 })}>1:1</button>
        <button
          title={heatmapMode ? "Disable latency heatmap" : "Enable latency heatmap (shows where latency accumulates)"}
          className={"ctrl-btn-text" + (heatmapMode ? " active-heatmap" : "")}
          onClick={() => setHeatmapMode(v => !v)}
          style={{ fontSize: 14 }}
        >🌡</button>
        <div className="ctrl-divider" />
        <button title="Clear canvas" className="ctrl-btn-danger" onClick={() => {
          if (nodes.length === 0) return;
          if (!window.confirm('Clear all nodes and edges?')) return;
          setNodes([]); setEdges([]); setSelectedNodeId(null);
          localStorage.removeItem('sf_canvas'); localStorage.removeItem('sf_canvas_id');
        }}>{window.SVG.x}</button>
        <button title="Save to cloud" className="ctrl-btn-cloud" onClick={async () => {
          const token = localStorage.getItem('sf_token');
          if (!token) { alert('Sign in to save to cloud.'); return; }
          if (!nodes.length) return;
          const body = JSON.stringify({ name: 'My Canvas', nodes, edges });
          const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
          try {
            const savedId = localStorage.getItem('sf_canvas_id');
            if (savedId) {
              const r = await fetch(`${API_BASE}/api/projects/${savedId}`, { method: 'PUT', headers, body });
              if (!r.ok) throw new Error('update failed');
            } else {
              const r = await fetch(`${API_BASE}/api/projects`, { method: 'POST', headers, body });
              const d = await r.json();
              if (d.id) localStorage.setItem('sf_canvas_id', d.id);
            }
            const btn = document.activeElement;
            if (btn) { btn.style.color = 'var(--green)'; setTimeout(() => { btn.style.color = ''; }, 1000); }
          } catch { alert('Cloud save failed. Is the backend running?'); }
        }}>{window.SVG.download}</button>
      </div>

      <div className="minimap">
        <MiniMap nodes={nodes} edges={edges} view={view} stageRef={stageRef} onPan={(x, y) => setView(v => ({ ...v, x, y }))} />
      </div>

      {ctxMenu && (
        <div className="context-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onMouseDown={e => e.stopPropagation()}>
          <button onClick={() => { const n = nodes.find(x => x.id === ctxMenu.id); if (n) { addNode(n.type, n.x + 30, n.y + 30); } setCtxMenu(null); }}>
            {window.SVG.copy}<span>Duplicate</span><span className="kbd-mini">⌘D</span>
          </button>
          <button onClick={() => {
            const node = nodes.find(n => n.id === ctxMenu.id);
            if (!node) { setCtxMenu(null); return; }
            const newLabel = window.prompt("Rename node:", node.label);
            if (newLabel && newLabel.trim()) updateNode(ctxMenu.id, { label: newLabel.trim() });
            setCtxMenu(null);
          }}>
            {window.SVG.pencil}<span>Rename</span>
          </button>
          <div className="ctx-divider" />
          {/* Disconnect submenu — list edges for this node */}
          {(() => {
            const nodeEdges = edges.filter(e => e.from === ctxMenu.id || e.to === ctxMenu.id);
            if (nodeEdges.length === 0) return (
              <button disabled style={{ opacity: 0.4 }}>
                {window.SVG.link}<span>No connections</span>
              </button>
            );
            return (
              <>
                <div className="ctx-section-label">Disconnect from:</div>
                {nodeEdges.map(e => {
                  const otherId  = e.from === ctxMenu.id ? e.to : e.from;
                  const other    = nodes.find(n => n.id === otherId);
                  const isInvalid = !!invalidEdgeMap[e.id];
                  const dir      = e.from === ctxMenu.id ? '→' : '←';
                  return (
                    <button key={e.id}
                      className={isInvalid ? "danger" : ""}
                      onClick={() => { removeEdge(e.id); setCtxMenu(null); }}
                    >
                      {window.SVG.x}
                      <span><span style={{ opacity: 0.5, marginRight: 3 }}>{dir}</span>{other?.label || otherId}</span>
                      {isInvalid && <span className="kbd-mini" style={{ color: "var(--red)" }}>⚠</span>}
                    </button>
                  );
                })}
              </>
            );
          })()}
          <div className="ctx-divider" />
          <button className="danger" onClick={() => { removeNode(ctxMenu.id); setCtxMenu(null); }}>
            {window.SVG.x}<span>Delete node</span><span className="kbd-mini">⌫</span>
          </button>
        </div>
      )}

      {/* ── Crashed node detail modal (click on crashed node) ───────────── */}
      {crashedSelectedNode && (
        <CrashDetailModal
          node={crashedSelectedNode}
          health={crashedSelectedHealth}
          crashInfo={crashedSelectedInfo}
          onClose={() => setCrashModalDismissed(true)}
          onOpenConfig={() => { setCrashModalDismissed(true); ui.setRightOpen(true); ui.setRightTab("config"); }}
          onOpenWhatIf={() => { setCrashModalDismissed(true); ui.setBottomOpen(true); ui.setRibbonTab("whatif"); }}
        />
      )}

      {/* ── Invalid connection alert toasts ─────────────────────────────── */}
      {connAlerts.length > 0 && (
        <div className="conn-alert-container">
          {connAlerts.map(a => (
            <div key={a.id} className={"conn-alert " + (a.severity === 'critical' ? 'critical' : 'warn')}>
              <div className="conn-alert-header">
                <span>{a.severity === 'critical' ? '🚫 INVALID CONNECTION' : '⚠️ ARCHITECTURE WARNING'}</span>
                <button className="crash-alert-close" onClick={() => setConnAlerts(x => x.filter(c => c.id !== a.id))}>✕</button>
              </div>
              <div className="conn-alert-path">{a.fromLabel} <span className="conn-arrow">→</span> {a.toLabel}</div>
              <div className="conn-alert-reason">{a.reason}</div>
              <div className="conn-alert-fix">Fix: {a.fix}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Crash / Recovery alert toasts ────────────────────────────────── */}
      {crashAlerts.length > 0 && (
        <div className="crash-alert-container">
          {crashAlerts.length > 1 && (
            <div className="crash-alert-count">{crashAlerts.length} alerts · scroll to see all</div>
          )}
          <div className="crash-alert-scroll" onWheel={e => e.stopPropagation()}>
          {crashAlerts.map(alert => {
            const isRecovery = alert.type === "recovery";
            const dismiss = () => setCrashAlerts(a => a.filter(x => x.id !== alert.id));
            return isRecovery ? (
              <div key={alert.id} className="crash-alert recovery">
                <div className="crash-alert-header">
                  <span>✅ NODE RECOVERED</span>
                  <button className="crash-alert-close" onClick={dismiss}>✕</button>
                </div>
                <div className="crash-alert-name">{alert.nodeName}</div>
                {alert.fixApplied && (
                  <div className="crash-alert-fix recovery">Config improved: {alert.fixApplied}</div>
                )}
                <div className="crash-alert-time">Recovered at {alert.time} · Back online</div>
              </div>
            ) : (
              <div key={alert.id} className="crash-alert">
                <div className="crash-alert-header">
                  <span>💥 NODE CRASHED</span>
                  <button className="crash-alert-close" onClick={dismiss}>✕</button>
                </div>
                <div className="crash-alert-name">{alert.nodeName}</div>
                <div className="crash-alert-stats">
                  <div className="crash-stat"><span className="crash-stat-label">Load</span><span className="crash-stat-val red">100%</span></div>
                  <div className="crash-stat"><span className="crash-stat-label">Error</span><span className="crash-stat-val red">{alert.err}%</span></div>
                  <div className="crash-stat"><span className="crash-stat-label">Lat</span><span className="crash-stat-val">{alert.lat}ms</span></div>
                </div>
                {alert.reason && (
                  <>
                    <div className="crash-alert-reason">
                      <span className="crash-reason-icon">⚠</span>
                      {alert.reason.text}
                    </div>
                    <div className="crash-alert-fix">
                      <span className="crash-fix-icon">→</span>
                      {alert.reason.fix}
                    </div>
                  </>
                )}
                <div className="crash-alert-time">Crashed at {alert.time} · Increase config to recover live</div>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Node ---------- */
const SysNode = React.memo(function SysNode({ node, health, selected, running, heatmapMode }) {
  const t = window.findNodeType(node.type);
  const cat = window.CATEGORIES[t.cat];
  const h = health || { status: "idle", load: 0, lat: 0, tput: 0, err: 0 };
  const loadPct = Math.round(h.load * 100);
  const loadColor = loadPct > 85 ? "var(--red)" : loadPct > 60 ? "var(--amber)" : "var(--green)";

  const heatColor = (heatmapMode && running && h.lat > 0)
    ? h.lat > 500 ? "rgba(248,113,113,0.5)"
      : h.lat > 300 ? "rgba(251,146,60,0.42)"
      : h.lat > 100 ? "rgba(251,191,36,0.3)"
      : "rgba(34,197,94,0.22)"
    : null;

  const isMisconfigured = h.status === 'misconfigured';

  return (
    <div
      data-node-id={node.id}
      className={"sys-node" + (selected ? " selected" : "") + (isMisconfigured ? " misconfigured" : h.status === "crashed" ? " crashed" : h.status === "failed" ? " failed" : "") + (h.bottleneck ? " bottleneck" : "") + (heatColor ? " heatmap-active" : "")}
      style={{ left: node.x, top: node.y, "--node-color": cat.color, "--node-glow": cat.glow, "--load-color": loadColor }}
    >
      {heatColor && !isMisconfigured && (
        <div className="heatmap-overlay" style={{ background: heatColor }} />
      )}
      {isMisconfigured && (
        <div className="invalid-conn-overlay" />
      )}
      <div className="handle left" data-handle="true" />
      <div className="handle right" data-handle="true" />
      <div className="sys-node-header">
        <div className="sys-node-icon">{window.SVG[t.icon]}</div>
        <div className="sys-node-label">{node.label}</div>
        <div className={"status-dot " + h.status} title={h.status} />
      </div>
      <div className="sys-node-body">
        <div className="load-bar"><div className="load-fill" style={{ width: loadPct + "%" }} /></div>
        {isMisconfigured ? (
          <div className="node-crash-reason" title="Invalid connection detected — see Advisor tab">
            <span className="node-crash-code" style={{ color: "var(--red)" }}>INVALID CONN</span>
            <span className="node-crash-hint">⚠ Right-click to fix</span>
          </div>
        ) : h.status === "crashed" && h.crashReason ? (
          <div className="node-crash-reason" title={h.crashReason.fix}>
            <span className="node-crash-code">{h.crashReason.code.replace(/_/g, " ")}</span>
            <span className="node-crash-hint">↑ Config to recover</span>
          </div>
        ) : (
          <div className="sys-node-metrics">
            <div>load <span>{loadPct}%</span></div>
            <div>lat <span>{running ? h.lat + "ms" : "—"}</span></div>
            <div>tput <span>{running ? h.tput + "/s" : "—"}</span></div>
            <div>err <span style={{ color: parseFloat(h.err) > 2 ? "var(--red)" : "inherit" }}>{running ? h.err + "%" : "—"}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.node.x === next.node.x &&
  prev.node.y === next.node.y &&
  prev.node.label === next.node.label &&
  prev.node.type === next.node.type &&
  prev.selected === next.selected &&
  prev.running === next.running &&
  prev.heatmapMode === next.heatmapMode &&
  prev.health?.status === next.health?.status &&   // covers misconfigured
  prev.health?.load === next.health?.load &&
  prev.health?.lat === next.health?.lat &&
  prev.health?.tput === next.health?.tput &&
  prev.health?.err === next.health?.err &&
  prev.health?.bottleneck === next.health?.bottleneck &&
  prev.health?.crashReason?.code === next.health?.crashReason?.code
);

/* ---------- Edge with flowing particles + reverse return packets ---------- */
const EdgeView = React.memo(function EdgeView({ edge, from, to, running, highlight, fromCrashed, invalid }) {
  const ax = from.x + 160, ay = from.y + 30;
  const bx = to.x, by = to.y + 30;
  const dx = bx - ax;
  const cx1 = ax + Math.max(40, Math.abs(dx) * 0.4);
  const cx2 = bx - Math.max(40, Math.abs(dx) * 0.4);
  const d = `M${ax},${ay} C${cx1},${ay} ${cx2},${by} ${bx},${by}`;

  // Protocol label: user-set or auto-inferred from node types
  const protocol = edge.protocol || inferProtocol(from.type, to.type);
  const showProtocolLabel = protocol !== 'HTTP';
  const midX = (ax + 3 * cx1 + 3 * cx2 + bx) / 8;
  const midY = (ay + by) / 2;

  const pathRef = useRefC();
  // Forward request particles (cyan/blue)
  const c0 = useRefC(), c1 = useRefC(), c2 = useRefC();
  // Reverse response particles (orange — data coming back to user)
  const r0 = useRefC(), r1 = useRefC();
  const rafRef = useRefC();

  useEffectC(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const fwdCircles = [c0.current, c1.current, c2.current];
    const retCircles = [r0.current, r1.current];
    const allCircles = [...fwdCircles, ...retCircles];

    if (!running || fromCrashed || !pathRef.current) {
      allCircles.forEach(c => { if (c) c.setAttribute('opacity', '0'); });
      // On invalid: flash forward particles red then hide
      if (invalid && running && !fromCrashed) {
        fwdCircles.forEach(c => { if (c) { c.setAttribute('opacity', '0.5'); c.setAttribute('fill', 'var(--red)'); } });
        setTimeout(() => fwdCircles.forEach(c => { if (c) c.setAttribute('opacity', '0'); }), 400);
      }
      return;
    }

    const len = pathRef.current.getTotalLength();
    const start = performance.now();
    const FWD_DUR = 2200;  // forward request speed
    const RET_DUR = 3000;  // return response speed (slightly slower)

    const tick = (now) => {
      const elapsed = now - start;

      // Forward particles (cyan) — requests flowing to destination
      if (!invalid) {
        for (let i = 0; i < 3; i++) {
          const phase = (elapsed / FWD_DUR + i / 3) % 1;
          const p = pathRef.current.getPointAtLength(phase * len);
          const c = fwdCircles[i];
          if (c) {
            c.setAttribute('cx', p.x);
            c.setAttribute('cy', p.y);
            c.setAttribute('opacity', String(0.4 + 0.6 * Math.sin(phase * Math.PI)));
          }
        }
      } else {
        // Invalid connection: show red X-like pulses going forward, no return
        for (let i = 0; i < 3; i++) {
          const phase = (elapsed / (FWD_DUR * 1.4) + i / 3) % 1;
          const p = pathRef.current.getPointAtLength(phase * len);
          const c = fwdCircles[i];
          if (c) {
            c.setAttribute('cx', p.x);
            c.setAttribute('cy', p.y);
            c.setAttribute('opacity', String(0.25 + 0.35 * Math.sin(phase * Math.PI)));
          }
        }
      }

      // Return particles (orange) — responses flowing back to the client
      // Only show on valid connections (invalid ones don't get responses)
      if (!invalid) {
        for (let i = 0; i < 2; i++) {
          const phase = (elapsed / RET_DUR + i / 2 + 0.4) % 1;
          const p = pathRef.current.getPointAtLength((1 - phase) * len); // REVERSE direction
          const r = retCircles[i];
          if (r) {
            r.setAttribute('cx', p.x);
            r.setAttribute('cy', p.y);
            r.setAttribute('opacity', String(0.3 + 0.45 * Math.sin(phase * Math.PI)));
          }
        }
      } else {
        retCircles.forEach(r => { if (r) r.setAttribute('opacity', '0'); });
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, fromCrashed, invalid, d]);

  const stroke  = invalid ? "var(--red)" : highlight ? "var(--cyan)" : "url(#edge-gradient)";
  const opacity = invalid ? 0.9 : highlight ? 0.95 : 0.6;
  const width   = invalid ? 2.2 : highlight ? 2 : 1.4;
  const dash    = invalid ? "6 4" : "none";
  const marker  = invalid ? "url(#arrow-invalid)" : "url(#arrow)";

  return (
    <g className="edge-group">
      <path ref={pathRef} d={d} stroke={stroke} strokeWidth={width} strokeDasharray={dash} fill="none" markerEnd={marker} opacity={opacity} className={"edge-path" + (running ? " flowing" : "")} />
      {showProtocolLabel && (
        <g>
          <rect
            x={midX - 18} y={midY - 14}
            width={36} height={13}
            rx={3} ry={3}
            fill="rgba(10,11,18,0.82)"
            stroke={invalid ? "rgba(248,113,113,0.4)" : "rgba(56,189,248,0.25)"}
            strokeWidth="0.8"
            pointerEvents="none"
          />
          <text
            x={midX} y={midY - 4}
            className="edge-protocol-label"
            textAnchor="middle"
            pointerEvents="none"
            style={{ fill: invalid ? "rgba(248,113,113,0.9)" : undefined }}
          >{invalid ? "BLOCKED" : protocol}</text>
        </g>
      )}
      {/* Forward request particles (cyan) */}
      <circle ref={c0} className="particle" r="3.2" fill={invalid ? "var(--red)" : "var(--cyan)"} opacity="0" />
      <circle ref={c1} className="particle" r="3.2" fill={invalid ? "var(--red)" : "var(--cyan)"} opacity="0" />
      <circle ref={c2} className="particle" r="3.2" fill={invalid ? "var(--red)" : "var(--cyan)"} opacity="0" />
      {/* Reverse response packets (orange — coming back to client) */}
      <circle ref={r0} r="2.6" fill="var(--amber)" opacity="0" />
      <circle ref={r1} r="2.6" fill="var(--amber)" opacity="0" />
    </g>
  );
}, (prev, next) =>
  prev.from.x === next.from.x &&
  prev.from.y === next.from.y &&
  prev.from.type === next.from.type &&
  prev.to.x === next.to.x &&
  prev.to.y === next.to.y &&
  prev.to.type === next.to.type &&
  prev.edge.protocol === next.edge.protocol &&
  prev.running === next.running &&
  prev.highlight === next.highlight &&
  prev.fromCrashed === next.fromCrashed &&
  prev.invalid === next.invalid
);

/* ---------- Minimap (click/drag to pan canvas) ---------- */
const MiniMap = React.memo(function MiniMap({ nodes, edges, view, stageRef, onPan }) {
  if (nodes.length === 0) return <div className="minimap-empty">Minimap</div>;

  const svgRef = useRefC(null);
  const dragging = useRefC(false);
  // Keep latest props accessible inside stable event handlers without re-registering
  const latest = useRefC({ view, nodes, onPan });
  latest.current = { view, nodes, onPan };

  const doPan = (clientX, clientY) => {
    if (!svgRef.current || !stageRef.current) return;
    const { view: v, nodes: ns, onPan: pan } = latest.current;
    if (!ns.length) return;
    const xs = ns.map(n => n.x), ys = ns.map(n => n.y);
    const minX2 = Math.min(...xs) - 60, minY2 = Math.min(...ys) - 60;
    const maxX2 = Math.max(...xs) + 220, maxY2 = Math.max(...ys) + 120;
    const w2 = maxX2 - minX2, h2 = maxY2 - minY2;
    const rect = svgRef.current.getBoundingClientRect();
    const wx = minX2 + ((clientX - rect.left) / rect.width)  * w2;
    const wy = minY2 + ((clientY - rect.top)  / rect.height) * h2;
    const sr  = stageRef.current.getBoundingClientRect();
    pan(sr.width / 2 - wx * v.k, sr.height / 2 - wy * v.k);
  };

  useEffectC(() => {
    const move = (e) => { if (dragging.current) doPan(e.clientX, e.clientY); };
    const up   = ()  => { dragging.current = false; };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup",   up);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup",   up);
    };
  }, []); // register once; latest ref keeps values fresh

  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
  const minX = Math.min(...xs) - 60, minY = Math.min(...ys) - 60;
  const maxX = Math.max(...xs) + 220, maxY = Math.max(...ys) + 120;
  const w = maxX - minX, h = maxY - minY;

  const stageRect = stageRef.current?.getBoundingClientRect();
  let viewRect = null;
  if (stageRect) {
    viewRect = {
      x: -view.x / view.k,
      y: -view.y / view.k,
      w: stageRect.width  / view.k,
      h: stageRect.height / view.k,
    };
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`${minX} ${minY} ${w} ${h}`}
      width="100%" height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ cursor: "crosshair", display: "block" }}
      onMouseDown={(e) => {
        e.preventDefault();
        dragging.current = true;
        doPan(e.clientX, e.clientY);
      }}
    >
      {edges.map(e => {
        const a = nodes.find(n => n.id === e.from);
        const b = nodes.find(n => n.id === e.to);
        if (!a || !b) return null;
        return <line key={e.id} x1={a.x + 80} y1={a.y + 30} x2={b.x + 80} y2={b.y + 30} stroke="rgba(14,165,233,0.5)" strokeWidth="1.5" />;
      })}
      {nodes.map(n => {
        const t = window.findNodeType(n.type);
        const cat = window.CATEGORIES[t.cat];
        return <rect key={n.id} x={n.x} y={n.y} width="160" height="60" fill={cat.color} opacity="0.75" rx="4" />;
      })}
      {viewRect && (
        <rect x={viewRect.x} y={viewRect.y} width={viewRect.w} height={viewRect.h}
          fill="rgba(14,165,233,0.12)" stroke="var(--cyan)" strokeWidth="3" rx="3"
          style={{ cursor: "grab" }}
        />
      )}
    </svg>
  );
});

/* ---------- Crashed node detail modal ---------- */
const CRASH_LABELS = {
  CONNECTION_SATURATION: "Connection Saturation",
  CPU_OVERLOAD:          "CPU Overload",
  TIMEOUT_CASCADE:       "Timeout Cascade",
  RETRY_EXHAUSTION:      "Retry Exhaustion",
  TRAFFIC_OVERLOAD:      "Traffic Overload",
  CASCADING_FAILURE:     "Cascading Failure",
};
const CRASH_ICONS = {
  CONNECTION_SATURATION: "🔗",
  CPU_OVERLOAD:          "🖥️",
  TIMEOUT_CASCADE:       "⏱️",
  RETRY_EXHAUSTION:      "🔄",
  TRAFFIC_OVERLOAD:      "📈",
  CASCADING_FAILURE:     "⚡",
};

function CrashDetailModal({ node, health, crashInfo, onClose, onOpenConfig, onOpenWhatIf }) {
  const t   = window.findNodeType(node.type);
  const cat = window.CATEGORIES[t.cat];
  const reason = health?.crashReason || crashInfo?.reason;
  const cfg    = crashInfo?.config || node.config || {};

  // Close on Escape
  useEffectC(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const code     = reason?.code || "UNKNOWN";
  const label    = CRASH_LABELS[code] || "Unknown Failure";
  const icon     = CRASH_ICONS[code]  || "💥";

  const culpritCpu     = code === "CPU_OVERLOAD";
  const culpritMaxConn = code === "CONNECTION_SATURATION";
  const culpritTimeout = code === "TIMEOUT_CASCADE";
  const culpritRetries = code === "RETRY_EXHAUSTION";

  return (
    <>
      <div className="crash-modal-backdrop" onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <div className="crash-modal">

        {/* Header */}
        <div className="crash-modal-header">
          <div className="crash-modal-node-icon" style={{ color: cat?.color || "var(--red)" }}>
            {window.SVG[t.icon]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="crash-modal-node-name">{node.label}</div>
            <div className="crash-modal-node-type">{t.label}</div>
          </div>
          <span className="crash-modal-status-badge">💥 CRASHED</span>
          <button className="crash-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Scrollable body */}
        <div className="crash-modal-body">

          {/* Root cause */}
          <div className="crash-modal-section">
            <div className="crash-modal-section-title">Root Cause</div>
            <div className="crash-modal-cause">
              <span className="crash-modal-cause-icon">{icon}</span>
              <div>
                <div className="crash-modal-cause-label">{label}</div>
                {reason?.text && <div className="crash-modal-cause-text">{reason.text}</div>}
              </div>
            </div>
          </div>

          {/* Config at crash time */}
          <div className="crash-modal-section">
            <div className="crash-modal-section-title">Config at time of crash</div>
            <div className="crash-modal-config-grid">
              <CrashConfigRow label="CPU cores"    value={`${cfg.cpu     ?? 60}`}    unit="cores" culprit={culpritCpu}     tip="Increase CPU to handle higher load" />
              <CrashConfigRow label="Max Conn"     value={`${cfg.maxConn ?? 1000}`}  unit="conn"  culprit={culpritMaxConn} tip="Increase maxConn to handle more concurrent requests" />
              <CrashConfigRow label="Timeout"      value={`${cfg.timeout ?? 30}`}    unit="s"     culprit={culpritTimeout} tip="Increase timeout to reduce error cascade" />
              <CrashConfigRow label="Retries"      value={`${cfg.retries ?? 3}`}     unit=""      culprit={culpritRetries} tip="Increase retries to absorb transient failures" />
            </div>
          </div>

          {/* Fix */}
          {reason?.fix && (
            <div className="crash-modal-section">
              <div className="crash-modal-section-title">How to recover (live — no restart needed)</div>
              <div className="crash-modal-fix">{reason.fix}</div>
            </div>
          )}

        </div>{/* end crash-modal-body */}

        {/* Actions — always visible, pinned to bottom */}
        <div className="crash-modal-actions">
          <button className="btn btn-primary" onClick={() => { onOpenConfig(); onClose(); }}>
            Open Config Panel
          </button>
          <button className="btn" onClick={() => { onOpenWhatIf(); onClose(); }}>
            Add Replicas (What-if)
          </button>
          <button className="btn" style={{ marginLeft: "auto" }} onClick={onClose}>Dismiss</button>
        </div>
      </div>
    </>
  );
}

function CrashConfigRow({ label, value, unit, culprit, tip }) {
  return (
    <div className={"crash-config-row" + (culprit ? " culprit" : "")} title={culprit ? tip : ""}>
      <span className="crash-config-label">{label}</span>
      <span className="crash-config-value">{value}{unit && <span className="crash-config-unit"> {unit}</span>}</span>
      {culprit && <span className="crash-config-culprit">⚠ culprit</span>}
    </div>
  );
}

window.Canvas = Canvas;
