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

  const isActive     = status !== 'idle';
  const isFailed     = status === 'failed';
  const isOverloaded = status === 'overloaded';

  const borderColor = selected ? '#e2e8f4' : isActive ? sc.border : nc.border;
  const glowColor   = selected ? 'rgba(226,232,244,0.5)' : isActive ? sc.glow : `${nc.glow}35`;

  const loadBarColor =
    utilization > 0.85 ? '#ef4444' :
    utilization > 0.60 ? '#f59e0b' :
    utilization > 0    ? '#10b981' : 'var(--border2)';

  const queueSize  = data.queue_size  ?? 0;
  const queueLimit = data.queue_limit ?? 50;

  return (
    <>
      {/* Hover tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute',
          bottom: '100%', left: 0,
          marginBottom: 10,
          zIndex: 1000,
          width: 264,
          background: '#08111d',
          border: '1px solid rgba(0,212,255,0.15)',
          borderRadius: 10,
          padding: '13px 15px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.85)',
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            <span style={{
              padding: '2px 7px',
              background: `${nc.border}18`,
              border: `1px solid ${nc.border}40`,
              borderRadius: 4, fontSize: 9,
              color: nc.text, fontFamily: 'var(--font-mono)',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {cfg.category.replace('-', ' / ')}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#dde5f0', fontFamily: 'var(--font-ui)' }}>
              {cfg.label}
            </span>
          </div>

          <div style={{ height: 1, background: 'rgba(0,212,255,0.08)', marginBottom: 9 }} />

          <div style={{ fontSize: 12, color: 'var(--text-sec)', lineHeight: 1.55, marginBottom: 9, fontFamily: 'var(--font-ui)' }}>
            {cfg.description}
          </div>

          <div style={{ height: 1, background: 'rgba(0,212,255,0.08)', marginBottom: 9 }} />

          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8, lineHeight: 1.6 }}>
            <span style={{ color: '#3a5a80', fontWeight: 700 }}>DEFAULTS: </span>
            {cfg.defaults.processing_time}ms ·{' '}
            {cfg.defaults.max_capacity}/s ·{' '}
            {cfg.defaults.failure_rate}% err
          </div>

          {cfg.tags && cfg.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {cfg.tags.map((tag: string) => (
                <span key={tag} style={{
                  padding: '2px 6px',
                  background: `${nc.border}12`,
                  border: `1px solid ${nc.border}25`,
                  borderRadius: 3, fontSize: 9,
                  color: nc.text, fontFamily: 'var(--font-mono)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Tooltip arrow */}
          <div style={{ position: 'absolute', bottom: -7, left: 14, width: 12, height: 7, overflow: 'hidden' }}>
            <div style={{
              width: 12, height: 12,
              background: '#08111d',
              border: '1px solid rgba(0,212,255,0.15)',
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
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{
          scale: 1, opacity: 1,
          boxShadow: `0 0 0 1px ${borderColor}, 0 0 28px ${glowColor}`,
        }}
        transition={{ duration: 0.18 }}
        style={{
          background: `linear-gradient(150deg, ${nc.bg} 0%, #060810 100%)`,
          border: `1px solid ${borderColor}`,
          borderRadius: 11,
          width: 192,
          cursor: 'pointer',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top accent stripe */}
        <motion.div
          animate={{
            background: isActive
              ? `linear-gradient(90deg, ${sc.border}, ${sc.border}00)`
              : `linear-gradient(90deg, ${nc.border}cc, ${nc.border}00)`,
          }}
          style={{ height: 2 }}
          transition={{ duration: 0.3 }}
        />

        <div style={{ padding: '10px 12px 11px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: `${nc.border}12`,
              border: `1px solid ${nc.border}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <NodeIcon nodeType={data.nodeType} color={nc.border} size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, color: nc.text,
                textTransform: 'uppercase', letterSpacing: '0.07em',
                fontFamily: 'var(--font-mono)', lineHeight: 1.2, marginBottom: 2,
                opacity: 0.8,
              }}>
                {cfg.category.replace('-', ' / ')}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#dde5f0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                lineHeight: 1.3, fontFamily: 'var(--font-ui)',
              }}>
                {data.label}
              </div>
              <div style={{
                fontSize: 10, color: 'var(--text-muted)', marginTop: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-ui)',
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
              <div style={{ marginBottom: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Load</span>
                  <span style={{ fontSize: 9, color: 'var(--text-sec)', fontFamily: 'var(--font-mono)' }}>
                    {data.currentLoad}/{data.max_capacity}
                  </span>
                </div>
                <div style={{
                  height: 3, background: 'rgba(255,255,255,0.04)',
                  borderRadius: 2, overflow: 'hidden',
                }}>
                  <motion.div
                    animate={{ width: `${utilization * 100}%` }}
                    transition={{ duration: 0.28 }}
                    style={{ height: '100%', background: loadBarColor, borderRadius: 2 }}
                  />
                </div>
              </div>

              {/* Queue chip */}
              <div style={{ height: 20, marginBottom: 5, display: 'flex', alignItems: 'center' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  background: queueSize > queueLimit * 0.8 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.1)',
                  border: `1px solid ${queueSize > queueLimit * 0.8 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.25)'}`,
                  borderRadius: 4, padding: '2px 7px',
                  fontSize: 10, fontFamily: 'var(--font-mono)',
                  color: queueSize > queueLimit * 0.8 ? '#ef4444' : '#f59e0b',
                  fontWeight: 600,
                  opacity: queueSize > 0 ? 1 : 0,
                  transition: 'opacity 0.2s',
                }}>
                  Q: {queueSize}/{queueLimit}
                </div>
              </div>

              {/* Stat chips */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                <StatChip label="LAT" value={`${data.processing_time}`} unit="ms" color={nc.text} />
                <StatChip label="CAP" value={`${data.max_capacity}`}   unit="/s" color={nc.text} />
                <StatChip label="ERR" value={`${data.failure_rate}`}   unit="%"  color={
                  data.failure_rate > 10 ? '#ef4444' : data.failure_rate > 3 ? '#f59e0b' : nc.text
                } />
              </div>

              {/* Utilization */}
              <div style={{
                marginTop: 7, paddingTop: 7,
                borderTop: `1px solid ${nc.border}14`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                opacity: isActive ? 1 : 0,
                transition: 'opacity 0.25s',
                pointerEvents: 'none',
              }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                  Utilization
                </span>
                <motion.span
                  animate={{ color: utilization > 0.8 ? '#ef4444' : utilization > 0.6 ? '#f59e0b' : '#10b981' }}
                  style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                >
                  {Math.round(utilization * 100)}%
                </motion.span>
              </div>
            </>
          )}

          {cfg.category === 'clients' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5, marginTop: 2,
              fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
            }}>
              <span>Traffic source</span>
              <span style={{ color: 'var(--cyan)', opacity: 0.6 }}>→</span>
            </div>
          )}
        </div>

        {/* Overload/failure flash */}
        <AnimatePresence>
          {isOverloaded && !isFailed && (
            <motion.div
              key="overload"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.03, 0.15, 0.03] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: '#ef4444' }}
            />
          )}
          {isFailed && (
            <motion.div
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.07, 0.28, 0.07] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, repeat: Infinity }}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: '#dc2626' }}
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
  border: '2.5px solid #060810',
  width: 10, height: 10,
  borderRadius: '50%',
  boxShadow: `0 0 7px ${color}70`,
});

