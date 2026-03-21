'use client';

import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { getNodeConfig } from '@/utils/nodeRegistry';

interface TopoAnalysis {
  nodeCount: number;
  edgeCount: number;
  userNodes: string[];
  leafNodes: string[];
  singlePoints: string[];    // nodes with only one path through them
  maxDepth: number;
  avgFanout: number;
  bottlenecks: string[];     // low capacity nodes with high connectivity
}

function analyzeTopology(
  nodes: { id: string; data: { nodeType: string; max_capacity: number; label: string } }[],
  edges: { source: string; target: string }[]
): TopoAnalysis {
  const outDeg = new Map<string, number>();
  const inDeg = new Map<string, number>();

  for (const n of nodes) { outDeg.set(n.id, 0); inDeg.set(n.id, 0); }
  for (const e of edges) {
    outDeg.set(e.source, (outDeg.get(e.source) || 0) + 1);
    inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
  }

  const userNodes = nodes.filter(n => n.data.nodeType === 'user').map(n => n.id);
  const leafNodes = nodes
    .filter(n => (outDeg.get(n.id) || 0) === 0 && n.data.nodeType !== 'user')
    .map(n => n.id);

  // Simple bottleneck: low capacity with multiple inbound edges
  const bottlenecks = nodes
    .filter(n => {
      const cap = n.data.max_capacity;
      const deg = (inDeg.get(n.id) || 0) + (outDeg.get(n.id) || 0);
      return cap < 150 && deg >= 2 && n.data.nodeType !== 'user';
    })
    .map(n => n.id);

  // Single points of failure: nodes where all paths must go through
  const singlePoints = nodes
    .filter(n => (inDeg.get(n.id) || 0) >= 2 && (outDeg.get(n.id) || 0) >= 1 && n.data.nodeType !== 'user')
    .map(n => n.id);

  const totalOut = Array.from(outDeg.values()).reduce((a, b) => a + b, 0);
  const avgFanout = nodes.length > 0 ? totalOut / nodes.length : 0;

  // Simple BFS depth
  let maxDepth = 0;
  for (const start of userNodes) {
    const visited = new Set<string>();
    const queue: [string, number][] = [[start, 0]];
    while (queue.length) {
      const [cur, d] = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      maxDepth = Math.max(maxDepth, d);
      const nexts = edges.filter(e => e.source === cur).map(e => e.target);
      for (const n of nexts) queue.push([n, d + 1]);
    }
  }

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    userNodes, leafNodes, singlePoints,
    maxDepth, avgFanout: Math.round(avgFanout * 10) / 10,
    bottlenecks,
  };
}

