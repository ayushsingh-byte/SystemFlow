'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { useUIStore } from '@/store/uiStore';
import { THEMES } from '@/utils/theme';
import { useAuthStore } from '@/store/authStore';

export default function Header() {
  const { simConfig, metrics, nodes, edges } = useStore();
  const { running, paused } = simConfig;
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [activationMsg, setActivationMsg] = useState('');
  const { theme } = useUIStore();
  const t = THEMES[theme];
  const { user, isPremium, logout, updateProfile, activatePremium, resetAllData } = useAuthStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const liveRate = running ? Math.round(simConfig.trafficRate) : 0;

  return (
    <header style={{
      height: 52,
      background: t.surface,
      borderBottom: `1px solid ${t.border2}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
      flexShrink: 0,
      position: 'relative',
      zIndex: 100,
    }}>

      {/* ── Logo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <motion.div
          animate={running && !paused ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 3, repeat: running && !paused ? Infinity : 0, ease: 'linear' }}
          style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(129,140,248,0.12))',
            border: '1px solid rgba(0,212,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L21.5 7.5v9L12 22l-9.5-5.5v-9L12 2z" stroke="#00d4ff" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M12 8L17 11v6l-5 3-5-3v-6l5-3z" fill="rgba(0,212,255,0.15)" stroke="rgba(0,212,255,0.55)" strokeWidth="1" strokeLinejoin="round"/>
          </svg>
        </motion.div>
        <div>
          <div style={{
            fontSize: 15, fontWeight: 800,
            fontFamily: 'var(--font-ui)',
            letterSpacing: '-0.02em', lineHeight: 1,
            color: t.textPrimary,
          }}>
            System<span style={{ color: '#00d4ff' }}>Flow</span>
          </div>
        </div>
      </div>

      <div className="sf-divider" />

      {/* ── Canvas stats ── */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <HeaderChip label="Nodes" value={String(nodes.length)} color="#818cf8" />
        <HeaderChip label="Edges" value={String(edges.length)} color="#3b82f6" />
      </div>

      {/* ── Live metrics (when running) ── */}
      <AnimatePresence>
        {running && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            style={{ display: 'flex', gap: 4, alignItems: 'center', overflow: 'hidden' }}
          >
            <div className="sf-divider" />
            <div style={{ display: 'flex', gap: 10 }}>
              <LiveMetric label="LATENCY" value={`${Math.round(metrics.avgLatency)}ms`} color="#3b82f6" />
              <LiveMetric label="P95"     value={`${metrics.percentiles?.p95 ?? 0}ms`}  color="#818cf8" />
              <LiveMetric label="THRUPUT" value={`${metrics.throughput.toFixed(1)}/s`}  color="#10b981" />
              <LiveMetric label="ERR%"    value={`${metrics.errorRate.toFixed(1)}%`}     color={metrics.errorRate > 5 ? '#ef4444' : '#10b981'} />
              <LiveMetric label="RATE"    value={`${liveRate}req/s`} color="#00d4ff" pulse />
            </div>
            {simConfig.trafficPattern && (
              <div className="chip chip-cyan" style={{ marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                {simConfig.trafficPattern}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex: 1 }} />

      {/* ── Profile button ── */}
      {user && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfile(p => !p)}
            title="Profile"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: user.avatarDataUrl ? 'transparent'
                : 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(129,140,248,0.2))',
              border: `1.5px solid ${showProfile ? 'rgba(0,212,255,0.5)' : t.border2}`,
              cursor: 'pointer', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.15s',
              flexShrink: 0,
            }}
          >
            {user.avatarDataUrl ? (
              <img src={user.avatarDataUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 11, fontWeight: 800, color: '#00d4ff', fontFamily: 'var(--font-mono)' }}>
                {user.username.slice(0, 2).toUpperCase()}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                className="animate-dropdown"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  background: '#0c1018',
                  border: '1px solid var(--border2)',
                  borderRadius: 12, padding: 16, width: 268,
                  zIndex: 1000, boxShadow: '0 12px 48px rgba(0,0,0,0.85)',
                }}
              >
                {/* Avatar + info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload avatar"
                    style={{
                      width: 46, height: 46, borderRadius: '50%',
                      background: user.avatarDataUrl ? 'transparent'
                        : 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(129,140,248,0.15))',
                      border: '2px solid var(--border2)', cursor: 'pointer',
                      overflow: 'hidden', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {user.avatarDataUrl ? (
                      <img src={user.avatarDataUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#00d4ff', fontFamily: 'var(--font-mono)' }}>
                        {user.username.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => updateProfile({ avatarDataUrl: ev.target?.result as string });
                      reader.readAsDataURL(file);
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingUsername ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          value={newUsername}
                          onChange={e => setNewUsername(e.target.value)}
                          className="sf-input"
                          style={{ padding: '4px 8px', fontSize: 13 }}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              if (newUsername.trim()) updateProfile({ username: newUsername.trim() });
                              setEditingUsername(false);
                            }
                            if (e.key === 'Escape') setEditingUsername(false);
                          }}
                        />
                        <button
                          onClick={() => {
                            if (newUsername.trim()) updateProfile({ username: newUsername.trim() });
                            setEditingUsername(false);
                          }}
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                        >✓</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f4', fontFamily: 'var(--font-ui)' }}>
                          {user.username}
                        </span>
                        <button
                          onClick={() => { setNewUsername(user.username); setEditingUsername(true); }}
                          title="Edit username"
                          style={{
                            background: 'none', border: 'none', color: 'var(--text-muted)',
                            cursor: 'pointer', padding: 0, lineHeight: 1,
                            transition: 'color 0.12s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-sec)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.email}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', marginBottom: 12, paddingTop: 12 }}>
                  {isPremium ? (
                    <div className="chip chip-amber" style={{ width: '100%', justifyContent: 'center', padding: '8px', borderRadius: 8, marginBottom: 10 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2 20h20v-4H2v4zm2-14l5 5 3-6 3 6 5-5-2 10H4L2 6z"/>
                      </svg>
                      Premium Active
                    </div>
                  ) : (
                    <div style={{ marginBottom: 10 }}>
                      <label className="sf-label" style={{ marginBottom: 6 }}>Activation Code</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          value={activationCode}
                          onChange={e => { setActivationCode(e.target.value); setActivationMsg(''); }}
                          placeholder="Enter code…"
                          className="sf-input"
                          style={{ fontSize: 12, padding: '7px 10px' }}
                          onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(245,158,11,0.4)'; }}
                          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--border2)'; }}
                        />
                        <button
                          onClick={() => {
                            const ok = activatePremium(activationCode);
                            setActivationMsg(ok ? 'Activated!' : 'Invalid code');
                            if (ok) setActivationCode('');
                          }}
                          className="btn btn-ghost"
                          style={{ padding: '7px 11px', fontSize: 12, flexShrink: 0, borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b' }}
                        >
                          Activate
                        </button>
                      </div>
                      {activationMsg && (
                        <div style={{ fontSize: 11, color: activationMsg.includes('!') ? '#10b981' : '#ef4444', marginTop: 5, fontFamily: 'var(--font-ui)' }}>
                          {activationMsg}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    className="btn btn-danger"
                    onClick={() => { logout(); setShowProfile(false); router.replace('/login'); }}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Sign Out
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      if (window.confirm('This will clear all accounts, canvas data, and settings. Are you sure?')) {
                        resetAllData();
                      }
                    }}
                    style={{ width: '100%', justifyContent: 'center', fontSize: 12, color: 'var(--text-faint)' }}
                  >
                    Reset All Data
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Help button ── */}
      <div style={{ position: 'relative' }}>
        <button
          className="btn-icon btn"
          onClick={() => setShowHelp(h => !h)}
          title="Keyboard shortcuts"
          style={{ background: showHelp ? 'var(--cyan-dim)' : undefined, borderColor: showHelp ? 'rgba(0,212,255,0.3)' : undefined }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 8v1M9.5 10.5C9.5 9.12 10.62 8 12 8s2.5 1.12 2.5 2.5c0 1.5-2.5 3-2.5 3M12 17v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        <AnimatePresence>
          {showHelp && (
            <motion.div
              className="animate-dropdown"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 8,
                background: '#0c1018',
                border: '1px solid var(--border2)',
                borderRadius: 10, padding: '14px 16px',
                width: 280, zIndex: 1000,
                boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
              }}
            >
              <div style={{
                fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
                fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                Quick Reference
              </div>
              {[
                ['Drag palette items', 'Add nodes to canvas'],
                ['Connect handles', 'Draw edges between nodes'],
                ['Click node', 'Select & configure'],
                ['Delete key', 'Remove selected node/edge'],
                ['▶ Run', 'Start simulation'],
                ['Chaos Mode', 'Inject random failures (2.5×)'],
                ['Traffic patterns', 'Constant / Ramp / Spike / Wave'],
                ['Topology tab', 'Bottleneck & SPOF analysis'],
                ['Log tab', 'Live request trace'],
              ].map(([key, val]) => (
                <div key={key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-sec)', fontFamily: 'var(--font-ui)' }}>{key}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>{val}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

function HeaderChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="header-metric-label">{label}</div>
      <div className="header-metric-value" style={{ color }}>{value}</div>
    </div>
  );
}

function LiveMetric({ label, value, color, pulse }: {
  label: string; value: string; color: string; pulse?: boolean;
}) {
  return (
    <div className="header-metric">
      <div className="header-metric-label">{label}</div>
      <motion.div
        key={value}
        initial={{ opacity: 0.4 }}
        animate={pulse ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
        transition={pulse ? { duration: 1.2, repeat: Infinity } : {}}
        className="header-metric-value"
        style={{ color }}
      >
        {value}
      </motion.div>
    </div>
  );
}
