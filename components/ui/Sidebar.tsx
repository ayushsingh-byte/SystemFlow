'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfigPanel from '@/components/panels/ConfigPanel';
import MetricsDashboard from '@/components/panels/MetricsDashboard';
import RequestLog from '@/components/panels/RequestLog';
import TopologyPanel from '@/components/panels/TopologyPanel';
import TemplatesPanel from '@/components/panels/TemplatesPanel';
import ArchitectureAdvisor from '@/components/panels/ArchitectureAdvisor';
import { useStore } from '@/store/useStore';
import { useUIStore } from '@/store/uiStore';
import { THEMES } from '@/utils/theme';

type Tab = 'config' | 'metrics' | 'log' | 'topology' | 'templates' | 'advisor';

interface TabDef {
  id: Tab;
  icon: React.ReactNode;
  label: string;
  badgeFn?: () => number;
}

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  config: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  metrics: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M3 17l4-5 4 3 4-6 4 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 21h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  log: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 10h16M4 14h10M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  topology: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth="2"/>
      <circle cx="5" cy="19" r="2.5" stroke="currentColor" strokeWidth="2"/>
      <circle cx="19" cy="19" r="2.5" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 7.5v5M12 12.5L5 17M12 12.5L19 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  templates: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/>
      <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/>
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/>
      <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  advisor: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M9 9 Q9 13 12 14 Q15 13 15 9" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2"/>
      <path d="M8 17 Q8 21 12 21 Q16 21 16 17" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="12" cy="5" r="1" fill="currentColor"/>
    </svg>
  ),
};

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('config');
  const { requestLog, metrics } = useStore();
  const { theme } = useUIStore();
  const t = THEMES[theme];

  const tabs: TabDef[] = [
    { id: 'config',    icon: TAB_ICONS.config,    label: 'Config' },
    { id: 'metrics',   icon: TAB_ICONS.metrics,   label: 'Metrics' },
    { id: 'log',       icon: TAB_ICONS.log,       label: 'Log', badgeFn: () => requestLog.length },
    { id: 'topology',  icon: TAB_ICONS.topology,  label: 'Topology' },
    { id: 'templates', icon: TAB_ICONS.templates, label: 'Templates' },
    { id: 'advisor',   icon: TAB_ICONS.advisor,   label: 'Advisor' },
  ];

  return (
    <div style={{
      width: 380,
      minWidth: 380,
      background: t.surface,
      borderLeft: `1px solid ${t.border}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        background: t.surface2,
        borderBottom: `1px solid ${t.border}`,
        flexShrink: 0,
        height: 52,
        overflowX: 'auto',
      }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const badge = tab.badgeFn?.() ?? 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? t.accent : 'transparent'}`,
                color: isActive ? t.accent : t.textSecondary,
                fontSize: 12,
                fontFamily: 'monospace',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                padding: '0 4px',
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = t.textPrimary;
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = t.textSecondary;
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {tab.label}
              </span>
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: 6, right: 10,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: t.accent, color: t.bg,
                  fontSize: 10, fontFamily: 'monospace', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            style={{ height: '100%', overflow: 'hidden' }}
          >
            {activeTab === 'config'    && <ConfigPanel />}
            {activeTab === 'metrics'   && <MetricsDashboard />}
            {activeTab === 'log'       && <RequestLog />}
            {activeTab === 'topology'  && <TopologyPanel />}
            {activeTab === 'templates' && <TemplatesPanel />}
            {activeTab === 'advisor'   && <ArchitectureAdvisor />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
