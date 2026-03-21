'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import ReactFlow, {
  Background, BackgroundVariant, Controls, MiniMap,
  NodeTypes, EdgeTypes, Panel,
  ReactFlowProvider, useReactFlow,
  Node, Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '@/store/useStore';
import SystemNode from '@/components/nodes/SystemNode';
import AnimatedEdge from './AnimatedEdge';
import { NodeData } from '@/simulation/types';
import { getNodeConfig } from '@/utils/nodeRegistry';
import { useAuthStore } from '@/store/authStore';

// ─── Auto-Layout Algorithm ────────────────────────────────────────────────────
function autoLayout(nodes: Node<NodeData>[], edges: Edge[]): Node<NodeData>[] {
  if (nodes.length === 0) return nodes;

  // Build adjacency (source → targets)
  const adj: Record<string, string[]> = {};
  const inDeg: Record<string, number> = {};
  for (const n of nodes) {
    adj[n.id] = [];
    inDeg[n.id] = 0;
  }
  for (const e of edges) {
    if (adj[e.source]) adj[e.source].push(e.target);
    if (e.target in inDeg) inDeg[e.target]++;
  }

  // BFS layer assignment
  const layer: Record<string, number> = {};
  const queue: string[] = [];

  // Sources: nodes with no incoming edges
  for (const n of nodes) {
    if (inDeg[n.id] === 0) {
      queue.push(n.id);
      layer[n.id] = 0;
    }
  }

  // If no sources (cyclic graph), start from all nodes at layer 0
  if (queue.length === 0) {
    for (const n of nodes) {
      queue.push(n.id);
      layer[n.id] = 0;
    }
  }

  let i = 0;
  while (i < queue.length) {
    const nodeId = queue[i++];
    const curLayer = layer[nodeId] ?? 0;
    for (const target of (adj[nodeId] || [])) {
      if (!(target in layer) || layer[target] < curLayer + 1) {
        layer[target] = curLayer + 1;
        queue.push(target);
      }
    }
  }

  // Assign unvisited nodes to layer 0
  for (const n of nodes) {
    if (!(n.id in layer)) layer[n.id] = 0;
  }

  // Group by layer
  const byLayer: Record<number, string[]> = {};
  const maxLayer = Math.max(...Object.values(layer));
  for (let l = 0; l <= maxLayer; l++) byLayer[l] = [];
  for (const [id, l] of Object.entries(layer)) byLayer[l].push(id);

  // Assign positions
  const COL_GAP = 300;
  const ROW_GAP = 170;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const newNodes: Node<NodeData>[] = [];
  for (let l = 0; l <= maxLayer; l++) {
    const col = byLayer[l] || [];
    const colHeight = col.length * ROW_GAP;
    col.forEach((id, idx) => {
      const n = nodeMap.get(id);
      if (!n) return;
      newNodes.push({
        ...n,
        position: {
          x: l * COL_GAP + 50,
          y: idx * ROW_GAP - colHeight / 2 + 200,
        },
      });
    });
  }

  // Any nodes not in layers (shouldn't happen)
  for (const n of nodes) {
    if (!newNodes.find(nn => nn.id === n.id)) newNodes.push(n);
  }

  return newNodes;
}

// CRITICAL: defined outside component to prevent re-render loop (React Flow warning #002)
const NODE_TYPES: NodeTypes = { systemNode: SystemNode };
const EDGE_TYPES: EdgeTypes = { animatedEdge: AnimatedEdge };

export default function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}

