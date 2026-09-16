/**
 * Photo View Queries - Tests
 * @module entities/steps/api
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper } from '@test/test-utils';
import { usePhotoViewsByPicturesStep, usePhotoView } from './photo-view.queries';

describe('Photo View Queries', () => {
    describe('usePhotoViewsByPicturesStep', () => {
        it('fetches photo views for a pictures step', async () => {
            const picturesStepId = crypto.randomUUID();
            const { result } = renderHook(() => usePhotoViewsByPicturesStep(picturesStepId), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });

        it('does not fetch when picturesStepId is empty', () => {
            const { result } = renderHook(() => usePhotoViewsByPicturesStep(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });

    describe('usePhotoView', () => {
        it('fetches a single photo view', async () => {
            const uuid = crypto.randomUUID();
            const { result } = renderHook(() => usePhotoView(uuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
        });

        it('does not fetch when uuid is empty', () => {
            const { result } = renderHook(() => usePhotoView(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });
});
