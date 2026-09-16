/**
 * FSEC Queries Tests
 *
 * Tests for TanStack Query hooks for FSEC operations using MSW.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach } from 'vitest';
import {
    useFsecs,
    useFsec,
    useFsecBySlug,
    useFsecsByCampaign,
    useCreateFsec,
    useUpdateFsec,
    useUpdateFsecRequestedViews,
    useDeleteFsec,
} from './fsec.queries';
import { fsecKeys } from './fsec.keys';
import { createQueryWrapper, createTestQueryClient, server } from '@test/test-utils';

// Mock data matching FsecApiSchema
const mockFsec = {
    version_uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    fsec_uuid: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    name: 'FSEC Test 001',
    campaign_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    status_id: 0,
    category_id: 0,
    rack_id: null,
    comments: 'Test comments',
    is_active: true,
    depressurization_failed: null,
    created_at: '2025-01-15T10:00:00Z',
    last_updated: '2025-01-15T10:00:00Z',
    delivery_date: null,
    shooting_date: null,
    preshooting_pressure: null,
    experience_srxx: null,
    localisation: null,
};

const mockFsecList = [
    mockFsec,
    {
        ...mockFsec,
        version_uuid: 'd4e5f6a7-b8c9-0123-defa-234567890123',
        fsec_uuid: 'e5f6a7b8-c9d0-1234-efab-345678901234',
        name: 'FSEC Test 002',
    },
    {
        ...mockFsec,
        version_uuid: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
        fsec_uuid: 'a7b8c9d0-e1f2-3456-abcd-567890123456',
        name: 'FSEC Test 003',
    },
];

const campaignUuid = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
const versionUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

// ============================================================================
// useFsecs TESTS
// ============================================================================

describe('useFsecs', () => {
    beforeEach(() => {
        server.use(
            http.get('/api/v1/fsecs/', () => {
                return HttpResponse.json(mockFsecList);
            }),
        );
    });

    it('should fetch all FSECs', async () => {
        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsecs(), { wrapper });

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(3);
        expect(result.current.data?.[0].name).toBe('FSEC Test 001');
    });

    it('should handle empty response', async () => {
        server.use(
            http.get('/api/v1/fsecs/', () => {
                return HttpResponse.json([]);
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsecs(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(0);
    });

    it('should handle server error', async () => {
        server.use(
            http.get('/api/v1/fsecs/', () => {
                return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsecs(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should return JSON content type', async () => {
        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsecs(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(Array.isArray(result.current.data)).toBe(true);
    });
});

// ============================================================================
// useFsec TESTS
// ============================================================================

describe('useFsec', () => {
    beforeEach(() => {
        server.use(
            http.get(`/api/v1/fsecs/${versionUuid}/`, () => {
                return HttpResponse.json(mockFsec);
            }),
        );
    });

    it('should fetch single FSEC by version UUID', async () => {
        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsec(versionUuid), { wrapper });

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.versionUuid).toBe(versionUuid);
        expect(result.current.data?.name).toBe('FSEC Test 001');
    });

    it('should not fetch when versionUuid is empty', async () => {
        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsec(''), { wrapper });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('should handle 404 error', async () => {
        server.use(
            http.get(`/api/v1/fsecs/${versionUuid}/`, () => {
                return HttpResponse.json({ error: 'Not Found' }, { status: 404 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsec(versionUuid), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should handle server error', async () => {
        server.use(
            http.get(`/api/v1/fsecs/${versionUuid}/`, () => {
                return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsec(versionUuid), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// useFsecsByCampaign TESTS
// ============================================================================

describe('useFsecsByCampaign', () => {
    beforeEach(() => {
        server.use(
            http.get(`/api/v1/fsecs/campaign/${campaignUuid}/`, () => {
                return HttpResponse.json(mockFsecList);
            }),
        );
    });

    it('should fetch FSECs by campaign UUID', async () => {
        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsecsByCampaign(campaignUuid), { wrapper });

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(3);
    });

    it('should not fetch when campaignUuid is empty', async () => {
        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsecsByCampaign(''), { wrapper });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('should handle empty response', async () => {
        server.use(
            http.get(`/api/v1/fsecs/campaign/${campaignUuid}/`, () => {
                return HttpResponse.json([]);
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsecsByCampaign(campaignUuid), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(0);
    });

    it('should handle server error', async () => {
        server.use(
            http.get(`/api/v1/fsecs/campaign/${campaignUuid}/`, () => {
                return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsecsByCampaign(campaignUuid), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// useCreateFsec TESTS
// ============================================================================

describe('useCreateFsec', () => {
    it('should create FSEC successfully', async () => {
        server.use(
            http.post('/api/v1/fsecs/', async ({ request }) => {
                const body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(
                    {
                        ...mockFsec,
                        version_uuid: '11111111-2222-3333-4444-555555555555',
                        fsec_uuid: '66666666-7777-8888-9999-aaaaaaaaaaaa',
                        ...body,
                    },
                    { status: 201 },
                );
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCreateFsec(), { wrapper });

        const newFsec = {
            name: 'New FSEC',
            campaignId: campaignUuid,
            statusId: 0,
            categoryId: 1,
            rackId: null,
            comments: 'New FSEC comments',
        };

        result.current.mutate(newFsec);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.name).toBe('New FSEC');
    });

    it('should handle validation error', async () => {
        server.use(
            http.post('/api/v1/fsecs/', () => {
                return HttpResponse.json({ error: 'Validation Error' }, { status: 400 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCreateFsec(), { wrapper });

        result.current.mutate({
            name: '',
            campaignId: '',
            statusId: 0,
            categoryId: 0,
            rackId: null,
            comments: null,
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should handle server error', async () => {
        server.use(
            http.post('/api/v1/fsecs/', () => {
                return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useCreateFsec(), { wrapper });

        result.current.mutate({
            name: 'Test FSEC',
            campaignId: campaignUuid,
            statusId: 0,
            categoryId: 0,
            rackId: null,
            comments: null,
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// useUpdateFsec TESTS
// ============================================================================

describe('useUpdateFsec', () => {
    it('should update FSEC successfully', async () => {
        server.use(
            http.put(`/api/v1/fsecs/${versionUuid}/`, async ({ request }) => {
                const body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({
                    ...mockFsec,
                    ...body,
                });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useUpdateFsec(), { wrapper });

        result.current.mutate({
            versionUuid: versionUuid,
            data: {
                name: 'Updated FSEC',
                campaignId: campaignUuid,
                statusId: 1,
                categoryId: 0,
                rackId: null,
                comments: 'Updated comments',
            },
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.name).toBe('Updated FSEC');
    });

    it('should handle not found error', async () => {
        server.use(
            http.put('/api/v1/fsecs/:uuid/', () => {
                return new HttpResponse(null, { status: 404 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useUpdateFsec(), { wrapper });

        result.current.mutate({
            versionUuid: 'non-existent-uuid',
            data: {
                name: 'Test',
                campaignId: campaignUuid,
                statusId: 0,
                categoryId: 0,
                rackId: null,
                comments: null,
            },
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should handle server error', async () => {
        server.use(
            http.put(`/api/v1/fsecs/${versionUuid}/`, () => {
                return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useUpdateFsec(), { wrapper });

        result.current.mutate({
            versionUuid: versionUuid,
            data: {
                name: 'Test',
                campaignId: campaignUuid,
                statusId: 0,
                categoryId: 0,
                rackId: null,
                comments: null,
            },
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// useDeleteFsec TESTS
// ============================================================================

describe('useDeleteFsec', () => {
    it('should delete FSEC successfully', async () => {
        let deleteCalled = false;

        server.use(
            http.delete(`/api/v1/fsecs/${versionUuid}/`, () => {
                deleteCalled = true;
                return new HttpResponse(null, { status: 204 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useDeleteFsec(), { wrapper });

        result.current.mutate(versionUuid);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(deleteCalled).toBe(true);
    });

    it('should handle not found error', async () => {
        server.use(
            http.delete('/api/v1/fsecs/:uuid/', () => {
                return new HttpResponse(null, { status: 404 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useDeleteFsec(), { wrapper });

        result.current.mutate('non-existent-uuid');

        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should handle server error', async () => {
        server.use(
            http.delete('/api/v1/fsecs/:uuid/', () => {
                return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useDeleteFsec(), { wrapper });

        result.current.mutate(versionUuid);

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// CACHE INVALIDATION TESTS
// ============================================================================

describe('Cache Invalidation', () => {
    it('should invalidate FSEC list query after create', async () => {
        let fetchCount = 0;

        server.use(
            http.get('/api/v1/fsecs/', () => {
                fetchCount++;
                return HttpResponse.json(mockFsecList);
            }),
            http.post('/api/v1/fsecs/', () => {
                return HttpResponse.json(mockFsec, { status: 201 });
            }),
        );

        const wrapper = createQueryWrapper();

        // First, fetch the list
        const { result: listResult } = renderHook(() => useFsecs(), { wrapper });
        await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

        const initialFetchCount = fetchCount;

        // Then create a new FSEC
        const { result: createResult } = renderHook(() => useCreateFsec(), { wrapper });
        createResult.current.mutate({
            name: 'New FSEC',
            campaignId: campaignUuid,
            statusId: 0,
            categoryId: 0,
            rackId: null,
            comments: null,
        });

        await waitFor(() => expect(createResult.current.isSuccess).toBe(true));

        // The list should be refetched due to invalidation
        await waitFor(() => expect(fetchCount).toBeGreaterThan(initialFetchCount));
    });

    it('should write the FSEC detail cache after update without refetching', async () => {
        let detailFetchCount = 0;

        server.use(
            http.get(`/api/v1/fsecs/${versionUuid}/`, () => {
                detailFetchCount++;
                return HttpResponse.json(mockFsec);
            }),
            http.put(`/api/v1/fsecs/${versionUuid}/`, () => {
                return HttpResponse.json({ ...mockFsec, name: 'Updated' });
            }),
        );

        const client = createTestQueryClient();
        const wrapper = createQueryWrapper(client);

        // First, fetch the detail
        const { result: detailResult } = renderHook(() => useFsec(versionUuid), { wrapper });
        await waitFor(() => expect(detailResult.current.isSuccess).toBe(true));

        const initialFetchCount = detailFetchCount;

        // Then update the FSEC
        const { result: updateResult } = renderHook(() => useUpdateFsec(), { wrapper });
        updateResult.current.mutate({
            versionUuid: versionUuid,
            data: {
                name: 'Updated FSEC',
                campaignId: campaignUuid,
                statusId: 0,
                categoryId: 0,
                rackId: null,
                comments: null,
            },
        });

        await waitFor(() => expect(updateResult.current.isSuccess).toBe(true));

        // La réponse PUT (source de vérité, slug recalculé côté serveur) est
        // écrite directement dans le cache détail : la query reflète le nouveau
        // nom SANS relancer de GET. Éviter un refetch est précisément ce qui
        // empêche le 404 sur l'ancien slug quand le nom/la campagne change.
        await waitFor(() =>
            expect(client.getQueryData<{ name: string }>(fsecKeys.detail(versionUuid))?.name).toBe('Updated'),
        );
        expect(detailFetchCount).toBe(initialFetchCount);
    });

    it('seeds the new slug and never refetches the old slug after a rename', async () => {
        // Régression : renommer (ou réaffecter) un FSEC change son slug calculé.
        // L'ancienne implémentation invalidait tout le préfixe `details()`, ce qui
        // relançait la query encore keyée sur l'ANCIEN slug d'URL → 404 (le slug
        // n'existe plus). La nouvelle écrit le cache du nouveau slug et laisse
        // l'ancien tranquille.
        const oldSlug = '2026-s1-lmj-omega-1';
        const newSlug = '2026-s1-lmj-omega-baptiste';
        let oldSlugFetchCount = 0;

        server.use(
            http.get(`/api/v1/fsecs/by-slug/${oldSlug}/`, () => {
                oldSlugFetchCount++;
                return HttpResponse.json({ ...mockFsec, slug: oldSlug });
            }),
            http.put(`/api/v1/fsecs/${versionUuid}/`, () =>
                HttpResponse.json({ ...mockFsec, name: 'Baptiste', slug: newSlug }),
            ),
        );

        // gcTime > 0 : l'entrée du NOUVEAU slug, seedée mais pas encore observée
        // (la page observe l'ancien slug jusqu'à la navigation), doit survivre au
        // garbage collector — comme en prod (gcTime 10 min). createTestQueryClient
        // force gcTime:0, qui la supprimerait aussitôt.
        const client = new QueryClient({
            defaultOptions: {
                queries: { retry: false, gcTime: 60_000, staleTime: 0 },
                mutations: { retry: false },
            },
        });
        const wrapper = createQueryWrapper(client);

        // Page chargée par l'ancien slug.
        const { result: bySlug } = renderHook(() => useFsecBySlug(oldSlug), { wrapper });
        await waitFor(() => expect(bySlug.current.isSuccess).toBe(true));
        const fetchCountAfterLoad = oldSlugFetchCount;

        // Renommage : le slug bascule sur newSlug.
        const { result: updateResult } = renderHook(() => useUpdateFsec(), { wrapper });
        updateResult.current.mutate({
            versionUuid: versionUuid,
            data: {
                name: 'Baptiste',
                campaignId: campaignUuid,
                statusId: 0,
                categoryId: 0,
                rackId: null,
                comments: null,
            },
        });
        await waitFor(() => expect(updateResult.current.isSuccess).toBe(true));

        // Le cache du NOUVEAU slug est peuplé → navigation instantanée, pas de 404.
        await waitFor(() =>
            expect(client.getQueryData<{ name: string }>(fsecKeys.detailBySlug(newSlug))?.name).toBe('Baptiste'),
        );
        // L'ANCIEN slug n'est jamais relancé (sinon 404 côté serveur).
        expect(oldSlugFetchCount).toBe(fetchCountAfterLoad);
    });

    it('should invalidate campaign FSECs query after create', async () => {
        let campaignFetchCount = 0;

        server.use(
            http.get(`/api/v1/fsecs/campaign/${campaignUuid}/`, () => {
                campaignFetchCount++;
                return HttpResponse.json(mockFsecList);
            }),
            http.post('/api/v1/fsecs/', () => {
                return HttpResponse.json(mockFsec, { status: 201 });
            }),
        );

        const wrapper = createQueryWrapper();

        // First, fetch campaign FSECs
        const { result: campaignResult } = renderHook(() => useFsecsByCampaign(campaignUuid), { wrapper });
        await waitFor(() => expect(campaignResult.current.isSuccess).toBe(true));

        const initialFetchCount = campaignFetchCount;

        // Then create a new FSEC
        const { result: createResult } = renderHook(() => useCreateFsec(), { wrapper });
        createResult.current.mutate({
            name: 'New FSEC',
            campaignId: campaignUuid,
            statusId: 0,
            categoryId: 0,
            rackId: null,
            comments: null,
        });

        await waitFor(() => expect(createResult.current.isSuccess).toBe(true));

        // The campaign list should be refetched due to invalidation
        await waitFor(() => expect(campaignFetchCount).toBeGreaterThan(initialFetchCount));
    });

    it('should invalidate list query after delete', async () => {
        let fetchCount = 0;

        server.use(
            http.get('/api/v1/fsecs/', () => {
                fetchCount++;
                return HttpResponse.json(mockFsecList);
            }),
            http.delete(`/api/v1/fsecs/${versionUuid}/`, () => {
                return new HttpResponse(null, { status: 204 });
            }),
        );

        const wrapper = createQueryWrapper();

        // First, fetch the list
        const { result: listResult } = renderHook(() => useFsecs(), { wrapper });
        await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

        const initialFetchCount = fetchCount;

        // Then delete a FSEC
        const { result: deleteResult } = renderHook(() => useDeleteFsec(), { wrapper });
        deleteResult.current.mutate(versionUuid);

        await waitFor(() => expect(deleteResult.current.isSuccess).toBe(true));

        // The list should be refetched due to invalidation
        await waitFor(() => expect(fetchCount).toBeGreaterThan(initialFetchCount));
    });
});

// ============================================================================
// REQUESTED VIEWS (R08) TESTS
// ============================================================================

describe('useUpdateFsecRequestedViews', () => {
    it('PATCHes the dedicated action and writes the detail caches (uuid + slug)', async () => {
        let receivedBody: Record<string, unknown> | null = null;
        server.use(
            http.patch(`/api/v1/fsecs/${versionUuid}/requested-views/`, async ({ request }) => {
                receivedBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({
                    ...mockFsec,
                    slug: 'fsec-slug',
                    requested_views: receivedBody.requested_views,
                });
            }),
        );

        // gcTime > 0 : les entrées seedées par setQueryData ne sont observées par
        // aucune query dans ce test ; avec gcTime:0 (createTestQueryClient) elles
        // seraient purgées aussitôt — comme en prod, on garde un cache vivant.
        const client = new QueryClient({
            defaultOptions: {
                queries: { retry: false, gcTime: 60_000, staleTime: 0 },
                mutations: { retry: false },
            },
        });
        const wrapper = createQueryWrapper(client);
        const { result } = renderHook(() => useUpdateFsecRequestedViews(), { wrapper });

        result.current.mutate({ versionUuid, requestedViews: 'Vue de face' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(receivedBody).toEqual({ requested_views: 'Vue de face' });
        expect(result.current.data?.requestedViews).toBe('Vue de face');
        expect(
            client.getQueryData<{ requestedViews: string | null }>(fsecKeys.detail(versionUuid))?.requestedViews,
        ).toBe('Vue de face');
        expect(
            client.getQueryData<{ requestedViews: string | null }>(fsecKeys.detailBySlug('fsec-slug'))?.requestedViews,
        ).toBe('Vue de face');
    });

    it('invalidates the FSEC lists (lists + byCampaign) after the PATCH, like useUpdateFsec', async () => {
        // Les listes sont la source de seed du détail (seedDetailFromList) : sans
        // invalidation, une entrée liste périmée pourrait ré-afficher l'ancienne
        // valeur des vues demandées au remontage de la page.
        let listFetches = 0;
        let campaignFetches = 0;
        server.use(
            http.get('/api/v1/fsecs/', () => {
                listFetches += 1;
                return HttpResponse.json(mockFsecList);
            }),
            http.get(`/api/v1/fsecs/campaign/${campaignUuid}/`, () => {
                campaignFetches += 1;
                return HttpResponse.json(mockFsecList);
            }),
            http.patch(`/api/v1/fsecs/${versionUuid}/requested-views/`, () =>
                HttpResponse.json({ ...mockFsec, requested_views: 'Vue de profil' }),
            ),
        );

        const client = createTestQueryClient();
        const wrapper = createQueryWrapper(client);

        const { result: list } = renderHook(() => useFsecs(), { wrapper });
        const { result: byCampaign } = renderHook(() => useFsecsByCampaign(campaignUuid), { wrapper });
        await waitFor(() => expect(list.current.isSuccess).toBe(true));
        await waitFor(() => expect(byCampaign.current.isSuccess).toBe(true));
        const listBefore = listFetches;
        const campaignBefore = campaignFetches;

        const { result } = renderHook(() => useUpdateFsecRequestedViews(), { wrapper });
        result.current.mutate({ versionUuid, requestedViews: 'Vue de profil' });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        await waitFor(() => expect(listFetches).toBeGreaterThan(listBefore));
        await waitFor(() => expect(campaignFetches).toBeGreaterThan(campaignBefore));
        // (L'écriture directe du cache détail est couverte par le premier test,
        // avec un client à gcTime > 0.)
    });

    it('sends null to clear the value', async () => {
        let receivedBody: Record<string, unknown> | null = null;
        server.use(
            http.patch(`/api/v1/fsecs/${versionUuid}/requested-views/`, async ({ request }) => {
                receivedBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ ...mockFsec, requested_views: null });
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useUpdateFsecRequestedViews(), { wrapper });

        result.current.mutate({ versionUuid, requestedViews: null });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(receivedBody).toEqual({ requested_views: null });
        expect(result.current.data?.requestedViews).toBeNull();
    });

    it('surfaces a validation error', async () => {
        server.use(
            http.patch(`/api/v1/fsecs/${versionUuid}/requested-views/`, () =>
                HttpResponse.json({ error: 'Validation Error' }, { status: 400 }),
            ),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useUpdateFsecRequestedViews(), { wrapper });

        result.current.mutate({ versionUuid, requestedViews: 'x'.repeat(5000) });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('parses requested_views from the FSEC detail (null when absent)', async () => {
        server.use(
            http.get(`/api/v1/fsecs/${versionUuid}/`, () =>
                HttpResponse.json({ ...mockFsec, requested_views: 'Vue de dessus' }),
            ),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsec(versionUuid), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.requestedViews).toBe('Vue de dessus');
    });
});

// ============================================================================
// R09 : INVALIDATION STOCK APRÈS MISE À JOUR FSEC
// ============================================================================

describe('useUpdateFsec → stock invalidation (R09)', () => {
    it('refetches the stock catalog and the assembly recap after an FSEC update', async () => {
        let catalogFetches = 0;
        let assemblyFetches = 0;

        server.use(http.put(`/api/v1/fsecs/${versionUuid}/`, () => HttpResponse.json({ ...mockFsec, status_id: 3 })));

        const client = createTestQueryClient();
        const wrapper = createQueryWrapper(client);

        // Deux queries « stock » observées, keyées sous les racines invalidées.
        const { result: catalog } = renderHook(
            () =>
                useQuery({
                    queryKey: ['stock-catalog', 'list', { kind: null }],
                    queryFn: async () => {
                        catalogFetches += 1;
                        return [];
                    },
                }),
            { wrapper },
        );
        const { result: assembly } = renderHook(
            () =>
                useQuery({
                    queryKey: ['fsec-assembly-items', 'fsec', 'some-fsec-uuid'],
                    queryFn: async () => {
                        assemblyFetches += 1;
                        return [];
                    },
                }),
            { wrapper },
        );
        await waitFor(() => expect(catalog.current.isSuccess).toBe(true));
        await waitFor(() => expect(assembly.current.isSuccess).toBe(true));
        const catalogBefore = catalogFetches;
        const assemblyBefore = assemblyFetches;

        const { result: update } = renderHook(() => useUpdateFsec(), { wrapper });
        update.current.mutate({
            versionUuid,
            data: {
                name: 'FSEC Test 001',
                campaignId: campaignUuid,
                statusId: 3,
                categoryId: 0,
                rackId: null,
                comments: null,
            },
        });
        await waitFor(() => expect(update.current.isSuccess).toBe(true));

        await waitFor(() => expect(catalogFetches).toBeGreaterThan(catalogBefore));
        await waitFor(() => expect(assemblyFetches).toBeGreaterThan(assemblyBefore));
    });
});

// ============================================================================
// SCHEMA VALIDATION TESTS
// ============================================================================

describe('Schema Validation', () => {
    it('should parse FSEC response with all fields', async () => {
        const fullFsec = {
            ...mockFsec,
            version_uuid: '12345678-abcd-1234-abcd-123456789012',
            fsec_uuid: '87654321-dcba-4321-dcba-210987654321',
            name: 'Full FSEC',
            status_id: 1,
            category_id: 2,
            rack_id: 5,
            comments: 'Full comments',
            depressurization_failed: false,
        };

        server.use(
            http.get(`/api/v1/fsecs/${versionUuid}/`, () => {
                return HttpResponse.json(fullFsec);
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsec(versionUuid), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.versionUuid).toBe('12345678-abcd-1234-abcd-123456789012');
        expect(result.current.data?.statusId).toBe(1);
        expect(result.current.data?.categoryId).toBe(2);
        expect(result.current.data?.rackId).toBe(5);
        expect(result.current.data?.depressurizationFailed).toBe(false);
    });

    it('should handle nullable fields', async () => {
        const fsecWithNulls = {
            ...mockFsec,
            name: 'FSEC with nulls',
            rack_id: null,
            comments: null,
            depressurization_failed: null,
        };

        server.use(
            http.get(`/api/v1/fsecs/${versionUuid}/`, () => {
                return HttpResponse.json(fsecWithNulls);
            }),
        );

        const wrapper = createQueryWrapper();
        const { result } = renderHook(() => useFsec(versionUuid), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.rackId).toBeNull();
        expect(result.current.data?.comments).toBeNull();
        expect(result.current.data?.depressurizationFailed).toBeNull();
    });
});
