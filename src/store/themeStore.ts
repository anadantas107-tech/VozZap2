// ============================================================
// VozZap - Theme Store (Zustand)
// Persists user theme preference to localStorage
// ============================================================

import { create } from 'zustand';
import { Theme } from '@/types';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const getInitialTheme = (): Theme => {
  const stored = localStorage.getItem('vozzap_theme') as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  // Respect OS preference on first visit
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    localStorage.setItem('vozzap_theme', theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next: Theme = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('vozzap_theme', next);
    set({ theme: next });
  },
}));
