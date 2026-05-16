// SystemFlow — Header component

const { useState: useStateH, useRef: useRefH, useEffect: useEffectH } = React;

function Header() {
  const { nodes, edges, simConfig, metrics } = window.useStore();
  const ui = window.useUI();
  const auth = window.useAuth();
  const running = simConfig.state === "running";
  const showLive = simConfig.state !== "idle";

  return (
    <div className="header">
      <div className="brand">
        <div className="brand-logo">
          <span className={running ? "logo-spinning" : ""} style={{ color: "var(--cyan)", display: "inline-flex" }}>
            {window.SVG.hex}
          </span>
        </div>
        <div className="brand-name">System<span className="accent">Flow</span></div>
      </div>

      <div className="header-divider" />

      <div className="header-chip indigo">
        <div className="header-chip-label">Nodes</div>
        <div className="header-chip-value">{String(nodes.length).padStart(2, "0")}</div>
      </div>
      <div className="header-chip cyan">
        <div className="header-chip-label">Edges</div>
        <div className="header-chip-value">{String(edges.length).padStart(2, "0")}</div>
      </div>

      {showLive && (
        <div className="header-metrics">
          <MetricCell label="Latency" value={metrics.latency + "ms"} cls="cyan" />
          <MetricCell label="P95" value={metrics.p95 + "ms"} cls="indigo" />
          <MetricCell label="Thrupt" value={Math.round(metrics.throughput) + "/s"} cls="green" />
          <MetricCell label="Err%" value={metrics.errorRate.toFixed(2) + "%"} cls={metrics.errorRate > 5 ? "red" : "amber"} />
          <MetricCell label="Rate" value={Math.round(metrics.currentRate) + "/s"} cls="cyan" pulse />
          <div className="pattern-chip">
            <span style={{ fontSize: 11 }}>{patternGlyph(simConfig.pattern)}</span>
            <span>{simConfig.pattern}</span>
          </div>
        </div>
      )}
      {!showLive && <div style={{ flex: 1 }} />}

      <div className="header-right">
        <button className="icon-btn" title="Save canvas (⌘S)" onClick={() => {
          const store = window.useStore();
          const data = { nodes: store.nodes, edges: store.edges };
          localStorage.setItem('sf_canvas', JSON.stringify(data));
          const btn = document.activeElement;
          if (btn) { btn.style.color = 'var(--green)'; setTimeout(() => { btn.style.color = ''; }, 800); }
        }}>{window.SVG.download}</button>
        <button className="icon-btn" title="Toggle accent theme" onClick={() => {
          const root = document.documentElement;
          const current = root.style.getPropertyValue('--cyan') || '#38bdf8';
          const themes = [
            { cyan: '#38bdf8', indigo: '#818cf8', green: '#22c55e' },
            { cyan: '#a78bfa', indigo: '#f472b6', green: '#34d399' },
            { cyan: '#fb923c', indigo: '#facc15', green: '#22c55e' },
          ];
          const idx = themes.findIndex(t => t.cyan === current.trim());
          const next = themes[(idx + 1) % themes.length];
          root.style.setProperty('--cyan', next.cyan);
          root.style.setProperty('--indigo', next.indigo);
          root.style.setProperty('--green', next.green);
        }}>{window.SVG.moon}</button>
        <div style={{ position: "relative" }}>
          <button className="icon-btn" onClick={() => ui.setShowHelp(v => !v)} title="Help">{window.SVG.help}</button>
          {ui.showHelp && <HelpDropdown onClose={() => ui.setShowHelp(false)} />}
        </div>
        <div style={{ position: "relative" }}>
          <button className="avatar-btn" onClick={() => ui.setShowProfile(v => !v)}>
            {auth.user.avatar ? <img src={auth.user.avatar} alt="" /> : auth.user.initials}
          </button>
          {ui.showProfile && <ProfileDropdown onClose={() => ui.setShowProfile(false)} />}
        </div>
      </div>
    </div>
  );
}

function MetricCell({ label, value, cls, pulse }) {
  return (
    <div className="metric-cell">
      <div className="metric-label">{label}</div>
      <div key={value} className={"metric-value " + cls + (pulse ? " pulse-rate" : "")}>{value}</div>
    </div>
  );
}

function patternGlyph(p) {
  return { constant: "━", ramp: "↗", spike: "/\\", wave: "∿", step: "▬" }[p] || "━";
}

function HelpDropdown({ onClose }) {
  const ref = useRefH();
  useEffectH(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} className="dropdown" style={{ width: 280, right: 0, top: 42 }}>
      <div className="section-title" style={{ marginTop: 0 }}>Keyboard Shortcuts</div>
      {[
        ["Run / Pause", "Space"],
        ["Stop simulation", "S"],
        ["Save canvas", "⌘ + S"],
        ["Toggle left panel", "⌘ + ["],
        ["Toggle right panel", "⌘ + ]"],
        ["Toggle toolbar", "⌘ + B"],
        ["Delete selected", "⌫"],
        ["Fit canvas", "F"],
        ["Open templates", "T"],
        ["Help", "?"],
      ].map(([d, k]) => (
        <div className="shortcut-row" key={d}>
          <span className="desc">{d}</span>
          <span className="kbd">{k}</span>
        </div>
      ))}
    </div>
  );
}

function ProfileDropdown({ onClose }) {
  const auth = window.useAuth();
  const ui = window.useUI();
  const [editing, setEditing] = useStateH(false);
  const [name, setName] = useStateH(auth.user.name);
  const ref = useRefH();
  const fileRef = useRefH();
  useEffectH(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const save = () => {
    auth.setUser(u => ({ ...u, name, initials: name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase() }));
    setEditing(false);
  };
  const onFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => auth.setUser(u => ({ ...u, avatar: r.result }));
    r.readAsDataURL(f);
  };

  return (
    <div ref={ref} className="dropdown profile-dropdown" style={{ right: 0 }}>
      <div className="profile-row-top">
        <button className="profile-avatar" onClick={() => fileRef.current?.click()} title="Upload avatar">
          {auth.user.avatar ? <img src={auth.user.avatar} alt="" /> : auth.user.initials}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        <div className="profile-info">
          <div className="profile-name-row">
            <input
              className="profile-name-input"
              value={name}
              readOnly={!editing}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setName(auth.user.name); setEditing(false); } }}
            />
            <span className="pencil-btn" onClick={() => editing ? save() : setEditing(true)}>{window.SVG.pencil}</span>
          </div>
          <div className="profile-email">{auth.user.email}</div>
        </div>
      </div>

      <div className="dropdown-section">
        {auth.isPremium ? (
          <div className="premium-badge">{window.SVG.crown} Pro Member · Active</div>
        ) : (
          <button className="btn btn-premium" style={{ width: "100%", padding: "10px 12px" }} onClick={() => { onClose(); ui.setShowPremium(true); }}>
            {window.SVG.sparkle} Upgrade to Pro
          </button>
        )}
      </div>

      <div className="dropdown-section">
        <div className="dropdown-btn-row">
          <button className="btn btn-danger" onClick={() => { onClose(); auth.signOut(); }}>Sign Out</button>
          <button className="btn btn-ghost" onClick={() => {
            if (window.confirm("Reset canvas and all metrics? This cannot be undone.")) {
              localStorage.removeItem('sf_canvas');
              window.location.reload();
            }
          }}>Reset</button>
        </div>
      </div>
    </div>
  );
}

window.Header = Header;
