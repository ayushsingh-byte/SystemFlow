// SystemFlow — App shell

const { useEffect: useEffectA } = React;

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[SystemFlow] Uncaught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f1117', color: '#fff', fontFamily: 'Inter,sans-serif', gap: 16 }
      },
        React.createElement('h2', { style: { fontSize: 24, margin: 0 } }, 'Something went wrong'),
        React.createElement('p', { style: { color: '#888', margin: 0 } }, this.state.error?.message || 'Unknown error'),
        React.createElement('button', {
          onClick: () => { this.setState({ hasError: false, error: null }); },
          style: { padding: '8px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }
        }, 'Try Again')
      );
    }
    return this.props.children;
  }
}

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
      // Undo: Ctrl+Z / Cmd+Z
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        store.undo();
        return;
      }
      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        store.redo();
        return;
      }
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
        store.saveToBackend();
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
  }, [store.simConfig.state, store.nodes.length, store.simConfig.rate, store.simConfig._confirmedHighTraffic, store.undo, store.redo]);

  // Load canvas from backend on mount
  useEffectA(() => {
    store.loadFromBackend();
  }, []);

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
ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
