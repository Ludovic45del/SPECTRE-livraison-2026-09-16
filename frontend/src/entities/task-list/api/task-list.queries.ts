/**
 * Task List Queries — TanStack Query hooks pour /task-lists/.
 * @module entities/task-list/api
 *
 * Invalidation ciblée :
 *  - mutations de liste       -> lists() (+ detail(uuid) si la liste existe encore)
 *  - mutations de tâches      -> detail(listUuid) + lists() (compteurs done/total)
 *  - mutations de commentaires-> comments(listUuid, taskUuid) + detail(listUuid)
 *                                (comment_count porté par la tâche)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import {
    TaskCommentListSchema,
    TaskCommentSchema,
    TaskItemSchema,
    TaskListDetailSchema,
    TaskListSummaryListSchema,
    TaskListSummarySchema,
    taskItemCreateToApi,
    taskItemPatchToApi,
    taskListCreateToApi,
    taskListPatchToApi,
    type TaskComment,
    type TaskItem,
    type TaskItemCreate,
    type TaskItemPatch,
    type TaskListCreate,
    type TaskListDetail,
    type TaskListPatch,
    type TaskListSummary,
} from '../model';
import { taskListKeys } from './task-list.keys';

/* ------------------------------------------------------------------ */
/*  Listes                                                             */
/* ------------------------------------------------------------------ */

/** Listes visibles par l'utilisateur courant (owner ou membre). */
export function useTaskLists() {
    return useQuery({
        queryKey: taskListKeys.lists(),
        queryFn: ({ signal }): Promise<TaskListSummary[]> => api.get('/task-lists/', TaskListSummaryListSchema, signal),
        ...QUERY_CACHE_CONFIG,
    });
}

/** Détail complet d'une liste (membres + tâches). Désactivé tant que uuid est null. */
export function useTaskListDetail(uuid: string | null) {
    return useQuery({
        queryKey: taskListKeys.detail(uuid ?? ''),
        queryFn: ({ signal }): Promise<TaskListDetail> => api.get(`/task-lists/${uuid}/`, TaskListDetailSchema, signal),
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}

/** Crée une liste (le requester devient owner). */
export function useCreateTaskList() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: TaskListCreate): Promise<TaskListSummary> => {
            const response = await api.post('/task-lists/', taskListCreateToApi(data));
            return TaskListSummarySchema.parse(response);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: taskListKeys.lists() });
        },
    });
}

/** PATCH partiel d'une liste (owner : name/description/color). */
export function useUpdateTaskList() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ uuid, data }: { uuid: string; data: TaskListPatch }): Promise<TaskListSummary> => {
            const response = await api.patch(`/task-lists/${uuid}/`, taskListPatchToApi(data));
            return TaskListSummarySchema.parse(response);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: taskListKeys.lists() });
            queryClient.invalidateQueries({ queryKey: taskListKeys.detail(variables.uuid) });
        },
    });
}

/** Supprime une liste (owner) — retire aussi le détail du cache. */
export function useDeleteTaskList() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (uuid: string): Promise<void> => {
            await api.delete(`/task-lists/${uuid}/`);
        },
        onSuccess: (_data, uuid) => {
            queryClient.removeQueries({ queryKey: taskListKeys.detail(uuid) });
            queryClient.invalidateQueries({ queryKey: taskListKeys.lists() });
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Membres                                                            */
/* ------------------------------------------------------------------ */

/** Invitations en lot (owner) — renvoie le résumé de liste rafraîchi. */
export function useAddTaskListMembers() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            listUuid,
            userUuids,
        }: {
            listUuid: string;
            userUuids: string[];
        }): Promise<TaskListSummary> => {
            const response = await api.post(`/task-lists/${listUuid}/members/`, { user_uuids: userUuids });
            return TaskListSummarySchema.parse(response);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: taskListKeys.lists() });
            queryClient.invalidateQueries({ queryKey: taskListKeys.detail(variables.listUuid) });
        },
    });
}

