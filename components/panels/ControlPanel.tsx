'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useSimulation } from '@/hooks/useSimulation';
import { TrafficPattern, TEST_PROFILES, TestProfile } from '@/simulation/types';
import { useUIStore } from '@/store/uiStore';
import { THEMES } from '@/utils/theme';

// ─── Log scale helpers ────────────────────────────────────────────────────────
function sliderToRate(sliderValue: number): number {
  return Math.round(Math.pow(10, (sliderValue / 100) * 6));
}
function rateToSlider(rate: number): number {
  return Math.round((Math.log10(Math.max(1, rate)) / 6) * 100);
}
function fmtRate(rate: number): string {
  if (rate >= 1000000) return `${(rate / 1000000).toFixed(2)}M`;
  if (rate >= 1000) return `${(rate / 1000).toFixed(1)}k`;
  return String(rate);
}

const PATTERNS: { id: TrafficPattern; label: string; icon: string; desc: string }[] = [
  { id: 'constant', label: 'Constant', icon: '━', desc: 'Steady load' },
  { id: 'ramp',     label: 'Ramp',    icon: '↗', desc: 'Gradually increasing' },
  { id: 'spike',    label: 'Spike',   icon: '/\\', desc: 'Alternating bursts' },
  { id: 'wave',     label: 'Wave',    icon: '∿', desc: 'Sinusoidal pattern' },
  { id: 'step',     label: 'Step',    icon: '▬', desc: 'Step up every 30s' },
];

