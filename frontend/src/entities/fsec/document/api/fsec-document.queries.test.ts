/**
 * FSEC Document Queries - Tests
 * @module entities/fsec-document/api
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryWrapper } from '@test/test-utils';
import { useFsecDocumentsByFsec, useFsecDocument } from './fsec-document.queries';

describe('FSEC Document Queries', () => {
    describe('useFsecDocumentsByFsec', () => {
        it('fetches documents for a FSEC', async () => {
            const fsecId = crypto.randomUUID();
            const { result } = renderHook(() => useFsecDocumentsByFsec(fsecId), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
            expect(Array.isArray(result.current.data)).toBe(true);
        });

        it('does not fetch when fsecId is empty', () => {
            const { result } = renderHook(() => useFsecDocumentsByFsec(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });

    describe('useFsecDocument', () => {
        it('fetches a single FSEC document', async () => {
            const uuid = crypto.randomUUID();
            const { result } = renderHook(() => useFsecDocument(uuid), {
                wrapper: createQueryWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBeDefined();
        });

        it('does not fetch when uuid is empty', () => {
            const { result } = renderHook(() => useFsecDocument(''), {
                wrapper: createQueryWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
        });
    });
});
