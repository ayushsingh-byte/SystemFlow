'use client';

import React, { useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NodeData } from '@/simulation/types';
import { NODE_REGISTRY, CATEGORY_META, searchNodes, getNodeConfig } from '@/utils/nodeRegistry';
import type { NodeCategory } from '@/utils/nodeRegistry';
import NodeIcon from '@/utils/NodeIcon';
import { BrandIcon } from '@/utils/BrandIcons';
import { useUIStore } from '@/store/uiStore';
import { THEMES } from '@/utils/theme';

export default function NodePalette() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<NodeCategory | 'all'>('all');
  const [hovered, setHovered] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useUIStore();
  const t = THEMES[theme];

  const results = useMemo(() => {
    let nodes = query ? searchNodes(query) : NODE_REGISTRY;
    if (activeCategory !== 'all') {
      nodes = nodes.filter(n => n.category === activeCategory);
    }
    return nodes;
  }, [query, activeCategory]);

  const byCategory = useMemo(() => {
    if (activeCategory !== 'all') return null;
    const map = new Map<NodeCategory, typeof NODE_REGISTRY>();
    for (const n of results) {
      const arr = map.get(n.category) || [];
      arr.push(n);
      map.set(n.category, arr);
    }
    return map;
  }, [results, activeCategory]);

  const onDragStart = useCallback((e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/reactflow-nodetype', type);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const categories = Object.keys(CATEGORY_META) as NodeCategory[];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        background: t.surface,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        width: collapsed ? 'auto' : 280,
        maxHeight: collapsed ? 'none' : 'calc(100vh - 230px)',
        boxShadow: '0 8px 40px #00000090',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        onClick={() => collapsed && setCollapsed(false)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px',
          background: t.surface2,
          borderBottom: collapsed ? 'none' : `1px solid ${t.border}`,
          flexShrink: 0,
          cursor: collapsed ? 'pointer' : 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M12 2L21.5 7.5v9L12 22l-9.5-5.5v-9L12 2z" stroke={t.textSecondary} strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          {!collapsed && (
            <>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, fontFamily: 'monospace' }}>
                Node Palette
              </span>
              <span style={{
                padding: '2px 7px', background: t.border,
                borderRadius: 5, fontSize: 12, color: t.textSecondary, fontFamily: 'monospace',
                fontWeight: 600,
              }}>
                {NODE_REGISTRY.length}
              </span>
            </>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setCollapsed(c => !c); }}
          title={collapsed ? 'Expand palette' : 'Collapse palette'}
          style={{
            width: 24, height: 24, borderRadius: 5,
            background: t.border, border: `1px solid ${t.border2}`,
            color: t.textSecondary, fontSize: 11, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.12s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = `${t.accent}50`;
            (e.currentTarget as HTMLElement).style.color = t.accent;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = t.border2;
            (e.currentTarget as HTMLElement).style.color = t.textSecondary;
          }}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Collapsible body */}
      {!collapsed && <>

      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="7" stroke={t.textMuted} strokeWidth="2"/>
            <path d="M20 20l-3-3" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search nodes..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', background: t.surface2,
              border: `1px solid ${t.border2}`, borderRadius: 7,
              padding: '0 32px 0 34px',
              height: 38,
              color: t.textPrimary, fontSize: 14, fontFamily: 'monospace',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { (e.target as HTMLElement).style.borderColor = `${t.accent}50`; }}
            onBlur={e => { (e.target as HTMLElement).style.borderColor = t.border2; }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 13,
              lineHeight: 1,
            }}>✕</button>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div style={{
        padding: '8px 10px',
        display: 'flex', gap: 4, flexWrap: 'wrap',
        borderBottom: `1px solid ${t.border}`, flexShrink: 0,
      }}>
        <CategoryPill
          id="all" label="All" color="#8fa3b8"
          active={activeCategory === 'all'}
          onClick={() => setActiveCategory('all')}
        />
        {categories.map(cat => {
          const meta = CATEGORY_META[cat];
          return (
            <CategoryPill
              key={cat} id={cat} label={meta.label}
              color={meta.color}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
            />
          );
        })}
      </div>

      {/* Node list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {results.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: t.textMuted, fontFamily: 'monospace', fontSize: 13 }}>
            No nodes match &quot;{query}&quot;
          </div>
        ) : activeCategory !== 'all' || query ? (
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {results.map(cfg => (
              <NodeItem
                key={cfg.id} cfg={cfg}
                hovered={hovered === cfg.id}
                onHover={setHovered}
                onDragStart={onDragStart}
              />
            ))}
          </div>
        ) : (
          byCategory && Array.from(byCategory.entries()).map(([cat, nodes]) => {
            const meta = CATEGORY_META[cat];
            return (
              <div key={cat} style={{ padding: '8px 10px 4px' }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: meta.color,
                  fontFamily: 'monospace', textTransform: 'uppercase',
                  letterSpacing: '0.08em', padding: '4px 6px 4px 10px',
                  display: 'flex', alignItems: 'center', gap: 6,
                  borderLeft: `3px solid ${meta.color}`,
                  marginBottom: 4,
                }}>
                  <CatIcon id={cat} color={meta.color} />
                  <span style={{ flex: 1 }}>{meta.label}</span>
                  <span style={{
                    background: `${meta.color}20`,
                    color: meta.color,
                    fontSize: 12,
                    padding: '1px 7px',
                    borderRadius: 10,
                    fontWeight: 700,
                  }}>
                    {nodes.length}
                  </span>
                </div>
                {nodes.map(cfg => (
                  <NodeItem
                    key={cfg.id} cfg={cfg}
                    hovered={hovered === cfg.id}
                    onHover={setHovered}
                    onDragStart={onDragStart}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      <div style={{
        padding: '7px 12px', borderTop: `1px solid ${t.border}`,
        fontSize: 12, color: t.textMuted, fontFamily: 'monospace', textAlign: 'center',
        flexShrink: 0,
      }}>
        Drag onto canvas ·{' '}
        <span style={{ color: t.textSecondary }}>{results.length} of {NODE_REGISTRY.length}</span>
      </div>

      </>}
    </motion.div>
  );
}

// Maps category id to inline SVG or brand
const CAT_ICONS: Record<string, { type: 'brand'; brand: string } | { type: 'svg'; el: (c: string) => React.ReactElement }> = {
  all:          { type: 'svg', el: (c) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="9" height="9" rx="1" stroke={c} strokeWidth="2"/><rect x="13" y="2" width="9" height="9" rx="1" stroke={c} strokeWidth="2"/><rect x="2" y="13" width="9" height="9" rx="1" stroke={c} strokeWidth="2"/><rect x="13" y="13" width="9" height="9" rx="1" stroke={c} strokeWidth="2"/></svg> },
  clients:      { type: 'svg', el: (c) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="7" r="4" stroke={c} strokeWidth="2"/><path d="M3 21c0-4.418 4.03-8 9-8s9 3.582 9 8" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg> },
  network:      { type: 'svg', el: (c) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L22 8.5v7L12 22l-10-6.5v-7L12 2z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg> },
  compute:      { type: 'svg', el: (c) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke={c} strokeWidth="2"/><rect x="8" y="8" width="8" height="8" rx="1" stroke={c} strokeWidth="1.5"/></svg> },
  database:     { type: 'svg', el: (c) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="6" rx="8" ry="3" stroke={c} strokeWidth="1.5"/><path d="M4 6v6c0 1.657 3.582 3 8 3s8-1.343 8-3V6" stroke={c} strokeWidth="1.5"/><path d="M4 12v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6" stroke={c} strokeWidth="1.5"/></svg> },
  storage:      { type: 'svg', el: (c) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="14" rx="2" stroke={c} strokeWidth="1.5"/><path d="M3 10h18" stroke={c} strokeWidth="1.5"/><circle cx="7" cy="8" r="1" fill={c}/></svg> },
  messaging:    { type: 'svg', el: (c) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 3H3l9 9.5L21 3z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/><rect x="3" y="3" width="18" height="16" rx="2" stroke={c} strokeWidth="1.5"/></svg> },
  aws:          { type: 'brand', brand: 'aws' },
  gcp:          { type: 'brand', brand: 'googlecloud' },
  azure:        { type: 'brand', brand: 'azure' },
  security:     { type: 'svg', el: (c) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 3L4 7v5c0 4.5 3.5 8.7 8 9.9C16.5 20.7 20 16.5 20 12V7l-8-4z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg> },
  observability:{ type: 'svg', el: (c) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 17l4-5 4 3 4-6 4 3" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 21h18" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg> },
  'ai-ml':      { type: 'svg', el: (c) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.5"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg> },
};

function CatIcon({ id, color }: { id: string; color: string }) {
  const def = CAT_ICONS[id];
  if (!def) return <span style={{ fontSize: 10, fontFamily: 'monospace', color }}>{id.slice(0,1).toUpperCase()}</span>;
  if (def.type === 'brand') {
    return <BrandIcon brand={def.brand} size={12} color={color} />;
  }
  return def.el(color);
}

function CategoryPill({ id, label, color, active, onClick }: {
  id: string; label: string; color: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        padding: '3px 8px', borderRadius: 6,
        background: active ? `${color}20` : 'transparent',
        border: `1px solid ${active ? color : '#1e2d3d'}`,
        color: active ? color : '#8fa3b8',
        fontSize: 12, fontFamily: 'monospace', fontWeight: active ? 700 : 400,
        cursor: 'pointer', transition: 'all 0.12s',
        display: 'flex', alignItems: 'center', gap: 4,
      }}
    >
      <CatIcon id={id} color={active ? color : '#8fa3b8'} />
      <span style={{ display: active ? 'inline' : 'none' }}>{label}</span>
    </button>
  );
}

function NodeItem({ cfg, hovered, onHover, onDragStart }: {
  cfg: ReturnType<typeof getNodeConfig>;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onDragStart: (e: React.DragEvent, type: string) => void;
}) {
  const nc = cfg.color;
  return (
    <motion.div
      draggable
      onDragStart={(e) => onDragStart(e, cfg.id)}
      onMouseEnter={() => onHover(cfg.id)}
      onMouseLeave={() => onHover(null)}
      animate={{
        background: hovered ? '#0d1520' : 'transparent',
        scale: hovered ? 1.02 : 1,
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 10px',
        minHeight: 44,
        borderRadius: 8,
        cursor: 'grab', userSelect: 'none', marginBottom: 1,
        borderLeft: hovered ? `3px solid ${nc.border}` : '3px solid transparent',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <span style={{
        width: 28, height: 28, flexShrink: 0,
        filter: hovered ? `drop-shadow(0 0 6px ${nc.glow}90)` : 'none',
        transition: 'filter 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <NodeIcon nodeType={cfg.id} color={nc.border} size={22} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, color: hovered ? nc.text : '#e2eaf4',
          fontFamily: 'monospace', fontWeight: 700,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          transition: 'color 0.12s', lineHeight: 1.3,
        }}>
          {cfg.label}
        </div>
        <div style={{
          fontSize: 11, color: hovered ? '#8fa3b8' : '#4a5a6a',
          fontFamily: 'monospace', lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          transition: 'color 0.2s',
        }}>
          {cfg.tagline}
        </div>
      </div>
    </motion.div>
  );
}
