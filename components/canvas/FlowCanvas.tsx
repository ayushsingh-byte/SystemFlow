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
import NodePalette from '@/components/panels/NodePalette';
import { NodeData } from '@/simulation/types';

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

function FlowCanvasInner() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    selectNode, addNode,
    undo, redo,
  } = useStore();

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
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addNode(nodeType, position);
  }, [addNode, screenToFlowPosition]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return (
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
          style={{
            background: '#0d1117', border: '1px solid #1e2d3d',
            borderRadius: 8, boxShadow: '0 4px 20px #00000080',
          }}
        />
        <MiniMap
          style={{
            background: '#080d14', border: '1px solid #1e2d3d',
            borderRadius: 8, boxShadow: '0 4px 20px #00000080',
          }}
          nodeColor={(n) => {
            const s = (n.data as NodeData)?.status;
            if (s === 'overloaded' || s === 'failed') return '#ef4444';
            if (s === 'stressed') return '#f59e0b';
            if (s === 'healthy') return '#10b981';
            return '#1e2d3d';
          }}
          maskColor="#05081188"
        />
        <Panel position="top-left" style={{ margin: '10px 0 0 10px' }}>
          <NodePalette />
        </Panel>
        <Panel position="top-right" style={{ margin: '10px 10px 0 0' }}>
          <CanvasToolbar />
        </Panel>
      </ReactFlow>
    </div>
  );
}
