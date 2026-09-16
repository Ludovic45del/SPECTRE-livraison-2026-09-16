/**
 * Task List Schema Tests — transform snake_case -> camelCase, enums, nullables.
 * @module entities/task-list/model
 */

import { describe, it, expect } from 'vitest';
import {
    TASK_LIST_COLORS,
    TASK_PRIORITIES,
    TaskCommentSchema,
    TaskItemSchema,
    TaskListCreateSchema,
    TaskListDetailSchema,
    TaskListSummarySchema,
    taskItemCreateToApi,
    taskItemPatchToApi,
    taskListCreateToApi,
    taskListPatchToApi,
} from './task-list.schema';

const LIST_UUID = '123e4567-e89b-12d3-a456-426614174000';
const OWNER_UUID = '11111111-1111-1111-1111-111111111111';
const MEMBER_UUID = '22222222-2222-2222-2222-222222222222';
const TASK_UUID = '33333333-3333-4333-8333-333333333333';

const validSummaryApi = {
    uuid: LIST_UUID,
    name: 'Courses labo',
    description: 'Liste de courses',
    color: 'blue',
    owner_uuid: OWNER_UUID,
    member_uuids: [MEMBER_UUID],
    task_count: 5,
    done_count: 2,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-16T10:00:00Z',
};

const validTaskApi = {
    uuid: TASK_UUID,
    task_list_uuid: LIST_UUID,
    title: 'Commander les joints',
    note: 'Réf. 42',
    priority: 'high',
    done: false,
    position: 3,
    due_date: '2026-02-01',
    assignee_uuid: MEMBER_UUID,
    created_by_uuid: OWNER_UUID,
    completed_by_uuid: null,
    completed_at: null,
    comment_count: 2,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-16T10:00:00Z',
};

describe('TaskListSummarySchema', () => {
    it('transforme le snake_case en camelCase', () => {
        const result = TaskListSummarySchema.parse(validSummaryApi);

        expect(result.uuid).toBe(LIST_UUID);
        expect(result.name).toBe('Courses labo');
        expect(result.color).toBe('blue');
        expect(result.ownerUuid).toBe(OWNER_UUID);
        expect(result.memberUuids).toEqual([MEMBER_UUID]);
        expect(result.taskCount).toBe(5);
        expect(result.doneCount).toBe(2);
        expect(result.createdAt).toBe('2026-01-15T10:00:00Z');
        expect(result.updatedAt).toBe('2026-01-16T10:00:00Z');
    });

    it('rejette un uuid invalide', () => {
        const result = TaskListSummarySchema.safeParse({ ...validSummaryApi, uuid: 'not-a-uuid' });
        expect(result.success).toBe(false);
    });

    it('rejette une couleur hors référentiel', () => {
        const result = TaskListSummarySchema.safeParse({ ...validSummaryApi, color: 'pink' });
        expect(result.success).toBe(false);
    });

    it('applique les défauts description/color', () => {
        const rest = Object.fromEntries(
            Object.entries(validSummaryApi).filter(([key]) => key !== 'description' && key !== 'color'),
        );
        const result = TaskListSummarySchema.parse(rest);
        expect(result.description).toBe('');
        expect(result.color).toBe('default');
    });
});

describe('TaskItemSchema', () => {
    it('transforme le snake_case en camelCase', () => {
        const result = TaskItemSchema.parse(validTaskApi);

        expect(result.taskListUuid).toBe(LIST_UUID);
        expect(result.title).toBe('Commander les joints');
        expect(result.priority).toBe('high');
        expect(result.dueDate).toBe('2026-02-01');
        expect(result.assigneeUuid).toBe(MEMBER_UUID);
        expect(result.createdByUuid).toBe(OWNER_UUID);
        expect(result.completedByUuid).toBeNull();
        expect(result.completedAt).toBeNull();
        expect(result.commentCount).toBe(2);
    });

    it('rejette une priorité hors enum', () => {
        const result = TaskItemSchema.safeParse({ ...validTaskApi, priority: 'urgent' });
        expect(result.success).toBe(false);
    });

    it('accepte les champs nullables à null', () => {
        const result = TaskItemSchema.parse({
            ...validTaskApi,
            due_date: null,
            assignee_uuid: null,
            created_by_uuid: null,
        });
        expect(result.dueDate).toBeNull();
        expect(result.assigneeUuid).toBeNull();
        expect(result.createdByUuid).toBeNull();
    });

    it('expose les 4 priorités dans TASK_PRIORITIES', () => {
        expect(TASK_PRIORITIES).toEqual(['low', 'normal', 'high', 'critical']);
        expect(TASK_LIST_COLORS).toHaveLength(6);
    });
});

