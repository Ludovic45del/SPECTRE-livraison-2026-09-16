/**
 * Task List Zod Schemas — Validation & Transformation
 * @module entities/task-list/model
 *
 * Source of Truth: spécification « Listes de tâches partagées »
 * (backend module tasklist — /api/v1/task-lists/).
 *
 * API Format: snake_case -> Domain Format: camelCase.
 * Les utilisateurs (owner, membres, assigné, auteur) sont représentés par leur
 * uuid de UserProfile ; noms/avatars sont résolus côté client via
 * useUserLookup() (pattern campaign-teams).
 */

import { z } from 'zod';

/** Priorités d'une tâche (ordre croissant d'importance). */
export const TASK_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/** Couleurs d'accent autorisées pour une liste. */
export const TASK_LIST_COLORS = ['default', 'blue', 'green', 'orange', 'purple', 'red'] as const;
export type TaskListColor = (typeof TASK_LIST_COLORS)[number];

/* ------------------------------------------------------------------ */
/*  Résumé de liste (GET /task-lists/)                                 */
/* ------------------------------------------------------------------ */

/** Raw API response schema (snake_case from Backend). */
export const TaskListSummaryApiSchema = z.object({
    uuid: z.string().uuid(),
    name: z.string(),
    description: z.string().default(''),
    color: z.enum(TASK_LIST_COLORS).default('default'),
    owner_uuid: z.string().uuid(),
    member_uuids: z.array(z.string().uuid()),
    task_count: z.number().int(),
    done_count: z.number().int(),
    created_at: z.string(),
    updated_at: z.string(),
});

/** Shared mapping function: snake_case API -> camelCase domain. */
function mapTaskListSummary(api: z.infer<typeof TaskListSummaryApiSchema>) {
    return {
        uuid: api.uuid,
        name: api.name,
        description: api.description,
        color: api.color,
        ownerUuid: api.owner_uuid,
        memberUuids: api.member_uuids,
        taskCount: api.task_count,
        doneCount: api.done_count,
        createdAt: api.created_at,
        updatedAt: api.updated_at,
    };
}

/** Domain schema with camelCase transformation. */
export const TaskListSummarySchema = TaskListSummaryApiSchema.transform(mapTaskListSummary);
export type TaskListSummary = z.infer<typeof TaskListSummarySchema>;

export const TaskListSummaryListSchema = z.array(TaskListSummarySchema);

/* ------------------------------------------------------------------ */
/*  Tâche (TaskItem)                                                   */
/* ------------------------------------------------------------------ */

/** Raw API response schema (snake_case from Backend). */
export const TaskItemApiSchema = z.object({
    uuid: z.string().uuid(),
    task_list_uuid: z.string().uuid(),
    title: z.string(),
    note: z.string().default(''),
    priority: z.enum(TASK_PRIORITIES),
    done: z.boolean(),
    position: z.number().int(),
    /** Date d'échéance au format YYYY-MM-DD (date-only, pas de fuseau). */
    due_date: z.string().nullable(),
    assignee_uuid: z.string().uuid().nullable(),
    created_by_uuid: z.string().uuid().nullable(),
    completed_by_uuid: z.string().uuid().nullable(),
    completed_at: z.string().nullable(),
    comment_count: z.number().int(),
    created_at: z.string(),
    updated_at: z.string(),
});

/** Shared mapping function: snake_case API -> camelCase domain. */
function mapTaskItem(api: z.infer<typeof TaskItemApiSchema>) {
    return {
        uuid: api.uuid,
        taskListUuid: api.task_list_uuid,
        title: api.title,
        note: api.note,
        priority: api.priority,
        done: api.done,
        position: api.position,
        dueDate: api.due_date,
        assigneeUuid: api.assignee_uuid,
        createdByUuid: api.created_by_uuid,
        completedByUuid: api.completed_by_uuid,
        completedAt: api.completed_at,
        commentCount: api.comment_count,
        createdAt: api.created_at,
        updatedAt: api.updated_at,
    };
}

/** Domain schema with camelCase transformation. */
export const TaskItemSchema = TaskItemApiSchema.transform(mapTaskItem);
export type TaskItem = z.infer<typeof TaskItemSchema>;

/* ------------------------------------------------------------------ */
/*  Détail de liste (GET /task-lists/{uuid}/) = résumé + tasks         */
/* ------------------------------------------------------------------ */

