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
    <div style={{
      flex: 1,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#050811', gap: 12,
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.2 }}>
        <path d="M12 2L21.5 7.5v9L12 22l-9.5-5.5v-9L12 2z" stroke="#00d4ff" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
      <div style={{ fontSize: 11, color: '#374151', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
        LOADING CANVAS...
      </div>
    </div>
  ),
});

export default function Home() {
  const {
    theme,
    leftPanelOpen,
    rightPanelOpen,
    bottomPanelOpen,
    toggleLeftPanel,
    toggleRightPanel,
    toggleBottomPanel,
  } = useUIStore();
  const t = THEMES[theme];
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  if (!user) return null;

  const LEFT_WIDTH = 285;
  const RIGHT_WIDTH = 360;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw',
      overflow: 'hidden', background: t.bg,
    }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Left panel — proper sidebar attached to left edge */}
        <div style={{
          width: leftPanelOpen ? LEFT_WIDTH : 0,
          minWidth: leftPanelOpen ? LEFT_WIDTH : 0,
          overflow: 'hidden',
          transition: 'width 0.25s ease, min-width 0.25s ease',
          flexShrink: 0,
          background: t.surface,
          borderRight: leftPanelOpen ? `1px solid ${t.border}` : 'none',
          position: 'relative',
          zIndex: 30,
        }}>
          <div style={{ width: LEFT_WIDTH, height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
            <NodePalette embedded />
          </div>
        </div>

        {/* Left panel toggle tab */}
        <button
          onClick={toggleLeftPanel}
          title={leftPanelOpen ? 'Collapse node palette' : 'Expand node palette'}
          style={{
            position: 'absolute',
            left: leftPanelOpen ? LEFT_WIDTH - 1 : 0,
            top: '50%', transform: 'translateY(-50%)',
            zIndex: 50, width: 18, height: 52,
            background: t.surface2, border: `1px solid ${t.border}`,
            borderLeft: leftPanelOpen ? 'none' : `1px solid ${t.border}`,
            borderRadius: leftPanelOpen ? '0 6px 6px 0' : '0 6px 6px 0',
            cursor: 'pointer', color: t.textSecondary,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9,
            transition: 'left 0.25s ease',
          }}
        >
          {leftPanelOpen ? '◀' : '▶'}
        </button>

        {/* Canvas area */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <FlowCanvas />

          {/* Right panel toggle tab */}
          <button
            onClick={toggleRightPanel}
            title={rightPanelOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            style={{
              position: 'absolute',
              right: rightPanelOpen ? RIGHT_WIDTH - 1 : 0,
              top: '50%', transform: 'translateY(-50%)',
              zIndex: 50, width: 18, height: 52,
              background: t.surface2, border: `1px solid ${t.border}`,
              borderRight: rightPanelOpen ? 'none' : `1px solid ${t.border}`,
              borderRadius: '6px 0 0 6px',
              cursor: 'pointer', color: t.textSecondary,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9,
              transition: 'right 0.25s ease',
            }}
          >
            {rightPanelOpen ? '▶' : '◀'}
          </button>

          {/* Right sidebar as absolute overlay — attached to right edge */}
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0,
            width: rightPanelOpen ? RIGHT_WIDTH : 0,
            overflow: 'hidden',
            transition: 'width 0.25s ease',
            zIndex: 40,
            pointerEvents: rightPanelOpen ? 'auto' : 'none',
          }}>
            <Sidebar />
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div style={{
        height: bottomPanelOpen ? 'auto' : 0,
        overflow: 'hidden',
        transition: 'height 0.25s ease',
        flexShrink: 0,
        position: 'relative',
      }}>
        <ControlPanel />
      </div>

      {/* Bottom expand button when collapsed */}
      {!bottomPanelOpen && (
        <button
          onClick={toggleBottomPanel}
          title="Expand toolbar"
          style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            zIndex: 200, padding: '4px 24px', background: t.surface2, border: `1px solid ${t.border}`,
            borderRadius: '6px 6px 0 0', cursor: 'pointer', color: t.accent,
            fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
            letterSpacing: '0.08em',
          }}
        >
          ▲ TOOLBAR
        </button>
      )}

      <OnboardingTour />
    </div>
  );
}
