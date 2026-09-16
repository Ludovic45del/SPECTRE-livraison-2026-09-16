/**
 * FSEC Team Queries - Tests
 * @module entities/fsec-team/api
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper } from '@test/test-utils';
import { useFsecTeamsByFsec, useFsecTeamMember } from './fsec-team.queries';

describe('FSEC Team Queries', () => {
    describe('useFsecTeamsByFsec', () => {
        it('fetches team members for a FSEC', async () => {
            const fsecId = crypto.randomUUID();
            const { result } = renderHook(() => useFsecTeamsByFsec(fsecId), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });

        it('does not fetch when fsecId is empty', () => {
            const { result } = renderHook(() => useFsecTeamsByFsec(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });

    describe('useFsecTeamMember', () => {
        it('fetches a single FSEC team member', async () => {
            const uuid = crypto.randomUUID();
            const { result } = renderHook(() => useFsecTeamMember(uuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
        });

        it('does not fetch when uuid is empty', () => {
            const { result } = renderHook(() => useFsecTeamMember(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });
});
