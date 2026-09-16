/**
 * Stock — invalidations React Query des mutations du catalogue (R11).
 *
 * Régression : un item créé/modifié dans le stock restait invisible dans le
 * sélecteur d'éléments d'une FSEC (clé ['stock-catalog', 'available-for-fsec',
 * uuid]) car seules les listes ['stock-catalog', 'list'] étaient invalidées.
 * Toutes les mutations doivent invalider la racine ['stock-catalog'].
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { createQueryWrapper, server } from '@test/test-utils';
import { createMockStockCatalogItem } from '@test/mocks/stock-handlers';

import { stockAlertKeys, stockCatalogKeys } from './stock-item.keys';
import {
    useCreateCatalogItem,
    useCreateStockMovement,
    useCreateStructurationBatch,
    useDeleteCatalogItem,
    usePatchCatalogItem,
} from './stock-item.queries';

const FSEC_UUID = '20000000-0000-4000-8000-000000000001';
const ITEM_UUID = '30000000-0000-4000-8000-000000000001';

/** Clé du sélecteur FSEC (cf. fsecAssemblyKeys.availableForFsec) — sous 'stock-catalog' exprès. */
const AVAILABLE_FOR_FSEC_KEY = ['stock-catalog', 'available-for-fsec', FSEC_UUID] as const;

const EMPTY_FILTERS = { kind: null, category: null, status: null, installation: null, search: '' };

/**
 * QueryClient dédié : `gcTime: Infinity` pour que les entrées de cache seedées
 * sans observateur ne soient pas ramassées avant la fin de la mutation (le
 * client de test par défaut a `gcTime: 0`).
 */
const createCacheProbeClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
            mutations: { retry: false },
        },
    });

describe('Stock mutations — invalidation de la racine stock-catalog (R11)', () => {
    let queryClient: QueryClient;

    /** Pré-remplit le cache avec toutes les clés concernées, non invalidées. */
    const seedCache = () => {
        queryClient.setQueryData(AVAILABLE_FOR_FSEC_KEY, []);
        queryClient.setQueryData(stockCatalogKeys.list(EMPTY_FILTERS), []);
        queryClient.setQueryData(stockCatalogKeys.detail(ITEM_UUID), createMockStockCatalogItem({ uuid: ITEM_UUID }));
        queryClient.setQueryData(stockCatalogKeys.nextStructurationNumber(), 1);
        queryClient.setQueryData(stockAlertKeys.all, { lowStock: [], expired: [], expiringSoon: [] });
    };

    const isInvalidated = (key: readonly unknown[]) => {
        const state = queryClient.getQueryState(key);
        expect(state).toBeDefined();
        return state?.isInvalidated ?? false;
    };

    beforeEach(() => {
        queryClient = createCacheProbeClient();
        seedCache();
        expect(isInvalidated(AVAILABLE_FOR_FSEC_KEY)).toBe(false);
    });

    it('useCreateCatalogItem invalide available-for-fsec, listes, n° structuration et alertes', async () => {
        const { result } = renderHook(() => useCreateCatalogItem(), { wrapper: createQueryWrapper(queryClient) });

        await act(async () => {
            await result.current.mutateAsync({
                kind: 'consumable',
                category: 'colles',
                name: 'Colle X',
                unite: 'tubes',
                quantite: 1,
            });
        });

        await waitFor(() => expect(isInvalidated(AVAILABLE_FOR_FSEC_KEY)).toBe(true));
        expect(isInvalidated(stockCatalogKeys.list(EMPTY_FILTERS))).toBe(true);
        expect(isInvalidated(stockCatalogKeys.nextStructurationNumber())).toBe(true);
        expect(isInvalidated(stockAlertKeys.all)).toBe(true);
    });

    it('useCreateStructurationBatch invalide available-for-fsec', async () => {
        const { result } = renderHook(() => useCreateStructurationBatch(), {
            wrapper: createQueryWrapper(queryClient),
        });

        await act(async () => {
            await result.current.mutateAsync({ structuration_type: 'standard', installation: 'LMJ', quantity: 2 });
        });

        await waitFor(() => expect(isInvalidated(AVAILABLE_FOR_FSEC_KEY)).toBe(true));
        expect(isInvalidated(stockCatalogKeys.nextStructurationNumber())).toBe(true);
    });

    it('usePatchCatalogItem met à jour le détail puis invalide available-for-fsec', async () => {
        const { result } = renderHook(() => usePatchCatalogItem(), { wrapper: createQueryWrapper(queryClient) });

        await act(async () => {
            await result.current.mutateAsync({ uuid: ITEM_UUID, data: { name: 'Renommé' } });
        });

        await waitFor(() => expect(isInvalidated(AVAILABLE_FOR_FSEC_KEY)).toBe(true));
        // Le détail est écrit de façon synchrone (nom mis à jour) avant l'invalidation.
        expect(queryClient.getQueryData<{ name: string }>(stockCatalogKeys.detail(ITEM_UUID))?.name).toBe('Renommé');
        expect(isInvalidated(stockCatalogKeys.list(EMPTY_FILTERS))).toBe(true);
    });

    it('useDeleteCatalogItem retire le détail et invalide available-for-fsec', async () => {
        const { result } = renderHook(() => useDeleteCatalogItem(), { wrapper: createQueryWrapper(queryClient) });

        await act(async () => {
            await result.current.mutateAsync(ITEM_UUID);
        });

        await waitFor(() => expect(isInvalidated(AVAILABLE_FOR_FSEC_KEY)).toBe(true));
        // Le détail supprimé est retiré du cache (removeQueries), pas seulement invalidé.
        expect(queryClient.getQueryState(stockCatalogKeys.detail(ITEM_UUID))).toBeUndefined();
    });

    it('useCreateStockMovement invalide available-for-fsec, le détail et les alertes', async () => {
        server.use(
            http.post('/api/v1/stock/movements/', () =>
                HttpResponse.json(
                    {
                        uuid: '40000000-0000-4000-8000-000000000001',
                        catalog_item_uuid: ITEM_UUID,
                        movement_type: 'entree',
                        quantite_delta: 3,
                        quantite_apres: 13,
                        date: '2026-08-30',
                        remarque: null,
                        auteur_name: null,
                        created_at: null,
                    },
                    { status: 201 },
                ),
            ),
        );
        const { result } = renderHook(() => useCreateStockMovement(), { wrapper: createQueryWrapper(queryClient) });

        await act(async () => {
            await result.current.mutateAsync({
                catalog_item_uuid: ITEM_UUID,
                movement_type: 'entree',
                quantite_delta: 3,
                date: '2026-08-30',
            });
        });

        await waitFor(() => expect(isInvalidated(AVAILABLE_FOR_FSEC_KEY)).toBe(true));
        expect(isInvalidated(stockCatalogKeys.detail(ITEM_UUID))).toBe(true);
        expect(isInvalidated(stockAlertKeys.all)).toBe(true);
    });
});
