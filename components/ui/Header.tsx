'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useSimulation } from '@/hooks/useSimulation';
import { useUIStore } from '@/store/uiStore';
import { THEMES } from '@/utils/theme';

export default function Header() {
  const { simConfig, metrics, nodes, edges } = useStore();
  const { running, paused } = simConfig;
  const [showHelp, setShowHelp] = useState(false);
  const { theme, toggleTheme } = useUIStore();
  const t = THEMES[theme];

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

      {/* Theme toggle button */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
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
        {theme === 'dark' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2"/>
          </svg>
        )}
      </button>

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