export const TaskListDetailSchema = TaskListSummaryApiSchema.extend({
    tasks: z.array(TaskItemApiSchema),
}).transform((api) => ({
    ...mapTaskListSummary(api),
    tasks: api.tasks.map(mapTaskItem),
}));
export type TaskListDetail = z.infer<typeof TaskListDetailSchema>;

/* ------------------------------------------------------------------ */
/*  Commentaire de tâche                                               */
/* ------------------------------------------------------------------ */

export const TaskCommentApiSchema = z.object({
    uuid: z.string().uuid(),
    task_uuid: z.string().uuid(),
    author_uuid: z.string().uuid().nullable(),
    text: z.string(),
    created_at: z.string(),
});

export const TaskCommentSchema = TaskCommentApiSchema.transform((api) => ({
    uuid: api.uuid,
    taskUuid: api.task_uuid,
    authorUuid: api.author_uuid,
    text: api.text,
    createdAt: api.created_at,
}));
export type TaskComment = z.infer<typeof TaskCommentSchema>;

export const TaskCommentListSchema = z.array(TaskCommentSchema);

/* ------------------------------------------------------------------ */
/*  Schémas de création / mise à jour (inputs)                         */
/* ------------------------------------------------------------------ */

/** Schema de création d'une liste (formulaire) — messages FR. */
export const TaskListCreateSchema = z.object({
    name: z.string().min(1, 'Le nom est requis').max(120, 'Le nom ne doit pas dépasser 120 caractères'),
    description: z.string().max(2000, 'La description ne doit pas dépasser 2000 caractères').optional(),
    color: z.enum(TASK_LIST_COLORS),
    /** Membres invités à la création (exclut l'utilisateur courant = owner). */
    memberUuids: z.array(z.string().uuid()),
});
export type TaskListCreate = z.infer<typeof TaskListCreateSchema>;

/** camelCase -> snake_case mapper pour POST /task-lists/. */
export function taskListCreateToApi(data: TaskListCreate): Record<string, unknown> {
    return {
        name: data.name,
        description: data.description ?? '',
        color: data.color,
        member_uuids: data.memberUuids,
    };
}

/** Patch partiel d'une liste (owner uniquement : name/description/color). */
export interface TaskListPatch {
    name?: string;
    description?: string;
    color?: TaskListColor;
}

/** camelCase -> snake_case mapper pour PATCH /task-lists/{uuid}/ (partiel). */
export function taskListPatchToApi(patch: TaskListPatch): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.description !== undefined) body.description = patch.description;
    if (patch.color !== undefined) body.color = patch.color;
    return body;
}

/** Payload de création d'une tâche. */
export interface TaskItemCreate {
    title: string;
    note?: string;
    priority?: TaskPriority;
    /** YYYY-MM-DD ou null. */
    dueDate?: string | null;
    assigneeUuid?: string | null;
}

/** camelCase -> snake_case mapper pour POST /task-lists/{uuid}/tasks/. */
export function taskItemCreateToApi(data: TaskItemCreate): Record<string, unknown> {
    const body: Record<string, unknown> = { title: data.title };
    if (data.note !== undefined) body.note = data.note;
    if (data.priority !== undefined) body.priority = data.priority;
    if (data.dueDate !== undefined) body.due_date = data.dueDate;
    if (data.assigneeUuid !== undefined) body.assignee_uuid = data.assigneeUuid;
    return body;
}

/** Patch partiel d'une tâche — seuls les champs fournis sont envoyés. */
export interface TaskItemPatch {
    title?: string;
    note?: string;
    priority?: TaskPriority;
    done?: boolean;
    /** YYYY-MM-DD ou null. */
    dueDate?: string | null;
    assigneeUuid?: string | null;
    position?: number;
}

/** camelCase -> snake_case mapper pour PATCH /task-lists/{uuid}/tasks/{taskUuid}/. */
export function taskItemPatchToApi(patch: TaskItemPatch): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (patch.title !== undefined) body.title = patch.title;
    if (patch.note !== undefined) body.note = patch.note;
    if (patch.priority !== undefined) body.priority = patch.priority;
    if (patch.done !== undefined) body.done = patch.done;
    if (patch.dueDate !== undefined) body.due_date = patch.dueDate;
    if (patch.assigneeUuid !== undefined) body.assignee_uuid = patch.assigneeUuid;
    if (patch.position !== undefined) body.position = patch.position;
    return body;
}
