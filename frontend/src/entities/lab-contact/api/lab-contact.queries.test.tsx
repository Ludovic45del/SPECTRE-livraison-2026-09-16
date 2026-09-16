/**
 * Lab Contact Queries Tests — hooks TanStack Query via MSW.
 *
 * Pattern task-list.queries.test.tsx : createQueryWrapper + server.use.
 * Couvre succès, liste vide (handler par défaut), erreur 500, mutations +
 * invalidations ciblées.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { createQueryWrapper, createTestQueryClient, server } from '@test/test-utils';
import { createMockLabContact } from '@test/mocks/handlers';
import { labContactKeys } from './lab-contact.keys';
import { useCreateLabContact, useDeleteLabContact, useLabContacts, useUpdateLabContact } from './lab-contact.queries';

const CONTACT_UUID = '77777777-7777-4777-8777-777777777777';

describe('useLabContacts', () => {
    it("récupère l'annuaire (camelCase)", async () => {
        server.use(
            http.get('/api/v1/lab-contacts/', () =>
                HttpResponse.json([
                    createMockLabContact({ uuid: CONTACT_UUID, name: 'Labo 426', phone: '426' }),
                    createMockLabContact({ name: 'Labo 215', phone: '215' }),
                ]),
            ),
        );

        const { result } = renderHook(() => useLabContacts(), { wrapper: createQueryWrapper() });

        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(2);
        expect(result.current.data?.[0]).toMatchObject({ uuid: CONTACT_UUID, name: 'Labo 426', phone: '426' });
        expect(result.current.data?.[0].createdAt).toEqual(expect.any(String));
    });

    it('gère une liste vide (handler par défaut : la page part vide)', async () => {
        const { result } = renderHook(() => useLabContacts(), { wrapper: createQueryWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });

    it('gère une erreur serveur 500', async () => {
        server.use(
            http.get('/api/v1/lab-contacts/', () => HttpResponse.json({ error: 'Server Error' }, { status: 500 })),
        );

        const { result } = renderHook(() => useLabContacts(), { wrapper: createQueryWrapper() });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeDefined();
    });
});

describe('useCreateLabContact', () => {
    it('crée un contact (POST snake_case) et invalide lists()', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.post('/api/v1/lab-contacts/', async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(createMockLabContact({ name: 'Gardiennage', phone: '9' }), { status: 201 });
            }),
        );

        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useCreateLabContact(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ name: 'Gardiennage', phone: '9', comment: '' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({ name: 'Gardiennage', phone: '9', comment: '' });
        expect(result.current.data?.name).toBe('Gardiennage');
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: labContactKeys.lists() });
    });

    it('remonte une erreur de validation 400', async () => {
        server.use(
            http.post('/api/v1/lab-contacts/', () =>
                HttpResponse.json({ error: 'Validation Error', code: 'VALIDATION_ERROR_NAME' }, { status: 400 }),
            ),
        );

        const { result } = renderHook(() => useCreateLabContact(), { wrapper: createQueryWrapper() });

        result.current.mutate({ name: '', phone: '', comment: '' });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useUpdateLabContact', () => {
    it('PUT complet et invalide lists() + detail(uuid)', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.put(`/api/v1/lab-contacts/${CONTACT_UUID}/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(
                    createMockLabContact({ uuid: CONTACT_UUID, name: 'Labo 426 bis', phone: '4260' }),
                );
            }),
        );

        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useUpdateLabContact(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ uuid: CONTACT_UUID, data: { name: 'Labo 426 bis', phone: '4260', comment: '' } });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({ name: 'Labo 426 bis', phone: '4260', comment: '' });
        expect(result.current.data?.name).toBe('Labo 426 bis');
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: labContactKeys.lists() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: labContactKeys.detail(CONTACT_UUID) });
    });

    it('remonte un 404 sur un contact inconnu', async () => {
        server.use(
            http.put(`/api/v1/lab-contacts/${CONTACT_UUID}/`, () =>
                HttpResponse.json({ error: 'Not found', code: 'LAB_CONTACT_NOT_FOUND' }, { status: 404 }),
            ),
        );

        const { result } = renderHook(() => useUpdateLabContact(), { wrapper: createQueryWrapper() });

        result.current.mutate({ uuid: CONTACT_UUID, data: { name: 'X', phone: '', comment: '' } });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useDeleteLabContact', () => {
    it('supprime le contact, retire detail(uuid) du cache et invalide lists()', async () => {
        let deleted = false;
        server.use(
            http.delete(`/api/v1/lab-contacts/${CONTACT_UUID}/`, () => {
                deleted = true;
                return new HttpResponse(null, { status: 204 });
            }),
        );

        const client = createTestQueryClient();
        client.setQueryData(labContactKeys.detail(CONTACT_UUID), { uuid: CONTACT_UUID });
        const removeSpy = vi.spyOn(client, 'removeQueries');
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useDeleteLabContact(), { wrapper: createQueryWrapper(client) });

        result.current.mutate(CONTACT_UUID);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(deleted).toBe(true);
        expect(removeSpy).toHaveBeenCalledWith({ queryKey: labContactKeys.detail(CONTACT_UUID) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: labContactKeys.lists() });
    });
});
