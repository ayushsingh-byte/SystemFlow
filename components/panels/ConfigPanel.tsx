'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { getNodeConfig } from '@/utils/nodeRegistry';
import { getNodeConfigSchema, ConfigSection, ConfigField } from '@/simulation/nodeConfigSchema';
import { NodeData } from '@/simulation/types';

// ─── Slider / NumInput ────────────────────────────────────────────────────────
function SliderField({ field, value, onUpdate }: {
  field: ConfigField;
  value: number | undefined;
  onUpdate: (key: string, val: number) => void;
}) {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step ?? 1;
  const unit = field.unit ?? '';
  const actual = value ?? min;
  const pct = Math.min(100, Math.max(0, ((actual - min) / (max - min)) * 100));

  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const fmt = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(1);
  };

  const startEdit = () => {
    setInputVal(String(actual));
    setEditing(true);
  };

  const commitEdit = () => {
    const n = parseFloat(inputVal);
    if (!isNaN(n)) {
      onUpdate(field.key as string, Math.min(max, Math.max(min, n)));
    }
    setEditing(false);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
        <div>
          <span style={{ fontSize: 13, color: '#c8d8e8', fontFamily: 'monospace', fontWeight: 600 }}>{field.label}</span>
          <div style={{ fontSize: 11, color: '#4a5a6a', fontFamily: 'monospace', marginTop: 2 }}>{field.description}</div>
        </div>
        {editing ? (
          <input
            autoFocus
            type="number"
            min={min}
            max={max}
            step={step}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') setEditing(false);
            }}
            style={{
              background: '#050810', border: '1px solid #00d4ff',
              borderRadius: 6, padding: '3px 8px',
              fontSize: 13, color: '#00d4ff', fontFamily: 'monospace', fontWeight: 800,
              width: 80, textAlign: 'center', flexShrink: 0, marginLeft: 8,
              outline: 'none',
            }}
          />
        ) : (
          <div
            onClick={startEdit}
            title="Click to type exact value"
            style={{
              background: '#050810', border: '1px solid #1e2d3d',
              borderRadius: 6, padding: '3px 10px',
              fontSize: 14, color: '#00d4ff', fontFamily: 'monospace', fontWeight: 800,
              minWidth: 56, textAlign: 'center', flexShrink: 0, marginLeft: 8,
              cursor: 'text',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#00d4ff50')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e2d3d')}
          >
            {fmt(actual)}{unit}
          </div>
        )}
      </div>
      <div style={{ position: 'relative', height: 8 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: '#080d16', borderRadius: 4, border: '1px solid #1e2d3d',
        }} />
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.12 }}
          style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            background: 'linear-gradient(90deg, #00d4ff, #7b2ff7)',
            borderRadius: 4,
          }}
        />
        <input
          type="range" min={min} max={max} step={step} value={actual}
          onChange={(e) => onUpdate(field.key as string, Number(e.target.value))}
          style={{
            position: 'absolute', inset: 0, width: '100%',
            opacity: 0, cursor: 'pointer', height: '100%',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: '#2a3a4a', fontFamily: 'monospace' }}>{fmt(min)}{unit}</span>
        <span style={{ fontSize: 10, color: '#2a3a4a', fontFamily: 'monospace' }}>{fmt(max)}{unit}</span>
      </div>
    </div>
  );
}

// ─── Toggle Field ─────────────────────────────────────────────────────────────
function ToggleField({ field, value, onUpdate }: {
  field: ConfigField;
  value: boolean | undefined;
  onUpdate: (key: string, val: boolean) => void;
}) {
  const enabled = value !== false; // default true
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '8px 10px', background: '#060b12', borderRadius: 8, border: '1px solid #141e2e' }}>
      <div>
        <div style={{ fontSize: 13, color: '#c8d8e8', fontFamily: 'monospace', fontWeight: 600 }}>{field.label}</div>
        <div style={{ fontSize: 11, color: '#4a5a6a', fontFamily: 'monospace', marginTop: 2 }}>{field.description}</div>
      </div>
      <button
        onClick={() => onUpdate(field.key as string, !enabled)}
        style={{
          position: 'relative', width: 40, height: 22, borderRadius: 11,
          background: enabled ? '#10b98140' : '#1e2d3d',
          border: `1px solid ${enabled ? '#10b981' : '#374151'}`,
          cursor: 'pointer', padding: 0, transition: 'all 0.2s', flexShrink: 0, marginLeft: 12,
        }}
      >
        <motion.div
          animate={{ x: enabled ? 18 : 2 }}
          transition={{ type: 'spring', stiffness: 600, damping: 35 }}
          style={{
            position: 'absolute', top: 3,
            width: 14, height: 14, borderRadius: '50%',
            background: enabled ? '#10b981' : '#374151',
            boxShadow: enabled ? '0 0 8px #10b981' : 'none',
          }}
        />
      </button>
    </div>
  );
}