function CanvasToolbar() {
  const { undo, redo, canUndo, canRedo, resetCanvas, nodes, edges } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [layouting, setLayouting] = useState(false);
  const { setNodes } = useReactFlow();

  const handleUndo = canUndo();
  const handleRedo = canRedo();

  const handleAutoLayout = () => {
    if (nodes.length === 0) return;
    setLayouting(true);
    const arranged = autoLayout(nodes, edges);
    setNodes(arranged);
    setTimeout(() => setLayouting(false), 400);
  };

  const doReset = () => {
    resetCanvas();
    setConfirmReset(false);
  };

  const btnStyle = (disabled: boolean, color: string): React.CSSProperties => ({
    padding: '5px 10px',
    background: disabled ? 'transparent' : `${color}18`,
    border: `1px solid ${disabled ? '#1e2d3d40' : `${color}50`}`,
    borderRadius: 6,
    color: disabled ? '#2a3a4a' : color,
    fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.12s', whiteSpace: 'nowrap' as const,
  });

  return (
    <div style={{
      display: 'flex', gap: 5, alignItems: 'center',
      background: '#080d1490', backdropFilter: 'blur(12px)',
      border: '1px solid #1e2d3d',
      borderRadius: 8, padding: '5px 8px',
      boxShadow: '0 4px 20px #00000080',
    }}>
      <button
        disabled={!handleUndo}
        onClick={() => undo()}
        title="Undo (Ctrl+Z)"
        style={btnStyle(!handleUndo, '#3b82f6')}
      >
        ↩ Undo
      </button>
      <button
        disabled={!handleRedo}
        onClick={() => redo()}
        title="Redo (Ctrl+Shift+Z)"
        style={btnStyle(!handleRedo, '#3b82f6')}
      >
        ↪ Redo
      </button>
      <div style={{ width: 1, height: 20, background: '#1e2d3d' }} />
      <button
        onClick={handleAutoLayout}
        disabled={nodes.length === 0 || layouting}
        title="Auto-layout nodes using BFS layering"
        style={btnStyle(nodes.length === 0 || layouting, '#8b5cf6')}
      >
        {layouting ? '⟳ Layout...' : '⊞ Auto-Layout'}
      </button>
      <div style={{ width: 1, height: 20, background: '#1e2d3d' }} />
      {confirmReset ? (
        <>
          <span style={{ fontSize: 10, color: '#ef4444', fontFamily: 'monospace' }}>Reset canvas?</span>
          <button
            onClick={doReset}
            style={{ ...btnStyle(false, '#ef4444'), padding: '4px 8px' }}
          >
            ✓ Yes
          </button>
          <button
            onClick={() => setConfirmReset(false)}
            style={{ ...btnStyle(false, '#636e7b'), padding: '4px 8px' }}
          >
            ✕ No
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirmReset(true)}
          title="Reset canvas"
          style={btnStyle(false, '#ef4444')}
        >
          ⊘ Reset
        </button>
      )}
    </div>
  );
}

