/**
 * Task List Queries Tests — hooks TanStack Query via MSW.
 *
 * Pattern campaign.queries.test.tsx : createQueryWrapper + server.use.
 * Couvre succès, liste vide, erreur 500, detail désactivé sans uuid,
 * mutations + invalidations ciblées.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi } from 'vitest';

import {
    useTaskLists,
    useTaskListDetail,
    useCreateTaskList,
    useUpdateTaskList,
    useDeleteTaskList,
    useAddTaskListMembers,
    useRemoveTaskListMember,
    useCreateTaskItem,
    useUpdateTaskItem,
    useDeleteTaskItem,
    useTaskComments,
    useAddTaskComment,
    useDeleteTaskComment,
} from './task-list.queries';
import { taskListKeys } from './task-list.keys';
import { createQueryWrapper, createTestQueryClient, server } from '@test/test-utils';
import { createMockTaskComment, createMockTaskItem, createMockTaskList } from '@test/mocks/tasklist-handlers';

const LIST_UUID = '123e4567-e89b-12d3-a456-426614174000';
const TASK_UUID = '33333333-3333-4333-8333-333333333333';
const MEMBER_UUID = '22222222-2222-2222-2222-222222222222';

const mockList = createMockTaskList({ uuid: LIST_UUID, name: 'Liste Alpha', color: 'blue' });

// ============================================================================
// useTaskLists
// ============================================================================

describe('useTaskLists', () => {
    it('récupère la liste des listes partagées', async () => {
        server.use(
            http.get('/api/v1/task-lists/', () =>
                HttpResponse.json([mockList, createMockTaskList({ name: 'Liste Beta' })]),
            ),
        );

        const { result } = renderHook(() => useTaskLists(), { wrapper: createQueryWrapper() });

        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(2);
        expect(result.current.data?.[0].name).toBe('Liste Alpha');
        expect(result.current.data?.[0].ownerUuid).toBe(mockList.owner_uuid);
    });

    it('gère une liste vide (handlers par défaut)', async () => {
        const { result } = renderHook(() => useTaskLists(), { wrapper: createQueryWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(0);
    });

    it('gère une erreur serveur 500', async () => {
        server.use(
            http.get('/api/v1/task-lists/', () => HttpResponse.json({ error: 'Server Error' }, { status: 500 })),
        );

        const { result } = renderHook(() => useTaskLists(), { wrapper: createQueryWrapper() });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeDefined();
    });
});

// ============================================================================
// useTaskListDetail
// ============================================================================

describe('useTaskListDetail', () => {
    it('récupère le détail (résumé + tâches)', async () => {
        server.use(
            http.get(`/api/v1/task-lists/${LIST_UUID}/`, () =>
                HttpResponse.json({
                    ...mockList,
                    tasks: [createMockTaskItem({ uuid: TASK_UUID, task_list_uuid: LIST_UUID, priority: 'critical' })],
                }),
            ),
        );

        const { result } = renderHook(() => useTaskListDetail(LIST_UUID), { wrapper: createQueryWrapper() });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.uuid).toBe(LIST_UUID);
        expect(result.current.data?.tasks).toHaveLength(1);
        expect(result.current.data?.tasks[0].priority).toBe('critical');
    });

    it('reste désactivé quand uuid est null', () => {
        const { result } = renderHook(() => useTaskListDetail(null), { wrapper: createQueryWrapper() });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('gère un 404 (liste invisible)', async () => {
        const { result } = renderHook(() => useTaskListDetail(LIST_UUID), { wrapper: createQueryWrapper() });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// Mutations de liste
// ============================================================================

describe('useCreateTaskList', () => {
    it('crée une liste (POST snake_case) et invalide lists()', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.post('/api/v1/task-lists/', async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(createMockTaskList({ name: 'Nouvelle' }), { status: 201 });
            }),
        );

        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useCreateTaskList(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({
            name: 'Nouvelle',
            description: 'desc',
            color: 'green',
            memberUuids: [MEMBER_UUID],
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({
            name: 'Nouvelle',
            description: 'desc',
            color: 'green',
            member_uuids: [MEMBER_UUID],
        });
        expect(result.current.data?.name).toBe('Nouvelle');
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskListKeys.lists() });
    });

    it('remonte une erreur de validation 400', async () => {
        server.use(
            http.post('/api/v1/task-lists/', () => HttpResponse.json({ error: 'Validation Error' }, { status: 400 })),
        );

        const { result } = renderHook(() => useCreateTaskList(), { wrapper: createQueryWrapper() });

        result.current.mutate({ name: 'X', color: 'default', memberUuids: [] });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useUpdateTaskList', () => {
    it('PATCH partiel et invalide lists() + detail(uuid)', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.patch(`/api/v1/task-lists/${LIST_UUID}/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ ...mockList, name: 'Renommée' });
            }),
        );

        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useUpdateTaskList(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ uuid: LIST_UUID, data: { name: 'Renommée' } });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({ name: 'Renommée' });
        expect(result.current.data?.name).toBe('Renommée');
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskListKeys.lists() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskListKeys.detail(LIST_UUID) });
    });
});

describe('useDeleteTaskList', () => {
    it('supprime la liste, retire le detail du cache et invalide lists()', async () => {
        const client = createTestQueryClient();
        client.setQueryData(taskListKeys.detail(LIST_UUID), { uuid: LIST_UUID });
        const removeSpy = vi.spyOn(client, 'removeQueries');
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useDeleteTaskList(), { wrapper: createQueryWrapper(client) });

        result.current.mutate(LIST_UUID);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(removeSpy).toHaveBeenCalledWith({ queryKey: taskListKeys.detail(LIST_UUID) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskListKeys.lists() });
        expect(client.getQueryData(taskListKeys.detail(LIST_UUID))).toBeUndefined();
    });

    it('gère un 404 à la suppression', async () => {
        server.use(http.delete(`/api/v1/task-lists/${LIST_UUID}/`, () => new HttpResponse(null, { status: 404 })));

        const { result } = renderHook(() => useDeleteTaskList(), { wrapper: createQueryWrapper() });

        result.current.mutate(LIST_UUID);

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ============================================================================
// Membres
// ============================================================================

describe('useAddTaskListMembers', () => {
    it('POST {user_uuids} et renvoie le résumé rafraîchi', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.post(`/api/v1/task-lists/${LIST_UUID}/members/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json({ ...mockList, member_uuids: [MEMBER_UUID] });
            }),
        );

        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useAddTaskListMembers(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ listUuid: LIST_UUID, userUuids: [MEMBER_UUID] });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({ user_uuids: [MEMBER_UUID] });
        expect(result.current.data?.memberUuids).toEqual([MEMBER_UUID]);
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskListKeys.detail(LIST_UUID) });
    });

    it('remonte un conflit 409 (membre déjà présent)', async () => {
        server.use(
            http.post(`/api/v1/task-lists/${LIST_UUID}/members/`, () =>
                HttpResponse.json({ error: 'Conflict' }, { status: 409 }),
            ),
        );

        const { result } = renderHook(() => useAddTaskListMembers(), { wrapper: createQueryWrapper() });

        result.current.mutate({ listUuid: LIST_UUID, userUuids: [MEMBER_UUID] });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useRemoveTaskListMember', () => {
    it('DELETE le membre et invalide lists() + detail()', async () => {
        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useRemoveTaskListMember(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ listUuid: LIST_UUID, userUuid: MEMBER_UUID });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskListKeys.lists() });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskListKeys.detail(LIST_UUID) });
    });
});

// ============================================================================
// Tâches
// ============================================================================

describe('useCreateTaskItem', () => {
    it('POST snake_case et invalide detail(listUuid) + lists()', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.post(`/api/v1/task-lists/${LIST_UUID}/tasks/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(
                    createMockTaskItem({ task_list_uuid: LIST_UUID, title: 'Nouvelle tâche', priority: 'high' }),
                    { status: 201 },
                );
            }),
        );

        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useCreateTaskItem(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({
            listUuid: LIST_UUID,
            data: { title: 'Nouvelle tâche', priority: 'high', dueDate: '2026-02-01' },
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({ title: 'Nouvelle tâche', priority: 'high', due_date: '2026-02-01' });
        expect(result.current.data?.title).toBe('Nouvelle tâche');
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskListKeys.detail(LIST_UUID) });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskListKeys.lists() });
    });
});

describe('useUpdateTaskItem', () => {
    it('PATCH partiel (done) — seuls les champs fournis sont envoyés', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.patch(`/api/v1/task-lists/${LIST_UUID}/tasks/${TASK_UUID}/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(
                    createMockTaskItem({ uuid: TASK_UUID, task_list_uuid: LIST_UUID, done: true }),
                );
            }),
        );

        const { result } = renderHook(() => useUpdateTaskItem(), { wrapper: createQueryWrapper() });

        result.current.mutate({ listUuid: LIST_UUID, taskUuid: TASK_UUID, data: { done: true } });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({ done: true });
        expect(result.current.data?.done).toBe(true);
    });

    it('gère une erreur serveur', async () => {
        server.use(
            http.patch(`/api/v1/task-lists/${LIST_UUID}/tasks/${TASK_UUID}/`, () =>
                HttpResponse.json({ error: 'Server Error' }, { status: 500 }),
            ),
        );

        const { result } = renderHook(() => useUpdateTaskItem(), { wrapper: createQueryWrapper() });

        result.current.mutate({ listUuid: LIST_UUID, taskUuid: TASK_UUID, data: { title: 'X' } });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useDeleteTaskItem', () => {
    it('DELETE et invalide detail(listUuid)', async () => {
        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useDeleteTaskItem(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ listUuid: LIST_UUID, taskUuid: TASK_UUID });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskListKeys.detail(LIST_UUID) });
    });
});

// ============================================================================
// Commentaires
// ============================================================================

describe('useTaskComments', () => {
    it("récupère les commentaires d'une tâche", async () => {
        server.use(
            http.get(`/api/v1/task-lists/${LIST_UUID}/tasks/${TASK_UUID}/comments/`, () =>
                HttpResponse.json([createMockTaskComment({ task_uuid: TASK_UUID, text: 'Premier' })]),
            ),
        );

        const { result } = renderHook(() => useTaskComments(LIST_UUID, TASK_UUID), {
            wrapper: createQueryWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(1);
        expect(result.current.data?.[0].text).toBe('Premier');
        expect(result.current.data?.[0].taskUuid).toBe(TASK_UUID);
    });

    it('reste désactivé sans taskUuid ou si enabled=false', () => {
        const { result: noTask } = renderHook(() => useTaskComments(LIST_UUID, null), {
            wrapper: createQueryWrapper(),
        });
        expect(noTask.current.fetchStatus).toBe('idle');

        const { result: disabled } = renderHook(() => useTaskComments(LIST_UUID, TASK_UUID, false), {
            wrapper: createQueryWrapper(),
        });
        expect(disabled.current.fetchStatus).toBe('idle');
    });
});

describe('useAddTaskComment', () => {
    it('POST le texte et invalide comments(...) + detail(listUuid)', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.post(`/api/v1/task-lists/${LIST_UUID}/tasks/${TASK_UUID}/comments/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(createMockTaskComment({ task_uuid: TASK_UUID, text: 'Bien vu' }), {
                    status: 201,
                });
            }),
        );

        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useAddTaskComment(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ listUuid: LIST_UUID, taskUuid: TASK_UUID, text: 'Bien vu' });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(sentBody).toEqual({ text: 'Bien vu' });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: taskListKeys.comments(LIST_UUID, TASK_UUID),
        });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskListKeys.detail(LIST_UUID) });
    });
});

describe('useDeleteTaskComment', () => {
    it('DELETE et invalide comments(...) + detail(listUuid)', async () => {
        const COMMENT_UUID = '44444444-4444-4444-8444-444444444444';
        const client = createTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useDeleteTaskComment(), { wrapper: createQueryWrapper(client) });

        result.current.mutate({ listUuid: LIST_UUID, taskUuid: TASK_UUID, commentUuid: COMMENT_UUID });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: taskListKeys.comments(LIST_UUID, TASK_UUID),
        });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskListKeys.detail(LIST_UUID) });
    });

    it('remonte un 403 (ni auteur ni owner)', async () => {
        server.use(
            http.delete(`/api/v1/task-lists/${LIST_UUID}/tasks/${TASK_UUID}/comments/:commentUuid/`, () =>
                HttpResponse.json({ detail: 'Interdit' }, { status: 403 }),
            ),
        );

        const { result } = renderHook(() => useDeleteTaskComment(), { wrapper: createQueryWrapper() });

        result.current.mutate({
            listUuid: LIST_UUID,
            taskUuid: TASK_UUID,
            commentUuid: '44444444-4444-4444-8444-444444444444',
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
