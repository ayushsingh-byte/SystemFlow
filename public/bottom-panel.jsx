// SystemFlow — Bottom panel (ribbon with tabs)

const { useEffect: useEffectB, useState: useStateB, useRef: useRefB, useMemo: useMemoB } = React;

const RIBBON_TABS = [
  { id: "simulate",  label: "Simulate",  accent: "var(--green)"  },
  { id: "traffic",   label: "Traffic",   accent: "var(--cyan)"   },
  { id: "chaos",     label: "Chaos",     accent: "var(--red)"    },
  { id: "whatif",    label: "What-if",   accent: "var(--indigo)" },
  { id: "slo",       label: "SLO",       accent: "var(--amber)"  },
  { id: "profiles",  label: "Profiles",  accent: "var(--indigo)" },
  { id: "testlab",   label: "Test Lab",  accent: "var(--purple)" },
  { id: "incident",  label: "Incident",  accent: "var(--red)"    },
  { id: "interview", label: "Interview", accent: "var(--gold)"   },
];

/* ---------- Interview challenges ---------- */
const INTERVIEW_CHALLENGES = [
  {
    id: "url_shortener", name: "URL Shortener", emoji: "🔗", time: 20,
    desc: "Design bit.ly: short URLs, redirects, 100M daily visits",
    criteria: [
      { id: "lb",     pts: 15, label: "Load balancer / API gateway", check: n => n.some(x => ['lb','gateway','cdn'].includes(x.type)) },
      { id: "db",     pts: 20, label: "Database for URL mappings",   check: n => n.some(x => ['sql','nosql','dynamo','mongo','aws-dynamo'].includes(x.type)) },
      { id: "cache",  pts: 20, label: "Cache for hot URLs",          check: n => n.some(x => ['redis','memcached'].includes(x.type)) },
      { id: "server", pts: 15, label: "App server tier",             check: n => n.some(x => ['server','function','aws-lambda','vm'].includes(x.type)) },
      { id: "cdn",    pts: 15, label: "CDN for redirect speed",      check: n => n.some(x => ['cdn','aws-cf'].includes(x.type)) },
      { id: "ha",     pts: 15, label: "Multi-component design",      check: n => n.length >= 4 },
    ],
  },
  {
    id: "chat", name: "Real-time Chat", emoji: "💬", time: 30,
    desc: "WhatsApp-scale: messages, groups, presence, history",
    criteria: [
      { id: "gw",     pts: 20, label: "WebSocket / API gateway",     check: n => n.some(x => ['gateway','lb','proxy','mesh'].includes(x.type)) },
      { id: "queue",  pts: 20, label: "Message queue for fan-out",   check: n => n.some(x => ['kafka','rabbitmq','sqs','pubsub','nats'].includes(x.type)) },
      { id: "db",     pts: 15, label: "Persistent history DB",       check: n => n.some(x => ['sql','nosql','mongo','cassandra'].includes(x.type)) },
      { id: "cache",  pts: 15, label: "Redis for presence/sessions", check: n => n.some(x => ['redis','memcached'].includes(x.type)) },
      { id: "server", pts: 15, label: "App server tier",             check: n => n.some(x => ['server','k8s','pod','function'].includes(x.type)) },
      { id: "obs",    pts: 15, label: "Observability stack",         check: n => n.some(x => ['prom','grafana','datadog','loki'].includes(x.type)) },
    ],
  },
  {
    id: "netflix", name: "Video Streaming", emoji: "🎬", time: 45,
    desc: "Netflix-scale: upload, encode, CDN delivery, recommendations",
    criteria: [
      { id: "cdn",    pts: 20, label: "CDN for video delivery",      check: n => n.some(x => ['cdn','aws-cf'].includes(x.type)) },
      { id: "store",  pts: 15, label: "Object storage for files",    check: n => n.some(x => ['s3','blob','object','aws-s3'].includes(x.type)) },
      { id: "queue",  pts: 15, label: "Async encoding pipeline",     check: n => n.some(x => ['kafka','sqs','rabbitmq','kinesis'].includes(x.type)) },
      { id: "db",     pts: 15, label: "Metadata database",           check: n => n.some(x => ['sql','nosql','mongo','dynamo'].includes(x.type)) },
      { id: "cache",  pts: 10, label: "Cache for metadata",          check: n => n.some(x => ['redis','memcached'].includes(x.type)) },
      { id: "lb",     pts: 10, label: "Load balancer",               check: n => n.some(x => ['lb','gateway'].includes(x.type)) },
      { id: "ha",     pts: 15, label: "Rich multi-service design",   check: n => n.length >= 6 },
    ],
  },
  {
    id: "twitter", name: "Social Feed", emoji: "🐦", time: 40,
    desc: "Twitter-scale: tweets, timeline fan-out, trends, followers",
    criteria: [
      { id: "lb",     pts: 15, label: "Load balancer / API gateway", check: n => n.some(x => ['lb','gateway'].includes(x.type)) },
      { id: "queue",  pts: 20, label: "Fan-out queue for timelines", check: n => n.some(x => ['kafka','sqs','rabbitmq','pubsub'].includes(x.type)) },
      { id: "cache",  pts: 20, label: "Cache for hot timelines",     check: n => n.some(x => ['redis','memcached'].includes(x.type)) },
      { id: "db",     pts: 15, label: "Primary database",            check: n => n.some(x => ['sql','nosql','mongo','cassandra'].includes(x.type)) },
      { id: "cdn",    pts: 10, label: "CDN for media",               check: n => n.some(x => ['cdn','aws-cf'].includes(x.type)) },
      { id: "ha",     pts: 20, label: "5+ nodes (no SPOF design)",   check: n => n.length >= 5 },
    ],
  },
  {
    id: "uber", name: "Ride Sharing", emoji: "🚗", time: 45,
    desc: "Uber-scale: location, driver matching, pricing, trips",
    criteria: [
      { id: "gw",     pts: 20, label: "Real-time gateway (location)", check: n => n.some(x => ['gateway','lb','proxy','mesh'].includes(x.type)) },
      { id: "queue",  pts: 20, label: "Event queue for matching",     check: n => n.some(x => ['kafka','rabbitmq','sqs','pubsub'].includes(x.type)) },
      { id: "db",     pts: 15, label: "Trip / user database",         check: n => n.some(x => ['sql','mongo','cassandra','dynamo'].includes(x.type)) },
      { id: "cache",  pts: 15, label: "Cache for driver locations",   check: n => n.some(x => ['redis','memcached'].includes(x.type)) },
      { id: "server", pts: 15, label: "Multiple microservices",       check: n => n.length >= 5 },
      { id: "obs",    pts: 15, label: "Observability",                check: n => n.some(x => ['prom','grafana','datadog'].includes(x.type)) },
    ],
  },
];

