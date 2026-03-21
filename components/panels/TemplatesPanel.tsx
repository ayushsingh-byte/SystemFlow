'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/authStore';
import { TEMPLATE_INFO, TemplateInfo } from '@/store/presets';
import type { AdvancedPresetId } from '@/store/presets';
import { BrandIcon } from '@/utils/BrandIcons';

// Brand map for each template category
const TEMPLATE_ICONS: Record<string, { brand: string; color: string }> = {
  'ecommerce':       { brand: 'shopify',       color: '#96BF48' },
  'social-media':    { brand: 'meta',          color: '#0082FB' },
  'video-streaming': { brand: 'netflix',       color: '#E50914' },
  'realtime-chat':   { brand: 'slack',         color: '#4A154B' },
  'fintech':         { brand: 'stripe',        color: '#008CDD' },
  'ride-sharing':    { brand: 'uber',          color: '#ffffff' },
  'saas-platform':   { brand: 'salesforce',    color: '#00A1E0' },
  'iot-pipeline':    { brand: 'aws',           color: '#FF9900' },
  'search-engine':   { brand: 'elasticsearch', color: '#00BFB3' },
  'gaming-backend':  { brand: 'steam',         color: '#66c0f4' },
};

function TemplateIcon({ id, color }: { id: string; color: string }) {
  const ti = TEMPLATE_ICONS[id];
  if (ti) {
    return <BrandIcon brand={ti.brand} size={22} color={ti.color} />;
  }
  // fallback: first 2 chars of id in color
  const initials = id.slice(0, 2).toUpperCase();
  return (
    <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color, lineHeight: 1 }}>
      {initials}
    </span>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  'Web Platform':     '#3b82f6',
  'Streaming':        '#8b5cf6',
  'Real-Time':        '#00d4ff',
  'Finance':          '#10b981',
  'Data Engineering': '#f59e0b',
};

