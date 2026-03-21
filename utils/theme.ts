export const THEMES = {
  dark: {
    bg: '#050811',
    surface: '#080d14',
    surface2: '#0a0f1a',
    border: '#141e2e',
    border2: '#1e2d3d',
    textPrimary: '#e2eaf4',
    textSecondary: '#8fa3b8',
    textMuted: '#4a5a6a',
    accent: '#00d4ff',
    accentBg: '#00d4ff15',
  },
  light: {
    bg: '#f0f4f8',
    surface: '#ffffff',
    surface2: '#f8fafc',
    border: '#e2e8f0',
    border2: '#cbd5e1',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    accent: '#0284c7',
    accentBg: '#0284c715',
  },
};

export type Theme = typeof THEMES.dark;