// ─── Select Field ─────────────────────────────────────────────────────────────
function SelectField({ field, value, onUpdate }: {
  field: ConfigField;
  value: string | number | undefined;
  onUpdate: (key: string, val: string | number) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: '#c8d8e8', fontFamily: 'monospace', fontWeight: 600, marginBottom: 4 }}>{field.label}</div>
      <div style={{ fontSize: 11, color: '#4a5a6a', fontFamily: 'monospace', marginBottom: 6 }}>{field.description}</div>
      <select
        value={value as string | number}
        onChange={(e) => onUpdate(field.key as string, e.target.value)}
        style={{
          width: '100%', background: '#080d16',
          border: '1px solid #1e2d3d', borderRadius: 6,
          padding: '7px 10px', color: '#e2eaf4',
          fontSize: 13, fontFamily: 'monospace', outline: 'none',
          cursor: 'pointer',
        }}
      >
        {field.options?.map(opt => (
          <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Number Input Field ───────────────────────────────────────────────────────
function NumberInputField({ field, value, onUpdate }: {
  field: ConfigField;
  value: number | undefined;
  onUpdate: (key: string, val: number) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: '#c8d8e8', fontFamily: 'monospace', fontWeight: 600, marginBottom: 4 }}>{field.label}</div>
      <div style={{ fontSize: 11, color: '#4a5a6a', fontFamily: 'monospace', marginBottom: 6 }}>{field.description}</div>
      <input
        type="number"
        value={value ?? 0}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(e) => onUpdate(field.key as string, Number(e.target.value))}
        style={{
          width: '100%', background: '#080d16',
          border: '1px solid #1e2d3d', borderRadius: 6,
          padding: '7px 10px', color: '#e2eaf4',
          fontSize: 13, fontFamily: 'monospace', outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// ─── Schema Section Card ──────────────────────────────────────────────────────
function SchemaSectionCard({ section, data, upd }: {
  section: ConfigSection;
  data: NodeData;
  upd: (key: string, val: unknown) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{
      background: '#060b12',
      border: `1px solid #141e2e`,
      borderLeft: `4px solid ${section.color}`,
      borderRadius: 10, marginBottom: 12, overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 14 }}>{section.icon}</span>
        <span style={{
          fontSize: 11, color: section.color, fontFamily: 'monospace',
          textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, flex: 1,
        }}>
          {section.title}
        </span>
        <span style={{ fontSize: 10, color: '#374151', fontFamily: 'monospace' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '4px 14px 14px' }}>
              {section.fields.map(field => {
                const rawVal = data[field.key];
                if (field.type === 'toggle') {
                  return (
                    <ToggleField
                      key={field.key as string}
                      field={field}
                      value={rawVal as boolean | undefined}
                      onUpdate={upd}
                    />
                  );
                }
                if (field.type === 'slider') {
                  return (
                    <SliderField
                      key={field.key as string}
                      field={field}
                      value={rawVal as number | undefined}
                      onUpdate={upd}
                    />
                  );
                }
                if (field.type === 'select') {
                  return (
                    <SelectField
                      key={field.key as string}
                      field={field}
                      value={rawVal as string | number | undefined}
                      onUpdate={upd}
                    />
                  );
                }
                if (field.type === 'number-input') {
                  return (
                    <NumberInputField
                      key={field.key as string}
                      field={field}
                      value={rawVal as number | undefined}
                      onUpdate={upd}
                    />
                  );
                }
                return null;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Node Header Card ─────────────────────────────────────────────────────────
function NodeHeaderCard({ nodeId, data, cfg, upd }: {
  nodeId: string;
  data: NodeData;
  cfg: ReturnType<typeof getNodeConfig>;
  upd: (key: string, val: unknown) => void;
}) {
  const nc = cfg.color;
  const statusColors: Record<string, string> = {
    idle: '#4a5a6a', healthy: '#10b981', stressed: '#f59e0b',
    overloaded: '#ef4444', failed: '#dc2626',
  };
  const statusColor = statusColors[data.status] || '#4a5a6a';
  const isOnline = data.enabled !== false;

  const loadPct = data.max_capacity > 0
    ? Math.min(100, (data.currentLoad / data.max_capacity) * 100)
    : 0;
  const queuePct = (data.queue_limit ?? 0) > 0
    ? Math.min(100, ((data.queue_size ?? 0) / (data.queue_limit ?? 1)) * 100)
    : 0;

  return (
    <div style={{
      background: `linear-gradient(135deg, ${nc.bg}, #050810)`,
      border: `1px solid ${nc.border}60`,
      borderRadius: 12, padding: 16, marginBottom: 16,
      boxShadow: `0 0 24px ${nc.glow}20`,
    }}>
      {/* Top row: emoji + info + online toggle */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `${nc.border}18`, border: `1px solid ${nc.border}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
        }}>
          {cfg.emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, color: nc.text, fontFamily: 'monospace',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              background: `${nc.border}18`, padding: '2px 7px', borderRadius: 10,
            }}>
              {cfg.category}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: statusColor,
                boxShadow: `0 0 6px ${statusColor}`, flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: statusColor, fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700 }}>
                {data.status}
              </span>
            </div>
          </div>

          {/* Editable label */}
          <input
            type="text" value={data.label}
            onChange={(e) => upd('label', e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#e2eaf4', fontSize: 17, fontWeight: 700,
              fontFamily: 'monospace', width: '100%',
              borderBottom: '1px solid #1e2d3d20', paddingBottom: 2,
            }}
            onFocus={e => { (e.target as HTMLInputElement).style.borderBottomColor = nc.border; }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderBottomColor = '#1e2d3d20'; }}
          />
          <div style={{ fontSize: 12, color: '#8fa3b8', marginTop: 3, fontFamily: 'monospace' }}>{cfg.tagline}</div>
        </div>

        {/* ONLINE / OFFLINE big toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => upd('enabled', !isOnline)}
            style={{
              position: 'relative', width: 44, height: 24, borderRadius: 12,
              background: isOnline ? '#10b98140' : '#ef444430',
              border: `1px solid ${isOnline ? '#10b981' : '#ef4444'}`,
              cursor: 'pointer', padding: 0, transition: 'all 0.2s',
            }}
          >
            <motion.div
              animate={{ x: isOnline ? 20 : 2 }}
              transition={{ type: 'spring', stiffness: 600, damping: 35 }}
              style={{
                position: 'absolute', top: 3,
                width: 16, height: 16, borderRadius: '50%',
                background: isOnline ? '#10b981' : '#ef4444',
                boxShadow: isOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444',
              }}
            />
          </button>
          <span style={{
            fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
            color: isOnline ? '#10b981' : '#ef4444',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* ID + Load badges */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{
          background: '#080d16', border: '1px solid #1e2d3d',
          borderRadius: 5, padding: '3px 8px',
          fontSize: 11, color: '#4a5a6a', fontFamily: 'monospace',
        }}>
          ID: {nodeId}
        </div>
        <div style={{
          background: '#080d16', border: '1px solid #1e2d3d',
          borderRadius: 5, padding: '3px 8px',
          fontSize: 11, color: '#8fa3b8', fontFamily: 'monospace',
        }}>
          Load: <span style={{ color: '#e2eaf4', fontWeight: 700 }}>{data.currentLoad}</span>
        </div>
        {(data.queue_size ?? 0) > 0 && (
          <div style={{
            background: '#080d16', border: '1px solid #1e2d3d',
            borderRadius: 5, padding: '3px 8px',
            fontSize: 11, color: '#f59e0b', fontFamily: 'monospace',
          }}>
            Queue: <span style={{ fontWeight: 700 }}>{data.queue_size}</span>
          </div>
        )}
      </div>

      {/* Load bar */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 10, color: '#4a5a6a', fontFamily: 'monospace' }}>LOAD</span>
          <span style={{ fontSize: 10, color: '#4a5a6a', fontFamily: 'monospace' }}>{Math.round(loadPct)}%</span>
        </div>
        <div style={{ height: 5, background: '#0d1117', borderRadius: 3 }}>
          <motion.div
            animate={{ width: `${loadPct}%` }}
            transition={{ duration: 0.2 }}
            style={{
              height: '100%', borderRadius: 3,
              background: loadPct > 80 ? '#ef4444' : loadPct > 60 ? '#f59e0b' : '#10b981',
            }}
          />
        </div>
      </div>

      {/* Queue bar */}
      {(data.queue_limit ?? 0) > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: '#4a5a6a', fontFamily: 'monospace' }}>QUEUE</span>
            <span style={{ fontSize: 10, color: '#4a5a6a', fontFamily: 'monospace' }}>{data.queue_size ?? 0}/{data.queue_limit}</span>
          </div>
          <div style={{ height: 5, background: '#0d1117', borderRadius: 3 }}>
            <motion.div
              animate={{ width: `${queuePct}%` }}
              transition={{ duration: 0.2 }}
              style={{
                height: '100%', borderRadius: 3,
                background: queuePct > 80 ? '#ef4444' : '#ec4899',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Actions Card ─────────────────────────────────────────────────────────────
function ActionsCard({ nodeId, deleteNode, duplicateNode, deleteEdgesForNode, resetToDefaults }: {
  nodeId: string;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  deleteEdgesForNode: (id: string) => void;
  resetToDefaults: () => void;
}) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  return (
    <div style={{
      background: '#060b12', border: '1px solid #141e2e',
      borderRadius: 10, padding: '14px', marginBottom: 12,
    }}>
      <div style={{
        fontSize: 11, color: '#374151', fontFamily: 'monospace',
        textTransform: 'uppercase', letterSpacing: '0.09em',
        marginBottom: 10, borderBottom: '1px solid #141e2e', paddingBottom: 7,
        borderLeft: '4px solid #636e7b', paddingLeft: 10, fontWeight: 700,
      }}>
        ⚙ Node Actions
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <ActionBtn label="Duplicate" icon="⧉" color="#3b82f6" onClick={() => duplicateNode(nodeId)} />
        <ActionBtn label="Reset Defaults" icon="↺" color="#8b5cf6" onClick={resetToDefaults} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {confirmDisconnect ? (
          <>
            <ActionBtn label="Confirm" icon="✓" color="#f59e0b" onClick={() => { deleteEdgesForNode(nodeId); setConfirmDisconnect(false); }} />
            <ActionBtn label="Cancel" icon="✕" color="#636e7b" onClick={() => setConfirmDisconnect(false)} />
          </>
        ) : (
          <>
            <ActionBtn label="Disconnect" icon="⛔" color="#f59e0b" onClick={() => setConfirmDisconnect(true)} />
            <ActionBtn label="Delete Node" icon="✕" color="#ef4444" onClick={() => deleteNode(nodeId)} />
          </>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ label, icon, color, onClick }: {
  label: string; icon: string; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 36, background: `${color}10`,
        border: `1px solid ${color}30`, borderRadius: 8,
        color, fontSize: 12, fontFamily: 'monospace', fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.12s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = `${color}20`;
        (e.currentTarget as HTMLElement).style.borderColor = color;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = `${color}10`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}30`;
      }}
    >
      {icon} {label}
    </button>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{
      padding: 32, textAlign: 'center', height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.15, lineHeight: 1 }}>⬡</div>
      <div style={{ fontSize: 14, color: '#8fa3b8', fontFamily: 'monospace', lineHeight: 2, marginBottom: 24 }}>
        Click any node to<br />configure its properties
      </div>
      <div style={{
        width: '100%', background: '#080d16', border: '1px solid #141e2e',
        borderRadius: 10, padding: '16px 18px',
        fontSize: 12, color: '#4a5a6a', fontFamily: 'monospace',
        lineHeight: 2.2, textAlign: 'left',
      }}>
        <div><kbd style={kbdStyle}>Delete</kbd> — remove node</div>
        <div><kbd style={kbdStyle}>Shift</kbd>+drag — multi-select</div>
        <div><kbd style={kbdStyle}>Ctrl+Z</kbd> — undo</div>
        <div>Drag from palette → canvas to add</div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  background: '#141e2e', borderRadius: 4, padding: '2px 7px',
  fontSize: 11, color: '#8fa3b8', fontFamily: 'monospace', marginRight: 5,
  border: '1px solid #1e2d3d',
};

// ─── Main ConfigPanel ─────────────────────────────────────────────────────────
export default function ConfigPanel() {
  const { nodes, selectedNodeId, updateNodeData, deleteNode, duplicateNode, deleteEdgesForNode } = useStore();
  const node = nodes.find((n) => n.id === selectedNodeId);

  const upd = useCallback((key: string, value: unknown) => {
    if (!selectedNodeId) return;
    updateNodeData(selectedNodeId, { [key]: value } as Partial<NodeData>);
  }, [selectedNodeId, updateNodeData]);

  if (!node || !selectedNodeId) return <EmptyState />;

  const data = node.data;
  const cfg = getNodeConfig(data.nodeType);
  const schema = getNodeConfigSchema(data.nodeType);

  const resetToDefaults = () => {
    if (!selectedNodeId) return;
    const defaults = getNodeConfig(data.nodeType).defaults;
    updateNodeData(selectedNodeId, defaults as Partial<NodeData>);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={selectedNodeId}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
        style={{ padding: '14px', overflowY: 'auto', height: '100%' }}
      >
        {/* Header Card */}
        <NodeHeaderCard
          nodeId={selectedNodeId}
          data={data}
          cfg={cfg}
          upd={upd}
        />

        {/* Dynamic schema sections */}
        {schema.map(section => (
          <SchemaSectionCard
            key={section.id}
            section={section}
            data={data}
            upd={upd}
          />
        ))}

        {/* Actions */}
        <ActionsCard
          nodeId={selectedNodeId}
          deleteNode={deleteNode}
          duplicateNode={duplicateNode}
          deleteEdgesForNode={deleteEdgesForNode}
          resetToDefaults={resetToDefaults}
        />
      </motion.div>
    </AnimatePresence>
  );
}
