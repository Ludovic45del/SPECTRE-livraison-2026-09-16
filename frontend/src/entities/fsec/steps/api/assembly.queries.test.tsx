/**
 * Assembly Steps Queries Tests
 *
 * Tests for TanStack Query hooks for Assembly steps using MSW.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach } from 'vitest';
import {
    useAssemblyStepsByFsec,
    useCreateAssemblyStep,
    useUpdateAssemblyStep,
    useDeleteAssemblyStep,
} from './assembly.queries';
import { createQueryWrapper, server } from '@test/test-utils';

// Mock data matching AssemblyStepApiSchema
const fsecVersionUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const stepUuid1 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
const stepUuid2 = 'c3d4e5f6-a7b8-9012-cdef-123456789012';

const mockAssemblyStep = {
    uuid: stepUuid1,
    fsec_version_id: fsecVersionUuid,
    operator: 'Assembleur Test',
    operator_user_uuid: null,
    operator_user_uuids: [],
    start_date: '2025-02-01',
    end_date: '2025-02-15',
    comments: 'Test assembly step',
    machine_uuids: ['423e4567-e89b-12d3-a456-426614174003'],
};

const OPERATOR_UUID_A = 'e5f6a7b8-c9d0-1234-efab-345678901234';
const OPERATOR_UUID_B = 'f6a7b8c9-d0e1-2345-fabc-456789012345';

const mockAssemblySteps = [
    mockAssemblyStep,
    {
        ...mockAssemblyStep,
        uuid: stepUuid2,
        comments: 'Second assembly step',
    },
];

// ============================================================================
// useAssemblyStepsByFsec TESTS
// ============================================================================

describe('useAssemblyStepsByFsec', () => {
    beforeEach(() => {
        server.use(
            http.get(`/api/v1/assembly-steps/fsec/${fsecVersionUuid}/`, () => {
                return HttpResponse.json(mockAssemblySteps);
            }),
        );
    });

    it('should fetch assembly steps by FSEC version', async () => {
        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useAssemblyStepsByFsec(fsecVersionUuid), { wrapper });

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(2);
        expect(result.current.data?.[0].uuid).toBe(stepUuid1);
    });

    it('should not fetch when fsecVersionUuid is empty', async () => {
        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useAssemblyStepsByFsec(''), { wrapper });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('should handle empty response', async () => {
        server.use(
            http.get(`/api/v1/assembly-steps/fsec/${fsecVersionUuid}/`, () => {
                return HttpResponse.json([]);
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useAssemblyStepsByFsec(fsecVersionUuid), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(0);
    });

    it('should handle server error', async () => {
        server.use(
            http.get(`/api/v1/assembly-steps/fsec/${fsecVersionUuid}/`, () => {
                return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useAssemblyStepsByFsec(fsecVersionUuid), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// useCreateAssemblyStep TESTS
// ============================================================================

describe('useCreateAssemblyStep', () => {
    it('should create assembly step successfully', async () => {
        server.use(
            http.post('/api/v1/assembly-steps/', async ({ request }) => {
                const body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(
                    {
                        ...mockAssemblyStep,
                        uuid: 'd4e5f6a7-b8c9-0123-defa-234567890123',
                        ...body,
                    },
                    { status: 201 },
                );
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCreateAssemblyStep(), { wrapper });

        const newStep = {
            fsecVersionId: fsecVersionUuid,
            operator: 'Assembleur Dupont',
            operatorUserUuid: null,
            startDate: new Date('2025-03-01'),
            endDate: new Date('2025-03-15'),
            comments: 'New step',
            machineUuids: ['423e4567-e89b-12d3-a456-426614174003'],
        };

        result.current.mutate(newStep);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.uuid).toBe('d4e5f6a7-b8c9-0123-defa-234567890123');
    });

    it('should send and round-trip multiple operators', async () => {
        let receivedBody: Record<string, unknown> | null = null;
        server.use(
            http.post('/api/v1/assembly-steps/', async ({ request }) => {
                receivedBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ ...mockAssemblyStep, uuid: stepUuid2, ...receivedBody }, { status: 201 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCreateAssemblyStep(), { wrapper });

        result.current.mutate({
            fsecVersionId: fsecVersionUuid,
            operatorUserUuids: [OPERATOR_UUID_A, OPERATOR_UUID_B],
            startDate: new Date('2025-03-01'),
            machineUuids: [],
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(receivedBody!.operator_user_uuids).toEqual([OPERATOR_UUID_A, OPERATOR_UUID_B]);
        expect(result.current.data?.operatorUserUuids).toEqual([OPERATOR_UUID_A, OPERATOR_UUID_B]);
    });

    it('should handle validation error', async () => {
        server.use(
            http.post('/api/v1/assembly-steps/', () => {
                return HttpResponse.json({ error: 'Validation Error' }, { status: 400 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCreateAssemblyStep(), { wrapper });

        result.current.mutate({
            fsecVersionId: fsecVersionUuid,
            operator: null,
            operatorUserUuid: null,
            startDate: null,
            endDate: null,
            comments: '',
            machineUuids: [],
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should handle server error', async () => {
        server.use(
            http.post('/api/v1/assembly-steps/', () => {
                return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCreateAssemblyStep(), { wrapper });

        result.current.mutate({
            fsecVersionId: fsecVersionUuid,
            operator: 'Assembleur',
            operatorUserUuid: null,
            startDate: null,
            endDate: null,
            comments: '',
            machineUuids: [],
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// useUpdateAssemblyStep TESTS
// ============================================================================

describe('useUpdateAssemblyStep', () => {
    it('should update assembly step successfully', async () => {
        const stepUuid = stepUuid1;

        server.use(
            http.put(`/api/v1/assembly-steps/${stepUuid}/`, async ({ request }) => {
                const body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({
                    ...mockAssemblyStep,
                    ...body,
                });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useUpdateAssemblyStep(), { wrapper });

        result.current.mutate({
            uuid: stepUuid,
            fsecVersionId: fsecVersionUuid,
            operator: 'Assembleur Martin',
            operatorUserUuid: null,
            startDate: null,
            endDate: null,
            comments: 'Updated comment',
            machineUuids: ['423e4567-e89b-12d3-a456-426614174003'],
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.comments).toBe('Updated comment');
    });

    it('should handle not found error', async () => {
        server.use(
            http.put('/api/v1/assembly-steps/:uuid/', () => {
                return new HttpResponse(null, { status: 404 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useUpdateAssemblyStep(), { wrapper });

        result.current.mutate({
            uuid: 'non-existent-uuid',
            fsecVersionId: fsecVersionUuid,
            operator: 'Assembleur',
            operatorUserUuid: null,
            startDate: null,
            endDate: null,
            comments: '',
            machineUuids: [],
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// useDeleteAssemblyStep TESTS
// ============================================================================

describe('useDeleteAssemblyStep', () => {
    it('should delete assembly step successfully', async () => {
        const stepUuid = stepUuid1;
        let deleteCalled = false;

        server.use(
            http.delete(`/api/v1/assembly-steps/${stepUuid}/`, () => {
                deleteCalled = true;
                return new HttpResponse(null, { status: 204 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useDeleteAssemblyStep(), { wrapper });

        result.current.mutate({ uuid: stepUuid, fsecVersionId: fsecVersionUuid });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(deleteCalled).toBe(true);
    });

    it('should handle not found error', async () => {
        server.use(
            http.delete('/api/v1/assembly-steps/:uuid/', () => {
                return new HttpResponse(null, { status: 404 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useDeleteAssemblyStep(), { wrapper });

        result.current.mutate({ uuid: 'non-existent-uuid', fsecVersionId: fsecVersionUuid });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should handle server error', async () => {
        server.use(
            http.delete('/api/v1/assembly-steps/:uuid/', () => {
                return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useDeleteAssemblyStep(), { wrapper });

        result.current.mutate({ uuid: stepUuid1, fsecVersionId: fsecVersionUuid });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// CACHE INVALIDATION TESTS
// ============================================================================

describe('Cache Invalidation', () => {
    it('should invalidate assembly steps query after create', async () => {
        let fetchCount = 0;

        server.use(
            http.get(`/api/v1/assembly-steps/fsec/${fsecVersionUuid}/`, () => {
                fetchCount++;
                return HttpResponse.json(mockAssemblySteps);
            }),
            http.post('/api/v1/assembly-steps/', () => {
                return HttpResponse.json(mockAssemblyStep, { status: 201 });
            }),
        );

        const wrapper = createQueryWrapper();

        // First, fetch the list
        const { result: listResult } = renderHook(() => useAssemblyStepsByFsec(fsecVersionUuid), { wrapper });
        await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

        const initialFetchCount = fetchCount;

        // Then create a new step
        const { result: createResult } = renderHook(() => useCreateAssemblyStep(), { wrapper });
        createResult.current.mutate({
            fsecVersionId: fsecVersionUuid,
            operator: 'Assembleur',
            operatorUserUuid: null,
            startDate: null,
            endDate: null,
            comments: '',
            machineUuids: [],
        });

        await waitFor(() => expect(createResult.current.isSuccess).toBe(true));

        // The list should be refetched due to invalidation
        await waitFor(() => expect(fetchCount).toBeGreaterThan(initialFetchCount));
    });
});