function PremiumModal({ nodeType, onClose, onActivated }: {
  nodeType: string;
  onClose: () => void;
  onActivated: (nodeType: string) => void;
}) {
  const { activatePremium } = useAuthStore();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const cfg = getNodeConfig(nodeType);

  const handleActivate = () => {
    const ok = activatePremium(code.trim());
    if (ok) {
      setMsg('');
      onActivated(nodeType);
    } else {
      setMsg('Invalid code. Try again.');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#080d14', border: '1px solid #f59e0b50',
          borderRadius: 16, padding: '28px 32px', width: 420,
          boxShadow: '0 0 60px #f59e0b20, 0 20px 80px #000000a0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: '#f59e0b18', border: '1px solid #f59e0b40',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#f59e0b">
              <path d="M2 20h20v-4H2v4zm2-14l5 5 3-6 3 6 5-5-2 10H4L2 6z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace' }}>
              Premium Feature
            </div>
            <div style={{ fontSize: 12, color: '#8fa3b8', fontFamily: 'monospace', marginTop: 2 }}>
              {cfg.label} requires premium access
            </div>
          </div>
        </div>

        <div style={{
          background: '#f59e0b0c', border: '1px solid #f59e0b25',
          borderRadius: 10, padding: '14px 16px', marginBottom: 20,
          fontSize: 13, color: '#fde68a', fontFamily: 'monospace', lineHeight: 1.7,
        }}>
          This node is part of the Premium tier which includes all cloud provider nodes (AWS, GCP, Azure),
          AI/ML services, enterprise databases, and advanced observability tools.
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#636e7b', fontFamily: 'monospace', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Activation Code
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              value={code}
              onChange={e => { setCode(e.target.value); setMsg(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleActivate(); }}
              placeholder="Enter your activation code..."
              style={{
                flex: 1, background: '#050811',
                border: `1px solid ${msg ? '#ef444450' : '#1e2d3d'}`,
                borderRadius: 8, padding: '10px 14px',
                color: '#e2eaf4', fontSize: 13, fontFamily: 'monospace',
                outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#f59e0b50'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = msg ? '#ef444450' : '#1e2d3d'; }}
            />
            <button
              onClick={handleActivate}
              style={{
                background: '#f59e0b20', border: '1px solid #f59e0b60',
                borderRadius: 8, color: '#f59e0b', cursor: 'pointer',
                padding: '10px 16px', fontSize: 13, fontFamily: 'monospace', fontWeight: 700,
                flexShrink: 0,
              }}
            >
              Activate
            </button>
          </div>
          {msg && (
            <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6, fontFamily: 'monospace' }}>
              {msg}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', background: 'transparent', border: '1px solid #1e2d3d',
            borderRadius: 8, padding: '10px 0', color: '#636e7b',
            fontSize: 13, fontFamily: 'monospace', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function FlowCanvasInner() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    selectNode, addNode,
    undo, redo,
  } = useStore();
  const { isPremium } = useAuthStore();
  const [premiumModal, setPremiumModal] = useState<{ nodeType: string; x: number; y: number } | null>(null);

  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const handlePaneClick = useCallback(() => selectNode(null), [selectNode]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nodeType = event.dataTransfer.getData('application/reactflow-nodetype') as NodeData['nodeType'];
    if (!nodeType) return;
    const isPremiumNode = event.dataTransfer.getData('application/reactflow-premium') === '1';
    if (isPremiumNode && !isPremium) {
      setPremiumModal({ nodeType, x: event.clientX, y: event.clientY });
      return;
    }
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addNode(nodeType, position);
  }, [addNode, screenToFlowPosition, isPremium]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handlePremiumActivated = (nodeType: string) => {
    if (premiumModal) {
      const position = screenToFlowPosition({ x: premiumModal.x, y: premiumModal.y });
      addNode(nodeType as NodeData['nodeType'], position);
    }
    setPremiumModal(null);
  };

  return (
    <>
      {premiumModal && (
        <PremiumModal
          nodeType={premiumModal.nodeType}
          onClose={() => setPremiumModal(null)}
          onActivated={handlePremiumActivated}
        />
      )}
      <div
        ref={wrapperRef}
        style={{ width: '100%', height: '100%' }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={handlePaneClick}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          defaultEdgeOptions={{ type: 'animatedEdge' }}
          style={{ background: '#050811' }}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Shift"
          connectionLineStyle={{ stroke: '#00d4ff', strokeWidth: 2, strokeDasharray: '4 3' }}
          connectionLineType="bezier"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={28} size={1} color="#1e2d3d55"
          />
          <Controls
            position="bottom-left"
            style={{
              background: '#0d1117', border: '1px solid #1e2d3d',
              borderRadius: 8, boxShadow: '0 4px 20px #00000080',
              bottom: 16, left: 16,
            }}
          />
          <MiniMap
            position="bottom-right"
            nodeStrokeWidth={3}
            zoomable
            pannable
            style={{
              background: '#080d14',
              border: '1px solid #1e2d3d',
              borderRadius: 8,
            }}
            nodeColor={(node) => {
              const cfg = getNodeConfig(node.data?.nodeType);
              return cfg?.color?.border ?? '#374151';
            }}
            maskColor="#050811cc"
          />
          <Panel position="top-right" style={{ margin: '10px 10px 0 0' }}>
            <CanvasToolbar />
          </Panel>
        </ReactFlow>
      </div>
    </>
  );
}
