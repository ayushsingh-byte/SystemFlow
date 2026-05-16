// SystemFlow — modals & onboarding tour

const { useState: useStateM, useEffect: useEffectM } = React;

function HighTrafficModal() {
  const ui = window.useUI();
  const { simConfig, setSimConfig, nodes } = window.useStore();
  const [code, setCode] = useStateM("");

  if (!ui.showHighTraffic) return null;
  const valid = code.trim().toUpperCase() === "RUN HOT";

  const confirm = () => {
    setSimConfig(c => ({ ...c, state: "running", _confirmedHighTraffic: true }));
    ui.setShowHighTraffic(false);
    setCode("");
  };

  return (
    <div className="modal-overlay" onClick={() => ui.setShowHighTraffic(false)}>
      <div className="high-traffic-card" onClick={(e) => e.stopPropagation()}>
        <div className="warn-icon">{window.SVG.warn}</div>
        <h2>High-traffic simulation</h2>
        <div className="sub">You are about to fire <b style={{ color: "var(--red)" }}>{simConfig.rate.toLocaleString()} req/s</b> at {nodes.length} nodes.</div>
        <div className="high-traffic-info">
          This is destructive load. Expect:
          <ul>
            <li>Saturated CPU and connection pools on every tier</li>
            <li>P99 latency spikes well above your SLA budget</li>
            <li>Cascading failures on weak nodes (DBs, single LBs)</li>
          </ul>
        </div>
        <input
          className={"confirm-input" + (valid ? " valid" : "")}
          placeholder='Type "RUN HOT" to confirm'
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && valid) confirm(); }}
          autoFocus
        />
        <div className="modal-buttons">
          <button className="btn btn-ghost" onClick={() => { ui.setShowHighTraffic(false); setCode(""); }}>Cancel</button>
          <button className="btn btn-danger" disabled={!valid} onClick={confirm}>Run anyway</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Onboarding tour ---------- */
const TOUR_STEPS = [
  {
    title: "Welcome to SystemFlow",
    desc: "Design distributed systems on a canvas, then hammer them with simulated traffic to see what breaks. This walkthrough takes 30 seconds.",
    target: null, // centered
  },
  {
    title: "Drag nodes from the palette",
    desc: "Pick from databases, queues, compute, AI, and more. Drag any node onto the canvas to add it.",
    target: ".left-panel",
    side: "right",
  },
  {
    title: "Wire nodes together",
    desc: "Hover a node — circle handles appear on each side. Drag from one to another to draw an edge.",
    target: ".canvas-area",
    side: "center",
  },
  {
    title: "Configure the load",
    desc: "Set a target rate, pick a traffic pattern, enable chaos. Profiles let you snap to common scenarios like Black Friday or Launch Day.",
    target: ".bottom-panel",
    side: "top",
  },
  {
    title: "Watch it run",
    desc: "Hit Run. Metrics stream in the header and the Metrics tab. The Advisor tab flags weaknesses in real time.",
    target: ".right-panel",
    side: "left",
  },
  {
    title: "Ready to design",
    desc: "Try loading a template from the Templates tab, or start from scratch. Press ? anytime for shortcuts.",
    target: null,
  },
];

