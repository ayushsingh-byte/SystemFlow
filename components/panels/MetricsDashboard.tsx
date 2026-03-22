'use client';

import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine,
} from 'recharts';
import { useStore } from '@/store/useStore';
import { motion } from 'framer-motion';
import { SystemHealthScore } from '@/simulation/types';

const TT_STYLE = {
  background: '#0a0f1a', border: '1px solid #1e2d3d',
  borderRadius: 6, padding: '6px 10px',
  fontSize: 11, fontFamily: 'monospace', color: '#e2eaf4',
};

const AXIS_TICK = { fontSize: 11, fill: '#4a5a6a', fontFamily: 'monospace' };

const GRADE_COLORS: Record<string, string> = {
  A: '#10b981',
  B: '#00d4ff',
  C: '#f59e0b',
  D: '#ef4444',
  F: '#dc2626',
};

function HealthScoreDisplay({ healthScore }: { healthScore: SystemHealthScore }) {
  const color = GRADE_COLORS[healthScore.grade] || '#8fa3b8';
  const nodes = useStore(s => s.nodes);

  const bottleneckNode = healthScore.bottleneck
    ? nodes.find(n => n.id === healthScore.bottleneck)
    : null;

  return (
    <div style={{
      background: '#080d16',
      border: `1px solid ${color}30`,
      borderRadius: 12,
      padding: '16px',
      marginBottom: 12,
      boxShadow: `0 0 20px ${color}15`,
    }}>
      {/* Grade + score row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <motion.div
          animate={{ boxShadow: [`0 0 0 ${color}00`, `0 0 18px ${color}40`, `0 0 0 ${color}00`] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            border: `3px solid ${color}`,
            background: `${color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 900, fontFamily: 'monospace',
            color,
            flexShrink: 0,
          }}
        >
          {healthScore.grade}
        </motion.div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: '#8fa3b8', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            System Health
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', color, lineHeight: 1 }}>
            {healthScore.score}
            <span style={{ fontSize: 15, color: '#8fa3b8', fontWeight: 400 }}>/100</span>
          </div>
          {bottleneckNode && (
            <div style={{
              marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5,
              background: '#ef444420', border: '1px solid #ef444440',
              borderRadius: 5, padding: '3px 8px',
            }}>
              <span style={{ fontSize: 12, color: '#ef4444', fontFamily: 'monospace', fontWeight: 700 }}>
                BOTTLENECK
              </span>
              <span style={{ fontSize: 12, color: '#fca5a5', fontFamily: 'monospace' }}>
                {bottleneckNode.data.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {healthScore.suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {healthScore.suggestions.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 7,
              background: '#0a0f1a', borderRadius: 6, padding: '6px 10px',
              border: '1px solid #141e2e',
            }}>
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>💡</span>
              <span style={{ fontSize: 12, color: '#8fa3b8', fontFamily: 'monospace', lineHeight: 1.5 }}>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MetricsDashboard() {
  const { metrics, simConfig } = useStore();
  const data = metrics.timeSeriesData;

  const statCards = useMemo(() => [
    {
      label: 'Avg Latency', value: `${Math.round(metrics.avgLatency)}`, unit: 'ms',
      sub: `P95: ${metrics.percentiles?.p95 ?? 0}ms`,
      color: '#3b82f6', icon: '⏱',
      bad: metrics.avgLatency > 500,
    },
    {
      label: 'P99 Latency', value: `${metrics.percentiles?.p99 ?? 0}`, unit: 'ms',
      sub: `P50: ${metrics.percentiles?.p50 ?? 0}ms`,
      color: '#8b5cf6', icon: '📊',
      bad: (metrics.percentiles?.p99 ?? 0) > 2000,
    },
    {
      label: 'Throughput', value: `${metrics.throughput.toFixed(1)}`, unit: '/s',
      sub: `${metrics.completedRequests} completed`,
      color: '#10b981', icon: '↑',
      bad: false,
    },
    {
      label: 'Error Rate', value: `${metrics.errorRate.toFixed(1)}`, unit: '%',
      sub: `${metrics.failedRequests} failures`,
      color: metrics.errorRate > 10 ? '#ef4444' : metrics.errorRate > 5 ? '#f59e0b' : '#10b981',
      icon: '⚠',
      bad: metrics.errorRate > 10,
    },
  ], [metrics]);

  return (
    <div style={{ padding: '14px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Health Score — always visible */}
      <HealthScoreDisplay healthScore={metrics.healthScore} />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {statCards.map((c) => (
          <motion.div
            key={c.label}
            style={{
              background: '#080d16',
              border: `1px solid ${c.color}25`,
              borderRadius: 10, padding: '12px 14px',
            }}
            animate={{
              boxShadow: c.bad
                ? [`0 0 0 ${c.color}00`, `0 0 14px ${c.color}30`, `0 0 0 ${c.color}00`]
                : `0 0 0 ${c.color}00`,
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: 14 }}>{c.icon}</span>
              <span style={{ fontSize: 13, color: '#8fa3b8', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {c.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <motion.span
                key={c.value}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ fontSize: 22, fontWeight: 800, color: c.color, fontFamily: 'monospace' }}
              >
                {c.value}
              </motion.span>
              <span style={{ fontSize: 12, color: c.color, fontFamily: 'monospace', opacity: 0.7 }}>{c.unit}</span>
            </div>
            <div style={{ fontSize: 12, color: '#4a5a6a', fontFamily: 'monospace', marginTop: 2 }}>{c.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Latency chart */}
      <ChartCard title="Latency Percentiles (ms)">
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid stroke="#141e2e" strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip contentStyle={TT_STYLE} labelStyle={{ color: '#8fa3b8', fontFamily: 'monospace' }} />
            <Line type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2} dot={false} name="Avg" isAnimationActive={false} />
            <Line type="monotone" dataKey="p95" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="P95" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Throughput + Error */}
      <ChartCard title="Throughput & Error Rate">
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="tpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#141e2e" strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip contentStyle={TT_STYLE} labelStyle={{ color: '#8fa3b8', fontFamily: 'monospace' }} />
            <Area type="monotone" dataKey="throughput" stroke="#10b981" strokeWidth={2} fill="url(#tpGrad)" dot={false} name="Throughput" isAnimationActive={false} />
            <Area type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={2} fill="url(#errGrad)" dot={false} name="Err%" isAnimationActive={false} />
            <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'SLA', fill: '#f59e0b', fontSize: 11, fontFamily: 'monospace' }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Active requests */}
      <ChartCard title="Active In-Flight Requests">
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#141e2e" strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip contentStyle={TT_STYLE} formatter={(v) => [v, 'Active']} labelStyle={{ color: '#8fa3b8', fontFamily: 'monospace' }} />
            <Area type="monotone" dataKey="activeRequests" stroke="#f59e0b" strokeWidth={2} fill="url(#activeGrad)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Request funnel */}
      <div style={{
        background: '#080d16', border: '1px solid #141e2e',
        borderRadius: 10, padding: '12px 14px',
      }}>
        <div style={{ fontSize: 13, color: '#8fa3b8', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Request Funnel
        </div>
        <FunnelBar label="Total" value={metrics.totalRequests} max={metrics.totalRequests} color="#8b5cf6" />
        <FunnelBar label="Success" value={metrics.completedRequests} max={metrics.totalRequests} color="#10b981" />
        <FunnelBar label="Failed" value={metrics.failedRequests} max={metrics.totalRequests} color="#ef4444" />
        <FunnelBar
          label="In-flight"
          value={Math.max(0, metrics.totalRequests - metrics.completedRequests - metrics.failedRequests)}
          max={metrics.totalRequests} color="#f59e0b"
        />
      </div>

      {/* Traffic pattern indicator */}
      <div style={{
        background: '#080d16', border: '1px solid #141e2e',
        borderRadius: 10, padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ fontSize: 13, color: '#8fa3b8', fontFamily: 'monospace', textTransform: 'uppercase' }}>Pattern:</div>
        <div style={{
          padding: '3px 10px', background: '#00d4ff10', border: '1px solid #00d4ff30',
          borderRadius: 5, fontSize: 13, color: '#00d4ff', fontFamily: 'monospace', fontWeight: 700,
        }}>
          {simConfig.trafficPattern.toUpperCase()}
        </div>
        <div style={{ fontSize: 13, color: '#4a5a6a', fontFamily: 'monospace' }}>
          {simConfig.running ? `@${simConfig.trafficRate}req/s` : 'stopped'}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#080d16', border: '1px solid #141e2e',
      borderRadius: 10, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 13, color: '#8fa3b8', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function FunnelBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 13, color: '#8fa3b8', fontFamily: 'monospace' }}>{label}</span>
        <span style={{ fontSize: 13, color, fontFamily: 'monospace', fontWeight: 700 }}>
          {value} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div style={{ height: 6, background: '#141e2e', borderRadius: 3, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
          style={{ height: '100%', background: color, borderRadius: 3 }}
        />
      </div>
    </div>
  );
}