// Pre-built failure scenarios
const FAILURE_SCENARIOS = [
  { id: "db_down",       name: "DB Failure",       icon: "🗄️",  desc: "Kill all database nodes",       targets: ["postgres","mysql","mongodb","cockroach"],  color: "var(--red)"    },
  { id: "cdn_fail",      name: "CDN Fail",          icon: "🌐",  desc: "CDN gone, origin absorbs load", targets: ["cdn","cloudfront","cloudflare","fastly"],  color: "var(--amber)"  },
  { id: "cache_evict",   name: "Cache Eviction",    icon: "💾",  desc: "Cache miss storm hits DB",      targets: ["redis","memcached","elasticache"],         color: "var(--purple)" },
  { id: "gateway_down",  name: "Gateway Down",      icon: "🔀",  desc: "API gateway / LB offline",      targets: ["gateway","nginx","haproxy","kong","lb"],   color: "var(--red)"    },
  { id: "queue_full",    name: "Queue Overflow",    icon: "📨",  desc: "Message queue backs up",        targets: ["kafka","rabbitmq","sqs","pubsub","queue"],  color: "var(--indigo)" },
  { id: "region_fail",   name: "Region Failure",    icon: "☁️",  desc: "Entire cloud region goes dark", targets: null, /* picks half of nodes */ color: "var(--red)" },
];

