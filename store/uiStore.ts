import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  theme: 'dark' | 'light';
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;
  ribbonTab: 'simulate' | 'traffic' | 'profiles' | 'chaos';
  toggleTheme: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
  setRibbonTab: (tab: UIState['ribbonTab']) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      leftPanelOpen: true,
      rightPanelOpen: true,
      bottomPanelOpen: true,
      ribbonTab: 'simulate',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
      setRibbonTab: (tab) => set({ ribbonTab: tab }),
    }),
    {
      name: 'infraflow-ui',
      partialize: (s) => ({
        theme: s.theme,
        leftPanelOpen: s.leftPanelOpen,
        rightPanelOpen: s.rightPanelOpen,
        bottomPanelOpen: s.bottomPanelOpen,
        ribbonTab: s.ribbonTab,
      }),
    }
  )
);
