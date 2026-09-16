/**
 * Campaign Document Queries - Tests
 * @module entities/campaign-document/api
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper } from '@test/test-utils';
import { useCampaignDocuments } from './campaign-document.queries';

describe('Campaign Document Queries', () => {
    describe('useCampaignDocuments', () => {
        it('fetches documents for a campaign', async () => {
            const campaignUuid = crypto.randomUUID();
            const { result } = renderHook(() => useCampaignDocuments(campaignUuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });

        it('does not fetch when campaignUuid is empty', () => {
            const { result } = renderHook(() => useCampaignDocuments(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });
});
