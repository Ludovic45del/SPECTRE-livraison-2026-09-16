/**
 * Tests de la machine à états pure useDateRangeSelection.
 */
import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import dayjs from 'dayjs';
import { useDateRangeSelection } from './useDateRangeSelection';

const d = (iso: string) => dayjs(iso);

describe('useDateRangeSelection', () => {
    it('starts empty (idle, no dates) by default', () => {
        const { result } = renderHook(() => useDateRangeSelection());
        expect(result.current.start).toBeNull();
        expect(result.current.end).toBeNull();
        expect(result.current.phase).toBe('idle');
    });

    it('seeds from the initial range', () => {
        const { result } = renderHook(() => useDateRangeSelection({ start: d('2026-05-07'), end: d('2026-05-09') }));
        expect(result.current.start?.format('YYYY-MM-DD')).toBe('2026-05-07');
        expect(result.current.end?.format('YYYY-MM-DD')).toBe('2026-05-09');
        expect(result.current.phase).toBe('idle');
    });

    it('first click sets start and enters picking-end', () => {
        const { result } = renderHook(() => useDateRangeSelection());
        act(() => result.current.handleDayClick(d('2026-05-07')));
        expect(result.current.start?.format('YYYY-MM-DD')).toBe('2026-05-07');
        expect(result.current.end).toBeNull();
        expect(result.current.phase).toBe('picking-end');
    });

    it('second click (later day) sets end and returns to idle', () => {
        const { result } = renderHook(() => useDateRangeSelection());
        act(() => result.current.handleDayClick(d('2026-05-07')));
        act(() => result.current.handleDayClick(d('2026-05-09')));
        expect(result.current.start?.format('YYYY-MM-DD')).toBe('2026-05-07');
        expect(result.current.end?.format('YYYY-MM-DD')).toBe('2026-05-09');
        expect(result.current.phase).toBe('idle');
    });

    it('swaps when the second click is before the start', () => {
        const { result } = renderHook(() => useDateRangeSelection());
        act(() => result.current.handleDayClick(d('2026-05-09')));
        act(() => result.current.handleDayClick(d('2026-05-07')));
        expect(result.current.start?.format('YYYY-MM-DD')).toBe('2026-05-07');
        expect(result.current.end?.format('YYYY-MM-DD')).toBe('2026-05-09');
        expect(result.current.phase).toBe('idle');
    });

    it('a single-day range is allowed (click the same day twice)', () => {
        const { result } = renderHook(() => useDateRangeSelection());
        act(() => result.current.handleDayClick(d('2026-05-07')));
        act(() => result.current.handleDayClick(d('2026-05-07')));
        expect(result.current.start?.format('YYYY-MM-DD')).toBe('2026-05-07');
        expect(result.current.end?.format('YYYY-MM-DD')).toBe('2026-05-07');
        expect(result.current.phase).toBe('idle');
    });

    it('a third click starts a fresh range', () => {
        const { result } = renderHook(() => useDateRangeSelection());
        act(() => result.current.handleDayClick(d('2026-05-07')));
        act(() => result.current.handleDayClick(d('2026-05-09')));
        act(() => result.current.handleDayClick(d('2026-05-20')));
        expect(result.current.start?.format('YYYY-MM-DD')).toBe('2026-05-20');
        expect(result.current.end).toBeNull();
        expect(result.current.phase).toBe('picking-end');
    });

    it('reset clears the range', () => {
        const { result } = renderHook(() => useDateRangeSelection({ start: d('2026-05-07'), end: d('2026-05-09') }));
        act(() => result.current.reset());
        expect(result.current.start).toBeNull();
        expect(result.current.end).toBeNull();
        expect(result.current.phase).toBe('idle');
    });

    it('setRange forces an explicit range and idles', () => {
        const { result } = renderHook(() => useDateRangeSelection());
        act(() => result.current.handleDayClick(d('2026-05-07'))); // picking-end
        act(() => result.current.setRange({ start: d('2026-06-01'), end: d('2026-06-05') }));
        expect(result.current.start?.format('YYYY-MM-DD')).toBe('2026-06-01');
        expect(result.current.end?.format('YYYY-MM-DD')).toBe('2026-06-05');
        expect(result.current.phase).toBe('idle');
    });
});
