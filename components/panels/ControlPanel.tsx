'use client';

import { useState } from 'react';
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
type RibbonTab = 'simulate' | 'traffic' | 'profiles' | 'chaos';

const RIBBON_TABS: { id: RibbonTab; label: string }[] = [
  { id: 'simulate', label: 'SIMULATE' },
  { id: 'traffic',  label: 'TRAFFIC'  },
  { id: 'profiles', label: 'PROFILES' },
  { id: 'chaos',    label: 'CHAOS'    },
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
          height: 28,
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
              height: 28, width: 28, background: 'transparent', border: 'none',
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
          height: 52,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 10,
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
