/**
 * Campaign Queries Tests
 *
 * Tests for TanStack Query hooks using MSW for API mocking.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, it, expect } from 'vitest';
import { useCampaigns, useCampaign, useCreateCampaign, useUpdateCampaign, useDeleteCampaign } from './campaign.queries';
import { createQueryWrapper, server } from '@test/test-utils';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockCampaign = {
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    type_id: 0,
    status_id: 0,
    installation_id: 0,
    name: 'Campagne Test',
    year: 2025,
    semester: 'S1',
    last_updated: '2025-01-15T10:00:00Z',
    start_date: '2025-01-15',
    end_date: '2025-06-30',
    dtri_number: 12345,
    description: 'Description test',
};

const mockCampaigns = [
    mockCampaign,
    {
        ...mockCampaign,
        uuid: '223e4567-e89b-12d3-a456-426614174001',
        name: 'Campagne Test 2',
    },
];

// ============================================================================
// useCampaigns TESTS
// ============================================================================

describe('useCampaigns', () => {
    it('should fetch campaigns list successfully', async () => {
        server.use(
            http.get('/api/v1/campaigns/', () => {
                return HttpResponse.json(mockCampaigns);
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCampaigns(), { wrapper });

        // Initially loading
        expect(result.current.isLoading).toBe(true);

        // Wait for data
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Check data
        expect(result.current.data).toHaveLength(2);
        expect(result.current.data?.[0].name).toBe('Campagne Test');
    });

    it('should handle empty campaigns list', async () => {
        server.use(
            http.get('/api/v1/campaigns/', () => {
                return HttpResponse.json([]);
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCampaigns(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(0);
    });

    it('should handle server error', async () => {
        server.use(
            http.get('/api/v1/campaigns/', () => {
                return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCampaigns(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBeDefined();
    });

    it('should handle network error', async () => {
        server.use(
            http.get('/api/v1/campaigns/', () => {
                return HttpResponse.error();
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCampaigns(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// useCampaign TESTS
// ============================================================================

describe('useCampaign', () => {
    const campaignUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('should fetch single campaign successfully', async () => {
        server.use(
            http.get(`/api/v1/campaigns/${campaignUuid}/`, () => {
                return HttpResponse.json(mockCampaign);
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCampaign(campaignUuid), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.uuid).toBe(campaignUuid);
        expect(result.current.data?.name).toBe('Campagne Test');
    });

    it('should not fetch when uuid is empty', async () => {
        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCampaign(''), { wrapper });

        // Should not be loading (disabled query)
        expect(result.current.isLoading).toBe(false);
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('should handle 404 not found', async () => {
        server.use(
            http.get(`/api/v1/campaigns/${campaignUuid}/`, () => {
                return new HttpResponse(null, { status: 404 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCampaign(campaignUuid), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// useCreateCampaign TESTS
// ============================================================================

describe('useCreateCampaign', () => {
    it('should create campaign successfully', async () => {
        const newCampaign = {
            name: 'Nouvelle Campagne',
            year: 2025,
            semester: 'S2' as const,
            typeId: 0,
            statusId: 0,
            installationId: 0,
        };

        server.use(
            http.post('/api/v1/campaigns/', async ({ request }) => {
                const body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(
                    {
                        ...mockCampaign,
                        uuid: '333e4567-e89b-12d3-a456-426614174002',
                        name: body.name,
                    },
                    { status: 201 },
                );
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCreateCampaign(), { wrapper });

        // Execute mutation
        result.current.mutate(newCampaign);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.name).toBe('Nouvelle Campagne');
    });

    it('should handle validation error', async () => {
        server.use(
            http.post('/api/v1/campaigns/', () => {
                return HttpResponse.json({ error: 'Validation Error', details: { name: 'Required' } }, { status: 400 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCreateCampaign(), { wrapper });

        result.current.mutate({
            name: '',
            year: 2025,
            semester: 'S1',
            typeId: 0,
            statusId: 0,
            installationId: 0,
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should handle duplicate conflict', async () => {
        server.use(
            http.post('/api/v1/campaigns/', () => {
                return HttpResponse.json({ error: 'Conflict', message: 'Campaign already exists' }, { status: 409 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCreateCampaign(), { wrapper });

        result.current.mutate({
            name: 'Existing Campaign',
            year: 2025,
            semester: 'S1',
            typeId: 0,
            statusId: 0,
            installationId: 0,
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// useUpdateCampaign TESTS
// ============================================================================

describe('useUpdateCampaign', () => {
    const campaignUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('should update campaign successfully', async () => {
        server.use(
            http.put(`/api/v1/campaigns/${campaignUuid}/`, async ({ request }) => {
                const body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({
                    ...mockCampaign,
                    name: body.name,
                    description: body.description,
                });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useUpdateCampaign(), { wrapper });

        result.current.mutate({
            uuid: campaignUuid,
            data: {
                name: 'Campagne Modifiée',
                year: 2025,
                semester: 'S1',
                typeId: 1,
                statusId: 1,
                installationId: 0,
                description: 'Description modifiée',
            },
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.name).toBe('Campagne Modifiée');
    });

    it('should handle not found error', async () => {
        server.use(
            http.put(`/api/v1/campaigns/${campaignUuid}/`, () => {
                return new HttpResponse(null, { status: 404 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useUpdateCampaign(), { wrapper });

        result.current.mutate({
            uuid: campaignUuid,
            data: {
                name: 'Update',
                year: 2025,
                semester: 'S1',
                typeId: 0,
                statusId: 0,
                installationId: 0,
            },
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// useDeleteCampaign TESTS
// ============================================================================

describe('useDeleteCampaign', () => {
    const campaignUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete campaign successfully', async () => {
        server.use(
            http.delete(`/api/v1/campaigns/${campaignUuid}/`, () => {
                return new HttpResponse(null, { status: 204 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useDeleteCampaign(), { wrapper });

        result.current.mutate(campaignUuid);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle delete not found', async () => {
        server.use(
            http.delete(`/api/v1/campaigns/${campaignUuid}/`, () => {
                return new HttpResponse(null, { status: 404 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useDeleteCampaign(), { wrapper });

        result.current.mutate(campaignUuid);

        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should handle delete server error', async () => {
        server.use(
            http.delete(`/api/v1/campaigns/${campaignUuid}/`, () => {
                return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useDeleteCampaign(), { wrapper });

        result.current.mutate(campaignUuid);

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