// ─── Test Profile Card ────────────────────────────────────────────────────────
function ProfileCard({ profile, isActive, onClick, t }: {
  profile: TestProfile;
  isActive: boolean;
  onClick: () => void;
  t: typeof THEMES.dark;
}) {
  const color = profile.failureInjection ? '#ef4444' :
    profile.trafficRate >= 1000 ? '#f59e0b' :
    profile.trafficRate >= 100 ? '#3b82f6' : '#10b981';

  return (
    <button
      onClick={onClick}
      title={profile.description}
      style={{
        minWidth: 90, flexShrink: 0,
        background: isActive ? `${color}20` : t.surface,
        border: `1px solid ${isActive ? color : t.border2}`,
        borderRadius: 6, padding: '5px 8px',
        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.borderColor = `${color}80`;
          (e.currentTarget as HTMLElement).style.background = `${color}10`;
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.borderColor = t.border2;
          (e.currentTarget as HTMLElement).style.background = t.surface;
        }
      }}
    >
      <div style={{ fontSize: 10, color: isActive ? color : t.textSecondary, fontFamily: 'monospace', fontWeight: 700, marginBottom: 1 }}>
        {profile.name}
      </div>
      <div style={{ fontSize: 9, color: t.textMuted, fontFamily: 'monospace' }}>
        {fmtRate(profile.trafficRate)} req/s · {profile.pattern}
      </div>
      {profile.failureInjection && (
        <div style={{ fontSize: 8, color: '#ef4444', fontFamily: 'monospace', marginTop: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" fill="#ef444420"/></svg>
          CHAOS
        </div>
      )}
    </button>
  );
}

// ─── High-Traffic Confirmation Modal ─────────────────────────────────────────
const HIGH_TRAFFIC_THRESHOLD = 1000;

function HighTrafficModal({
  pendingRate, pendingProfile, onConfirm, onCancel,
}: {
  pendingRate: number;
  pendingProfile: TestProfile | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState('');
  const valid = input.trim() === 'CONFIRM';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#00000095', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          background: '#0a0f1a', border: '1px solid #ef444450',
          borderRadius: 16, padding: '28px 32px', width: 480,
          boxShadow: '0 0 60px #ef444430, 0 20px 60px #00000080',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: '#ef444418', border: '1px solid #ef444440',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L2 20h20z" stroke="#ef4444" strokeWidth="2" fill="#ef444415" strokeLinejoin="round"/>
              <line x1="12" y1="10" x2="12" y2="15" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="12" cy="18" r="1.3" fill="#ef4444"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', fontFamily: 'monospace' }}>
              HIGH TRAFFIC WARNING
            </div>
            <div style={{ fontSize: 12, color: '#8fa3b8', fontFamily: 'monospace', marginTop: 2 }}>
              {pendingProfile ? `Profile: ${pendingProfile.name}` : `Rate: ${fmtRate(pendingRate)} req/s`}
            </div>
          </div>
        </div>

        <div style={{
          background: '#ef444410', border: '1px solid #ef444430',
          borderRadius: 10, padding: '14px 16px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, color: '#fca5a5', fontFamily: 'monospace', lineHeight: 1.8 }}>
            You are about to send <strong style={{ color: '#ef4444' }}>{fmtRate(pendingRate)} requests/second</strong>.
          </div>
          <div style={{ fontSize: 12, color: '#8fa3b8', fontFamily: 'monospace', lineHeight: 1.7, marginTop: 8 }}>
            At this rate, your browser may become unresponsive. The simulation
            engine uses batch processing above 1,000 req/s, but rendering and
            metrics updates can still cause significant CPU load.
          </div>
          <div style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'monospace', marginTop: 10, lineHeight: 1.6 }}>
            Recommendations: Close other browser tabs. Use a high-performance
            machine. Consider starting at 10k req/s and scaling up.
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#8fa3b8', fontFamily: 'monospace', marginBottom: 8 }}>
            Type <strong style={{ color: '#ef4444' }}>CONFIRM</strong> to proceed:
          </div>
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && valid) onConfirm(); }}
            placeholder="Type CONFIRM here..."
            style={{
              width: '100%', background: '#050810',
              border: `1px solid ${valid ? '#10b981' : '#1e2d3d'}`,
              borderRadius: 8, padding: '10px 14px',
              color: valid ? '#10b981' : '#e2eaf4',
              fontSize: 14, fontFamily: 'monospace', fontWeight: 700,
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.15s, color 0.15s',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, height: 40, background: 'transparent',
              border: '1px solid #374151', borderRadius: 8,
              color: '#8fa3b8', fontSize: 13, fontFamily: 'monospace',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel — Stay Safe
          </button>
          <button
            disabled={!valid}
            onClick={onConfirm}
            style={{
              flex: 1, height: 40,
              background: valid ? '#ef444420' : '#1e2d3d',
              border: `1px solid ${valid ? '#ef4444' : '#1e2d3d'}`,
              borderRadius: 8, color: valid ? '#ef4444' : '#374151',
              fontSize: 13, fontFamily: 'monospace', fontWeight: 700,
              cursor: valid ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            Run High-Traffic Test
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Ribbon Tab Types ─────────────────────────────────────────────────────────
type RibbonTab = 'simulate' | 'traffic' | 'profiles' | 'chaos' | 'testlab';

const RIBBON_TABS: { id: RibbonTab; label: string }[] = [
  { id: 'simulate', label: 'SIMULATE' },
  { id: 'traffic',  label: 'TRAFFIC'  },
  { id: 'profiles', label: 'PROFILES' },
  { id: 'chaos',    label: 'CHAOS'    },
  { id: 'testlab',  label: 'TEST LAB' },
];

// ─── Test Scenarios ───────────────────────────────────────────────────────────
interface TestScenario {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  duration: number;
  trafficRate: number;
  pattern: TrafficPattern;
  failureInjection: boolean;
  maxErrorRate: number;
  maxLatency: number;
}

const TEST_SCENARIOS: TestScenario[] = [
  { id: 'smoke',      name: 'Smoke Test',      badge: 'QUICK',   badgeColor: '#10b981', description: '10s at 10 req/s — quick sanity check',                   duration: 10,  trafficRate: 10,    pattern: 'constant', failureInjection: false, maxErrorRate: 5,   maxLatency: 2000  },
  { id: 'baseline',   name: 'Baseline',         badge: '30s',     badgeColor: '#3b82f6', description: '30s at 50 req/s — establish performance baseline',        duration: 30,  trafficRate: 50,    pattern: 'constant', failureInjection: false, maxErrorRate: 2,   maxLatency: 1000  },
  { id: 'load',       name: 'Load Test',        badge: '60s',     badgeColor: '#3b82f6', description: '60s at 500 req/s — verify expected load capacity',        duration: 60,  trafficRate: 500,   pattern: 'constant', failureInjection: false, maxErrorRate: 5,   maxLatency: 2000  },
  { id: 'stress',     name: 'Stress Test',      badge: 'RAMP',    badgeColor: '#f59e0b', description: '60s ramp 1→5k req/s — find system breaking point',       duration: 60,  trafficRate: 5000,  pattern: 'ramp',     failureInjection: false, maxErrorRate: 20,  maxLatency: 5000  },
  { id: 'spike',      name: 'Spike Test',       badge: 'BURST',   badgeColor: '#f59e0b', description: '60s spike bursts — test auto-scaling & burst resilience', duration: 60,  trafficRate: 1000,  pattern: 'spike',    failureInjection: false, maxErrorRate: 10,  maxLatency: 3000  },
  { id: 'soak',       name: 'Soak Test',        badge: '120s',    badgeColor: '#8b5cf6', description: '120s at 200 req/s — endurance & memory leak detection',   duration: 120, trafficRate: 200,   pattern: 'constant', failureInjection: false, maxErrorRate: 3,   maxLatency: 1500  },
  { id: 'breakpoint', name: 'Breakpoint',       badge: 'STEP',    badgeColor: '#f59e0b', description: '90s step ramp — find exact failure threshold',            duration: 90,  trafficRate: 10000, pattern: 'step',     failureInjection: false, maxErrorRate: 50,  maxLatency: 10000 },
  { id: 'chaos',      name: 'Chaos Test',       badge: 'CHAOS',   badgeColor: '#ef4444', description: '60s at 500 req/s + random failures — chaos engineering',  duration: 60,  trafficRate: 500,   pattern: 'constant', failureInjection: true,  maxErrorRate: 30,  maxLatency: 5000  },
  { id: 'failover',   name: 'Failover Test',    badge: 'FAIL',    badgeColor: '#ef4444', description: '60s spike + chaos — verify failover & redundancy',        duration: 60,  trafficRate: 300,   pattern: 'spike',    failureInjection: true,  maxErrorRate: 25,  maxLatency: 4000  },
  { id: 'sla',        name: 'SLA Validation',   badge: 'SLA',     badgeColor: '#10b981', description: '60s wave — validate 99.9% uptime & latency SLAs',        duration: 60,  trafficRate: 100,   pattern: 'wave',     failureInjection: false, maxErrorRate: 0.1, maxLatency: 500   },
  { id: 'cascade',    name: 'Cascade Failure',  badge: 'EXTREME', badgeColor: '#dc2626', description: '45s max load + chaos — trigger cascade failures',         duration: 45,  trafficRate: 10000, pattern: 'spike',    failureInjection: true,  maxErrorRate: 80,  maxLatency: 15000 },
  { id: 'recovery',   name: 'Recovery Test',    badge: 'MTTR',    badgeColor: '#8b5cf6', description: '90s ramp + chaos — measure mean time to recovery',        duration: 90,  trafficRate: 1000,  pattern: 'ramp',     failureInjection: true,  maxErrorRate: 40,  maxLatency: 8000  },
];

// ─── ControlPanel ─────────────────────────────────────────────────────────────
export default function ControlPanel() {
  const { simConfig, metrics } = useStore();
  const {
    startSimulation, pauseSimulation, resumeSimulation, stopSimulation,
    setTrafficRate, toggleFailureInjection, setTrafficPattern,
  } = useSimulation();

  const { theme, ribbonTab, setRibbonTab, toggleBottomPanel } = useUIStore();
  const t = THEMES[theme];

  const { running, paused, trafficRate, failureInjection, trafficPattern } = simConfig;
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [profileConfirmed, setProfileConfirmed] = useState<string | null>(null);

  // High traffic modal state
  const [htModal, setHtModal] = useState<{ rate: number; profile: TestProfile | null } | null>(null);
  const [pendingStart, setPendingStart] = useState(false);

  // Test Lab state
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [testProgress, setTestProgress] = useState(0);
  const [testResults, setTestResults] = useState<Record<string, { passed: boolean; errorRate: number; latency: number; throughput: number }>>({});
  const testTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (testTimerRef.current) clearInterval(testTimerRef.current); };
  }, []);

  const stopTest = useCallback(() => {
    if (testTimerRef.current) {
      clearInterval(testTimerRef.current);
      testTimerRef.current = null;
    }
    stopSimulation();
    setActiveTest(null);
    setTestProgress(0);
  }, [stopSimulation]);

  const runTest = useCallback((scenario: TestScenario) => {
    if (testTimerRef.current) {
      clearInterval(testTimerRef.current);
      testTimerRef.current = null;
    }

    if (running) stopSimulation();
    setActiveTest(scenario.id);
    setTestProgress(0);
    setTrafficRate(scenario.trafficRate);
    setTrafficPattern(scenario.pattern);
    if (scenario.failureInjection !== failureInjection) {
      toggleFailureInjection(scenario.failureInjection);
    }

    setTimeout(() => {
      startSimulation();
      const startTime = Date.now();
      const totalMs = scenario.duration * 1000;

      // Progress ticker
      testTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setTestProgress(Math.min(99, Math.round((elapsed / totalMs) * 100)));
      }, 300);

      // End timer
      setTimeout(() => {
        if (testTimerRef.current) {
          clearInterval(testTimerRef.current);
          testTimerRef.current = null;
        }
        stopSimulation();
        setTestProgress(100);

        const m = useStore.getState().metrics;
        const passed = m.errorRate <= scenario.maxErrorRate && m.avgLatency <= scenario.maxLatency;
        setTestResults(prev => ({
          ...prev,
          [scenario.id]: {
            passed,
            errorRate: parseFloat(m.errorRate.toFixed(1)),
            latency: Math.round(m.avgLatency),
            throughput: parseFloat(m.throughput.toFixed(1)),
          },
        }));
        setActiveTest(null);
      }, totalMs);
    }, 150);
  }, [running, failureInjection, stopSimulation, startSimulation, setTrafficRate, setTrafficPattern, toggleFailureInjection]);

  const sliderValue = rateToSlider(trafficRate);

  const handleSliderChange = (sv: number) => {
    const rate = sliderToRate(sv);
    setTrafficRate(rate);
    setActiveProfileId(null);
  };

  const handleRun = () => {
    if (trafficRate > HIGH_TRAFFIC_THRESHOLD) {
      setHtModal({ rate: trafficRate, profile: null });
      setPendingStart(true);
    } else {
      startSimulation();
    }
  };

  const handleModalConfirm = () => {
    if (htModal) {
      if (htModal.profile) {
        setTrafficRate(htModal.profile.trafficRate);
        setTrafficPattern(htModal.profile.pattern);
        if (htModal.profile.failureInjection !== failureInjection) {
          toggleFailureInjection(htModal.profile.failureInjection);
        }
        setActiveProfileId(htModal.profile.id);
        setProfileConfirmed(htModal.profile.id);
        setTimeout(() => setProfileConfirmed(null), 1500);
      }
      setHtModal(null);
      if (pendingStart) {
        setPendingStart(false);
        setTimeout(() => startSimulation(), 50);
      }
    }
  };

  const handleModalCancel = () => {
    if (htModal && !htModal.profile) {
      setTrafficRate(HIGH_TRAFFIC_THRESHOLD);
    }
    setPendingStart(false);
    setHtModal(null);
  };

  const applyProfile = (profile: TestProfile) => {
    if (profile.trafficRate > HIGH_TRAFFIC_THRESHOLD) {
      setHtModal({ rate: profile.trafficRate, profile });
      return;
    }
    setTrafficRate(profile.trafficRate);
    setTrafficPattern(profile.pattern);
    if (profile.failureInjection !== failureInjection) {
      toggleFailureInjection(profile.failureInjection);
    }
    setActiveProfileId(profile.id);
    setProfileConfirmed(profile.id);
    setTimeout(() => setProfileConfirmed(null), 1500);
  };

  const statusColor = !running ? t.textMuted : paused ? '#f59e0b' : '#10b981';
  const statusLabel = !running ? 'IDLE' : paused ? 'PAUSED' : 'RUNNING';

  return (
    <>
      {htModal && (
        <HighTrafficModal
          pendingRate={htModal.rate}
          pendingProfile={htModal.profile}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}

      <div style={{
        background: t.surface2,
        borderTop: `1px solid ${t.border}`,
        position: 'relative',
        zIndex: 200,
        flexShrink: 0,
        userSelect: 'none',
      }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          height: 34,
          borderBottom: `1px solid ${t.border}`,
          background: t.surface,
          paddingLeft: 8,
        }}>
          {RIBBON_TABS.map(tab => {
            const isActive = ribbonTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setRibbonTab(tab.id)}
                style={{
                  height: '100%',
                  padding: '0 14px',
                  background: isActive ? t.surface2 : 'transparent',
                  border: 'none',
                  borderRight: `1px solid ${t.border}`,
                  borderBottom: isActive ? `2px solid ${t.accent}` : '2px solid transparent',
                  color: isActive ? t.accent : t.textMuted,
                  fontSize: 9,
                  fontFamily: 'monospace',
                  fontWeight: isActive ? 800 : 600,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.color = t.textSecondary;
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.color = t.textMuted;
                }}
              >
                {tab.label}
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          {/* Status badge in tab bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingRight: 8 }}>
            <motion.div
              animate={running && !paused ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                width: 6, height: 6, borderRadius: '50%', background: statusColor,
                boxShadow: running && !paused ? `0 0 8px ${statusColor}` : 'none',
              }}
            />
            <span style={{ fontSize: 9, color: statusColor, fontFamily: 'monospace', fontWeight: 700 }}>
              {statusLabel}
            </span>
          </div>

          {/* Collapse button */}
          <button
            onClick={toggleBottomPanel}
            title="Collapse toolbar"
            style={{
              height: 34, width: 32, background: 'transparent', border: 'none',
              borderLeft: `1px solid ${t.border}`,
              color: t.textMuted, cursor: 'pointer', fontSize: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = t.textSecondary; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
          >
            ▼
          </button>
        </div>

        {/* Tab content area */}
        <div style={{
          height: ribbonTab === 'testlab' ? 200 : 76,
          display: 'flex',
          alignItems: ribbonTab === 'testlab' ? 'flex-start' : 'center',
          padding: ribbonTab === 'testlab' ? '10px 14px 8px' : '0 14px',
          gap: 12,
          overflowX: 'auto',
          overflowY: 'hidden',
        }}>

          {/* SIMULATE tab */}
          {ribbonTab === 'simulate' && (
            <>
              {/* Sim controls */}
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                {!running ? (
                  <CtrlBtn onClick={handleRun} color="#10b981" label="▶  Run" />
                ) : paused ? (
                  <>
                    <CtrlBtn onClick={resumeSimulation} color="#3b82f6" label="▶  Resume" />
                    <CtrlBtn onClick={stopSimulation} color="#ef4444" label="■  Stop" />
                  </>
                ) : (
                  <>
                    <CtrlBtn onClick={pauseSimulation} color="#f59e0b" label="||  Pause" />
                    <CtrlBtn onClick={stopSimulation} color="#ef4444" label="■  Stop" />
                  </>
                )}
              </div>

              <Divider t={t} />

              {/* Live counters */}
              {running ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                  <LiveStat label="TOTAL" value={fmtRate(metrics.totalRequests)} color="#8b5cf6" t={t} />
                  <LiveStat label="OK" value={fmtRate(metrics.completedRequests)} color="#10b981" t={t} />
                  <LiveStat label="FAILED" value={fmtRate(metrics.failedRequests)} color="#ef4444" t={t} />
                  <LiveStat label="ACTIVE" value={String(Math.max(0, metrics.totalRequests - metrics.completedRequests - metrics.failedRequests))} color="#f59e0b" t={t} />
                </div>
              ) : (
                <div style={{ fontSize: 10, color: t.textMuted, fontFamily: 'monospace', flexShrink: 0 }}>
                  Press ▶ Run to start simulation
                </div>
              )}

              {running && <Divider t={t} />}

              {/* Rate display */}
              {running && (
                <div style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: t.textMuted, fontFamily: 'monospace', textTransform: 'uppercase' }}>Rate</div>
                  <div style={{ fontSize: 13, color: t.accent, fontFamily: 'monospace', fontWeight: 800 }}>
                    {fmtRate(trafficRate)}<span style={{ fontSize: 9, color: t.textMuted }}> req/s</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TRAFFIC tab */}
          {ribbonTab === 'traffic' && (
            <>
              {/* Rate slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 9, color: t.textMuted, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Traffic Rate
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ fontSize: 16, color: t.accent, fontFamily: 'monospace', fontWeight: 800 }}>
                      {fmtRate(trafficRate)}
                    </span>
                    <span style={{ fontSize: 9, color: t.textMuted, fontFamily: 'monospace' }}>req/s</span>
                  </div>
                </div>
                <div style={{ width: 120 }}>
                  <input
                    type="range" min={1} max={100} step={1} value={sliderValue}
                    onChange={(e) => handleSliderChange(Number(e.target.value))}
                    style={{ width: '100%', accentColor: t.accent, cursor: 'pointer', height: 4 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 1 }}>
                    <span style={{ fontSize: 8, color: t.textMuted, fontFamily: 'monospace' }}>1</span>
                    <span style={{ fontSize: 8, color: t.textMuted, fontFamily: 'monospace' }}>1M</span>
                  </div>
                </div>
              </div>

              <Divider t={t} />

              {/* Pattern buttons */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 9, color: t.textMuted, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Pattern
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {PATTERNS.map((p) => (
                    <button
                      key={p.id}
                      title={p.desc}
                      onClick={() => setTrafficPattern(p.id)}
                      style={{
                        padding: '3px 7px',
                        background: trafficPattern === p.id ? `${t.accent}18` : 'transparent',
                        border: `1px solid ${trafficPattern === p.id ? t.accent : t.border2}`,
                        borderRadius: 5, color: trafficPattern === p.id ? t.accent : t.textMuted,
                        fontSize: 9, fontFamily: 'monospace', fontWeight: trafficPattern === p.id ? 700 : 400,
                        cursor: 'pointer', transition: 'all 0.12s',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}
                    >
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* PROFILES tab */}
          {ribbonTab === 'profiles' && (
            <div style={{
              display: 'flex', gap: 5, overflowX: 'auto', width: '100%',
              alignItems: 'center',
            }}>
              {TEST_PROFILES.map(profile => (
                <div key={profile.id} style={{ position: 'relative', flexShrink: 0 }}>
                  <ProfileCard
                    profile={profile}
                    isActive={activeProfileId === profile.id}
                    onClick={() => applyProfile(profile)}
                    t={t}
                  />
                  {profileConfirmed === profile.id && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                        background: '#10b981', borderRadius: 4, padding: '2px 6px',
                        fontSize: 9, color: '#fff', fontFamily: 'monospace', fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Applied!
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* CHAOS tab */}
          {ribbonTab === 'chaos' && (
            <>
              {/* Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <ToggleSwitch
                  enabled={failureInjection}
                  onChange={toggleFailureInjection}
                  activeColor="#ef4444"
                />
                <div>
                  <div style={{
                    fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                    color: failureInjection ? '#ef4444' : t.textMuted,
                    transition: 'color 0.2s',
                  }}>
                    Chaos Mode
                  </div>
                  <div style={{ fontSize: 9, color: t.textMuted, fontFamily: 'monospace' }}>
                    {failureInjection ? '2.5× failures + latency spikes' : 'Inject random failures'}
                  </div>
                </div>
              </div>

              {failureInjection && (
                <>
                  <Divider t={t} />
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                    <LiveStat label="FAILED" value={fmtRate(metrics.failedRequests)} color="#ef4444" t={t} />
                    <LiveStat label="ERR%" value={`${metrics.errorRate.toFixed(1)}%`} color={metrics.errorRate > 10 ? '#ef4444' : '#f59e0b'} t={t} />
                    <LiveStat label="LATENCY" value={`${Math.round(metrics.avgLatency)}ms`} color="#f59e0b" t={t} />
                  </div>
                  <Divider t={t} />
                  <div style={{
                    padding: '4px 10px', background: '#ef444415', border: '1px solid #ef444430',
                    borderRadius: 6, fontSize: 10, color: '#ef4444', fontFamily: 'monospace', flexShrink: 0,
                  }}>
                    Chaos active — 2.5x failure rate
                  </div>
                </>
              )}
            </>
          )}

          {/* TEST LAB tab */}
          {ribbonTab === 'testlab' && (
            <>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, paddingBottom: 4, borderBottom: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.textSecondary, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    12 Test Scenarios
                    {activeTest && <span style={{ color: '#f59e0b', marginLeft: 8 }}>● Running: {TEST_SCENARIOS.find(s => s.id === activeTest)?.name}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {Object.keys(testResults).length > 0 && (
                      <button onClick={() => setTestResults({})} style={{ background: 'transparent', border: `1px solid ${t.border2}`, borderRadius: 4, color: t.textMuted, fontSize: 9, fontFamily: 'monospace', cursor: 'pointer', padding: '2px 8px' }}>
                        Clear Results
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrollable grid */}
                <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                  <div style={{ display: 'flex', gap: 5, minWidth: 'max-content' }}>
                    {TEST_SCENARIOS.map(scenario => {
                      const result = testResults[scenario.id];
                      const isRunning = activeTest === scenario.id;
                      const borderCol = result ? (result.passed ? '#10b98140' : '#ef444440') : (isRunning ? `${scenario.badgeColor}50` : t.border);
                      return (
                        <div key={scenario.id} style={{
                          width: 158, flexShrink: 0,
                          background: isRunning ? `${scenario.badgeColor}08` : result ? (result.passed ? '#10b98108' : '#ef444408') : t.surface,
                          border: `1px solid ${borderCol}`,
                          borderRadius: 7, padding: '8px 9px',
                          transition: 'all 0.2s',
                        }}>
                          {/* Top row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{
                              padding: '1px 5px', borderRadius: 3,
                              background: `${scenario.badgeColor}20`, border: `1px solid ${scenario.badgeColor}50`,
                              fontSize: 8, color: scenario.badgeColor, fontFamily: 'monospace', fontWeight: 700,
                            }}>
                              {scenario.badge}
                            </span>
                            {result && (
                              <span style={{
                                padding: '1px 5px', borderRadius: 3, fontSize: 8, fontFamily: 'monospace', fontWeight: 800,
                                background: result.passed ? '#10b98120' : '#ef444420',
                                color: result.passed ? '#10b981' : '#ef4444',
                                border: `1px solid ${result.passed ? '#10b98140' : '#ef444440'}`,
                              }}>
                                {result.passed ? 'PASS' : 'FAIL'}
                              </span>
                            )}
                          </div>

                          {/* Name */}
                          <div style={{ fontSize: 11, fontWeight: 700, color: isRunning ? scenario.badgeColor : t.textPrimary, fontFamily: 'monospace', marginBottom: 3, transition: 'color 0.2s' }}>
                            {scenario.name}
                          </div>

                          {/* Description or progress or results */}
                          {isRunning ? (
                            <div style={{ marginBottom: 5 }}>
                              <div style={{ height: 3, background: t.border, borderRadius: 2, marginBottom: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${testProgress}%`, background: scenario.badgeColor, borderRadius: 2, transition: 'width 0.3s' }} />
                              </div>
                              <div style={{ fontSize: 9, color: scenario.badgeColor, fontFamily: 'monospace' }}>{testProgress}% · {scenario.duration}s test</div>
                            </div>
                          ) : result ? (
                            <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                              <span style={{ fontSize: 9, color: t.textMuted, fontFamily: 'monospace' }}>err:{result.errorRate}%</span>
                              <span style={{ fontSize: 9, color: t.textMuted, fontFamily: 'monospace' }}>p50:{result.latency}ms</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: 9, color: t.textMuted, fontFamily: 'monospace', marginBottom: 5, lineHeight: 1.4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                              {scenario.description}
                            </div>
                          )}

                          {/* Run button */}
                          <button
                            onClick={() => isRunning ? stopTest() : runTest(scenario)}
                            disabled={!!activeTest && !isRunning}
                            style={{
                              width: '100%', height: 22, borderRadius: 4,
                              background: isRunning ? '#ef444415' : `${scenario.badgeColor}15`,
                              border: `1px solid ${isRunning ? '#ef444440' : `${scenario.badgeColor}40`}`,
                              color: isRunning ? '#ef4444' : scenario.badgeColor,
                              fontSize: 9, fontFamily: 'monospace', fontWeight: 700, cursor: activeTest && !isRunning ? 'not-allowed' : 'pointer',
                              opacity: activeTest && !isRunning ? 0.4 : 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                              transition: 'all 0.12s',
                            }}
                          >
                            {isRunning ? '⏹ Stop' : result ? '↺ Re-run' : '▶ Run'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function CtrlBtn({ onClick, color, label }: { onClick: () => void; color: string; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 10px',
        background: `${color}18`, border: `1px solid ${color}50`,
        borderRadius: 6, color, fontSize: 10,
        fontFamily: 'monospace', fontWeight: 700,
        cursor: 'pointer', letterSpacing: '0.02em', transition: 'all 0.12s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = `${color}28`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 10px ${color}40`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = `${color}18`;
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {label}
    </button>
  );
}

function Divider({ t }: { t: typeof THEMES.dark }) {
  return <div style={{ width: 1, height: 32, background: t.border, flexShrink: 0 }} />;
}

function LiveStat({ label, value, color, t }: { label: string; value: string; color: string; t: typeof THEMES.dark }) {
  return (
    <div style={{ textAlign: 'center', flexShrink: 0 }}>
      <div style={{ fontSize: 8, color: t.textMuted, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </div>
      <motion.div
        key={value}
        initial={{ opacity: 0.5, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ fontSize: 13, color, fontFamily: 'monospace', fontWeight: 800 }}
      >
        {value}
      </motion.div>
    </div>
  );
}

function ToggleSwitch({ enabled, onChange, activeColor }: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  activeColor: string;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: 38, height: 20, borderRadius: 10,
        background: enabled ? activeColor : '#1e2d3d',
        border: `1px solid ${enabled ? activeColor : '#374151'}`,
        cursor: 'pointer', padding: 2,
        display: 'flex', alignItems: 'center',
        justifyContent: enabled ? 'flex-end' : 'flex-start',
        transition: 'all 0.2s', flexShrink: 0,
      }}
    >
      <motion.div
        layout
        style={{
          width: 14, height: 14, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px #0004',
        }}
      />
    </button>
  );
}
