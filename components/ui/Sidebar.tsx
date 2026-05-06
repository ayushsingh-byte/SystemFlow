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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  metrics: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M3 17l4-5 4 3 4-6 4 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 21h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  log: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 10h16M4 14h10M4 18h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  topology: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="5"  cy="19" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="19" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M12 7.5v5M12 12.5L5 17M12 12.5L19 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  templates: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3"  y="3"  width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="13" y="3"  width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="3"  y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  ),
  advisor: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8 17q0 4 4 4t4-4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <circle cx="12" cy="5" r="1" fill="currentColor"/>
    </svg>
  ),
};

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<Tab>('config');
  const { requestLog } = useStore();
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
      width: 360, minWidth: 360,
      background: t.surface,
      borderLeft: `1px solid ${t.border}`,
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div className="tab-bar" style={{ height: 50 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const badge = tab.badgeFn?.() ?? 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              className={`tab-btn${isActive ? ' active' : ''}`}
            >
              <span style={{ lineHeight: 1 }}>{tab.icon}</span>
              <span className="tab-btn-label">{tab.label}</span>
              {badge > 0 && (
                <span className="tab-badge">{badge > 99 ? '99+' : badge}</span>
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
