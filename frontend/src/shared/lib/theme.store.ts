/**
 * Theme Mode Store
 * @module shared/lib
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'cream';

/**
 * Ordre de bascule du bouton de thème : clair → sombre → crème → clair.
 * Le mode « crème » est une variante chaude du mode clair (cf. createAppTheme).
 */
export const THEME_CYCLE: readonly ThemeMode[] = ['light', 'dark', 'cream'];

interface ThemeState {
    mode: ThemeMode;
    toggleMode: () => void;
    setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            mode: 'light',
            toggleMode: () =>
                set((state) => {
                    const idx = THEME_CYCLE.indexOf(state.mode);
                    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
                    return { mode: next };
                }),
            setMode: (mode) => set({ mode }),
        }),
        { name: 'theme-mode' },
    ),
);
