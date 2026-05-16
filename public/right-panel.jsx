// SystemFlow — Right panel (6 tabs)

const { useState: useStateR, useMemo: useMemoR, useRef: useRefR, useEffect: useEffectR } = React;

const RIGHT_TABS = [
  { id: "config",    label: "Config",    icon: "config"   },
  { id: "metrics",   label: "Metrics",   icon: "chart"    },
  { id: "log",       label: "Log",       icon: "log"      },
  { id: "advisor",   label: "Advisor",   icon: "triangle" },
  { id: "templates", label: "Templates", icon: "grid"     },
  { id: "team",      label: "Team",      icon: "users"    },
  { id: "rag",       label: "AI",        icon: "brain"    },
];

function RightPanel() {
  const ui = window.useUI();
  const store = window.useStore();
  const advisorCount = useMemoR(
    () => window.runAdvisor(store.nodes, store.edges).length || null,
    [store.nodes, store.edges]
  );

  return (
    <div className={"right-panel" + (ui.rightOpen ? "" : " collapsed")}>
      {ui.rightOpen && (
        <>
          <div className="tab-bar">
            {RIGHT_TABS.map(t => {
              const active = ui.rightTab === t.id;
              const badge = (t.id === "log" && store.requestLog.length > 0)
                ? store.requestLog.length
                : (t.id === "advisor")
                  ? advisorCount
                  : null;
              return (
                <button
                  key={t.id}
                  className={"tab-btn" + (active ? " active" : "")}
                  onClick={() => ui.setRightTab(t.id)}
                  title={t.label}
                >
                  {window.SVG[t.icon]}
                  <span>{t.label}</span>
                  {badge ? <span className="tab-badge">{badge > 99 ? "99+" : badge}</span> : null}
                </button>
              );
            })}
          </div>
          <div className="tab-content" key={ui.rightTab}>
            {ui.rightTab === "config"    && <ConfigTab />}
            {ui.rightTab === "metrics"   && <MetricsTab />}
            {ui.rightTab === "log"       && <LogTab />}
            {ui.rightTab === "advisor"   && <AdvisorTab />}
            {ui.rightTab === "templates" && <TemplatesTab />}
            {ui.rightTab === "team"      && <TeamTab />}
            {ui.rightTab === "rag"       && <RagTab />}
          </div>
        </>
      )}
      <button className="collapse-tab right" onClick={() => ui.setRightOpen(v => !v)} title={ui.rightOpen ? "Collapse" : "Expand"}>
        {ui.rightOpen ? window.SVG.chevRight : window.SVG.chevLeft}
      </button>
    </div>
  );
}

/* ---------- Config tab ---------- */
function ConfigTab() {
  const { nodes, edges, selectedNodeId, updateNode, removeNode, removeEdge, displayedNodeHealth: nodeHealth } = window.useStore();
  const node = nodes.find(n => n.id === selectedNodeId);

  if (!node) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" style={{ width: 40, height: 40, margin: "8px auto" }}>{window.SVG.config}</div>
        <h3>No node selected</h3>
        <p>Click a node on the canvas to edit its configuration.</p>
      </div>
    );
  }
  const t = window.findNodeType(node.type);
  const cat = window.CATEGORIES[t.cat];
  const h = nodeHealth[node.id] || { status: "idle", load: 0, lat: 0, tput: 0, err: 0 };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: cat.dim, color: cat.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {window.SVG[t.icon]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="text-input"
            style={{ background: "transparent", border: "none", padding: 0, fontWeight: 700, fontSize: 14 }}
            value={node.label}
            onChange={(e) => updateNode(node.id, { label: e.target.value })}
          />
          <div style={{ font: "600 10.5px/1 var(--mono)", color: cat.color, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 3 }}>
            {t.label} · {cat.label}
          </div>
        </div>
      </div>

      <div className="section-title">Live status</div>
      <div className="percentile-grid" style={{ marginBottom: 14 }}>
        <div className="percentile-card"><div className="l">Load</div><div className="v" style={{ color: h.load > 0.85 ? "var(--red)" : h.load > 0.6 ? "var(--amber)" : "var(--green)" }}>{Math.round(h.load * 100)}%</div></div>
        <div className="percentile-card"><div className="l">Latency</div><div className="v">{h.lat || 0}ms</div></div>
        <div className="percentile-card"><div className="l">Errors</div><div className="v" style={{ color: parseFloat(h.err) > 2 ? "var(--red)" : "var(--cyan)" }}>{h.err}%</div></div>
      </div>

      <div className="section-title">Resources</div>
      <Slider label="CPU cores"      value={node.config.cpu}     min={1}    max={128}  step={1}    onChange={(v) => updateNode(node.id, { config: { cpu: v } })}     unit="" />
      <Slider label="Memory"         value={node.config.memory}  min={1}    max={256}  step={1}    onChange={(v) => updateNode(node.id, { config: { memory: v } })}  unit="GB" />
      <Slider label="Max connections" value={node.config.maxConn} min={100}  max={50000} step={100} onChange={(v) => updateNode(node.id, { config: { maxConn: v } })} unit="" />
      <Slider label="Request timeout" value={node.config.timeout} min={1}    max={300}  step={1}    onChange={(v) => updateNode(node.id, { config: { timeout: v } })} unit="s" />
      <Slider label="Retries"        value={node.config.retries} min={0}    max={10}   step={1}    onChange={(v) => updateNode(node.id, { config: { retries: v } })} unit="" />

      <ConnectionsSection node={node} nodes={nodes} edges={edges} removeEdge={removeEdge} />

      <div className="section-title" style={{ marginTop: 18 }}>Danger zone</div>
      <button className="btn btn-danger" style={{ width: "100%" }} onClick={() => removeNode(node.id)}>Delete Node</button>
    </div>
  );
}

