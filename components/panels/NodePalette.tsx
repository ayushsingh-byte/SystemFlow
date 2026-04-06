'use client';

import React, { useCallback, useState, useMemo } from 'react';
import { NODE_REGISTRY, CATEGORY_META, searchNodes, getNodeConfig } from '@/utils/nodeRegistry';
import type { NodeCategory } from '@/utils/nodeRegistry';
import NodeIcon from '@/utils/NodeIcon';
import { BrandIcon } from '@/utils/BrandIcons';
import { useUIStore } from '@/store/uiStore';
import { THEMES } from '@/utils/theme';
import { useAuthStore } from '@/store/authStore';

export default function NodePalette({ embedded }: { embedded?: boolean }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<NodeCategory | 'all'>('all');
  const [hovered, setHovered] = useState<string | null>(null);
  const { theme } = useUIStore();
  const t = THEMES[theme];
  const { isPremium } = useAuthStore();

  const results = useMemo(() => {
    let nodes = query ? searchNodes(query) : NODE_REGISTRY;
    if (activeCategory !== 'all') nodes = nodes.filter(n => n.category === activeCategory);
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

  const onDragStart = useCallback((e: React.DragEvent, type: string, premium: boolean) => {
    e.dataTransfer.setData('application/reactflow-nodetype', type);
    e.dataTransfer.setData('application/reactflow-premium', premium ? '1' : '0');
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const categories = Object.keys(CATEGORY_META) as NodeCategory[];

  return (
    <div style={{ background: t.surface, display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>

      {/* Header */}
      <div className="panel-header">
        <div className="panel-header-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
            <path d="M12 2L21.5 7.5v9L12 22l-9.5-5.5v-9L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          Node Palette
          <span style={{
            padding: '1px 7px',
            background: 'var(--surface3)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 11,
            color: 'var(--text-sec)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
          }}>{NODE_REGISTRY.length}</span>
        </div>
        {!isPremium && (
          <div className="chip chip-amber">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 20h20v-4H2v4zm2-14l5 5 3-6 3 6 5-5-2 10H4L2 6z"/>
            </svg>
            PRO
          </div>
        )}
      </div>

      {/* Search */}
      <div className="panel-section" style={{ padding: '10px 12px' }}>
        <div style={{ position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search nodes…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search-input"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '2px 4px',
              }}
            >✕</button>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div style={{
        padding: '8px 12px 8px',
        display: 'flex', gap: 4, flexWrap: 'wrap',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <CategoryPill
          id="all" label="All" color="var(--text-sec)"
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
      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
        {results.length === 0 ? (
          <div style={{
            padding: '32px 20px', textAlign: 'center',
            color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
            fontSize: 13,
          }}>
            No nodes match &quot;{query}&quot;
          </div>
        ) : activeCategory !== 'all' || query ? (
          <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column' }}>
            {results.map(cfg => (
              <NodeItem
                key={cfg.id} cfg={cfg}
                hovered={hovered === cfg.id}
                onHover={setHovered}
                onDragStart={(e, type) => onDragStart(e, type, !!cfg.premium)}
                isPremium={isPremium}
              />
            ))}
          </div>
        ) : (
          byCategory && Array.from(byCategory.entries()).map(([cat, nodes]) => {
            const meta = CATEGORY_META[cat];
            return (
              <div key={cat} style={{ padding: '10px 8px 4px' }}>
                {/* Category header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '4px 10px 6px',
                  marginBottom: 2,
                }}>
                  <div style={{
                    width: 3, height: 16, borderRadius: 2,
                    background: meta.color, flexShrink: 0, opacity: 0.7,
                  }} />
                  <CatIcon id={cat} color={meta.color} />
                  <span style={{
                    flex: 1, fontSize: 11, fontWeight: 700,
                    color: meta.color, fontFamily: 'var(--font-ui)',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    opacity: 0.85,
                  }}>{meta.label}</span>
                  <span style={{
                    background: `${meta.color}18`,
                    color: meta.color, fontSize: 10,
                    padding: '1px 6px', borderRadius: 8,
                    fontWeight: 700, fontFamily: 'var(--font-mono)',
                    opacity: 0.8,
                  }}>{nodes.length}</span>
                </div>
                {nodes.map(cfg => (
                  <NodeItem
                    key={cfg.id} cfg={cfg}
                    hovered={hovered === cfg.id}
                    onHover={setHovered}
                    onDragStart={(e, type) => onDragStart(e, type, !!cfg.premium)}
                    isPremium={isPremium}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '7px 14px',
        borderTop: '1px solid var(--border)',
        fontSize: 11,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-ui)',
        textAlign: 'center',
        flexShrink: 0,
        background: 'var(--surface2)',
      }}>
        {!isPremium ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b">
              <path d="M2 20h20v-4H2v4zm2-14l5 5 3-6 3 6 5-5-2 10H4L2 6z"/>
            </svg>
            <span style={{ color: '#f59e0b', fontSize: 11 }}>Unlock PRO nodes via profile</span>
          </div>
        ) : (
          <span>
            Drag to canvas ·{' '}
            <span style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-mono)' }}>
              {results.length}/{NODE_REGISTRY.length}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Category icon map ───────────────────────────────────────────────────── */
const CAT_ICONS: Record<string, { type: 'brand'; brand: string } | { type: 'svg'; el: (c: string) => React.ReactElement }> = {
  all:          { type: 'svg', el: (c) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="9" height="9" rx="1" stroke={c} strokeWidth="2"/><rect x="13" y="2" width="9" height="9" rx="1" stroke={c} strokeWidth="2"/><rect x="2" y="13" width="9" height="9" rx="1" stroke={c} strokeWidth="2"/><rect x="13" y="13" width="9" height="9" rx="1" stroke={c} strokeWidth="2"/></svg> },
  clients:      { type: 'svg', el: (c) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="7" r="4" stroke={c} strokeWidth="2"/><path d="M3 21c0-4.418 4.03-8 9-8s9 3.582 9 8" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg> },
  network:      { type: 'svg', el: (c) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2L22 8.5v7L12 22l-10-6.5v-7L12 2z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg> },
  compute:      { type: 'svg', el: (c) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke={c} strokeWidth="2"/><rect x="8" y="8" width="8" height="8" rx="1" stroke={c} strokeWidth="1.5"/></svg> },
  database:     { type: 'svg', el: (c) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="6" rx="8" ry="3" stroke={c} strokeWidth="1.5"/><path d="M4 6v6c0 1.657 3.582 3 8 3s8-1.343 8-3V6" stroke={c} strokeWidth="1.5"/><path d="M4 12v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6" stroke={c} strokeWidth="1.5"/></svg> },
  storage:      { type: 'svg', el: (c) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="14" rx="2" stroke={c} strokeWidth="1.5"/><path d="M3 10h18" stroke={c} strokeWidth="1.5"/><circle cx="7" cy="8" r="1" fill={c}/></svg> },
  messaging:    { type: 'svg', el: (c) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 3H3l9 9.5L21 3z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/><rect x="3" y="3" width="18" height="16" rx="2" stroke={c} strokeWidth="1.5"/></svg> },
  aws:          { type: 'brand', brand: 'aws' },
  gcp:          { type: 'brand', brand: 'googlecloud' },
  azure:        { type: 'brand', brand: 'azure' },
  security:     { type: 'svg', el: (c) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 3L4 7v5c0 4.5 3.5 8.7 8 9.9C16.5 20.7 20 16.5 20 12V7l-8-4z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg> },
  observability:{ type: 'svg', el: (c) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M3 17l4-5 4 3 4-6 4 3" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 21h18" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg> },
  'ai-ml':      { type: 'svg', el: (c) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.5"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg> },
  servers:      { type: 'svg', el: (c) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="5" rx="1" stroke={c} strokeWidth="1.5"/><rect x="2" y="10" width="20" height="5" rx="1" stroke={c} strokeWidth="1.5"/><rect x="2" y="17" width="20" height="4" rx="1" stroke={c} strokeWidth="1.5"/><circle cx="19" cy="5.5" r="1" fill={c}/><circle cx="19" cy="12.5" r="1" fill={c}/></svg> },
};

function CatIcon({ id, color }: { id: string; color: string }) {
  const def = CAT_ICONS[id];
  if (!def) return <span style={{ fontSize: 10, color }}>{id.slice(0,1).toUpperCase()}</span>;
  if (def.type === 'brand') return <BrandIcon brand={def.brand} size={11} color={color} />;
  return def.el(color);
}

function CategoryPill({ id, label, color, active, onClick }: {
  id: string; label: string; color: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`cat-pill${active ? ' active' : ''}`}
      style={{
        borderColor: active ? color : undefined,
        color: active ? color : undefined,
        background: active ? `${color}12` : undefined,
      }}
    >
      <CatIcon id={id} color={active ? color : 'var(--text-muted)'} />
      {active && <span>{label}</span>}
    </button>
  );
}

function NodeItem({ cfg, hovered, onHover, onDragStart, isPremium }: {
  cfg: ReturnType<typeof getNodeConfig>;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onDragStart: (e: React.DragEvent, type: string) => void;
  isPremium: boolean;
}) {
  const nc = cfg.color;
  const isPremiumNode = !!cfg.premium;
  const isLocked = isPremiumNode && !isPremium;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, cfg.id)}
      onMouseEnter={() => onHover(cfg.id)}
      onMouseLeave={() => onHover(null)}
      className="node-item"
      style={{
        borderLeftColor: hovered ? nc.border : 'transparent',
        background: hovered ? 'var(--surface2)' : 'transparent',
      }}
      title={isLocked ? `${cfg.label} — Premium node` : cfg.description}
    >
      {/* Icon */}
      <span style={{
        width: 26, height: 26, flexShrink: 0,
        filter: hovered ? `drop-shadow(0 0 5px ${nc.glow}80)` : 'none',
        transition: 'filter 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <NodeIcon nodeType={cfg.id} color={nc.border} size={20} />
      </span>

      {/* Labels */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 600,
          color: hovered ? nc.text : 'var(--text)',
          fontFamily: 'var(--font-ui)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          transition: 'color 0.12s', lineHeight: 1.4,
        }}>
          {cfg.label}
        </div>
        <div style={{
          fontSize: 11, color: hovered ? 'var(--text-sec)' : 'var(--text-muted)',
          fontFamily: 'var(--font-ui)', lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          transition: 'color 0.15s',
        }}>
          {cfg.tagline}
        </div>
      </div>

      {/* Premium badge */}
      {isPremiumNode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
          background: isLocked ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${isLocked ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
          borderRadius: 4, padding: '2px 6px',
        }}>
          <span style={{
            fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700,
            color: isLocked ? '#f59e0b' : '#10b981',
            letterSpacing: '0.05em',
          }}>PRO</span>
        </div>
      )}
    </div>
  );
}
