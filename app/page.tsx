'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';
import Sidebar from '@/components/ui/Sidebar';
import ControlPanel from '@/components/panels/ControlPanel';
import NodePalette from '@/components/panels/NodePalette';
import OnboardingTour from '@/components/ui/OnboardingTour';
import { useUIStore } from '@/store/uiStore';
import { THEMES } from '@/utils/theme';
import { useAuthStore } from '@/store/authStore';

const FlowCanvas = dynamic(() => import('@/components/canvas/FlowCanvas'), {
  ssr: false,
  loading: () => (
    <div className="canvas-loading">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.15 }}>
        <path d="M12 2L21.5 7.5v9L12 22l-9.5-5.5v-9L12 2z" stroke="#00d4ff" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
      <div className="canvas-loading-text">Loading canvas…</div>
    </div>
  ),
});

export default function Home() {
  const {
    leftPanelOpen, rightPanelOpen, bottomPanelOpen,
    toggleLeftPanel, toggleRightPanel, toggleBottomPanel,
  } = useUIStore();
  const { theme } = useUIStore();
  const t = THEMES[theme];
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  if (!user) return null;

  const LEFT_WIDTH  = 285;
  const RIGHT_WIDTH = 360;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw',
      overflow: 'hidden', background: t.bg,
    }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* ── Left panel (node palette) ── */}
        <div style={{
          width: leftPanelOpen ? LEFT_WIDTH : 0,
          minWidth: leftPanelOpen ? LEFT_WIDTH : 0,
          overflow: 'hidden',
          transition: 'width 0.22s ease, min-width 0.22s ease',
          flexShrink: 0,
          background: t.surface,
          borderRight: leftPanelOpen ? `1px solid ${t.border}` : 'none',
          position: 'relative', zIndex: 30,
        }}>
          <div style={{ width: LEFT_WIDTH, height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
            <NodePalette embedded />
          </div>
        </div>

        {/* ── Left toggle tab ── */}
        <button
          onClick={toggleLeftPanel}
          title={leftPanelOpen ? 'Collapse palette' : 'Expand palette'}
          className="panel-toggle panel-toggle-left"
          style={{ left: leftPanelOpen ? LEFT_WIDTH - 1 : 0 }}
        >
          {leftPanelOpen ? '◂' : '▸'}
        </button>

        {/* ── Canvas area ── */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <FlowCanvas />

          {/* Right toggle tab */}
          <button
            onClick={toggleRightPanel}
            title={rightPanelOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="panel-toggle panel-toggle-right"
            style={{ right: rightPanelOpen ? RIGHT_WIDTH - 1 : 0 }}
          >
            {rightPanelOpen ? '▸' : '◂'}
          </button>

          {/* Right sidebar overlay */}
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: rightPanelOpen ? RIGHT_WIDTH : 0,
            overflow: 'hidden',
            transition: 'width 0.22s ease',
            zIndex: 40,
            pointerEvents: rightPanelOpen ? 'auto' : 'none',
          }}>
            <Sidebar />
          </div>
        </div>
      </div>

      {/* ── Bottom control panel ── */}
      <div style={{
        height: bottomPanelOpen ? 'auto' : 0,
        overflow: 'hidden',
        transition: 'height 0.22s ease',
        flexShrink: 0,
      }}>
        <ControlPanel />
      </div>

      {!bottomPanelOpen && (
        <button
          onClick={toggleBottomPanel}
          title="Expand toolbar"
          className="toolbar-expand"
        >
          ▲ Toolbar
        </button>
      )}

      <OnboardingTour />
    </div>
  );
}
