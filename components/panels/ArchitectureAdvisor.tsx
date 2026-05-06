'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useUIStore } from '@/store/uiStore';
import { THEMES } from '@/utils/theme';
import type { NodeData } from '@/simulation/types';
import type { Node, Edge } from 'reactflow';

import {
  analyzeArchitecture,
  countType,
  COMPUTE_TYPES, DB_TYPES, LB_TYPES, CDN_TYPES, QUEUE_TYPES, MONITOR_TYPES
} from '@/utils/scoring';

// ─── Score Gauge ─────────────────────────────────────────────────────────────

function ScoreGauge({ score, grade, t }: { score: number; grade: string; t: typeof THEMES.dark }) {
  const size = 100;
  const r = 38;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * r;
  const pct = score / 100;
  const dashOffset = circumference * (1 - pct * 0.75); // 270 deg arc
  const dashArray = `${circumference * 0.75} ${circumference * 0.25}`;

  const color = score >= 80 ? '#10b981' :
    score >= 60 ? '#f59e0b' :
    score >= 40 ? '#ef4444' : '#7c3aed';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox="0 0 100 100">
          {/* Background arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={t.border2}
            strokeWidth="8"
            strokeDasharray={dashArray}
            strokeDashoffset={`${circumference * 0.25}`}
            strokeLinecap="round"
            transform="rotate(135 50 50)"
          />
          {/* Score arc */}
          <motion.circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={dashArray}
            initial={{ strokeDashoffset: circumference * 0.75 }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            strokeLinecap="round"
            transform="rotate(135 50 50)"
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: 'monospace', lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 10, color: t.textMuted, fontFamily: 'monospace' }}>/ 100</div>
        </div>
      </div>
      <div>
        <div style={{
          fontSize: 32, fontWeight: 900, color, fontFamily: 'monospace', lineHeight: 1,
          textShadow: `0 0 20px ${color}50`,
        }}>
          {grade}
        </div>
        <div style={{ fontSize: 10, color: t.textMuted, fontFamily: 'monospace', marginTop: 2 }}>
          Architecture Grade
        </div>
        <div style={{ fontSize: 9, color: t.textMuted, fontFamily: 'monospace', marginTop: 4, lineHeight: 1.6 }}>
          {score >= 80 ? 'Production Ready' :
           score >= 60 ? 'Needs Improvement' :
           score >= 40 ? 'Not Production Ready' : 'Prototype Only'}
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArchitectureAdvisor() {
  const { nodes, edges } = useStore();
  const { theme } = useUIStore();
  const t = THEMES[theme];

  const analysis = useMemo(
    () => analyzeArchitecture(nodes, edges),
    [nodes, edges]
  );

  const severityColor = (s: string) =>
    s === 'critical' ? '#ef4444' :
    s === 'warning' ? '#f59e0b' : '#10b981';

  const severityIcon = (s: string) =>
    s === 'critical' ? '✕' :
    s === 'warning' ? '!' : '✓';

  if (nodes.length === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: t.surface, padding: 32, gap: 12,
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" opacity={0.3}>
          <circle cx="12" cy="9" r="4" stroke={t.textSecondary} strokeWidth="1.5"/>
          <path d="M8 17 Q8 21 12 21 Q16 21 16 17" stroke={t.textSecondary} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        </svg>
        <div style={{ fontSize: 13, color: t.textMuted, fontFamily: 'monospace', textAlign: 'center', lineHeight: 1.8 }}>
          Add nodes to your canvas<br/>to analyze your architecture
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%', overflowY: 'auto',
      background: t.surface,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: `1px solid ${t.border}`,
        background: t.surface2,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, fontFamily: 'monospace', marginBottom: 2 }}>
          Architecture Advisor
        </div>
        <div style={{ fontSize: 10, color: t.textMuted, fontFamily: 'monospace' }}>
          Real-time analysis of {nodes.length} nodes, {edges.length} connections
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Score gauge */}
        <div style={{
          background: t.surface2, border: `1px solid ${t.border}`,
          borderRadius: 10, padding: '16px',
        }}>
          <ScoreGauge score={analysis.score} grade={analysis.grade} t={t} />
        </div>

        {/* Issues */}
        <div>
          <div style={{
            fontSize: 10, color: t.textMuted, fontFamily: 'monospace',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 8,
          }}>
            Architecture Checklist
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {analysis.issues.map((issue, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '7px 10px',
                  background: `${severityColor(issue.severity)}10`,
                  border: `1px solid ${severityColor(issue.severity)}25`,
                  borderRadius: 7,
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  background: `${severityColor(issue.severity)}20`,
                  border: `1px solid ${severityColor(issue.severity)}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, color: severityColor(issue.severity), fontWeight: 900,
                }}>
                  {severityIcon(issue.severity)}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: severityColor(issue.severity), fontFamily: 'monospace', fontWeight: 700 }}>
                    {issue.message}
                  </div>
                  {issue.detail && (
                    <div style={{ fontSize: 9, color: t.textMuted, fontFamily: 'monospace', marginTop: 1, lineHeight: 1.5 }}>
                      {issue.detail}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Improvements */}
        {analysis.improvements.length > 0 && (
          <div>
            <div style={{
              fontSize: 10, color: t.textMuted, fontFamily: 'monospace',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              marginBottom: 8,
            }}>
              Recommendations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {analysis.improvements.map((imp, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '6px 10px',
                  background: t.surface2, border: `1px solid ${t.border}`,
                  borderRadius: 6,
                }}>
                  <span style={{ color: t.accent, fontSize: 10, flexShrink: 0, marginTop: 1 }}>→</span>
                  <span style={{ fontSize: 10, color: t.textSecondary, fontFamily: 'monospace', lineHeight: 1.5 }}>{imp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLA Calculator */}
        <div style={{
          background: t.surface2, border: `1px solid ${t.border}`,
          borderRadius: 10, padding: 14,
        }}>
          <div style={{
            fontSize: 10, color: t.textMuted, fontFamily: 'monospace',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 10,
          }}>
            Theoretical SLA
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: t.accent, fontFamily: 'monospace' }}>
              {analysis.slaEstimate.percent.toFixed(2)}%
            </span>
            <span style={{ fontSize: 10, color: t.textMuted, fontFamily: 'monospace' }}>uptime</span>
          </div>
          <div style={{
            fontSize: 11, color: t.textSecondary, fontFamily: 'monospace',
            padding: '4px 8px', background: `${t.accent}10`, borderRadius: 4,
            display: 'inline-block', marginBottom: 6,
          }}>
            {analysis.slaEstimate.label}
          </div>
          <div style={{ fontSize: 9, color: t.textMuted, fontFamily: 'monospace', lineHeight: 1.6, marginTop: 4 }}>
            Based on node failure rates in a serial dependency chain.
            Reduce individual failure_rate settings to improve SLA.
          </div>
          {/* SLA bar */}
          <div style={{ marginTop: 8, height: 4, background: t.border2, borderRadius: 2, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${analysis.slaEstimate.percent}%` }}
              transition={{ duration: 0.8 }}
              style={{ height: '100%', background: t.accent, borderRadius: 2 }}
            />
          </div>
        </div>

        {/* Cost Estimator */}
        <div style={{
          background: t.surface2, border: `1px solid ${t.border}`,
          borderRadius: 10, padding: 14,
        }}>
          <div style={{
            fontSize: 10, color: t.textMuted, fontFamily: 'monospace',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 10,
          }}>
            Cost Estimate (AWS)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>
              ~${analysis.costEstimate.toLocaleString()}
            </span>
            <span style={{ fontSize: 10, color: t.textMuted, fontFamily: 'monospace' }}>/month</span>
          </div>
          <div style={{ fontSize: 9, color: t.textMuted, fontFamily: 'monospace', lineHeight: 1.6, marginTop: 6 }}>
            Rough estimate based on node types and capacity settings.
            Actual costs vary by region, usage, and reserved instance pricing.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
            {[
              { label: 'Compute', count: countType(nodes, COMPUTE_TYPES), rate: 75 },
              { label: 'Databases', count: countType(nodes, DB_TYPES), rate: 150 },
              { label: 'Networking', count: countType(nodes, LB_TYPES) + countType(nodes, CDN_TYPES), rate: 20 },
              { label: 'Queues', count: countType(nodes, QUEUE_TYPES), rate: 40 },
              { label: 'Monitoring', count: countType(nodes, MONITOR_TYPES), rate: 30 },
            ].filter(r => r.count > 0).map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: t.textSecondary, fontFamily: 'monospace' }}>
                  {row.label} ×{row.count}
                </span>
                <span style={{ fontSize: 9, color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>
                  ~${(row.count * row.rate).toLocaleString()}/mo
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