function ConnectionsSection({ node, nodes, edges, removeEdge }) {
  const nodeEdges = edges.filter(e => e.from === node.id || e.to === node.id);
  const invalidEdgeIds = useMemoR(() => {
    const map = {};
    if (!window.checkEdgeValidity) return map;
    edges.forEach(e => {
      const from = nodes.find(n => n.id === e.from);
      const to   = nodes.find(n => n.id === e.to);
      if (from && to && window.checkEdgeValidity(from, to)) map[e.id] = true;
    });
    return map;
  }, [edges, nodes]);

  return (
    <>
      <div className="section-title" style={{ marginTop: 18 }}>Connections</div>
      {nodeEdges.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 10 }}>No connections</div>
      ) : nodeEdges.map(e => {
        const otherId = e.from === node.id ? e.to : e.from;
        const other   = nodes.find(n => n.id === otherId);
        const dir     = e.from === node.id ? "→" : "←";
        const isInvalid = !!invalidEdgeIds[e.id];
        return (
          <div key={e.id} className={"conn-row" + (isInvalid ? " invalid" : "")}>
            <span className="conn-dir">{dir}</span>
            <span className="conn-label">{other?.label || otherId}</span>
            {isInvalid && <span className="conn-warn-icon" title="Invalid connection — architecturally unsound">⚠</span>}
            <button className="conn-remove" onClick={() => removeEdge(e.id)} title="Disconnect">✕</button>
          </div>
        );
      })}
    </>
  );
}

function Slider({ label, value, min, max, step, onChange, unit }) {
  return (
    <div className="config-row">
      <div className="config-label">
        <span className="config-label-text">{label}</span>
        <span className="config-value-chip">{value}{unit}</span>
      </div>
      <input type="range" className="slider" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

/* ---------- Metrics tab ---------- */
function MetricsTab() {
  const { displayedMetrics: metrics, simConfig, playbackTick } = window.useStore();
  const running = simConfig.state !== "idle";
  if (!running) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" style={{ width: 40, height: 40, margin: "8px auto" }}>{window.SVG.chart}</div>
        <h3>No data yet</h3>
        <p>Start a simulation to populate metrics.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="section-title">Latency percentiles</div>
      <div className="percentile-grid" style={{ marginBottom: 14 }}>
        <div className="percentile-card"><div className="l">P50</div><div className="v">{metrics.p50}ms</div></div>
        <div className="percentile-card"><div className="l">P95</div><div className="v" style={{ color: metrics.p95 > 250 ? "var(--amber)" : "var(--cyan)" }}>{metrics.p95}ms</div></div>
        <div className="percentile-card"><div className="l">P99</div><div className="v" style={{ color: metrics.p99 > 500 ? "var(--red)" : "var(--cyan)" }}>{metrics.p99}ms</div></div>
      </div>

      <Sparkline title="Latency" unit="ms" data={metrics.latencyHistory} value={metrics.latency} color="var(--cyan)" />
      <Sparkline title="Throughput" unit="/s" data={metrics.throughputHistory} value={Math.round(metrics.throughput)} color="var(--green)" />
      <Sparkline title="Error rate" unit="%" data={metrics.errorHistory} value={metrics.errorRate.toFixed(2)} color={metrics.errorRate > 2 ? "var(--red)" : "var(--amber)"} fmt={(v) => v.toFixed(2)} />

      <div className="section-title" style={{ marginTop: 14 }}>Traffic ledger</div>
      <div className="percentile-grid">
        <div className="percentile-card"><div className="l">Total</div><div className="v" style={{ color: "var(--text)" }}>{metrics.totalRequests.toLocaleString()}</div></div>
        <div className="percentile-card"><div className="l">OK</div><div className="v" style={{ color: "var(--green)" }}>{metrics.completedRequests.toLocaleString()}</div></div>
        <div className="percentile-card"><div className="l">Failed</div><div className="v" style={{ color: "var(--red)" }}>{metrics.failedRequests.toLocaleString()}</div></div>
      </div>

      <div className="section-title" style={{ marginTop: 14 }}>Load heatmap</div>
      <Heatmap />
    </div>
  );
}

function Sparkline({ title, data, value, color, unit, fmt }) {
  const w = 300, h = 50;
  if (!data || data.length < 2) {
    return (
      <div className="chart-card">
        <div className="chart-head"><span className="chart-title">{title}</span><span className="chart-value" style={{ color }}>{value}{unit}</span></div>
        <div style={{ height: h, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 11 }}>collecting…</div>
      </div>
    );
  }
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => [i * (w / Math.max(1, data.length - 1)), h - (v / max) * (h - 4) - 2]);
  const d = "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");
  const area = d + ` L${w},${h} L0,${h} Z`;
  return (
    <div className="chart-card">
      <div className="chart-head"><span className="chart-title">{title}</span><span className="chart-value" style={{ color }}>{fmt ? fmt(parseFloat(value)) : value}{unit}</span></div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={"g-" + title} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#g-${title})`} />
        <path d={d} stroke={color} strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  );
}