function OnboardingTour() {
  const ui = window.useUI();
  const [pos, setPos] = useStateM(null);

  useEffectM(() => {
    if (ui.tourStep < 0 || ui.tourStep >= TOUR_STEPS.length) { setPos(null); return; }
    const step = TOUR_STEPS[ui.tourStep];
    if (!step.target) {
      setPos({ left: "50%", top: "50%", transform: "translate(-50%, -50%)" });
      return;
    }
    const el = document.querySelector(step.target);
    if (!el) { setPos({ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }); return; }
    const r = el.getBoundingClientRect();
    const W = 280, H = 160;
    let left, top;
    if (step.side === "right") { left = r.right + 16; top = r.top + r.height / 2 - H / 2; }
    else if (step.side === "left") { left = r.left - W - 16; top = r.top + r.height / 2 - H / 2; }
    else if (step.side === "top") { left = r.left + r.width / 2 - W / 2; top = r.top - H - 16; }
    else { left = r.left + r.width / 2 - W / 2; top = r.top + r.height / 2 - H / 2; }
    // clamp
    left = Math.max(16, Math.min(window.innerWidth - W - 16, left));
    top = Math.max(16, Math.min(window.innerHeight - H - 16, top));
    setPos({ left, top });
  }, [ui.tourStep]);

  if (ui.tourStep < 0 || !pos) return null;
  const step = TOUR_STEPS[ui.tourStep];
  const isLast = ui.tourStep === TOUR_STEPS.length - 1;

  return (
    <>
      <div className="tour-overlay" onClick={() => ui.setTourStep(-1)} />
      <div className="tour-card" style={pos}>
        <div className="tour-step">Step {ui.tourStep + 1} of {TOUR_STEPS.length}</div>
        <div className="tour-title">{step.title}</div>
        <div className="tour-desc">{step.desc}</div>
        <div className="tour-actions">
          <button className="btn btn-ghost" onClick={() => ui.setTourStep(-1)}>Skip</button>
          <div style={{ display: "flex", gap: 6 }}>
            {ui.tourStep > 0 && (
              <button className="btn" onClick={() => ui.setTourStep(s => s - 1)}>Back</button>
            )}
            <button className="btn btn-primary" onClick={() => isLast ? ui.setTourStep(-1) : ui.setTourStep(s => s + 1)}>
              {isLast ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Premium upgrade modal ---------- */
const PREMIUM_FEATURES = [
  { title: "108-node palette", desc: "Every cloud, every framework, full AI/ML stack." },
  { title: "AI Advisor", desc: "Live topology coaching from a fine-tuned LLM." },
  { title: "Chaos & Cascade", desc: "Inject failures, watch the blast radius." },
  { title: "Test Lab", desc: "12 scenarios from smoke to breakpoint." },
  { title: "Unlimited canvases", desc: "Save every architecture you ship." },
  { title: "Real-time collab", desc: "Up to 10 teammates on one canvas." },
  { title: "Export & share", desc: "PNG, SVG, Terraform, K8s manifests." },
  { title: "Priority support", desc: "Slack channel with our SRE team." },
];

const TRIAL_CODE = "TRIAL2025";

function PremiumModal() {
  const ui = window.useUI();
  const auth = window.useAuth();
  const [code, setCode] = useStateM("");
  const [step, setStep] = useStateM("features"); // "features" | "activate"
  const [err, setErr] = useStateM("");
  if (!ui.showPremium) return null;

  const close = () => { ui.setShowPremium(false); setStep("features"); setCode(""); setErr(""); };

  const tryActivate = () => {
    if (code.trim().toUpperCase() !== TRIAL_CODE) {
      setErr("Invalid code. Check your email or use the free trial code.");
      return;
    }
    auth.setPremium(true);
    close();
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
        <div className="premium-aurora">
          <div className="premium-crown">{window.SVG.crown}</div>
        </div>
        <div className="premium-body">
          {step === "features" ? (
            <>
              <h2>Unlock SystemFlow Pro</h2>
              <div className="premium-sub">Used by 12,000+ engineers at Stripe, Vercel, Datadog, Cloudflare.</div>
              <div className="premium-tier">
                <span className="price">$19</span>
                <span className="per">/ month</span>
                <span style={{ font: "600 10px/1 var(--mono)", color: "var(--text-muted)", marginLeft: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>· cancel anytime</span>
              </div>
              <div className="premium-features">
                {PREMIUM_FEATURES.map((f, i) => (
                  <div key={i} className="premium-feat">
                    <div className="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                    <div className="feat-text"><b>{f.title}</b> — {f.desc}</div>
                  </div>
                ))}
              </div>
              <div className="premium-actions">
                <button className="btn btn-ghost" onClick={close}>Maybe later</button>
                <button className="btn btn-premium" onClick={() => setStep("activate")}>
                  {window.SVG.sparkle} Start 14-day trial
                </button>
              </div>
              <div className="premium-trust">
                <span>★★★★★ <b style={{ color: "var(--text-sec)" }}>4.9</b> on G2</span>
                <span>· SOC 2 Type II</span>
                <span>· 99.99% uptime</span>
              </div>
            </>
          ) : (
            <>
              <h2>Enter activation code</h2>
              <div className="premium-sub" style={{ marginBottom: 18 }}>
                Check your email for a trial code, or use <b style={{ color: "var(--amber)", fontFamily: "var(--mono)" }}>{TRIAL_CODE}</b> for the free 14-day trial.
              </div>
              <input
                className={"confirm-input" + (code.trim().toUpperCase() === TRIAL_CODE ? " valid" : "")}
                placeholder="Enter code (e.g. TRIAL2025)"
                value={code}
                onChange={(e) => { setCode(e.target.value); setErr(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") tryActivate(); }}
                autoFocus
                style={{ marginBottom: 8 }}
              />
              {err && <div style={{ color: "var(--red)", font: "600 11px/1.4 var(--sans)", marginBottom: 8 }}>{err}</div>}
              <div className="modal-buttons">
                <button className="btn btn-ghost" onClick={() => { setStep("features"); setCode(""); setErr(""); }}>Back</button>
                <button className="btn btn-premium" onClick={tryActivate} disabled={!code.trim()}>
                  {window.SVG.sparkle} Activate Pro
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

window.HighTrafficModal = HighTrafficModal;
window.OnboardingTour = OnboardingTour;
window.PremiumModal = PremiumModal;