function BottomPanel() {
  const ui = window.useUI();
  const { simConfig } = window.useStore();
  const open = ui.bottomOpen;

  const stateCls   = simConfig.state === "running" ? "running" : simConfig.state === "paused" ? "paused" : "idle";
  const stateLabel = simConfig.state === "running" ? "Live · running" : simConfig.state === "paused" ? "Paused" : "Idle";

  return (
    <div className={"bottom-panel" + (open ? "" : " collapsed")}>
      <button className="collapse-tab bottom" onClick={() => ui.setBottomOpen(v => !v)} title={open ? "Collapse" : "Expand"}>
        {open ? window.SVG.chevDown : window.SVG.chevUp}
      </button>

      {open && (
        <>
          <div className="ribbon">
            {RIBBON_TABS.map(t => (
              <div
                key={t.id}
                className={"ribbon-tab" + (ui.ribbonTab === t.id ? " active" : "")}
                style={{ "--accent": t.accent }}
                onClick={() => ui.setRibbonTab(t.id)}
              >
                {t.label}
              </div>
            ))}
            <div className={"ribbon-status " + stateCls}>
              <span className="pulse-dot" />
              <span>{stateLabel}</span>
            </div>
          </div>

          <div className="ribbon-body" key={ui.ribbonTab}>
            {ui.ribbonTab === "simulate"  && <SimulateRibbon  />}
            {ui.ribbonTab === "traffic"   && <TrafficRibbon   />}
            {ui.ribbonTab === "chaos"     && <ChaosRibbon     />}
            {ui.ribbonTab === "whatif"    && <WhatIfRibbon    />}
            {ui.ribbonTab === "slo"       && <SloRibbon       />}
            {ui.ribbonTab === "profiles"  && <ProfilesRibbon  />}
            {ui.ribbonTab === "testlab"   && <TestLabRibbon   />}
            {ui.ribbonTab === "incident"  && <IncidentRibbon  />}
            {ui.ribbonTab === "interview" && <InterviewRibbon />}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Simulate ---------- */
function SimulateRibbon() {
  const store = window.useStore();
  const { simConfig, setSimConfig, displayedMetrics: metrics, setMetrics, setRequestLog, setNodeHealth,
          nodes, simulationHistory, playbackTick, setPlaybackTick, setSimulationHistory,
          setBottleneckNodeId, setChaosKilledNodes, setCrashedNodes, setCrashAlerts } = store;
  const ui = window.useUI();
  const running = simConfig.state === "running";

  const start = () => {
    if (nodes.length === 0) return;
    if (simConfig.rate > 1000 && !simConfig._confirmedHighTraffic) { ui.setShowHighTraffic(true); return; }
    setSimConfig(c => ({ ...c, state: "running" }));
  };
  const pause = () => setSimConfig(c => ({ ...c, state: c.state === "running" ? "paused" : "running" }));
  const stop = () => {
    setSimConfig(c => ({ ...c, state: "idle", testProgress: 0, activeTest: null, _confirmedHighTraffic: false, failScenario: null }));
    setRequestLog([]);
    setNodeHealth({});
    setBottleneckNodeId(null);
    setChaosKilledNodes({});
    setCrashedNodes({});
    setCrashAlerts([]);
    setMetrics(m => ({ ...m, latency: 0, p50: 0, p95: 0, p99: 0, throughput: 0, errorRate: 0, currentRate: 0,
      totalRequests: 0, completedRequests: 0, failedRequests: 0, activeRequests: 0,
      latencyHistory: [], throughputHistory: [], errorHistory: [] }));
  };

  const scrubMax = simulationHistory.length - 1;
  const isLive = playbackTick === null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="simulate-row">
        <button
          className="sim-btn"
          style={{ "--btn-color": "var(--green)", "--btn-dim": "var(--green-dim)", "--btn-glow": "rgba(16,185,129,0.4)" }}
          onClick={running ? pause : start}
          disabled={nodes.length === 0}
        >
          {running ? window.SVG.pause : window.SVG.play}
          {running ? "Pause" : simConfig.state === "paused" ? "Resume" : "Run"}
        </button>
        <button
          className="sim-btn"
          style={{ "--btn-color": "var(--red)", "--btn-dim": "var(--red-dim)", "--btn-glow": "rgba(239,68,68,0.4)" }}
          onClick={stop}
          disabled={simConfig.state === "idle"}
        >
          {window.SVG.stop}
          Stop
        </button>
        {simulationHistory.length > 0 && (
          <button
            className="sim-btn"
            style={{ "--btn-color": "var(--text-muted)", "--btn-dim": "var(--surface3)", "--btn-glow": "transparent", fontSize: 11 }}
            onClick={() => { setSimulationHistory([]); setPlaybackTick(null); }}
            title="Clear history"
          >
            ✕ History
          </button>
        )}

        <div style={{ width: 1, height: 38, background: "var(--border)" }} />

        <div className="sim-counters">
          <Counter label="Active"    value={metrics.activeRequests}    color="var(--cyan)"  />
          <Counter label="Completed" value={metrics.completedRequests} color="var(--green)" />
          <Counter label="Failed"    value={metrics.failedRequests}    color="var(--red)"   />
          <Counter label="Total"     value={metrics.totalRequests}     color="var(--text)"  />
        </div>

        <span className="spacer" />
        <div style={{ font: "500 10.5px/1.4 var(--mono)", color: "var(--text-muted)", textAlign: "right" }}>
          {nodes.length === 0 ? "Add nodes to begin" : `${nodes.length} nodes loaded`}<br />
          <span style={{ color: "var(--cyan)" }}>Space</span> to run · <span style={{ color: "var(--cyan)" }}>S</span> to stop
        </div>
      </div>

      {/* ── Time Scrubber ── */}
      {simulationHistory.length > 1 && (
        <div className="scrubber-row">
          <span className="scrubber-label">T+0s</span>
          <input
            type="range"
            className="slider scrubber-slider"
            min={0}
            max={scrubMax}
            value={playbackTick ?? scrubMax}
            onChange={(e) => setPlaybackTick(Number(e.target.value))}
          />
          <span className="scrubber-label">T+{Math.round(simulationHistory.length)}s</span>
          {!isLive && (
            <button className="scrubber-live-btn" onClick={() => setPlaybackTick(null)}>▶ Live</button>
          )}
          {!isLive && (
            <span className="scrubber-tick">
              T+{Math.round((playbackTick / Math.max(1, scrubMax)) * simulationHistory.length)}s
            </span>
          )}
          {isLive && <span className="scrubber-tick" style={{ color: "var(--green)" }}>● LIVE</span>}
        </div>
      )}
    </div>
  );
}

function Counter({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>{value.toLocaleString()}</div>
    </div>
  );
}

/* ---------- Traffic ---------- */
function TrafficRibbon() {
  const { simConfig, setSimConfig } = window.useStore();
  const PATTERNS = [
    { id: "constant", glyph: "━", label: "Constant" },
    { id: "ramp",     glyph: "↗", label: "Ramp"     },
    { id: "spike",    glyph: "/\\",label: "Spike"    },
    { id: "wave",     glyph: "∿", label: "Wave"     },
    { id: "step",     glyph: "▬", label: "Step"     },
  ];
  return (
    <div className="traffic-row">
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div className="metric-label">Target rate</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            className="rate-input"
            type="number"
            min={1} max={50000}
            value={simConfig.rate}
            onChange={(e) => setSimConfig(c => ({ ...c, rate: Math.max(1, Math.min(50000, Number(e.target.value) || 0)) }))}
          />
          <span className="unit-label">req/s</span>
        </div>
      </div>

      <div style={{ width: 1, height: 38, background: "var(--border)" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div className="metric-label">Pattern</div>
        <div className="pattern-btns">
          {PATTERNS.map(p => (
            <button
              key={p.id}
              className={"pattern-btn" + (simConfig.pattern === p.id ? " active" : "")}
              onClick={() => setSimConfig(c => ({ ...c, pattern: p.id }))}
              title={p.label}
            >
              <span className="pattern-glyph">{p.glyph}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <span className="spacer" />

      <div className="log-slider-wrap">
        <div className="metric-label">Log verbosity</div>
        <input
          type="range" className="slider"
          min={0} max={3} step={1}
          value={simConfig.verbosity ?? 1}
          onChange={(e) => setSimConfig(c => ({ ...c, verbosity: Number(e.target.value) }))}
        />
        <div className="log-slider-labels">
          <span>Silent</span><span>Errors</span><span>Info</span><span>Debug</span>
        </div>
      </div>

      {simConfig.rate > 1000 && <div className="warning-chip">{window.SVG.warn} High rate</div>}
    </div>
  );
}

/* ---------- Chaos ---------- */
function ChaosRibbon() {
  const { simConfig, setSimConfig, nodes, chaosKilledNodes } = window.useStore();
  const on = simConfig.chaos;
  const monkeyOn = simConfig.chaosMonkey;
  const killedCount = Object.keys(chaosKilledNodes).length;

  const activateScenario = (scenario) => {
    const nodeIds = scenario.targets === null
      // region failure: kill half of all nodes
      ? nodes.slice(0, Math.ceil(nodes.length / 2)).map(n => n.id)
      : nodes
          .filter(n => scenario.targets.some(t => n.type.toLowerCase().includes(t)))
          .map(n => n.id);
    if (nodeIds.length === 0) {
      alert(`No "${scenario.name}" nodes found on canvas. Add matching nodes first.`);
      return;
    }
    setSimConfig(c => ({ ...c, failScenario: { id: scenario.id, nodeIds }, state: c.state === "idle" ? "running" : c.state }));
  };
  const clearScenario = () => setSimConfig(c => ({ ...c, failScenario: null }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Chaos toggles */}
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        {/* Manual chaos */}
        <div className="chaos-row">
          <div className={"toggle-switch" + (on ? " on" : "")} onClick={() => setSimConfig(c => ({ ...c, chaos: !c.chaos }))}>
            <div className="toggle-thumb" />
          </div>
          <div className="chaos-info">
            <div className="chaos-info-title" style={{ color: on ? "var(--red)" : "var(--text)" }}>
              Chaos Engineering {on ? "ON" : "OFF"}
            </div>
            <div className="chaos-info-desc">Random latency spikes and packet drops.</div>
          </div>
        </div>

        <div style={{ width: 1, height: 38, background: "var(--border)" }} />

        {/* Chaos monkey */}
        <div className="chaos-row">
          <div className={"toggle-switch" + (monkeyOn ? " on" : "")} style={{ "--sw-color": "var(--amber)" }}
            onClick={() => setSimConfig(c => ({ ...c, chaosMonkey: !c.chaosMonkey }))}>
            <div className="toggle-thumb" />
          </div>
          <div className="chaos-info">
            <div className="chaos-info-title" style={{ color: monkeyOn ? "var(--amber)" : "var(--text)" }}>
              Chaos Monkey {monkeyOn ? "ON" : "OFF"}
            </div>
            <div className="chaos-info-desc">
              Auto-kills random nodes every 4–6s. {killedCount > 0 && <span style={{ color: "var(--red)" }}>● {killedCount} node{killedCount > 1 ? "s" : ""} killed</span>}
            </div>
          </div>
        </div>

        {on && (
          <>
            <div style={{ width: 1, height: 38, background: "var(--border)" }} />
            <ChaosKnob label="Fail rate"     value={simConfig.chaosFailRate ?? 2}   set={(v) => setSimConfig(c => ({ ...c, chaosFailRate: v }))}  max={20}  unit="%" disabled={!on} />
            <ChaosKnob label="Latency jitter" value={simConfig.chaosJitter  ?? 100} set={(v) => setSimConfig(c => ({ ...c, chaosJitter: v }))}    max={500} unit="ms" disabled={!on} />
            <ChaosKnob label="Drop rate"     value={simConfig.chaosDrop    ?? 1}    set={(v) => setSimConfig(c => ({ ...c, chaosDrop: v }))}       max={10}  unit="%" disabled={!on} />
          </>
        )}

        <span className="spacer" />
        {(on || monkeyOn) && <div className="warning-chip">{window.SVG.warn} Chaos active</div>}
      </div>

      {/* ── Failure Scenario Library ─────────────────────────────────────────── */}
      <div>
        <div className="metric-label" style={{ marginBottom: 6 }}>
          Failure Scenario Library
          {simConfig.failScenario && (
            <button onClick={clearScenario} style={{ marginLeft: 10, fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "var(--red-dim)", color: "var(--red)", border: "1px solid var(--red)", cursor: "pointer" }}>
              Clear ✕
            </button>
          )}
        </div>
        <div className="scenario-cards">
          {FAILURE_SCENARIOS.map(s => {
            const active = simConfig.failScenario?.id === s.id;
            return (
              <div
                key={s.id}
                className={"scenario-card" + (active ? " active" : "")}
                style={{ "--sc-color": s.color }}
                onClick={() => active ? clearScenario() : activateScenario(s)}
                title={s.desc}
              >
                <span className="scenario-icon">{s.icon}</span>
                <span className="scenario-name">{s.name}</span>
                {active && <span className="scenario-active-dot">●</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChaosKnob({ label, value, set, max, unit, disabled }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 110, opacity: disabled ? 0.5 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="metric-label">{label}</span>
        <span className="config-value-chip" style={{ color: "var(--red)", background: "var(--red-dim)" }}>{value}{unit}</span>
      </div>
      <input type="range" className="slider" min={0} max={max} value={value} onChange={(e) => set(Number(e.target.value))} disabled={disabled} />
    </div>
  );
}

/* ---------- What-if ---------- */
function WhatIfRibbon() {
  const { nodes, edges, whatIfOverrides, setWhatIfOverrides, updateNode, displayedNodeHealth } = window.useStore();
  const connectedIds = new Set();
  edges.forEach(e => { connectedIds.add(e.from); connectedIds.add(e.to); });
  const connected = nodes.filter(n => connectedIds.has(n.id));

  if (connected.length === 0) {
    return <div style={{ padding: "16px 20px", color: "var(--text-muted)", fontSize: 12 }}>Connect nodes on the canvas to explore what-if scenarios.</div>;
  }

  const setReplicas = (id, v) => setWhatIfOverrides(o => ({ ...o, [id]: { ...(o[id] || {}), replicas: v } }));
  const applyAll = () => {
    Object.entries(whatIfOverrides).forEach(([id, ov]) => {
      if (ov.replicas && ov.replicas !== 1) {
        updateNode(id, { config: { maxConn: (nodes.find(n => n.id === id)?.config?.maxConn || 1000) * ov.replicas } });
      }
    });
    setWhatIfOverrides({});
  };
  const resetAll = () => setWhatIfOverrides({});
  const hasOverrides = Object.keys(whatIfOverrides).length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 2 }}>
        <span style={{ font: "600 11px var(--mono)", color: "var(--text-muted)" }}>Scale replicas per node — simulation updates live without changing config</span>
        <span className="spacer" />
        {hasOverrides && (
          <>
            <button className="btn btn-primary" style={{ padding: "4px 12px", fontSize: 11 }} onClick={applyAll}>Apply to config</button>
            <button className="btn" style={{ padding: "4px 12px", fontSize: 11 }} onClick={resetAll}>Reset</button>
          </>
        )}
      </div>
      <div className="whatif-row">
        {connected.map(n => {
          const t = window.findNodeType(n.type);
          const replicas = whatIfOverrides[n.id]?.replicas || 1;
          const h = displayedNodeHealth[n.id] || {};
          const errNum = parseFloat(h.err) || 0;
          return (
            <div key={n.id} className="whatif-card">
              <div className="whatif-node-name" title={n.label}>{n.label}</div>
              <div className="whatif-type">{t?.label || n.type}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "6px 0" }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)", minWidth: 52 }}>Replicas</span>
                <input type="range" className="slider" min={1} max={16} value={replicas}
                  onChange={(e) => setReplicas(n.id, Number(e.target.value))} style={{ flex: 1 }} />
                <span className="config-value-chip" style={{ color: "var(--cyan)", background: "var(--cyan-dim)", minWidth: 28, textAlign: "center" }}>{replicas}×</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)" }}>
                <span>err: <span style={{ color: errNum > 5 ? "var(--red)" : "var(--green)" }}>{h.err || "—"}%</span></span>
                <span>lat: {h.lat || "—"}ms</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- SLO Calculator ---------- */
function SloRibbon() {
  const { sloTargets, setSloTargets, displayedMetrics: metrics, simConfig } = window.useStore();
  const running = simConfig.state === "running";

  const p99Pass  = metrics.p99  <= sloTargets.p99;
  const errPass  = metrics.errorRate <= sloTargets.errorRate;
  const sloPass  = p99Pass && errPass;
  const hasData  = metrics.p99 > 0 || metrics.errorRate > 0;

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* SLO targets */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="metric-label">SLO Targets</div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>P99 latency ≤</span>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                type="number" min={10} max={5000} step={10}
                value={sloTargets.p99}
                onChange={(e) => setSloTargets(s => ({ ...s, p99: Number(e.target.value) }))}
                style={{ width: 68, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)", padding: "3px 6px", fontSize: 12 }}
              />
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>ms</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Error rate ≤</span>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                type="number" min={0.01} max={50} step={0.1}
                value={sloTargets.errorRate}
                onChange={(e) => setSloTargets(s => ({ ...s, errorRate: Number(e.target.value) }))}
                style={{ width: 68, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)", padding: "3px 6px", fontSize: 12 }}
              />
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>%</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />

      {/* Live SLO verdict */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="metric-label">Live Status</div>
        {!hasData ? (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Run simulation to check SLO compliance</div>
        ) : (
          <div className={"slo-verdict " + (sloPass ? "pass" : "fail")}>
            <span className="slo-icon">{sloPass ? "✓" : "✗"}</span>
            <span>SLO {sloPass ? "PASSING" : "FAILING"}</span>
          </div>
        )}

        {hasData && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <SloCheck label="P99 latency" current={metrics.p99} target={sloTargets.p99} unit="ms" pass={p99Pass} />
            <SloCheck label="Error rate"  current={parseFloat(metrics.errorRate.toFixed(2))} target={sloTargets.errorRate} unit="%" pass={errPass} lowerBetter />
          </div>
        )}
      </div>

      {hasData && !sloPass && (
        <>
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="metric-label">Suggestions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
              {!p99Pass && <span>↑ Increase CPU cores on bottleneck node</span>}
              {!p99Pass && <span>↑ Add replicas via the What-if tab</span>}
              {!errPass && <span>↑ Increase maxConn on saturated nodes</span>}
              {!errPass && <span>↑ Add retry logic (retries slider in Config)</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SloCheck({ label, current, target, unit, pass }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11 }}>
      <span style={{ color: pass ? "var(--green)" : "var(--red)", width: 12 }}>{pass ? "✓" : "✗"}</span>
      <span style={{ color: "var(--text-muted)", minWidth: 80 }}>{label}</span>
      <span style={{ color: pass ? "var(--green)" : "var(--red)", fontFamily: "var(--mono)" }}>
        {current}{unit}
      </span>
      <span style={{ color: "var(--text-muted)" }}>/ {target}{unit}</span>
    </div>
  );
}

/* ---------- Profiles ---------- */
function ProfilesRibbon() {
  const { simConfig, setSimConfig } = window.useStore();
  const ui = window.useUI();
  const apply = (p) => {
    if (p.rate > 1000) ui.setShowHighTraffic(true);
    setSimConfig(c => ({ ...c, rate: p.rate, pattern: p.pattern, chaos: !!p.chaos, activeProfile: p.id }));
  };
  return (
    <div className="profile-row">
      {window.PROFILES.map(p => (
        <div
          key={p.id}
          className={"profile-card" + (simConfig.activeProfile === p.id ? " active" : "")}
          style={{ "--prof-color": p.color, "--prof-dim": p.dim }}
          onClick={() => apply(p)}
        >
          <h5>{p.name}</h5>
          <div className="rate">{p.rate.toLocaleString()} req/s</div>
          <div className="pattern">{p.pattern}</div>
          {p.chaos && <div className="chaos-label">{window.SVG.warn} chaos</div>}
        </div>
      ))}
    </div>
  );
}

/* ---------- Test Lab ---------- */
function TestLabRibbon() {
  const { simConfig, setSimConfig, setMetrics, metrics } = window.useStore();
  const auth = window.useAuth();
  const [running, setRunningState] = useStateB(null);
  const intervalRef = useRefB();

  const runTest = (test) => {
    if (running) return;
    setRunningState(test.id);
    setSimConfig(c => ({ ...c, activeTest: test.id, testProgress: 0 }));
    const cfg = {
      smoke:      { rate: 10,    pattern: "constant", chaos: false, duration: 6  },
      baseline:   { rate: 50,    pattern: "constant", chaos: false, duration: 8  },
      load:       { rate: 500,   pattern: "constant", chaos: false, duration: 10 },
      stress:     { rate: 5000,  pattern: "ramp",     chaos: false, duration: 12 },
      spike:      { rate: 1000,  pattern: "spike",    chaos: false, duration: 10 },
      soak:       { rate: 200,   pattern: "constant", chaos: false, duration: 14 },
      breakpoint: { rate: 10000, pattern: "step",     chaos: false, duration: 12 },
      chaos:      { rate: 500,   pattern: "constant", chaos: true,  duration: 10 },
      failover:   { rate: 300,   pattern: "constant", chaos: true,  duration: 8  },
      sla:        { rate: 200,   pattern: "constant", chaos: false, duration: 8  },
      cascade:    { rate: 2000,  pattern: "spike",    chaos: true,  duration: 12 },
      recovery:   { rate: 100,   pattern: "wave",     chaos: false, duration: 10 },
    }[test.id];
    setSimConfig(c => ({ ...c, rate: cfg.rate, pattern: cfg.pattern, chaos: cfg.chaos, state: "running", activeTest: test.id, testProgress: 0, _confirmedHighTraffic: true }));
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      elapsed += 0.5;
      const pct = Math.min(1, elapsed / cfg.duration);
      setSimConfig(c => ({ ...c, testProgress: pct }));
      if (pct >= 1) {
        clearInterval(intervalRef.current);
        setTimeout(() => {
          setMetrics(m => {
            const pass = m.errorRate < 1 && m.p95 < 250;
            setTimeout(() => {
              setSimConfig(c => ({
                ...c, state: "idle", testProgress: 1,
                testResults: { ...c.testResults, [test.id]: { pass, err: m.errorRate, lat: m.p95, reason: !pass ? (m.errorRate >= 1 ? `error rate ${m.errorRate.toFixed(1)}%` : `p95 ${m.p95}ms`) : null } }
              }));
              setRunningState(null);
            }, 0);
            return m;
          });
        }, 100);
      }
    }, 500);
  };

  useEffectB(() => () => intervalRef.current && clearInterval(intervalRef.current), []);

  return (
    <div className="testlab-row">
      {window.TESTS.map(t => {
        const isRunning = simConfig.activeTest === t.id && simConfig.state === "running";
        const result    = simConfig.testResults[t.id];
        const isPro     = ["soak", "breakpoint", "cascade", "recovery", "failover"].includes(t.id);
        const locked    = isPro && !auth.isPremium;
        return (
          <div key={t.id} className="testcard"
            style={{ "--test-color": t.color, "--test-dim": t.dim, opacity: locked ? 0.55 : 1, cursor: locked ? "not-allowed" : "pointer" }}
            onClick={() => !locked && !running && runTest(t)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="badge">{t.badge}</span>
              {isPro && <span className={"mini-badge " + (locked ? "amber" : "green")} style={{ marginLeft: "auto" }}>PRO</span>}
            </div>
            <h5>{t.name}</h5>
            <p>{t.desc}</p>
            {isRunning && (
              <>
                <div className="progress-bar"><div className="progress-fill" style={{ width: (simConfig.testProgress * 100) + "%" }} /></div>
                <div className="progress-pct">{Math.round(simConfig.testProgress * 100)}%</div>
              </>
            )}
            {result && !isRunning && (
              <>
                <div className="results">
                  <span className="nums">{result.err.toFixed(1)}% · {result.lat}ms</span>
                  <span className={"verdict " + (result.pass ? "pass" : "fail")}>{result.pass ? "PASS" : "FAIL"}</span>
                </div>
                {!result.pass && <div className="fail-reason">{result.reason}</div>}
              </>
            )}
            {!isRunning && !result && (
              <div className="results">
                <span className="nums" style={{ color: "var(--text-muted)" }}>not run</span>
                <span className="verdict" style={{ background: "var(--surface3)", color: "var(--text-muted)" }}>—</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Incident Replay ---------- */
function IncidentRibbon() {
  const { nodes, edges, simConfig, setSimConfig } = window.useStore();

  const connectedIds = useMemoB(() => {
    const s = new Set();
    edges.forEach(e => { s.add(e.from); s.add(e.to); });
    return s;
  }, [edges]);

  const connectedNodes = nodes.filter(n => connectedIds.has(n.id));
  const activeIds = new Set(simConfig.failScenario?.nodeIds || []);
  const activeCount = activeIds.size;

  const toggle = (id) => {
    setSimConfig(c => {
      const cur = new Set(c.failScenario?.nodeIds || []);
      cur.has(id) ? cur.delete(id) : cur.add(id);
      const nodeIds = [...cur];
      return { ...c, failScenario: nodeIds.length > 0 ? { id: 'incident', nodeIds } : null };
    });
  };

  const clearAll = () => setSimConfig(c => ({ ...c, failScenario: null }));

  return (
    <div className="incident-ribbon">
      <div className="incident-header">
        <div>
          <div className="incident-title">Incident Replay</div>
          <div className="incident-sub">Click nodes to force-fail them — watch cascade effects in real time</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {activeCount > 0 && (
            <div className="incident-active-badge">
              <span className="pulse-dot" style={{ background: 'var(--red)', '--sc-color': 'var(--red)' }} />
              {activeCount} DOWN
            </div>
          )}
          {activeCount > 0 && (
            <button className="btn" style={{ fontSize: 11, padding: '4px 10px' }} onClick={clearAll}>Clear All</button>
          )}
        </div>
      </div>

      {connectedNodes.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>
          Connect nodes on the canvas to use incident replay.
        </div>
      ) : (
        <div className="incident-nodes">
          {connectedNodes.map(n => {
            const t = window.findNodeType(n.type);
            const cat = window.CATEGORIES[t.cat];
            const failed = activeIds.has(n.id);
            return (
              <button
                key={n.id}
                className={"incident-node-btn" + (failed ? " failed" : "")}
                style={{ '--node-color': cat.color }}
                onClick={() => toggle(n.id)}
                title={failed ? "Click to recover node" : "Click to force-fail node"}
              >
                <span className="incident-node-icon" style={{ color: cat.color }}>{window.SVG[t.icon]}</span>
                <span className="incident-node-label">{n.label}</span>
                <span className={"incident-node-status" + (failed ? " down" : " up")}>{failed ? "FAILED" : "LIVE"}</span>
              </button>
            );
          })}
        </div>
      )}

      {activeCount > 0 && simConfig.state !== "running" && (
        <div className="incident-hint">▶ Start simulation to observe the failure cascade.</div>
      )}
    </div>
  );
}

/* ---------- System Design Interview Mode ---------- */
function InterviewRibbon() {
  const store = window.useStore();
  const [phase, setPhase]     = useStateB('select'); // select | active | done
  const [challenge, setChal]  = useStateB(null);
  const [timeLeft, setTLeft]  = useStateB(0);
  const [results, setResults] = useStateB(null);
  const timerRef   = useRefB(null);
  const nodesRef   = useRefB(store.nodes);
  const chalRef    = useRefB(challenge);
  useEffectB(() => { nodesRef.current  = store.nodes; },  [store.nodes]);
  useEffectB(() => { chalRef.current   = challenge;   },  [challenge]);

  const grade = () => {
    const n  = nodesRef.current;
    const ch = chalRef.current;
    if (!ch) return;
    const criteria = ch.criteria.map(c => ({ ...c, passed: c.check(n) }));
    const score    = criteria.filter(c => c.passed).reduce((a, c) => a + c.pts, 0);
    setResults({ score, criteria, nodeCount: n.length });
    setPhase('done');
    clearInterval(timerRef.current);
  };

  const start = (ch) => {
    setChal(ch);
    setTLeft(ch.time * 60);
    setResults(null);
    setPhase('active');
  };

  const reset = () => { setPhase('select'); setChal(null); setResults(null); clearInterval(timerRef.current); };

  useEffectB(() => {
    if (phase !== 'active') { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTLeft(t => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  useEffectB(() => {
    if (phase === 'active' && timeLeft === 0) grade();
  }, [timeLeft]);

  if (phase === 'select') {
    return (
      <div className="interview-ribbon">
        <div className="interview-header">
          <span style={{ fontSize: 16 }}>{window.SVG.trophy}</span>
          <div>
            <div className="interview-title">System Design Interview Mode</div>
            <div className="interview-sub">Design on canvas, get graded on scalability choices</div>
          </div>
        </div>
        <div className="interview-challenges">
          {INTERVIEW_CHALLENGES.map(ch => (
            <button key={ch.id} className="interview-challenge-card" onClick={() => start(ch)}>
              <span className="challenge-emoji">{ch.emoji}</span>
              <div className="challenge-info">
                <div className="challenge-name">{ch.name}</div>
                <div className="challenge-desc">{ch.desc}</div>
              </div>
              <div className="challenge-time">{ch.time}m</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'active') {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const timerStr = `${mins}:${String(secs).padStart(2, '0')}`;
    const isUrgent  = timeLeft < 60;
    const isWarning = timeLeft < 300 && !isUrgent;
    const pct = challenge ? (timeLeft / (challenge.time * 60)) * 100 : 100;
    return (
      <div className="interview-ribbon">
        <div className="interview-active-header">
          <div className="interview-challenge-name">{challenge.emoji} {challenge.name}</div>
          <div className={"interview-timer" + (isUrgent ? " urgent" : isWarning ? " warning" : "")}>
            {window.SVG.timer} {timerStr}
          </div>
          <button className="btn btn-primary" style={{ fontSize: 11, padding: '5px 12px' }} onClick={grade}>Grade Now</button>
          <button className="btn" style={{ fontSize: 11, padding: '5px 10px' }} onClick={reset}>Quit</button>
        </div>
        <div className="interview-timer-bar">
          <div className="interview-timer-fill" style={{ width: pct + '%', background: isUrgent ? 'var(--red)' : isWarning ? 'var(--amber)' : 'var(--green)' }} />
        </div>
        <div className="interview-criteria">
          {challenge.criteria.map(c => (
            <div key={c.id} className="criteria-item pending">
              <span className="criteria-check">○</span>
              <span className="criteria-label">{c.label}</span>
              <span className="criteria-pts">+{c.pts}pts</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'done' && results) {
    const grade = results.score >= 90 ? 'A+' : results.score >= 80 ? 'A' : results.score >= 70 ? 'B' : results.score >= 60 ? 'C' : 'D';
    const gradeColor = { 'A+': 'var(--green)', A: 'var(--green)', B: 'var(--cyan)', C: 'var(--amber)', D: 'var(--red)' }[grade];
    const gradeLabel = { 'A+': 'Expert!', A: 'Solid design', B: 'Good start', C: 'Needs work', D: 'Keep practicing' }[grade];
    return (
      <div className="interview-ribbon">
        <div className="interview-result-header">
          <div className="interview-score" style={{ color: gradeColor }}>
            <span className="score-grade">{grade}</span>
            <span className="score-num">{results.score}/100</span>
          </div>
          <div>
            <div className="interview-title">{challenge.emoji} {challenge.name}</div>
            <div className="interview-sub" style={{ color: gradeColor }}>{gradeLabel} · {results.nodeCount} nodes placed</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn btn-primary" style={{ fontSize: 11 }} onClick={reset}>Try Again</button>
          </div>
        </div>
        <div className="interview-criteria">
          {results.criteria.map(c => (
            <div key={c.id} className={"criteria-item" + (c.passed ? " passed" : " failed")}>
              <span className="criteria-check">{c.passed ? "✓" : "✗"}</span>
              <span className="criteria-label">{c.label}</span>
              <span className="criteria-pts" style={{ color: c.passed ? 'var(--green)' : 'var(--text-muted)' }}>
                {c.passed ? `+${c.pts}pts` : `0/${c.pts}pts`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

window.BottomPanel = BottomPanel;
