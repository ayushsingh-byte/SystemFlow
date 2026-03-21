'use client';

import dynamic from 'next/dynamic';
import Header from '@/components/ui/Header';
import Sidebar from '@/components/ui/Sidebar';
import ControlPanel from '@/components/panels/ControlPanel';
import { useUIStore } from '@/store/uiStore';
import { THEMES } from '@/utils/theme';

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

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw',
      overflow: 'hidden', background: t.bg,
    }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Canvas area */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <FlowCanvas />

          {/* Left panel toggle button - floats on left edge of canvas */}
          <button
            onClick={toggleLeftPanel}
            title={leftPanelOpen ? 'Collapse node palette' : 'Expand node palette'}
            style={{
              position: 'absolute', left: leftPanelOpen ? 0 : 8, top: '50%', transform: 'translateY(-50%)',
              zIndex: 50, width: 20, height: 48, background: t.surface2, border: `1px solid ${t.border}`,
              borderRadius: '0 6px 6px 0', cursor: 'pointer', color: t.textSecondary,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
              transition: 'left 0.25s ease',
            }}
          >
            {leftPanelOpen ? '◀' : '▶'}
          </button>

          {/* Right panel toggle - floats on right edge */}
          <button
            onClick={toggleRightPanel}
            title={rightPanelOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            style={{
              position: 'absolute', right: rightPanelOpen ? 0 : 8, top: '50%', transform: 'translateY(-50%)',
              zIndex: 50, width: 20, height: 48, background: t.surface2, border: `1px solid ${t.border}`,
              borderRadius: '6px 0 0 6px', cursor: 'pointer', color: t.textSecondary,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
              transition: 'right 0.25s ease',
            }}
          >
            {rightPanelOpen ? '▶' : '◀'}
          </button>
        </div>

        {/* Right sidebar - animated */}
        <div style={{
          width: rightPanelOpen ? 380 : 0,
          minWidth: 0,
          overflow: 'hidden',
          transition: 'width 0.25s ease',
          flexShrink: 0,
        }}>
          {rightPanelOpen && <Sidebar />}
        </div>
      </div>

      {/* Bottom ribbon */}
      <div style={{
        height: bottomPanelOpen ? 'auto' : 0,
        overflow: 'hidden',
        transition: 'height 0.25s ease',
        flexShrink: 0,
        position: 'relative',
      }}>
        <ControlPanel />
        {/* Bottom collapse button */}
        <button
          onClick={toggleBottomPanel}
          title="Collapse toolbar"
          style={{
            position: 'absolute', right: 60, top: -12, zIndex: 100,
            width: 60, height: 12, background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: '6px 6px 0 0', cursor: 'pointer', color: t.textSecondary,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8,
          }}
        >
          ▼
        </button>
      </div>

      {/* Bottom show button when collapsed */}
      {!bottomPanelOpen && (
        <button
          onClick={toggleBottomPanel}
          title="Expand toolbar"
          style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            zIndex: 200, padding: '3px 20px', background: t.surface2, border: `1px solid ${t.border}`,
            borderRadius: '6px 6px 0 0', cursor: 'pointer', color: t.accent,
            fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
          }}
        >
          ▲ TOOLBAR
        </button>
      )}
    </div>
  );
}
