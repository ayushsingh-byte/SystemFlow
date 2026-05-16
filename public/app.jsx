// SystemFlow — App shell

const { useEffect: useEffectA } = React;

function App() {
  return (
    <window.AuthProvider>
      <window.UIProvider>
        <window.StoreProvider>
          <AppInner />
        </window.StoreProvider>
      </window.UIProvider>
    </window.AuthProvider>
  );
}

function AppInner() {
  window.useSimulationEngine();
  const ui = window.useUI();
  const store = window.useStore();

  // Keyboard shortcuts
  useEffectA(() => {
    const onKey = (e) => {
      const inField = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
      if (inField) return;
      if (e.key === " ") {
        e.preventDefault();
        const s = store.simConfig.state;
        if (s === "idle") {
          if (store.nodes.length === 0) return;
          if (store.simConfig.rate > 1000 && !store.simConfig._confirmedHighTraffic) {
            ui.setShowHighTraffic(true);
          } else {
            store.setSimConfig(c => ({ ...c, state: "running" }));
          }
        } else if (s === "running") {
          store.setSimConfig(c => ({ ...c, state: "paused" }));
        } else if (s === "paused") {
          store.setSimConfig(c => ({ ...c, state: "running" }));
        }
      } else if ((e.key === "s" || e.key === "S") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        try { localStorage.setItem('sf_canvas', JSON.stringify({ nodes: store.nodes, edges: store.edges })); } catch {}
      } else if (e.key === "s" || e.key === "S") {
        store.setSimConfig(c => ({ ...c, state: "idle", _confirmedHighTraffic: false }));
      } else if (e.key === "t" || e.key === "T") {
        ui.setRightOpen(true);
        ui.setRightTab("templates");
      } else if (e.key === "?") {
        ui.setShowHelp(v => !v);
      } else if (e.key === "[" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        ui.setLeftOpen(v => !v);
      } else if (e.key === "]" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        ui.setRightOpen(v => !v);
      } else if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        ui.setBottomOpen(v => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [store.simConfig.state, store.nodes.length, store.simConfig.rate, store.simConfig._confirmedHighTraffic]);

  // First-run tour
  useEffectA(() => {
    if (!localStorage.getItem("sf-toured")) {
      setTimeout(() => ui.setTourStep(0), 400);
      localStorage.setItem("sf-toured", "1");
    }
  }, []);

  return (
    <div className="app">
      <window.Header />
      <window.LeftPanel />
      <window.Canvas />
      <window.RightPanel />
      <window.BottomPanel />
      <window.HighTrafficModal />
      <window.PremiumModal />
      <window.OnboardingTour />
    </div>
  );
}

window.App = App;

// mount
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