describe('TaskListDetailSchema', () => {
    it('transforme le résumé + le tableau de tâches', () => {
        const result = TaskListDetailSchema.parse({ ...validSummaryApi, tasks: [validTaskApi] });

        expect(result.ownerUuid).toBe(OWNER_UUID);
        expect(result.tasks).toHaveLength(1);
        expect(result.tasks[0].taskListUuid).toBe(LIST_UUID);
        expect(result.tasks[0].priority).toBe('high');
    });

    it('rejette un détail sans tasks', () => {
        const result = TaskListDetailSchema.safeParse(validSummaryApi);
        expect(result.success).toBe(false);
    });
});

describe('TaskCommentSchema', () => {
    it('transforme le snake_case en camelCase (author nullable)', () => {
        const result = TaskCommentSchema.parse({
            uuid: TASK_UUID,
            task_uuid: TASK_UUID,
            author_uuid: null,
            text: 'RAS',
            created_at: '2026-01-15T10:00:00Z',
        });
        expect(result.taskUuid).toBe(TASK_UUID);
        expect(result.authorUuid).toBeNull();
        expect(result.text).toBe('RAS');
    });
});

describe('TaskListCreateSchema', () => {
    it('valide des données de création correctes', () => {
        const result = TaskListCreateSchema.safeParse({
            name: 'Nouvelle liste',
            description: 'desc',
            color: 'green',
            memberUuids: [MEMBER_UUID],
        });
        expect(result.success).toBe(true);
    });

    it('rejette un nom vide et un nom trop long', () => {
        expect(TaskListCreateSchema.safeParse({ name: '', color: 'default', memberUuids: [] }).success).toBe(false);
        expect(
            TaskListCreateSchema.safeParse({ name: 'a'.repeat(121), color: 'default', memberUuids: [] }).success,
        ).toBe(false);
    });
});

describe('mappers camelCase -> snake_case', () => {
    it('taskListCreateToApi mappe member_uuids et défaut description', () => {
        expect(taskListCreateToApi({ name: 'L', color: 'red', memberUuids: [MEMBER_UUID] })).toEqual({
            name: 'L',
            description: '',
            color: 'red',
            member_uuids: [MEMBER_UUID],
        });
    });

    it('taskListPatchToApi ne mappe que les champs fournis', () => {
        expect(taskListPatchToApi({ name: 'Renommée' })).toEqual({ name: 'Renommée' });
        expect(taskListPatchToApi({ color: 'purple', description: '' })).toEqual({
            color: 'purple',
            description: '',
        });
    });

    it('taskItemCreateToApi mappe due_date / assignee_uuid', () => {
        expect(
            taskItemCreateToApi({
                title: 'T',
                priority: 'critical',
                dueDate: '2026-02-01',
                assigneeUuid: MEMBER_UUID,
            }),
        ).toEqual({ title: 'T', priority: 'critical', due_date: '2026-02-01', assignee_uuid: MEMBER_UUID });
        expect(taskItemCreateToApi({ title: 'T' })).toEqual({ title: 'T' });
    });

    it('taskItemPatchToApi est partiel et préserve les null explicites', () => {
        expect(taskItemPatchToApi({ done: true })).toEqual({ done: true });
        expect(taskItemPatchToApi({ dueDate: null, assigneeUuid: null })).toEqual({
            due_date: null,
            assignee_uuid: null,
        });
        expect(taskItemPatchToApi({ position: 4, note: 'n' })).toEqual({ position: 4, note: 'n' });
    });
});
