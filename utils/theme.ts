export const THEMES = {
  dark: {
    bg: '#09090b',
    surface: '#18181b',
    surface2: '#27272a',
    border: '#27272a',
    border2: '#3f3f46',
    textPrimary: '#f4f4f5',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    accent: '#0ea5e9',
    accentBg: 'rgba(14, 165, 233, 0.15)',
  },
  light: {
    bg: '#fafafa',
    surface: '#ffffff',
    surface2: '#f4f4f5',
    border: '#e4e4e7',
    border2: '#d4d4d8',
    textPrimary: '#09090b',
    textSecondary: '#52525b',
    textMuted: '#71717a',
    accent: '#0284c7',
    accentBg: 'rgba(2, 132, 199, 0.15)',
  },
};

export type Theme = typeof THEMES.dark;
