'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { useSimulation } from '@/hooks/useSimulation';
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
      padding: '0 20px',
      gap: 14,
      flexShrink: 0,
      position: 'relative',
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <motion.div
          animate={running && !paused ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 3, repeat: running && !paused ? Infinity : 0, ease: 'linear' }}
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'linear-gradient(135deg, #00d4ff20, #7b2ff720)',
            border: '1px solid #00d4ff50',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L21.5 7.5v9L12 22l-9.5-5.5v-9L12 2z" stroke="#00d4ff" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M12 8L17 11v6l-5 3-5-3v-6l5-3z" fill="#00d4ff20" stroke="#00d4ff80" strokeWidth="1" strokeLinejoin="round"/>
          </svg>
        </motion.div>
        <div>
          <div style={{
            fontSize: 14, fontWeight: 800, fontFamily: 'monospace',
            letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            <span style={{ color: t.textPrimary }}>Infra</span>
            <span style={{ color: t.accent }}>Flow</span>
          </div>
          <div style={{ fontSize: 8, color: t.textMuted, fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Design & Simulate
          </div>
        </div>
      </div>

      <Div />

      {/* Canvas summary */}
      <div style={{ display: 'flex', gap: 12 }}>
        <HeaderChip label="Nodes" value={String(nodes.length)} color="#8b5cf6" />
        <HeaderChip label="Edges" value={String(edges.length)} color="#3b82f6" />
      </div>

      <Div />

      {/* Live metrics bar — only when running */}
      <AnimatePresence>
        {running && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            style={{ display: 'flex', gap: 14, overflow: 'hidden' }}
          >
            <LiveMetric label="LATENCY" value={`${Math.round(metrics.avgLatency)}ms`} color="#3b82f6" />
            <LiveMetric label="P95" value={`${metrics.percentiles?.p95 ?? 0}ms`} color="#8b5cf6" />
            <LiveMetric label="THRUPUT" value={`${metrics.throughput.toFixed(1)}/s`} color="#10b981" />
            <LiveMetric label="ERR%" value={`${metrics.errorRate.toFixed(1)}%`} color={metrics.errorRate > 5 ? '#ef4444' : '#10b981'} />
            <LiveMetric label="RATE" value={`${liveRate}req/s`} color="#00d4ff" pulse />
          </motion.div>
        )}
      </AnimatePresence>

      {running && <Div />}

      <div style={{ flex: 1 }} />

      {/* Pattern badge */}
      {running && (
        <div style={{
          padding: '3px 10px',
          background: '#00d4ff10', border: '1px solid #00d4ff30',
          borderRadius: 4, fontSize: 9, color: '#00d4ff',
          fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {simConfig.trafficPattern}
        </div>
      )}

      {/* Profile button */}
      {user && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfile(p => !p)}
            title="Profile"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: user.avatarDataUrl ? 'transparent' : 'linear-gradient(135deg, #00d4ff30, #8b5cf630)',
              border: `1px solid ${showProfile ? '#00d4ff80' : t.border2}`,
              cursor: 'pointer', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.15s',
              flexShrink: 0,
            }}
          >
            {user.avatarDataUrl ? (
              <img src={user.avatarDataUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 12, fontWeight: 800, color: '#00d4ff', fontFamily: 'monospace' }}>
                {user.username.slice(0, 2).toUpperCase()}
              </span>
            )}
          </button>

          {/* Profile dropdown */}
          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  background: '#080d14', border: '1px solid #1e2d3d',
                  borderRadius: 12, padding: 16, width: 260,
                  zIndex: 1000, boxShadow: '0 8px 40px #00000090',
                }}
              >
                {/* Avatar + username */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload avatar"
                    style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: user.avatarDataUrl ? 'transparent' : 'linear-gradient(135deg, #00d4ff20, #8b5cf620)',
                      border: '2px solid #1e2d3d', cursor: 'pointer',
                      overflow: 'hidden', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {user.avatarDataUrl ? (
                      <img src={user.avatarDataUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#00d4ff', fontFamily: 'monospace' }}>
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
                      reader.onload = (ev) => {
                        const dataUrl = ev.target?.result as string;
                        updateProfile({ avatarDataUrl: dataUrl });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingUsername ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          value={newUsername}
                          onChange={e => setNewUsername(e.target.value)}
                          style={{
                            flex: 1, background: '#050811', border: '1px solid #00d4ff50',
                            borderRadius: 4, padding: '3px 6px', color: '#e2eaf4',
                            fontSize: 13, fontFamily: 'monospace', outline: 'none',
                          }}
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
                          style={{ background: '#00d4ff20', border: '1px solid #00d4ff50', borderRadius: 4, color: '#00d4ff', cursor: 'pointer', padding: '2px 6px', fontSize: 11 }}
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#e2eaf4', fontFamily: 'monospace' }}>{user.username}</span>
                        <button
                          onClick={() => { setNewUsername(user.username); setEditingUsername(true); }}
                          style={{ background: 'none', border: 'none', color: '#636e7b', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                          title="Edit username"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#4a5a6a', fontFamily: 'monospace', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.email}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #1e2d3d', marginBottom: 12, paddingTop: 12 }}>
                  {/* Premium section */}
                  {isPremium ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: '#f59e0b10', border: '1px solid #f59e0b30',
                      borderRadius: 8, padding: '8px 10px', marginBottom: 10,
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b">
                        <path d="M2 20h20v-4H2v4zm2-14l5 5 3-6 3 6 5-5-2 10H4L2 6z"/>
                      </svg>
                      <span style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'monospace', fontWeight: 700 }}>Premium Active</span>
                    </div>
                  ) : (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: '#636e7b', fontFamily: 'monospace', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Activation Code
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          value={activationCode}
                          onChange={e => { setActivationCode(e.target.value); setActivationMsg(''); }}
                          placeholder="Enter code..."
                          style={{
                            flex: 1, background: '#050811', border: '1px solid #1e2d3d',
                            borderRadius: 6, padding: '6px 8px', color: '#e2eaf4',
                            fontSize: 12, fontFamily: 'monospace', outline: 'none',
                          }}
                          onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#f59e0b50'; }}
                          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#1e2d3d'; }}
                        />
                        <button
                          onClick={() => {
                            const ok = activatePremium(activationCode);
                            setActivationMsg(ok ? 'Premium activated!' : 'Invalid code');
                            if (ok) setActivationCode('');
                          }}
                          style={{
                            background: '#f59e0b20', border: '1px solid #f59e0b50',
                            borderRadius: 6, color: '#f59e0b', cursor: 'pointer',
                            padding: '6px 10px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                          }}
                        >
                          Activate
                        </button>
                      </div>
                      {activationMsg && (
                        <div style={{ fontSize: 11, color: activationMsg.includes('!') ? '#10b981' : '#ef4444', marginTop: 4, fontFamily: 'monospace' }}>
                          {activationMsg}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sign out */}
                <button
                  onClick={() => {
                    logout();
                    setShowProfile(false);
                    router.replace('/login');
                  }}
                  style={{
                    width: '100%', background: '#ef444415', border: '1px solid #ef444430',
                    borderRadius: 8, padding: '8px 0', color: '#ef4444',
                    fontSize: 13, fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.12s', marginBottom: 6,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ef444425'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ef444415'; }}
                >
                  Sign Out
                </button>

                {/* Reset all data */}
                <button
                  onClick={() => {
                    if (window.confirm('This will clear all accounts, canvas data, and settings. Are you sure?')) {
                      resetAllData();
                    }
                  }}
                  style={{
                    width: '100%', background: 'transparent', border: '1px solid #1e2d3d',
                    borderRadius: 8, padding: '6px 0', color: '#3a4a5a',
                    fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#636e7b'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3a4a5a'; }}
                >
                  Reset All Data
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Help button */}
      <button
        onClick={() => setShowHelp(h => !h)}
        style={{
          width: 28, height: 28, borderRadius: 6,
          background: t.border, border: `1px solid ${t.border2}`,
          color: t.textSecondary, fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.12s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = `${t.accent}50`;
          (e.currentTarget as HTMLElement).style.color = t.accent;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = t.border2;
          (e.currentTarget as HTMLElement).style.color = t.textSecondary;
        }}
      >
        ?
      </button>

      {/* Help dropdown */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              position: 'absolute', top: 54, right: 16,
              background: t.surface, border: `1px solid ${t.border2}`,
              borderRadius: 10, padding: '14px 16px',
              width: 260, zIndex: 1000,
              boxShadow: '0 8px 32px #00000090',
            }}
          >
            <div style={{ fontSize: 11, color: t.textMuted, fontFamily: 'monospace', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
                display: 'flex', justifyContent: 'space-between',
                padding: '4px 0', borderBottom: `1px solid ${t.border}`,
              }}>
                <span style={{ fontSize: 10, color: t.textSecondary, fontFamily: 'monospace' }}>{key}</span>
                <span style={{ fontSize: 10, color: t.textMuted, fontFamily: 'monospace' }}>{val}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Div() {
  // Note: accesses theme from a closure - we use a stable color for separators
  return <div style={{ width: 1, height: 28, background: '#1e2d3d', flexShrink: 0 }} />;
}

function HeaderChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#636e7b', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ fontSize: 14, color, fontFamily: 'monospace', fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function LiveMetric({ label, value, color, pulse }: {
  label: string; value: string; color: string; pulse?: boolean;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#636e7b', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <motion.div
        key={value}
        initial={{ opacity: 0.4 }}
        animate={pulse ? { opacity: [1, 0.6, 1] } : { opacity: 1 }}
        transition={pulse ? { duration: 1, repeat: Infinity } : {}}
        style={{ fontSize: 13, color, fontFamily: 'monospace', fontWeight: 700 }}
      >
        {value}
      </motion.div>
    </div>
  );
}
