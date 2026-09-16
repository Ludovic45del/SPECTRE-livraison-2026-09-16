/**
 * Test du sélecteur de couleurs planning : il doit suivre les TROIS modes du
 * store (clair / sombre / crème), et non le `palette.mode` binaire de MUI.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useThemeStore } from '@shared/lib/theme.store';
import { usePlanningColors } from './planning.hooks';
import { PLANNING_COLORS_CREAM, PLANNING_COLORS_DARK, PLANNING_COLORS_LIGHT } from './planning.constants';

beforeEach(() => {
    act(() => useThemeStore.setState({ mode: 'light' }));
});

describe('usePlanningColors', () => {
    it('mode clair → palette claire', () => {
        const { result } = renderHook(() => usePlanningColors());
        expect(result.current).toBe(PLANNING_COLORS_LIGHT);
    });

    it('mode sombre → palette sombre', () => {
        act(() => useThemeStore.setState({ mode: 'dark' }));
        const { result } = renderHook(() => usePlanningColors());
        expect(result.current).toBe(PLANNING_COLORS_DARK);
    });

    it('mode crème → palette crème (pas la claire froide)', () => {
        act(() => useThemeStore.setState({ mode: 'cream' }));
        const { result } = renderHook(() => usePlanningColors());
        expect(result.current).toBe(PLANNING_COLORS_CREAM);
        expect(result.current).not.toBe(PLANNING_COLORS_LIGHT);
    });
});
