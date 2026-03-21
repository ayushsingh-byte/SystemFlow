'use client';

import { memo, useCallback, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { NodeData } from '@/simulation/types';
import { getNodeConfig, STATUS_COLORS } from '@/utils/nodeConfig';
import { useStore } from '@/store/useStore';
import NodeIcon from '@/utils/NodeIcon';

function SystemNode({ id, data, selected }: NodeProps<NodeData>) {
  const selectNode = useStore((s) => s.selectNode);
  const handleClick = useCallback(() => selectNode(id), [id, selectNode]);
  const [hovered, setHovered] = useState(false);

  const status = data.status || 'idle';
  const cfg = getNodeConfig(data.nodeType);
  const nc = cfg.color;
  const sc = STATUS_COLORS[status];

  const utilization = data.max_capacity > 0
    ? Math.min(1, data.currentLoad / data.max_capacity)
    : 0;

  const isActive = status !== 'idle';
  const borderColor = selected ? '#ffffff' : isActive ? sc.border : nc.border;
  const glowColor = selected ? '#ffffff80' : isActive ? sc.glow : `${nc.glow}40`;

  const loadBarColor =
    utilization > 0.85 ? '#ef4444' :
    utilization > 0.6  ? '#f59e0b' :
    utilization > 0    ? '#10b981' : '#1e2d3d';

  const isFailed = status === 'failed';
  const isOverloaded = status === 'overloaded';

  const queueSize = data.queue_size ?? 0;
  const queueLimit = data.queue_limit ?? 50;

  return (
    <>
    {/* Hover tooltip - sibling to main node, outside overflow:hidden */}
    {hovered && (
      <div style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        marginBottom: 8,
        zIndex: 1000,
        width: 260,
        background: '#050c15',
        border: '1px solid #1e3a50',
        borderRadius: 10,
        padding: '14px 16px',
        boxShadow: '0 8px 40px #000000b0',
        pointerEvents: 'none',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{
            padding: '2px 7px',
            background: `${nc.border}20`,
            border: `1px solid ${nc.border}50`,
            borderRadius: 4,
            fontSize: 9,
            color: nc.text,
            fontFamily: 'monospace',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {cfg.category.replace('-', ' / ')}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#dde5f0', fontFamily: 'monospace' }}>
            {cfg.label}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#1e3a50', marginBottom: 10 }} />

        {/* Description */}
        <div style={{ fontSize: 13, color: '#8fa3b8', lineHeight: 1.6, marginBottom: 10 }}>
          {cfg.description}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#1e3a50', marginBottom: 10 }} />

        {/* Defaults row */}
        <div style={{ fontSize: 10, color: '#636e7b', fontFamily: 'monospace', marginBottom: 8 }}>
          <span style={{ color: '#4a6785', fontWeight: 700 }}>DEFAULTS: </span>
          Processing {cfg.defaults.processing_time}ms
          {' · '}Cap {cfg.defaults.max_capacity}/s
          {' · '}Err {cfg.defaults.failure_rate}%
        </div>

        {/* Tags */}
        {cfg.tags && cfg.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <span style={{ fontSize: 9, color: '#4a6785', fontFamily: 'monospace', fontWeight: 700, alignSelf: 'center' }}>TAGS:</span>
            {cfg.tags.map((tag: string) => (
              <span key={tag} style={{
                padding: '2px 6px',
                background: `${nc.border}15`,
                border: `1px solid ${nc.border}30`,
                borderRadius: 3,
                fontSize: 9,
                color: nc.text,
                fontFamily: 'monospace',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Arrow pointing down */}
        <div style={{
          position: 'absolute',
          bottom: -7,
          left: 16,
          width: 12,
          height: 7,
          overflow: 'hidden',
        }}>
          <div style={{
            width: 12,
            height: 12,
            background: '#050c15',
            border: '1px solid #1e3a50',
            transform: 'rotate(45deg)',
            transformOrigin: 'center',
            marginTop: -6,
          }} />
        </div>
      </div>
    )}

    <motion.div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{
        scale: 1, opacity: 1,
        boxShadow: `0 0 0 1px ${borderColor}, 0 0 24px ${glowColor}, inset 0 1px 0 ${nc.border}15`,
      }}
      transition={{ duration: 0.2 }}
      style={{
        background: `linear-gradient(145deg, ${nc.bg} 0%, #050811 100%)`,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        width: 190,
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top accent stripe */}
      <motion.div
        animate={{ background: isActive
          ? `linear-gradient(90deg, ${sc.border}, ${sc.border}00)`
          : `linear-gradient(90deg, ${nc.border}cc, ${nc.border}00)`,
        }}
        style={{ height: 2.5 }}
        transition={{ duration: 0.3 }}
      />

      <div style={{ padding: '11px 13px 11px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 9 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: `${nc.border}15`, border: `1px solid ${nc.border}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <NodeIcon nodeType={data.nodeType} color={nc.border} size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700, color: nc.text,
              textTransform: 'uppercase', letterSpacing: '0.07em',
              fontFamily: 'monospace', lineHeight: 1.2, marginBottom: 2,
            }}>
              {cfg.category.replace('-', ' / ')}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#dde5f0',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: 1.3,
            }}>
              {data.label}
            </div>
            <div style={{
              fontSize: 10, color: '#636e7b', marginTop: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {cfg.tagline}
            </div>
          </div>
          <StatusDot status={status} />
        </div>

        {/* Non-client metrics */}
        {cfg.category !== 'clients' && (
          <>
            {/* Load bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: '#636e7b', fontFamily: 'monospace' }}>LOAD</span>
                <span style={{ fontSize: 9, color: '#9ba8b5', fontFamily: 'monospace' }}>
                  {data.currentLoad}/{data.max_capacity}
                </span>
              </div>
              <div style={{
                height: 4, background: '#0d1117', borderRadius: 3, overflow: 'hidden',
                border: '1px solid #1e2d3d22',
              }}>
                <motion.div
                  animate={{ width: `${utilization * 100}%` }}
                  transition={{ duration: 0.25 }}
                  style={{ height: '100%', background: loadBarColor, borderRadius: 3 }}
                />
              </div>
            </div>

            {/* Queue size chip — fixed height to prevent layout shift */}
            <div style={{ height: 22, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: queueSize > queueLimit * 0.8 ? '#ef444420' : '#f59e0b15',
                border: `1px solid ${queueSize > queueLimit * 0.8 ? '#ef444440' : '#f59e0b40'}`,
                borderRadius: 4, padding: '2px 7px',
                fontSize: 10, fontFamily: 'monospace',
                color: queueSize > queueLimit * 0.8 ? '#ef4444' : '#f59e0b',
                fontWeight: 700,
                opacity: queueSize > 0 ? 1 : 0,
                transition: 'opacity 0.2s',
              }}>
                <span>Q: {queueSize}/{queueLimit}</span>
              </div>
            </div>

            {/* Stat chips */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
              <StatChip label="LAT" value={`${data.processing_time}`} unit="ms" color={nc.text} />
              <StatChip label="CAP" value={`${data.max_capacity}`} unit="/s" color={nc.text} />
              <StatChip label="ERR" value={`${data.failure_rate}`} unit="%" color={
                data.failure_rate > 10 ? '#ef4444' : data.failure_rate > 3 ? '#f59e0b' : nc.text
              } />
            </div>

            {/* Live utilization — always reserve height, fade in/out to avoid layout shift */}
            <div style={{
              marginTop: 7, paddingTop: 7,
              borderTop: `1px solid ${nc.border}18`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              opacity: isActive ? 1 : 0,
              transition: 'opacity 0.25s',
              pointerEvents: 'none',
            }}>
              <span style={{ fontSize: 10, color: '#636e7b', fontFamily: 'monospace' }}>
                utilization
              </span>
              <motion.span
                animate={{ color: utilization > 0.8 ? '#ef4444' : utilization > 0.6 ? '#f59e0b' : '#10b981' }}
                style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}
              >
                {Math.round(utilization * 100)}%
              </motion.span>
            </div>
          </>
        )}

        {/* Client node */}
        {cfg.category === 'clients' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
            fontSize: 10, color: '#636e7b', fontFamily: 'monospace',
          }}>
            <span>Traffic source →</span>
          </div>
        )}
      </div>

      {/* Overload flash */}
      <AnimatePresence>
        {isOverloaded && !isFailed && (
          <motion.div
            key="overload-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.04, 0.18, 0.04] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: '#ef4444',
            }}
          />
        )}
        {isFailed && (
          <motion.div
            key="failed-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.08, 0.35, 0.08] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, repeat: Infinity }}
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: '#dc2626',
            }}
          />
        )}
      </AnimatePresence>

      {/* Handles */}
      <Handle type="target" position={Position.Left}   style={hs(nc.border)} />
      <Handle type="target" position={Position.Top}    style={hs(nc.border)} />
      <Handle type="source" position={Position.Right}  style={hs(nc.border)} />
      <Handle type="source" position={Position.Bottom} style={hs(nc.border)} />
    </motion.div>
    </>
  );
}

