'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useUIStore } from '@/store/uiStore';
import { THEMES } from '@/utils/theme';
import type { NodeData } from '@/simulation/types';
import type { Node, Edge } from 'reactflow';

// ─── Scoring Logic ────────────────────────────────────────────────────────────

interface Issue {
  severity: 'critical' | 'warning' | 'good';
  message: string;
  detail?: string;
}

interface HealthAnalysis {
  score: number;
  grade: string;
  issues: Issue[];
  improvements: string[];
  slaEstimate: { percent: number; nines: number; label: string };
  costEstimate: number;
}

const CDN_TYPES = new Set(['cdn', 'aws-cloudfront', 'edge-function', 'cdn-storage']);
const LB_TYPES = new Set(['load-balancer', 'aws-alb', 'ingress', 'traffic-router']);
const CB_TYPES = new Set(['circuit-breaker']);
const CACHE_TYPES = new Set(['redis', 'cache', 'aws-elasticache']);
const QUEUE_TYPES = new Set(['kafka', 'rabbitmq', 'queue', 'broker', 'aws-sqs', 'event-bus']);
const MONITOR_TYPES = new Set(['prometheus', 'grafana', 'datadog', 'elk-stack', 'health-check', 'alert-manager']);
const DB_TYPES = new Set(['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'neo4j', 'influxdb', 'clickhouse', 'cockroachdb', 'supabase', 'cassandra', 'database', 'aws-rds']);
const RATELIMIT_TYPES = new Set(['rate-limiter', 'aws-api-gateway', 'api-gateway']);
const WAF_TYPES = new Set(['waf', 'firewall', 'app-waf', 'network-firewall', 'ddos-scrubber']);
const COMPUTE_TYPES = new Set(['microservice', 'backend', 'serverless', 'worker', 'aws-lambda', 'aws-ec2', 'aws-ecs', 'container', 'kubernetes-pod', 'vm']);

function getNodeTypes(nodes: Node<NodeData>[]) {
  const types = new Set(nodes.map(n => n.data?.nodeType ?? ''));
  return types;
}

function hasAny(types: Set<string>, check: Set<string>) {
  for (const t of types) {
    if (check.has(t)) return true;
  }
  return false;
}

function countType(nodes: Node<NodeData>[], check: Set<string>): number {
  return nodes.filter(n => check.has(n.data?.nodeType ?? '')).length;
}

function findSPOF(nodes: Node<NodeData>[], edges: Edge[]): string[] {
  // Nodes with many dependencies but no redundancy (simplified check)
  const inDegree: Record<string, number> = {};
  const outDegree: Record<string, number> = {};
  for (const n of nodes) {
    inDegree[n.id] = 0;
    outDegree[n.id] = 0;
  }
  for (const e of edges) {
    if (e.target in inDegree) inDegree[e.target]++;
    if (e.source in outDegree) outDegree[e.source]++;
  }
  // A node is potentially SPOF if many others depend on it
  const spofs: string[] = [];
  for (const n of nodes) {
    if (inDegree[n.id] >= 3 && !LB_TYPES.has(n.data?.nodeType ?? '')) {
      spofs.push(n.data?.label ?? n.id);
    }
  }
  return spofs;
}

function calcSLA(nodes: Node<NodeData>[]): { percent: number; nines: number; label: string } {
  // Each node availability derived from failure_rate
  let availability = 1.0;
  for (const n of nodes) {
    const fr = n.data?.failure_rate ?? 0; // 0-100 percent
    const nodeAvail = fr === 0 ? 0.9999 : Math.max(0, 1 - fr / 100);
    availability *= nodeAvail;
  }
  const pct = Math.max(0, Math.min(100, availability * 100));
  // Count 9s
  const ninesStr = pct.toFixed(4);
  let nines = 0;
  const afterDecimal = ninesStr.split('.')[1] || '';
  // e.g. 99.99 → 4 nines (2 before decimal + 2 after)
  if (pct >= 99) {
    nines = 2;
    let rem = afterDecimal;
    while (rem.startsWith('9')) {
      nines++;
      rem = rem.slice(1);
    }
  } else if (pct >= 90) {
    nines = 1;
  } else {
    nines = 0;
  }

  const label = nines === 0 ? 'No SLA' :
    nines === 1 ? '1 nine (90%)' :
    nines === 2 ? '2 nines (99%)' :
    nines === 3 ? '3 nines (99.9%)' :
    nines === 4 ? '4 nines (99.99%)' : '5 nines (99.999%)';

  return { percent: pct, nines, label };
}

function estimateCost(nodes: Node<NodeData>[]): number {
  let total = 0;
  for (const n of nodes) {
    const nt = n.data?.nodeType ?? '';
    const cap = n.data?.max_capacity ?? 100;
    const scaleFactor = Math.max(1, cap / 100);

    if (COMPUTE_TYPES.has(nt)) {
      total += Math.round(50 + scaleFactor * 50); // $50-200
    } else if (DB_TYPES.has(nt)) {
      total += Math.round(100 + scaleFactor * 100); // $100-500
    } else if (CDN_TYPES.has(nt)) {
      total += 20;
    } else if (LB_TYPES.has(nt)) {
      total += 20;
    } else if (QUEUE_TYPES.has(nt)) {
      total += 40;
    } else if (MONITOR_TYPES.has(nt)) {
      total += 30;
    } else {
      total += 15;
    }
  }
  return total;
}

function analyzeArchitecture(nodes: Node<NodeData>[], edges: Edge[]): HealthAnalysis {
  const types = getNodeTypes(nodes);
  const issues: Issue[] = [];
  const improvements: string[] = [];
  let score = 0;

  const hasCDN = hasAny(types, CDN_TYPES);
  const hasLB = hasAny(types, LB_TYPES);
  const hasCB = hasAny(types, CB_TYPES);
  const hasCache = hasAny(types, CACHE_TYPES);
  const hasQueue = hasAny(types, QUEUE_TYPES);
  const hasMonitor = hasAny(types, MONITOR_TYPES);
  const hasRateLimit = hasAny(types, RATELIMIT_TYPES);
  const hasWAF = hasAny(types, WAF_TYPES);
  const dbCount = countType(nodes, DB_TYPES);

  if (hasCDN) {
    score += 10;
    issues.push({ severity: 'good', message: 'CDN detected', detail: 'Reduces latency for global users' });
  } else {
    issues.push({ severity: 'warning', message: 'No CDN detected', detail: 'Add CloudFront or Fastly to reduce latency by 60-80%' });
    improvements.push('Add a CDN (CloudFront, Fastly) to cache static assets at edge locations');
  }

  if (hasLB) {
    score += 10;
    issues.push({ severity: 'good', message: 'Load balancer present', detail: 'Enables horizontal scaling' });
  } else {
    issues.push({ severity: 'critical', message: 'No load balancer', detail: 'Single endpoint is a reliability risk — add ALB or Nginx' });
    improvements.push('Add a load balancer (AWS ALB, Nginx) to distribute traffic and enable zero-downtime deploys');
  }

  if (hasCB) {
    score += 10;
    issues.push({ severity: 'good', message: 'Circuit breaker present', detail: 'Prevents cascade failures' });
  } else {
    if (nodes.length >= 3) {
      issues.push({ severity: 'warning', message: 'No circuit breaker', detail: 'Add circuit breakers to prevent cascade failures between services' });
      improvements.push('Implement circuit breakers (Hystrix, Resilience4j) to stop cascade failures');
    }
  }

  if (hasCache) {
    score += 10;
    issues.push({ severity: 'good', message: 'Cache layer present', detail: 'Redis/ElastiCache reduces DB load' });
  } else if (dbCount > 0) {
    issues.push({ severity: 'warning', message: 'No cache layer', detail: 'Add Redis to reduce database pressure and improve latency' });
    improvements.push('Add Redis cache to reduce DB load by 80-90% for read-heavy workloads');
  }

  if (hasQueue) {
    score += 10;
    issues.push({ severity: 'good', message: 'Message queue present', detail: 'Enables async processing and decoupling' });
  } else if (nodes.length >= 4) {
    issues.push({ severity: 'warning', message: 'No message queue', detail: 'Consider Kafka or RabbitMQ for async workloads' });
    improvements.push('Add a message queue (Kafka, RabbitMQ) for async processing and decoupling services');
  }

  // SPOF check
  const spofs = findSPOF(nodes, edges);
  if (spofs.length === 0) {
    score += 10;
    if (nodes.length > 2) {
      issues.push({ severity: 'good', message: 'No obvious SPOFs detected' });
    }
  } else {
    issues.push({ severity: 'critical', message: `Potential SPOF: ${spofs.slice(0, 2).join(', ')}`, detail: 'These nodes have 3+ dependencies — consider redundancy' });
    improvements.push(`Add redundancy for high-dependency nodes: ${spofs.slice(0,2).join(', ')}`);
  }

  if (hasMonitor) {
    score += 10;
    issues.push({ severity: 'good', message: 'Observability stack present', detail: 'Monitoring, alerting and metrics configured' });
  } else if (nodes.length >= 3) {
    issues.push({ severity: 'warning', message: 'No monitoring/observability', detail: 'Add Prometheus + Grafana or Datadog for production readiness' });
    improvements.push('Add monitoring (Prometheus + Grafana, Datadog) — you cannot fix what you cannot see');
  }

  if (dbCount >= 2) {
    score += 10;
    issues.push({ severity: 'good', message: 'Multiple database instances', detail: 'Enables replication and read scalability' });
  } else if (dbCount === 1) {
    issues.push({ severity: 'warning', message: 'Single database instance', detail: 'Add read replicas or multi-AZ for high availability' });
    improvements.push('Add read replicas to your database for read scalability and HA');
  }

  if (hasRateLimit) {
    score += 5;
    issues.push({ severity: 'good', message: 'Rate limiting present' });
  } else {
    improvements.push('Add rate limiting (API Gateway, nginx rate limit) to protect against abuse');
  }

  if (hasWAF) {
    score += 5;
    issues.push({ severity: 'good', message: 'WAF / security layer present' });
  } else {
    improvements.push('Add WAF protection to guard against SQL injection, XSS, and DDoS attacks');
  }

  const grade = score >= 90 ? 'A+' :
    score >= 80 ? 'A' :
    score >= 70 ? 'B' :
    score >= 60 ? 'C' :
    score >= 40 ? 'D' : 'F';

  const slaEstimate = calcSLA(nodes);
  const costEstimate = estimateCost(nodes);

  return { score, grade, issues, improvements, slaEstimate, costEstimate };
}

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