export default function TemplatesPanel() {
  const { loadPreset, simConfig } = useStore();
  const { isPremium } = useAuthStore();
  const [selected, setSelected] = useState<TemplateInfo | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');
  const [premiumPrompt, setPremiumPrompt] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(TEMPLATE_INFO.map(t => t.category)))];

  const visible = filter === 'All'
    ? TEMPLATE_INFO
    : TEMPLATE_INFO.filter(t => t.category === filter);

  const handleLoad = (tpl: TemplateInfo) => {
    if (simConfig.running) return;
    if (tpl.premium && !isPremium) {
      setPremiumPrompt(tpl.id);
      return;
    }
    loadPreset(tpl.id as AdvancedPresetId);
    setLoaded(tpl.id);
    setTimeout(() => setLoaded(null), 2000);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: '1px solid #141e2e',
        flexShrink: 0,
        background: '#060b12',
      }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: '#e2eaf4',
          fontFamily: 'monospace', marginBottom: 4,
        }}>
          System Templates
        </div>
        <div style={{ fontSize: 11, color: '#4a5a6a', fontFamily: 'monospace', lineHeight: 1.5 }}>
          {TEMPLATE_INFO.length} production-grade blueprints · 20–25 nodes each
        </div>
      </div>

      {/* Category filter */}
      <div style={{
        padding: '8px 12px', display: 'flex', gap: 5, flexWrap: 'wrap',
        borderBottom: '1px solid #141e2e', flexShrink: 0,
      }}>
        {categories.map(cat => {
          const color = cat === 'All' ? '#8fa3b8' : (CATEGORY_COLORS[cat] ?? '#8fa3b8');
          const active = filter === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '3px 10px', borderRadius: 6,
                background: active ? `${color}20` : 'transparent',
                border: `1px solid ${active ? color : '#1e2d3d'}`,
                color: active ? color : '#8fa3b8',
                fontSize: 11, fontFamily: 'monospace', fontWeight: active ? 700 : 400,
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Template list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {visible.map((tpl) => {
          const color = CATEGORY_COLORS[tpl.category] ?? '#8fa3b8';
          const isSelected = selected?.id === tpl.id;
          const isLoaded = loaded === tpl.id;
          const isLocked = tpl.premium && !isPremium;

          return (
            <div key={tpl.id}>
              {/* Card */}
              <motion.div
                onClick={() => setSelected(isSelected ? null : tpl)}
                whileHover={{ scale: 1.005 }}
                style={{
                  background: isSelected ? `${color}12` : '#060b12',
                  border: `1px solid ${isSelected ? color : '#141e2e'}`,
                  borderRadius: 10, padding: '12px 14px',
                  cursor: 'pointer', marginBottom: 2,
                  transition: 'all 0.15s',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                    background: `${color}18`, border: `1px solid ${color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TemplateIcon id={tpl.id} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: '#e2eaf4',
                      fontFamily: 'monospace', marginBottom: 2,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {tpl.name}
                      {tpl.premium && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          background: isLocked ? '#f59e0b18' : '#10b98118',
                          border: `1px solid ${isLocked ? '#f59e0b40' : '#10b98140'}`,
                          borderRadius: 4, padding: '1px 6px',
                        }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill={isLocked ? '#f59e0b' : '#10b981'}>
                            <path d="M2 20h20v-4H2v4zm2-14l5 5 3-6 3 6 5-5-2 10H4L2 6z"/>
                          </svg>
                          <span style={{ fontSize: 9, color: isLocked ? '#f59e0b' : '#10b981', fontFamily: 'monospace', fontWeight: 800 }}>
                            PRO
                          </span>
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        padding: '1px 7px', borderRadius: 4,
                        background: `${color}20`, border: `1px solid ${color}40`,
                        fontSize: 10, color, fontFamily: 'monospace', fontWeight: 700,
                      }}>
                        {tpl.category}
                      </span>
                      <span style={{ fontSize: 10, color: '#4a5a6a', fontFamily: 'monospace' }}>
                        {tpl.nodeCount} nodes
                      </span>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, color: isSelected ? color : '#374151',
                    transition: 'color 0.15s', flexShrink: 0,
                  }}>
                    {isLocked ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="11" width="18" height="11" rx="2" stroke="#f59e0b" strokeWidth="1.5"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    ) : (isSelected ? '▲' : '▼')}
                  </div>
                </div>

                {/* Description */}
                <div style={{
                  fontSize: 11, color: '#8fa3b8', fontFamily: 'monospace',
                  marginTop: 8, lineHeight: 1.6,
                }}>
                  {tpl.description}
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {tpl.tags.map(tag => (
                    <span key={tag} style={{
                      padding: '1px 6px', borderRadius: 4,
                      background: '#080d16', border: '1px solid #1e2d3d',
                      fontSize: 10, color: '#4a5a6a', fontFamily: 'monospace',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Expanded detail */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      background: '#050a10',
                      border: `1px solid ${color}30`,
                      borderTop: 'none', borderRadius: '0 0 10px 10px',
                      padding: '12px 14px', marginBottom: 6,
                    }}>
                      {/* Bottlenecks */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{
                          fontSize: 10, color: '#ef4444',
                          fontFamily: 'monospace', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                          marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 20h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                            <path d="M12 9v5M12 17.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Expected Bottlenecks
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {tpl.bottlenecks.map(b => (
                            <span key={b} style={{
                              padding: '2px 8px', borderRadius: 5,
                              background: '#ef444415', border: '1px solid #ef444430',
                              fontSize: 11, color: '#fca5a5', fontFamily: 'monospace',
                            }}>
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Scaling notes */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{
                          fontSize: 10, color: '#10b981',
                          fontFamily: 'monospace', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                          marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <path d="M3 17l5-6 4 4 5-7 4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M20 8v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Scaling Strategy
                        </div>
                        <div style={{
                          fontSize: 11, color: '#8fa3b8',
                          fontFamily: 'monospace', lineHeight: 1.6,
                          background: '#080d16', borderRadius: 6,
                          padding: '8px 10px', border: '1px solid #141e2e',
                        }}>
                          {tpl.scalingNotes}
                        </div>
                      </div>

                      {/* Load button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLoad(tpl); }}
                        disabled={simConfig.running}
                        style={{
                          width: '100%', height: 38,
                          background: isLoaded ? '#10b98120' : isLocked ? '#f59e0b15' : `${color}18`,
                          border: `1px solid ${isLoaded ? '#10b981' : isLocked ? '#f59e0b50' : color}`,
                          borderRadius: 8,
                          color: isLoaded ? '#10b981' : isLocked ? '#f59e0b' : color,
                          fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
                          cursor: simConfig.running ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s',
                          opacity: simConfig.running ? 0.5 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        {isLoaded ? '+ Loaded!' : simConfig.running ? '|| Stop sim first' : isLocked ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="11" width="18" height="11" rx="2" stroke="#f59e0b" strokeWidth="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            Premium Required — Activate to Load
                          </>
                        ) : `> Load ${tpl.name}`}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 14px', borderTop: '1px solid #141e2e',
        fontSize: 11, color: '#374151', fontFamily: 'monospace',
        textAlign: 'center', flexShrink: 0, background: '#060b12',
      }}>
        Click template → expand details → Load to canvas
      </div>
    </div>
  );
}