const hs = (color: string) => ({
  background: color,
  border: '2.5px solid #050811',
  width: 11, height: 11, borderRadius: '50%',
  boxShadow: `0 0 8px ${color}80`,
});

function StatChip({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string;
}) {
  return (
    <div style={{
      background: '#080d14', borderRadius: 5, padding: '4px 5px',
      border: '1px solid #1e2d3d', textAlign: 'center',
    }}>
      <div style={{ fontSize: 8, color: '#636e7b', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color, fontFamily: 'monospace', fontWeight: 700, lineHeight: 1.2 }}>
        {value}<span style={{ fontSize: 8, opacity: 0.65 }}>{unit}</span>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: NodeData['status'] }) {
  const c = {
    idle: '#374151',
    healthy: '#10b981',
    stressed: '#f59e0b',
    overloaded: '#ef4444',
    failed: '#dc2626',
  }[status] || '#374151';

  const isFailed = status === 'failed';

  return (
    <motion.div
      animate={
        isFailed
          ? { scale: [1, 1.8, 1], opacity: [1, 0.4, 1] }
          : status !== 'idle'
            ? { scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }
            : {}
      }
      transition={{ duration: isFailed ? 0.7 : 1.4, repeat: Infinity }}
      style={{
        width: 9, height: 9, borderRadius: '50%', background: c,
        flexShrink: 0, marginTop: 4,
        boxShadow: status !== 'idle' ? `0 0 ${isFailed ? 12 : 8}px ${c}` : 'none',
      }}
    />
  );
}

export default memo(SystemNode);