function Heatmap() {
  const { nodes, displayedNodeHealth: nodeHealth } = window.useStore();
  if (nodes.length === 0) return <div className="empty-state" style={{ padding: "16px 8px" }}><p>Add nodes to view load.</p></div>;
  return (
    <div className="heatmap">
      {nodes.slice(0, 24).map(n => {
        const h = nodeHealth[n.id] || { load: 0 };
        const load = h.load || 0;
        const col = load > 0.85 ? "#ef4444" : load > 0.65 ? "#f59e0b" : load > 0.3 ? "#10b981" : "#3f3f46";
        const op = 0.35 + load * 0.65;
        return <div key={n.id} className="heat-cell" style={{ background: col, opacity: op }} title={`${n.label}: ${Math.round(load * 100)}%`} />;
      })}
    </div>
  );
}

/* ---------- Log tab ---------- */
function LogTab() {
  const { requestLog, setRequestLog } = window.useStore();
  const [filter, setFilter] = useStateR("all");
  const items = useMemoR(() => {
    return requestLog.filter(e => {
      if (filter === "2xx") return e.status >= 200 && e.status < 300;
      if (filter === "4xx") return e.status >= 400 && e.status < 500;
      if (filter === "5xx") return e.status >= 500;
      return true;
    }).slice(-200).reverse();
  }, [requestLog, filter]);

  return (
    <div>
      <div className="log-toolbar">
        {["all", "2xx", "4xx", "5xx"].map(f => (
          <button key={f} className={"toggle-chip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>{f.toUpperCase()}</button>
        ))}
        <span className="spacer" />
        <button className="toggle-chip" onClick={() => setRequestLog([])}>Clear</button>
      </div>
      <div className="log-list">
        {items.length === 0 && <div className="empty-state"><p>No requests yet.</p></div>}
        {items.map(e => {
          const cls = e.status >= 500 ? "s5xx" : e.status >= 400 ? "s4xx" : "s2xx";
          return (
            <div key={e.id} className={"log-entry " + cls}>
              <span className="ts">{e.ts}</span>
              <span className="method">{e.method}</span>
              <span className="path">{e.path}</span>
              <span className="status">{e.status}</span>
              <span className="lat">{e.lat}ms</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Vendor lock-in section ---------- */
function VendorSection({ nodes }) {
  if (nodes.length === 0) return null;
  const awsCount   = nodes.filter(n => window.findNodeType(n.type)?.cat === 'aws').length;
  const gcpCount   = nodes.filter(n => window.findNodeType(n.type)?.cat === 'gcp').length;
  const azureCount = nodes.filter(n => window.findNodeType(n.type)?.cat === 'azure').length;
  const cloudCount = awsCount + gcpCount + azureCount;
  const portability = Math.round(100 * (1 - cloudCount / nodes.length));
  const grade = portability >= 80 ? 'A' : portability >= 60 ? 'B' : portability >= 40 ? 'C' : 'D';
  const gradeColor = { A: 'var(--green)', B: 'var(--cyan)', C: 'var(--amber)', D: 'var(--red)' }[grade];

  return (
    <div className="vendor-section">
      <div className="vendor-header">
        <div className="vendor-grade" style={{ color: gradeColor }}>{grade}</div>
        <div style={{ flex: 1 }}>
          <div className="section-title" style={{ margin: 0 }}>Portability — {portability}%</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
            {cloudCount === 0 ? 'No vendor-specific nodes' : `${cloudCount} vendor-locked node${cloudCount !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>
      {cloudCount > 0 && (
        <div className="vendor-bars">
          {awsCount > 0   && <VendorBar label="AWS"   count={awsCount}   total={nodes.length} color="#ff9900" />}
          {gcpCount > 0   && <VendorBar label="GCP"   count={gcpCount}   total={nodes.length} color="#4285f4" />}
          {azureCount > 0 && <VendorBar label="Azure" count={azureCount} total={nodes.length} color="#0078d4" />}
        </div>
      )}
    </div>
  );
}

function VendorBar({ label, count, total, color }) {
  const pct = Math.round(100 * count / total);
  return (
    <div className="vendor-bar-row">
      <span className="vendor-bar-label" style={{ color }}>{label}</span>
      <div className="vendor-bar-track">
        <div className="vendor-bar-fill" style={{ width: pct + '%', background: color }} />
      </div>
      <span className="vendor-bar-count">{count}</span>
    </div>
  );
}

/* ---------- Advisor tab ---------- */
function AdvisorTab() {
  const { nodes, edges, metrics, simConfig } = window.useStore();
  const findings = useMemoR(() => window.runAdvisor(nodes, edges, metrics, simConfig), [nodes, edges, metrics.errorRate, metrics.p95, simConfig.state]);

  const sevMap = {
    critical: { color: "var(--red)",    dim: "var(--red-dim)" },
    warn:     { color: "var(--amber)",  dim: "var(--amber-dim)" },
    info:     { color: "var(--cyan)",   dim: "var(--cyan-dim)" },
  };

  return (
    <div>
      <VendorSection nodes={nodes} />
      {findings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ width: 40, height: 40, margin: "8px auto", color: "var(--green)" }}>{window.SVG.triangle}</div>
          <h3>All clear</h3>
          <p>No topology issues detected.</p>
        </div>
      ) : (
        <>
          <div className="section-title">{findings.length} finding{findings.length === 1 ? "" : "s"}</div>
          {findings.map((f, i) => {
            const s = sevMap[f.severity];
            return (
              <div key={i} className="finding" style={{ "--severity-color": s.color, "--severity-dim": s.dim }}>
                <div className="finding-head">
                  <span className="finding-title">{f.title}</span>
                  <span className="severity-chip">{f.severity}</span>
                </div>
                <div className="finding-desc">{f.desc}</div>
                <div className="finding-fix"><strong>Fix:</strong> {f.fix}</div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

/* ---------- Templates tab ---------- */
function TemplatesTab() {
  const { loadTemplate, nodes } = window.useStore();
  const [confirming, setConfirming] = useStateR(null);

  const apply = (tmpl) => {
    if (nodes.length > 0) setConfirming(tmpl);
    else loadTemplate(tmpl);
  };
  return (
    <div>
      <div className="section-title">Architecture templates</div>
      <div className="template-grid">
        {window.TEMPLATES.map(t => (
          <div key={t.id} className="template-card" style={{ "--cat-color": t.catColor }} onClick={() => apply(t)}>
            <h4>{t.name}</h4>
            <p>{t.desc}</p>
            <div className="meta">
              <span style={{ color: t.catColor }}>{t.cat.toUpperCase()}</span>
              <span>{t.nodes.length} nodes</span>
            </div>
          </div>
        ))}
      </div>
      {confirming && (
        <div className="modal-overlay" onClick={() => setConfirming(null)}>
          <div className="high-traffic-card" style={{ borderColor: "var(--amber)", boxShadow: "0 0 40px rgba(245,158,11,0.3)" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: "var(--amber)" }}>Replace canvas?</h2>
            <div className="sub">Loading "{confirming.name}" will overwrite all current nodes and edges.</div>
            <div className="modal-buttons">
              <button className="btn" onClick={() => setConfirming(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { loadTemplate(confirming); setConfirming(null); }}>Load template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Team tab ---------- */
function TeamTab() {
  const auth = window.useAuth();
  const teammates = [
    { name: "Priya Anand",   email: "priya@systemflow.dev",   initials: "PA", role: "Owner",  online: true,  color: "#0ea5e9" },
    { name: "Marcus Lin",    email: "marcus@systemflow.dev",  initials: "ML", role: "Editor", online: true,  color: "#10b981" },
    { name: "Sara Kovač",    email: "sara@systemflow.dev",    initials: "SK", role: "Editor", online: false, color: "#a855f7" },
    { name: "Theo Martin",   email: "theo@systemflow.dev",    initials: "TM", role: "Viewer", online: false, color: "#f59e0b" },
  ];
  return (
    <div>
      <div className="section-title">You</div>
      <div className="finding" style={{ borderLeftColor: "var(--cyan)" }}>
        <div className="finding-head">
          <div className="profile-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
            {auth.user.avatar ? <img src={auth.user.avatar} alt="" /> : auth.user.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="finding-title">{auth.user.name}</div>
            <div className="finding-desc" style={{ fontSize: 10.5, marginTop: 1 }}>{auth.user.email}</div>
          </div>
          <span className="mini-badge cyan">OWNER</span>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 16 }}>Members · {teammates.length}</div>
      {teammates.map(m => (
        <div key={m.email} className="finding" style={{ borderLeftColor: m.online ? "var(--green)" : "var(--border3)" }}>
          <div className="finding-head">
            <div className="profile-avatar" style={{ width: 32, height: 32, fontSize: 11, color: m.color, position: "relative" }}>
              {m.initials}
              {m.online && <span style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: "50%", background: "var(--green)", border: "2px solid var(--surface)" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="finding-title">{m.name}</div>
              <div className="finding-desc" style={{ fontSize: 10.5, marginTop: 1 }}>{m.email}</div>
            </div>
            <span className={"mini-badge " + (m.role === "Editor" ? "indigo" : m.role === "Viewer" ? "gray" : "cyan")}>{m.role.toUpperCase()}</span>
          </div>
        </div>
      ))}

      <button className="btn btn-primary" style={{ width: "100%", marginTop: 10 }}>+ Invite teammate</button>

      <div className="section-title" style={{ marginTop: 18 }}>Share link</div>
      <div className="finding" style={{ borderLeftColor: "var(--indigo)" }}>
        <div style={{ font: "600 11px/1.4 var(--mono)", color: "var(--cyan)", wordBreak: "break-all" }}>
          systemflow.dev/s/3kf-aq72-wp9
        </div>
        <div className="finding-fix" style={{ marginTop: 6 }}>
          Anyone with this link can <strong>view</strong> the canvas.
        </div>
      </div>
    </div>
  );
}

/* ---------- RAG / AI Chat tab ---------- */

function ragRespond(q, nodes, edges, metrics, findings, simConfig) {
  if (/summary|overview|analyze|analyse|what.*(have|see|got)|tell me|describe/.test(q)) {
    if (nodes.length === 0) return "Canvas is empty. Drag nodes from the left palette or press T to load a template. Then ask me anything about the architecture!";
    const connectedIds = new Set();
    edges.forEach(e => { connectedIds.add(e.from); connectedIds.add(e.to); });
    const orphans = nodes.filter(n => !connectedIds.has(n.id));
    let out = `Canvas: ${nodes.length} node${nodes.length > 1 ? "s" : ""}, ${edges.length} edge${edges.length !== 1 ? "s" : ""}. `;
    if (orphans.length) out += `${orphans.length} disconnected node(s): ${orphans.map(o => o.label).join(", ")}. `;
    if (findings.length === 0) out += "No topology issues — looks solid!";
    else out += `${findings.length} finding(s): ${findings.map(f => `[${f.severity}] ${f.title}`).join(" | ")}.`;
    return out;
  }

  if (/bottleneck|slow|latency|performance|fast|speed|p95|p99/.test(q)) {
    if (simConfig.state !== "idle" && metrics) {
      if (metrics.p95 > 400) return `P95 latency is ${metrics.p95}ms — above 400ms SLA. Likely cause: saturated DB or missing cache. Add Redis between your app tier and DB, or scale out the hot node horizontally.`;
      if (metrics.errorRate > 5) return `Error rate is ${metrics.errorRate.toFixed(1)}% — above 1% SLA budget. Check connection pool limits on overloaded nodes and add retry logic with exponential backoff.`;
    }
    const crit = findings.filter(f => f.severity === "critical");
    if (crit.length) return `Critical: ${crit[0].title}. ${crit[0].fix}`;
    if (nodes.length === 0) return "Add nodes and run a load test (Test Lab tab) to detect bottlenecks under traffic.";
    return "No critical bottlenecks detected. Run a stress test in the Test Lab tab to discover limits — the Breakpoint scenario finds your max throughput.";
  }

  if (/spof|single point|failover|redundan|high avail|ha\b/.test(q)) {
    const spofs = findings.filter(f => /single point|spof/i.test(f.title));
    if (spofs.length) return `SPOF(s) detected: ${spofs.map(s => s.title).join("; ")}. Fix: ${spofs[0].fix}`;
    if (nodes.length < 2) return "Add more nodes to identify SPOFs. A SPOF is any node whose failure takes down the whole system.";
    return "No SPOFs detected. HA best practices: (1) replica for every database, (2) 2+ instances of stateless services, (3) multi-zone deployment for critical paths, (4) health checks + circuit breakers.";
  }

  if (/cache|redis|caching|memcache/.test(q)) {
    const noCache = findings.find(f => /cache/i.test(f.title));
    if (noCache) return `${noCache.desc} — ${noCache.fix}`;
    const caches = nodes.filter(n => n.type === "redis" || n.type === "cdn");
    if (caches.length) return `Cache layer: ${caches.map(c => c.label).join(", ")}. Tune TTLs to match data staleness requirements. Target >80% hit rate for DB-heavy paths.`;
    return "Add Redis between your app tier and database. Cache read-heavy queries — typical speedup: 10ms DB read → <1ms cache hit. Use cache-aside (lazy loading) pattern to start.";
  }

  if (/load balanc|lb\b|traffic distrib|round robin|haproxy|nginx/.test(q)) {
    const noLb = findings.find(f => /load balancer/i.test(f.title));
    if (noLb) return `${noLb.desc} ${noLb.fix}`;
    const lbs = nodes.filter(n => ["lb", "gateway", "cdn"].includes(n.type));
    if (lbs.length) return `Load balancer(s): ${lbs.map(l => l.label).join(", ")}. Config: health checks every 10s, connection draining on scale-in, sticky sessions only if stateful.`;
    return "Add a Load Balancer node in front of your app servers. Use round-robin for stateless services, least-connections for variable-duration requests. ALB for HTTP/2, NLB for raw TCP at very high throughput.";
  }

  if (/security|waf|auth|firewall|ssl|tls|owasp|jwt|secret/.test(q)) {
    const secIssues = findings.filter(f => /waf|auth|security/i.test(f.title));
    if (secIssues.length) return `Security gap: ${secIssues[0].title}. ${secIssues[0].fix}`;
    const secNodes = nodes.filter(n => window.findNodeType(n.type)?.cat === "security");
    if (secNodes.length) return `Security layer: ${secNodes.map(s => s.label).join(", ")}. Ensure: TLS termination at edge, JWT validation at gateway, secrets in a vault — never in env vars.`;
    return "Secure your architecture: (1) WAF at the perimeter for OWASP Top-10 protection, (2) Auth service for centralized identity (OAuth2/OIDC), (3) mTLS for service-to-service traffic, (4) secrets manager for credentials.";
  }

  if (/observ|monitor|metric|grafana|prometheus|log|trace|jaeger|apm/.test(q)) {
    const obsIssue = findings.find(f => /observ/i.test(f.title));
    if (obsIssue) return `${obsIssue.desc} ${obsIssue.fix}`;
    const obsNodes = nodes.filter(n => window.findNodeType(n.type)?.cat === "observability");
    if (obsNodes.length) return `Observability stack: ${obsNodes.map(o => o.label).join(", ")}. Configure RED metrics (Rate, Errors, Duration) per service and set SLO-based alerts on P95 and error rate.`;
    return "Three pillars: (1) Metrics — Prometheus + Grafana, (2) Logs — ELK or Grafana Loki, (3) Traces — OpenTelemetry + Jaeger. Add these from the Observability palette category.";
  }

  if (/database|db\b|postgres|mysql|mongo|sqlite|dynamo|supabase/.test(q)) {
    const dbs = nodes.filter(n => ["database", "storage"].includes(window.findNodeType(n.type)?.cat));
    const dbIssue = findings.find(f => /single point/i.test(f.title) && dbs.some(d => f.title.includes(d.label)));
    if (dbs.length === 0) return "No database nodes yet. Common choices: PostgreSQL (relational, ACID), MongoDB (documents), Redis (cache/leaderboards), DynamoDB (serverless key-value at scale).";
    if (dbIssue) return `Database issue: ${dbIssue.title}. ${dbIssue.fix}`;
    return `Database(s): ${dbs.map(d => d.label).join(", ")}. Best practices: read replicas for read-heavy load, connection pooling (PgBouncer), sharding for >10M rows/table.`;
  }

  if (/queue|kafka|rabbit|sqs|pubsub|async|event|stream|kinesis/.test(q)) {
    const queues = nodes.filter(n => ["kafka", "rabbitmq", "sqs", "pubsub", "kinesis"].includes(n.type));
    if (queues.length) return `Queue(s): ${queues.map(q => q.label).join(", ")}. Monitor: consumer lag, DLQ depth, retention. Pattern: API → Queue → Worker → DB (write path).`;
    return "Message queues decouple producers from consumers and absorb traffic spikes. Kafka for high-throughput streams, RabbitMQ for task queues, SQS for managed serverless. Add from the Messaging category.";
  }

  if (/scale|scal|grow|spike|traffic|autoscal|horizontal|vertical/.test(q)) {
    const rate = simConfig.state !== "idle" ? (metrics?.currentRate || 0) : 0;
    if (rate > 1000) return `At ${rate.toLocaleString()} req/s: (1) horizontal autoscaling on stateless services, (2) check DB connection pool limits, (3) CDN for static assets, (4) async queues for non-critical writes.`;
    return "Scaling: (1) Horizontal (add instances) for stateless services, (2) Read replicas + caching for databases, (3) Sharding for write-heavy workloads, (4) CDN + edge caching for static content. Profile before optimizing.";
  }

  if (/health|score|grade|how good|how bad|rate my/.test(q)) {
    const score = Math.max(0, 100
      - findings.filter(f => f.severity === "critical").length * 20
      - findings.filter(f => f.severity === "warn").length * 8
      - findings.filter(f => f.severity === "info").length * 2);
    return `Architecture health: ${score}/100. ${findings.length === 0 ? "No issues found." : findings.map(f => `[${f.severity}] ${f.title}`).join(" | ")}. ${simConfig.state === "running" ? `Live: P95=${metrics?.p95}ms, err=${metrics?.errorRate?.toFixed(1)}%.` : "Start a simulation for live metrics."}`;
  }

  if (/help|what can|how to|howto|commands|features/.test(q)) {
    return "I can help with: topology analysis ('analyze my architecture'), performance ('what are the bottlenecks?'), design patterns ('how do I add HA?'), best practices ('should I add Redis?'), security ('is my architecture secure?'), and cost optimization. Ask anything!";
  }

  if (/fix|solve|resolve|improve|suggest/.test(q)) {
    if (findings.length === 0) return "No issues detected — your topology looks clean! Run a load test to push it further.";
    const top = findings[0];
    return `Top priority fix: [${top.severity}] ${top.title}. ${top.desc} Recommendation: ${top.fix}`;
  }

  if (nodes.length === 0) return "Canvas is empty. Drag nodes from the left palette or press T to load a template. Then ask me anything!";
  return `Your ${nodes.length}-node topology has ${edges.length} connection(s). ${findings.length > 0 ? `${findings.length} finding(s): ${findings.map(f => f.title).join(", ")}. ` : "No issues detected. "}Try: 'What are the bottlenecks?', 'How do I improve availability?', or 'Analyze my architecture'.`;
}

const RAG_PRESETS = [
  "Analyze my architecture",
  "Any bottlenecks?",
  "Add high availability",
  "Should I add a cache?",
];

function RagTab() {
  const { nodes, edges, metrics, simConfig } = window.useStore();
  const [messages, setMessages] = useStateR([
    { id: 0, role: "ai", text: "Hi! I analyze your canvas and answer system design questions. What do you want to know?" }
  ]);
  const [input, setInput] = useStateR("");
  const [thinking, setThinking] = useStateR(false);
  const listRef = useRefR(null);

  useEffectR(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async (text) => {
    const q = (text !== undefined ? text : input).trim();
    if (!q || thinking) return;
    setInput("");
    setMessages(m => [...m, { id: Date.now(), role: "user", text: q }]);
    setThinking(true);
    await new Promise(r => setTimeout(r, 350 + Math.random() * 350));
    const findings = window.runAdvisor(nodes, edges, metrics, simConfig);
    const reply = ragRespond(q.toLowerCase(), nodes, edges, metrics, findings, simConfig);
    setMessages(m => [...m, { id: Date.now() + 1, role: "ai", text: reply }]);
    setThinking(false);
  };

  return (
    <div>
      <div className="section-title" style={{ marginTop: 0 }}>Canvas AI</div>

      <div ref={listRef} className="rag-messages">
        {messages.map(msg => (
          <div key={msg.id} className={"rag-msg " + msg.role}>
            <div className="rag-bubble">{msg.text}</div>
          </div>
        ))}
        {thinking && (
          <div className="rag-msg ai">
            <div className="rag-bubble thinking">
              <span className="rag-dot" /><span className="rag-dot" /><span className="rag-dot" />
            </div>
          </div>
        )}
      </div>

      <div className="rag-presets">
        {RAG_PRESETS.map(p => (
          <button key={p} className="toggle-chip" style={{ fontSize: 10 }} onClick={() => send(p)}>{p}</button>
        ))}
      </div>

      <div className="rag-input-row">
        <input
          className="text-input"
          style={{ flex: 1 }}
          placeholder="Ask about your architecture…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
          disabled={thinking}
        />
        <button
          className="btn btn-primary"
          style={{ padding: "7px 12px", flexShrink: 0 }}
          onClick={() => send()}
          disabled={!input.trim() || thinking}
        >
          Ask
        </button>
      </div>
    </div>
  );
}

/* ---------- Cycle (circular dependency) detection ---------- */
function detectCyclesFn(nodesList, edgesList) {
  const adj = {};
  nodesList.forEach(n => { adj[n.id] = []; });
  edgesList.forEach(e => { if (adj[e.from]) adj[e.from].push(e.to); });
  const visited = {}, inStack = {};
  let found = false, cyclePath = [];
  function dfs(id, path) {
    if (found) return;
    visited[id] = true; inStack[id] = true;
    for (const next of (adj[id] || [])) {
      if (!visited[next]) { dfs(next, [...path, next]); }
      else if (inStack[next] && !found) {
        found = true;
        const start = path.indexOf(next);
        cyclePath = start >= 0 ? path.slice(start) : [next];
      }
    }
    inStack[id] = false;
  }
  nodesList.forEach(n => { if (!visited[n.id]) dfs(n.id, [n.id]); });
  return { found, cyclePath };
}

/* ---------- Advisor engine (exported) ---------- */
window.runAdvisor = function (nodes, edges, metrics, simConfig) {
  const findings = [];
  if (!nodes || nodes.length === 0) return findings;

  // Circular dependency detection
  if (edges.length > 0) {
    const { found, cyclePath } = detectCyclesFn(nodes, edges);
    if (found && cyclePath.length > 0) {
      const labels = cyclePath.map(id => nodes.find(n => n.id === id)?.label || id);
      findings.push({
        severity: "critical",
        title: "Circular dependency detected",
        desc: `Service loop: ${labels.join(" → ")} → ${labels[0]}. Creates infinite retry cascades and deadlocks under failure.`,
        fix: "Break the cycle with a message queue or event-driven handoff between the looped services.",
      });
    }
  }

  // SPOF: single DB serving multiple compute nodes
  const dbs = nodes.filter(n => {
    const t = window.findNodeType(n.type);
    return t?.cat === "database" || t?.cat === "storage";
  });
  dbs.forEach(db => {
    const inbound = edges.filter(e => e.to === db.id);
    if (inbound.length >= 2 && !nodes.some(n => n.type === db.type && n.id !== db.id)) {
      findings.push({
        severity: "warn",
        title: `${db.label} is a single point of failure`,
        desc: `${inbound.length} services route to a lone ${db.label} with no replica.`,
        fix: "Add a read replica or failover instance of the same type.",
      });
    }
  });

  // No load balancer in front of multiple app servers
  const appServers = nodes.filter(n => ["server", "container", "web-server", "aws-ec2", "az-vm"].includes(n.type));
  const hasLB = nodes.some(n => ["lb", "gateway", "cdn"].includes(n.type));
  if (appServers.length >= 2 && !hasLB) {
    findings.push({
      severity: "warn",
      title: "Multiple app servers, no load balancer",
      desc: `Found ${appServers.length} app instances but no LB / gateway routing traffic.`,
      fix: "Drop a Load Balancer or API Gateway in front of the app fleet.",
    });
  }

  // No cache for DB-heavy paths
  const hasCache = nodes.some(n => n.type === "redis" || n.type === "cdn");
  if (dbs.length > 0 && appServers.length > 0 && !hasCache) {
    findings.push({
      severity: "info",
      title: "No cache layer detected",
      desc: "Database reads are hitting the primary directly.",
      fix: "Insert Redis or a CDN between the app tier and the database.",
    });
  }

  // Orphaned nodes (no edges in or out, and >1 total node)
  if (nodes.length > 1) {
    const connected = new Set();
    edges.forEach(e => { connected.add(e.from); connected.add(e.to); });
    const orphans = nodes.filter(n => !connected.has(n.id));
    if (orphans.length > 0) {
      findings.push({
        severity: "info",
        title: `${orphans.length} disconnected node${orphans.length === 1 ? "" : "s"}`,
        desc: orphans.map(o => o.label).join(", ") + " — receives no traffic.",
        fix: "Connect to the rest of the graph, or remove if unused.",
      });
    }
  }

  // Missing observability when stack is >5 nodes
  const hasObs = nodes.some(n => {
    const t = window.findNodeType(n.type);
    return t?.cat === "observability";
  });
  if (nodes.length >= 5 && !hasObs) {
    findings.push({
      severity: "info",
      title: "No observability stack",
      desc: "5+ services with no metrics or APM in the topology.",
      fix: "Add Prometheus, Grafana, or DataDog.",
    });
  }

  // No security
  const hasSec = nodes.some(n => {
    const t = window.findNodeType(n.type);
    return t?.cat === "security";
  });
  const hasClients = nodes.some(n => window.findNodeType(n.type)?.cat === "clients");
  if (hasClients && nodes.length >= 4 && !hasSec) {
    findings.push({
      severity: "warn",
      title: "Public endpoints with no WAF or Auth",
      desc: "Client-facing topology lacks firewall / auth layer.",
      fix: "Add a WAF in front of the gateway and an Auth service for sessions.",
    });
  }

  // Live: error rate critical
  if (metrics && metrics.errorRate > 5) {
    findings.push({
      severity: "critical",
      title: `Error rate at ${metrics.errorRate.toFixed(1)}%`,
      desc: "Errors are well above the 1% SLA budget.",
      fix: "Reduce traffic rate, add retries, or scale out the saturated tier.",
    });
  }
  if (metrics && metrics.p95 > 400) {
    findings.push({
      severity: "warn",
      title: `P95 latency ${metrics.p95}ms`,
      desc: "P95 above 400ms — users will feel it.",
      fix: "Add caching, increase CPU on hot nodes, or shard the DB.",
    });
  }

  return findings;
};

window.RightPanel = RightPanel;
