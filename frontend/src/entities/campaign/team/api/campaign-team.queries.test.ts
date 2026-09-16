/**
 * Campaign Team Queries - Tests
 * @module entities/campaign-team/api
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper } from '@test/test-utils';
import { useCampaignTeam } from './campaign-team.queries';

describe('Campaign Team Queries', () => {
    describe('useCampaignTeam', () => {
        it('fetches team members for a campaign', async () => {
            const campaignUuid = crypto.randomUUID();
            const { result } = renderHook(() => useCampaignTeam(campaignUuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });

        it('does not fetch when campaignUuid is empty', () => {
            const { result } = renderHook(() => useCampaignTeam(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });
});