/** Retire un membre (owner) ou quitte la liste (soi-même, non-owner). */
export function useRemoveTaskListMember() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ listUuid, userUuid }: { listUuid: string; userUuid: string }): Promise<void> => {
            await api.delete(`/task-lists/${listUuid}/members/${userUuid}/`);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: taskListKeys.lists() });
            queryClient.invalidateQueries({ queryKey: taskListKeys.detail(variables.listUuid) });
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Tâches                                                             */
/* ------------------------------------------------------------------ */

/** Crée une tâche dans une liste (owner/membre). */
export function useCreateTaskItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ listUuid, data }: { listUuid: string; data: TaskItemCreate }): Promise<TaskItem> => {
            const response = await api.post(`/task-lists/${listUuid}/tasks/`, taskItemCreateToApi(data));
            return TaskItemSchema.parse(response);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: taskListKeys.detail(variables.listUuid) });
            queryClient.invalidateQueries({ queryKey: taskListKeys.lists() });
        },
    });
}

/** PATCH partiel d'une tâche (title/note/priority/done/due_date/assignee/position). */
export function useUpdateTaskItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            listUuid,
            taskUuid,
            data,
        }: {
            listUuid: string;
            taskUuid: string;
            data: TaskItemPatch;
        }): Promise<TaskItem> => {
            const response = await api.patch(`/task-lists/${listUuid}/tasks/${taskUuid}/`, taskItemPatchToApi(data));
            return TaskItemSchema.parse(response);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: taskListKeys.detail(variables.listUuid) });
            queryClient.invalidateQueries({ queryKey: taskListKeys.lists() });
        },
    });
}

/** Supprime une tâche (owner/membre). */
export function useDeleteTaskItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ listUuid, taskUuid }: { listUuid: string; taskUuid: string }): Promise<void> => {
            await api.delete(`/task-lists/${listUuid}/tasks/${taskUuid}/`);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: taskListKeys.detail(variables.listUuid) });
            queryClient.invalidateQueries({ queryKey: taskListKeys.lists() });
        },
    });
}

/* ------------------------------------------------------------------ */
/*  Commentaires                                                       */
/* ------------------------------------------------------------------ */

/** Commentaires d'une tâche (ordre chrono). `enabled` permet le lazy-load (dialog). */
export function useTaskComments(listUuid: string, taskUuid: string | null, enabled = true) {
    return useQuery({
        queryKey: taskListKeys.comments(listUuid, taskUuid ?? ''),
        queryFn: ({ signal }): Promise<TaskComment[]> =>
            api.get(`/task-lists/${listUuid}/tasks/${taskUuid}/comments/`, TaskCommentListSchema, signal),
        enabled: Boolean(listUuid && taskUuid) && enabled,
        ...QUERY_CACHE_CONFIG,
    });
}

/** Ajoute un commentaire — invalide comments(...) + detail (comment_count). */
export function useAddTaskComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            listUuid,
            taskUuid,
            text,
        }: {
            listUuid: string;
            taskUuid: string;
            text: string;
        }): Promise<TaskComment> => {
            const response = await api.post(`/task-lists/${listUuid}/tasks/${taskUuid}/comments/`, { text });
            return TaskCommentSchema.parse(response);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: taskListKeys.comments(variables.listUuid, variables.taskUuid),
            });
            queryClient.invalidateQueries({ queryKey: taskListKeys.detail(variables.listUuid) });
        },
    });
}

/** Supprime un commentaire (auteur ou owner de la liste). */
export function useDeleteTaskComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            listUuid,
            taskUuid,
            commentUuid,
        }: {
            listUuid: string;
            taskUuid: string;
            commentUuid: string;
        }): Promise<void> => {
            await api.delete(`/task-lists/${listUuid}/tasks/${taskUuid}/comments/${commentUuid}/`);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: taskListKeys.comments(variables.listUuid, variables.taskUuid),
            });
            queryClient.invalidateQueries({ queryKey: taskListKeys.detail(variables.listUuid) });
        },
    });
}