export default function TopologyPanel() {
  const { nodes, edges, metrics } = useStore();

  const analysis = useMemo(
    () => analyzeTopology(nodes, edges),
    [nodes, edges]
  );

  const getLabel = (id: string) => nodes.find(n => n.id === id)?.data.label ?? id;
  const getType = (id: string) => nodes.find(n => n.id === id)?.data.nodeType ?? 'backend';

  return (
    <div style={{ padding: '12px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Topology stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6,
      }}>
        {[
          { label: 'Nodes', value: analysis.nodeCount, icon: '⬡' },
          { label: 'Edges', value: analysis.edgeCount, icon: '→' },
          { label: 'Depth', value: analysis.maxDepth, icon: '↓' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#0d1117', border: '1px solid #1e2d3d',
            borderRadius: 8, padding: '8px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
            <div style={{ fontSize: 18, color: '#00d4ff', fontFamily: 'monospace', fontWeight: 800 }}>{s.value}</div>
            <div style={{ fontSize: 8, color: '#374151', fontFamily: 'monospace', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Issues */}
      {(analysis.bottlenecks.length > 0 || analysis.singlePoints.length > 0) && (
        <Section title="⚠ Issues Detected">
          {analysis.bottlenecks.map(id => (
            <IssueRow key={`b-${id}`} type="bottleneck" nodeId={id} label={getLabel(id)} nodeType={getType(id)} />
          ))}
          {analysis.singlePoints.map(id => (
            <IssueRow key={`s-${id}`} type="spof" nodeId={id} label={getLabel(id)} nodeType={getType(id)} />
          ))}
        </Section>
      )}

      {/* Node breakdown */}
      <Section title="Node Performance">
        {nodes.filter(n => n.data.nodeType !== 'user').map(n => {
          const nm = metrics.nodeMetrics?.[n.id];
          const errRate = nm && nm.requestsHandled > 0
            ? Math.round((nm.requestsFailed / nm.requestsHandled) * 100)
            : 0;
          return (
            <div key={n.id} style={{
              background: '#080d14', border: '1px solid #1e2d3d',
              borderRadius: 6, padding: '7px 10px', marginBottom: 5,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12 }}>{getNodeConfig(n.data.nodeType).emoji}</span>
                  <div>
                    <div style={{ fontSize: 10, color: '#cdd9e5', fontFamily: 'monospace', fontWeight: 600 }}>{n.data.label}</div>
                    <div style={{ fontSize: 8, color: '#374151', fontFamily: 'monospace' }}>{n.data.nodeType}</div>
                  </div>
                </div>
                <StatusBadge status={n.data.status} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
                <NodeMetric label="HANDLED" value={String(nm?.requestsHandled ?? 0)} />
                <NodeMetric label="FAILED" value={String(nm?.requestsFailed ?? 0)} color="#ef4444" />
                <NodeMetric label="AVG LAT" value={`${Math.round(nm?.avgLatency ?? 0)}ms`} />
                <NodeMetric label="ERR%" value={`${errRate}%`} color={errRate > 5 ? '#ef4444' : undefined} />
              </div>
            </div>
          );
        })}
        {nodes.filter(n => n.data.nodeType !== 'user').length === 0 && (
          <div style={{ fontSize: 10, color: '#374151', fontFamily: 'monospace', padding: '8px 0' }}>
            Add nodes to the canvas to see metrics here
          </div>
        )}
      </Section>

      {/* Presets */}
      <Section title="Load Preset Topology">
        <PresetButton preset="simple-web" label="Simple Web App" desc="User → Gateway → Services → DB" />
        <PresetButton preset="microservices" label="Microservices" desc="CDN, LB, Auth, App, Cache, DB" />
        <PresetButton preset="event-driven" label="Event-Driven" desc="Rate Limiter, Kafka, Consumers" />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11, color: '#636e7b', fontFamily: 'monospace',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #1e2d3d',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function IssueRow({ type, label, nodeType, nodeId }: {
  type: 'bottleneck' | 'spof'; label: string; nodeType: string; nodeId: string;
}) {
  const isBottleneck = type === 'bottleneck';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 8px', marginBottom: 4,
      background: isBottleneck ? '#f59e0b0d' : '#ef44440d',
      border: `1px solid ${isBottleneck ? '#f59e0b30' : '#ef444430'}`,
      borderRadius: 6,
    }}>
      <span style={{ fontSize: 12 }}>{isBottleneck ? '🔴' : '⚡'}</span>
      <div>
        <div style={{ fontSize: 10, color: isBottleneck ? '#f59e0b' : '#ef4444', fontFamily: 'monospace', fontWeight: 600 }}>
          {isBottleneck ? 'Bottleneck' : 'Single Point of Failure'}
        </div>
        <div style={{ fontSize: 11, color: '#636e7b', fontFamily: 'monospace' }}>{label} ({nodeType})</div>
      </div>
    </div>
  );
}

function NodeMetric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: '#0d1117', borderRadius: 4, padding: '3px 4px', textAlign: 'center',
      border: '1px solid #1e2d3d',
    }}>
      <div style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 11, color: color || '#9ba8b5', fontFamily: 'monospace', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = {
    idle: '#374151', healthy: '#10b981', stressed: '#f59e0b',
    overloaded: '#ef4444', failed: '#dc2626',
  }[status] || '#374151';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '1px 6px', background: `${c}15`,
      border: `1px solid ${c}40`, borderRadius: 4,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
      <span style={{ fontSize: 10, color: c, fontFamily: 'monospace', textTransform: 'uppercase' }}>{status}</span>
    </div>
  );
}

function PresetButton({ preset, label, desc }: {
  preset: 'simple-web' | 'microservices' | 'event-driven';
  label: string; desc: string;
}) {
  const { loadPreset } = useStore();
  return (
    <button
      onClick={() => loadPreset(preset)}
      style={{
        width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 4,
        background: 'transparent', border: '1px solid #1e2d3d', borderRadius: 6,
        cursor: 'pointer', transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#00d4ff40';
        (e.currentTarget as HTMLElement).style.background = '#00d4ff08';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#1e2d3d';
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <div style={{ fontSize: 11, color: '#cdd9e5', fontFamily: 'monospace', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace', marginTop: 2 }}>{desc}</div>
    </button>
  );
}
