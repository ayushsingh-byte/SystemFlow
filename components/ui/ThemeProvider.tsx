'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Initial render script to prevent flash of wrong theme (runs before hydration)
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            try {
              const item = localStorage.getItem('infraflow-ui');
              if (item) {
                const state = JSON.parse(item).state;
                if (state && state.theme) {
                  document.documentElement.setAttribute('data-theme', state.theme);
                }
              }
            } catch (e) {}
          `,
        }}
      />
      {children}
    </>
  );
}
