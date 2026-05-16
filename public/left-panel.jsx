// SystemFlow — Left panel (node palette)

const { useState: useStateL, useMemo: useMemoL } = React;

function LeftPanel() {
  const ui = window.useUI();
  const store = window.useStore();
  const auth = window.useAuth();
  const openUpgrade = () => ui.setShowPremium(true);
  const [query, setQuery] = useStateL("");
  const [activeCat, setActiveCat] = useStateL("all");

  const filtered = useMemoL(() => {
    return window.NODE_TYPES.filter(t => {
      if (activeCat !== "all" && t.cat !== activeCat) return false;
      if (query) {
        const q = query.toLowerCase();
        return t.label.toLowerCase().includes(q) || t.tag.toLowerCase().includes(q);
      }
      return true;
    });
  }, [query, activeCat]);

  const grouped = useMemoL(() => {
    if (activeCat !== "all") return [[activeCat, filtered]];
    const m = {};
    filtered.forEach(t => { (m[t.cat] = m[t.cat] || []).push(t); });
    return Object.entries(m);
  }, [filtered, activeCat]);

  const unlocked = filtered.filter(t => !t.pro || auth.isPremium).length;

  return (
    <div className={"left-panel" + (ui.leftOpen ? "" : " collapsed")}>
      {ui.leftOpen && (
        <>
          <div className="panel-header">
            <div className="panel-title">Node Palette</div>
            <div className="count-badge">{window.NODE_TYPES.length}</div>
            {!auth.isPremium && <div className="pro-chip">PRO</div>}
          </div>

          <div className="search">
            <span className="search-icon" style={{ width: 14, height: 14 }}>{window.SVG.search}</span>
            <input
              placeholder="Search nodes..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <span className="clear-icon" onClick={() => setQuery("")}>{window.SVG.x}</span>}
          </div>

          <div className="cat-filter">
            <button
              className={"cat-pill" + (activeCat === "all" ? " active" : "")}
              style={activeCat === "all" ? { "--cat-color": "var(--cyan)", "--cat-dim": "var(--cyan-dim)" } : {}}
              onClick={() => setActiveCat("all")}
            >
              <span>All</span>
            </button>
            {Object.entries(window.CATEGORIES).map(([key, cat]) => {
              const active = activeCat === key;
              return (
                <button
                  key={key}
                  className={"cat-pill " + (active ? "active" : "icon-only")}
                  style={{ "--cat-color": cat.color, "--cat-dim": cat.dim }}
                  onClick={() => setActiveCat(active ? "all" : key)}
                  title={cat.label}
                >
                  <span style={{ display: "inline-flex", color: cat.color }}>{window.SVG[cat.icon]}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {!auth.isPremium && (
            <div className="pro-upsell-banner" onClick={openUpgrade}>
              <h4>{window.SVG.crown} Upgrade to Pro</h4>
              <p>Unlock all {window.NODE_TYPES.length} nodes, AI Advisor, Chaos & Test Lab.</p>
              <span className="gold-arrow">{window.SVG.chevRight}</span>
            </div>
          )}

          <div className="node-list">
            {grouped.map(([catKey, items]) => {
              const cat = window.CATEGORIES[catKey];
              return (
                <div key={catKey}>
                  {activeCat === "all" && (
                    <div className="node-group-header" style={{ "--cat-color": cat.color }}>
                      <span>{window.SVG[cat.icon]}</span>
                      <span className="node-group-label">{cat.label}</span>
                      <span className="node-group-count">{items.length}</span>
                    </div>
                  )}
                  {items.map(t => (
                    <NodeItem key={t.id} t={t} cat={cat} locked={t.pro && !auth.isPremium} onLocked={openUpgrade} />
                  ))}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="empty-state">
                <h3>No matches</h3>
                <p>Try a different search or category.</p>
              </div>
            )}
          </div>

          <div className={"left-footer" + (auth.isPremium ? "" : " amber")}>
            {auth.isPremium ? (
              <>
                <span>Drag to canvas</span>
                <span>{unlocked}/{window.NODE_TYPES.length}</span>
              </>
            ) : (
              <span>★ Unlock PRO nodes via profile</span>
            )}
          </div>
        </>
      )}
      <button className="collapse-tab left" onClick={() => ui.setLeftOpen(v => !v)} title={ui.leftOpen ? "Collapse" : "Expand"}>
        {ui.leftOpen ? window.SVG.chevLeft : window.SVG.chevRight}
      </button>
    </div>
  );
}

function NodeItem({ t, cat, locked, onLocked }) {
  const onDragStart = (e) => {
    if (locked) { e.preventDefault(); return; }
    e.dataTransfer.setData("application/sf-node-type", t.id);
    e.dataTransfer.effectAllowed = "copy";
  };
  return (
    <div
      className="node-item"
      draggable={!locked}
      onDragStart={onDragStart}
      onClick={() => locked && onLocked?.()}
      style={{ "--cat-color": cat.color, "--cat-dim": cat.dim, "--cat-glow": cat.glow, opacity: locked ? 0.55 : 1, cursor: locked ? "pointer" : "grab" }}
      title={locked ? "Click to upgrade · Pro required" : "Drag to canvas"}
    >
      <div className="node-icon-wrap">{window.SVG[t.icon]}</div>
      <div className="node-item-text">
        <div className="node-item-label">{t.label}</div>
        <div className="node-item-tag">{t.tag}</div>
      </div>
      {t.pro && (
        <span className={"mini-badge " + (locked ? "amber" : "green")}>PRO</span>
      )}
    </div>
  );
}

window.LeftPanel = LeftPanel;
