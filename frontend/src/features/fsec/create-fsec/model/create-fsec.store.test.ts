/**
 * Tests for Create FSEC Store
 *
 * Tests the Zustand store driving the FSEC creation modal, with a focus on
 * how `open()` sets `preselectedCampaignId` (which locks the campaign field).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCreateFsecStore } from './create-fsec.store';

describe('useCreateFsecStore', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useCreateFsecStore());
        act(() => {
            result.current.reset();
        });
    });

    it('is closed with no preselected campaign initially', () => {
        const { result } = renderHook(() => useCreateFsecStore());

        expect(result.current.isOpen).toBe(false);
        expect(result.current.preselectedCampaignId).toBeNull();
    });

    it('opens without preselecting a campaign when called with no arg', () => {
        const { result } = renderHook(() => useCreateFsecStore());

        act(() => {
            result.current.open();
        });

        expect(result.current.isOpen).toBe(true);
        expect(result.current.preselectedCampaignId).toBeNull();
    });

    it('preselects the campaign when opened from a campaign context', () => {
        const { result } = renderHook(() => useCreateFsecStore());
        const campaignId = '11111111-1111-1111-1111-111111111111';

        act(() => {
            result.current.open(campaignId);
        });

        expect(result.current.isOpen).toBe(true);
        expect(result.current.preselectedCampaignId).toBe(campaignId);
    });

    it('ignores a non-string arg so a click MouseEvent cannot lock the campaign field', () => {
        const { result } = renderHook(() => useCreateFsecStore());
        // Simulates `onClick={open}` where React forwards the MouseEvent.
        const fakeEvent = { type: 'click', currentTarget: {} } as unknown as string;

        act(() => {
            result.current.open(fakeEvent);
        });

        expect(result.current.isOpen).toBe(true);
        expect(result.current.preselectedCampaignId).toBeNull();
    });

    it('clears the preselected campaign on reset', () => {
        const { result } = renderHook(() => useCreateFsecStore());

        act(() => {
            result.current.open('22222222-2222-2222-2222-222222222222');
        });
        act(() => {
            result.current.reset();
        });

        expect(result.current.isOpen).toBe(false);
        expect(result.current.preselectedCampaignId).toBeNull();
    });
});
