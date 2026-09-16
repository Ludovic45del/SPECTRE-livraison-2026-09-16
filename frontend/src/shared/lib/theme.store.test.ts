/**
 * Tests du store de thème : cycle de bascule clair → sombre → crème → clair.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useThemeStore, THEME_CYCLE } from './theme.store';

beforeEach(() => {
    // Repart toujours du mode clair par défaut.
    act(() => {
        useThemeStore.setState({ mode: 'light' });
    });
});

describe('useThemeStore', () => {
    it('démarre en mode clair', () => {
        const { result } = renderHook(() => useThemeStore());
        expect(result.current.mode).toBe('light');
    });

    it('toggleMode parcourt le cycle clair → sombre → crème → clair', () => {
        const { result } = renderHook(() => useThemeStore());

        act(() => result.current.toggleMode());
        expect(result.current.mode).toBe('dark');

        act(() => result.current.toggleMode());
        expect(result.current.mode).toBe('cream');

        act(() => result.current.toggleMode());
        expect(result.current.mode).toBe('light');
    });

    it('setMode positionne directement un mode', () => {
        const { result } = renderHook(() => useThemeStore());

        act(() => result.current.setMode('cream'));
        expect(result.current.mode).toBe('cream');

        act(() => result.current.setMode('dark'));
        expect(result.current.mode).toBe('dark');
    });

    it('THEME_CYCLE contient les trois modes dans le bon ordre', () => {
        expect([...THEME_CYCLE]).toEqual(['light', 'dark', 'cream']);
    });
});