function StatChip({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 5, padding: '4px 5px',
      border: '1px solid rgba(255,255,255,0.06)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color, fontFamily: 'var(--font-mono)', fontWeight: 700, lineHeight: 1.3 }}>
        {value}<span style={{ fontSize: 8, opacity: 0.6 }}>{unit}</span>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: NodeData['status'] }) {
  const c = {
    idle:       '#2d3f55',
    healthy:    '#10b981',
    stressed:   '#f59e0b',
    overloaded: '#ef4444',
    failed:     '#dc2626',
  }[status] || '#2d3f55';

  const isFailed = status === 'failed';

  return (
    <motion.div
      animate={
        isFailed
          ? { scale: [1, 1.7, 1], opacity: [1, 0.4, 1] }
          : status !== 'idle'
            ? { scale: [1, 1.4, 1], opacity: [1, 0.65, 1] }
            : {}
      }
      transition={{ duration: isFailed ? 0.7 : 1.5, repeat: Infinity }}
      style={{
        width: 8, height: 8, borderRadius: '50%', background: c,
        flexShrink: 0, marginTop: 5,
        boxShadow: status !== 'idle' ? `0 0 ${isFailed ? 10 : 7}px ${c}` : 'none',
      }}
    />
  );
}

export default memo(SystemNode);
