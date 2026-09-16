/**
 * Task List MSW handlers & mock data factories for tests.
 *
 * Couvre les endpoints du module tasklist (/api/v1/task-lists/…) :
 *   - GET    /task-lists/                                    (résumés)
 *   - POST   /task-lists/                                    (création)
 *   - GET    /task-lists/:uuid/                               (détail + tasks)
 *   - PATCH  /task-lists/:uuid/                               (name/description/color)
 *   - DELETE /task-lists/:uuid/
 *   - POST   /task-lists/:uuid/members/                       ({user_uuids})
 *   - DELETE /task-lists/:uuid/members/:userUuid/
 *   - POST   /task-lists/:uuid/tasks/
 *   - PATCH  /task-lists/:uuid/tasks/:taskUuid/
 *   - DELETE /task-lists/:uuid/tasks/:taskUuid/
 *   - GET    /task-lists/:uuid/tasks/:taskUuid/comments/
 *   - POST   /task-lists/:uuid/tasks/:taskUuid/comments/
 *   - DELETE /task-lists/:uuid/tasks/:taskUuid/comments/:commentUuid/
 *
 * IMPORTANT : les mocks renvoient du snake_case (format API brut) — la
 * transformation camelCase est faite par les schémas Zod côté client.
 */
import { http, HttpResponse } from 'msw';

/* ------------------------------------------------------------------ */
/*  Factories (snake_case = format API brut)                           */
/* ------------------------------------------------------------------ */

export const MOCK_OWNER_UUID = '11111111-1111-1111-1111-111111111111';

export const createMockTaskList = (overrides: Record<string, unknown> = {}) => ({
    uuid: crypto.randomUUID(),
    name: 'Liste Test',
    description: '',
    color: 'default',
    owner_uuid: MOCK_OWNER_UUID,
    member_uuids: [] as string[],
    task_count: 0,
    done_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
});

export const createMockTaskItem = (overrides: Record<string, unknown> = {}) => ({
    uuid: crypto.randomUUID(),
    task_list_uuid: crypto.randomUUID(),
    title: 'Tâche Test',
    note: '',
    priority: 'normal',
    done: false,
    position: 0,
    due_date: null as string | null,
    assignee_uuid: null as string | null,
    created_by_uuid: MOCK_OWNER_UUID as string | null,
    completed_by_uuid: null as string | null,
    completed_at: null as string | null,
    comment_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
});

export const createMockTaskComment = (overrides: Record<string, unknown> = {}) => ({
    uuid: crypto.randomUUID(),
    task_uuid: crypto.randomUUID(),
    author_uuid: MOCK_OWNER_UUID,
    text: 'Commentaire de test',
    created_at: new Date().toISOString(),
    ...overrides,
});

type MockTaskList = ReturnType<typeof createMockTaskList>;
type MockTaskItem = ReturnType<typeof createMockTaskItem>;
type MockTaskComment = ReturnType<typeof createMockTaskComment>;

/* ------------------------------------------------------------------ */
/*  Default handlers — stateless (listes vides + 404 sur les détails)  */
/* ------------------------------------------------------------------ */

/** Default tasklist handlers — pas d'état partagé entre tests. */
export const tasklistHandlers = [
    http.get('/api/v1/task-lists/', () => HttpResponse.json([])),
    http.post('/api/v1/task-lists/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockTaskList(body), { status: 201 });
    }),
    // Routes imbriquées AVANT le catch-all :uuid.
    http.post('/api/v1/task-lists/:uuid/members/', async ({ params, request }) => {
        const body = (await request.json()) as { user_uuids?: string[] };
        return HttpResponse.json(
            createMockTaskList({ uuid: params.uuid as string, member_uuids: body.user_uuids ?? [] }),
        );
    }),
    http.delete('/api/v1/task-lists/:uuid/members/:userUuid/', () => new HttpResponse(null, { status: 204 })),
    http.get('/api/v1/task-lists/:uuid/tasks/:taskUuid/comments/', () => HttpResponse.json([])),
    http.post('/api/v1/task-lists/:uuid/tasks/:taskUuid/comments/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockTaskComment({ task_uuid: params.taskUuid as string, ...body }), {
            status: 201,
        });
    }),
    http.delete(
        '/api/v1/task-lists/:uuid/tasks/:taskUuid/comments/:commentUuid/',
        () => new HttpResponse(null, { status: 204 }),
    ),
    http.post('/api/v1/task-lists/:uuid/tasks/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockTaskItem({ task_list_uuid: params.uuid as string, ...body }), {
            status: 201,
        });
    }),
    http.patch('/api/v1/task-lists/:uuid/tasks/:taskUuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
            createMockTaskItem({ uuid: params.taskUuid as string, task_list_uuid: params.uuid as string, ...body }),
        );
    }),
    http.delete('/api/v1/task-lists/:uuid/tasks/:taskUuid/', () => new HttpResponse(null, { status: 204 })),
    http.get('/api/v1/task-lists/:uuid/', () => new HttpResponse(null, { status: 404 })),
    http.patch('/api/v1/task-lists/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockTaskList({ uuid: params.uuid as string, ...body }));
    }),
    http.delete('/api/v1/task-lists/:uuid/', () => new HttpResponse(null, { status: 204 })),
];

/* ------------------------------------------------------------------ */
/*  Handlers avec données injectées — état local mutable par test      */
/* ------------------------------------------------------------------ */

export interface TasklistHandlersData {
    lists?: MockTaskList[];
    tasks?: MockTaskItem[];
    comments?: MockTaskComment[];
}

/**
 * Tasklist handlers avec un jeu de données spécifique. L'état est LOCAL à
 * l'appel (copies) et mute au fil des mutations : après invalidation TanStack,
 * les refetch reflètent les créations/patchs/suppressions du test.
 *
 * NOTE : task_count/done_count des résumés sont recalculés depuis `tasks`,
 * comment_count des tâches depuis `comments`.
 */
export function tasklistHandlersWithData(data: TasklistHandlersData) {
    const lists: MockTaskList[] = (data.lists ?? []).map((l) => ({ ...l }));
    let tasks: MockTaskItem[] = (data.tasks ?? []).map((t) => ({ ...t }));
    let comments: MockTaskComment[] = (data.comments ?? []).map((c) => ({ ...c }));

    const tasksOf = (listUuid: string) => tasks.filter((t) => t.task_list_uuid === listUuid);
    const withCounts = (list: MockTaskList) => {
        const listTasks = tasksOf(list.uuid);
        return {
            ...list,
            task_count: listTasks.length,
            done_count: listTasks.filter((t) => t.done).length,
        };
    };
    const withCommentCount = (task: MockTaskItem) => ({
        ...task,
        comment_count: comments.filter((c) => c.task_uuid === task.uuid).length,
    });

    return [
        http.get('/api/v1/task-lists/', () => HttpResponse.json(lists.map(withCounts))),
        http.post('/api/v1/task-lists/', async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>;
            const created = createMockTaskList(body);
            lists.push(created);
            return HttpResponse.json(created, { status: 201 });
        }),
        // Membres — routes imbriquées avant :uuid.
        http.post('/api/v1/task-lists/:uuid/members/', async ({ params, request }) => {
            const list = lists.find((l) => l.uuid === params.uuid);
            if (!list) return new HttpResponse(null, { status: 404 });
            const body = (await request.json()) as { user_uuids?: string[] };
            for (const uuid of body.user_uuids ?? []) {
                if (!list.member_uuids.includes(uuid)) list.member_uuids.push(uuid);
            }
            return HttpResponse.json(withCounts(list));
        }),
        http.delete('/api/v1/task-lists/:uuid/members/:userUuid/', ({ params }) => {
            const list = lists.find((l) => l.uuid === params.uuid);
            if (!list) return new HttpResponse(null, { status: 404 });
            list.member_uuids = list.member_uuids.filter((uuid) => uuid !== params.userUuid);
            return new HttpResponse(null, { status: 204 });
        }),
        // Commentaires.
        http.get('/api/v1/task-lists/:uuid/tasks/:taskUuid/comments/', ({ params }) =>
            HttpResponse.json(comments.filter((c) => c.task_uuid === params.taskUuid)),
        ),
        http.post('/api/v1/task-lists/:uuid/tasks/:taskUuid/comments/', async ({ params, request }) => {
            const body = (await request.json()) as Record<string, unknown>;
            const created = createMockTaskComment({ task_uuid: params.taskUuid as string, ...body });
            comments.push(created);
            return HttpResponse.json(created, { status: 201 });
        }),
        http.delete('/api/v1/task-lists/:uuid/tasks/:taskUuid/comments/:commentUuid/', ({ params }) => {
            comments = comments.filter((c) => c.uuid !== params.commentUuid);
            return new HttpResponse(null, { status: 204 });
        }),
        // Tâches.
        http.post('/api/v1/task-lists/:uuid/tasks/', async ({ params, request }) => {
            const body = (await request.json()) as Record<string, unknown>;
            const listUuid = params.uuid as string;
            const created = createMockTaskItem({
                task_list_uuid: listUuid,
                position: tasksOf(listUuid).length,
                ...body,
            });
            tasks.push(created);
            return HttpResponse.json(created, { status: 201 });
        }),
        http.patch('/api/v1/task-lists/:uuid/tasks/:taskUuid/', async ({ params, request }) => {
            const task = tasks.find((t) => t.uuid === params.taskUuid);
            if (!task) return new HttpResponse(null, { status: 404 });
            const body = (await request.json()) as Record<string, unknown>;
            Object.assign(task, body);
            if (body.done === true) {
                task.completed_at = new Date().toISOString();
                task.completed_by_uuid = MOCK_OWNER_UUID;
            } else if (body.done === false) {
                task.completed_at = null;
                task.completed_by_uuid = null;
            }
            return HttpResponse.json(withCommentCount(task));
        }),
        http.delete('/api/v1/task-lists/:uuid/tasks/:taskUuid/', ({ params }) => {
            tasks = tasks.filter((t) => t.uuid !== params.taskUuid);
            comments = comments.filter((c) => c.task_uuid !== params.taskUuid);
            return new HttpResponse(null, { status: 204 });
        }),
        // Détail / patch / delete de liste (catch-all :uuid en dernier).
        http.get('/api/v1/task-lists/:uuid/', ({ params }) => {
            const list = lists.find((l) => l.uuid === params.uuid);
            if (!list) return new HttpResponse(null, { status: 404 });
            return HttpResponse.json({
                ...withCounts(list),
                tasks: tasksOf(list.uuid).map(withCommentCount),
            });
        }),
        http.patch('/api/v1/task-lists/:uuid/', async ({ params, request }) => {
            const list = lists.find((l) => l.uuid === params.uuid);
            if (!list) return new HttpResponse(null, { status: 404 });
            const body = (await request.json()) as Record<string, unknown>;
            Object.assign(list, body);
            return HttpResponse.json(withCounts(list));
        }),
        http.delete('/api/v1/task-lists/:uuid/', ({ params }) => {
            const index = lists.findIndex((l) => l.uuid === params.uuid);
            if (index >= 0) lists.splice(index, 1);
            tasks = tasks.filter((t) => t.task_list_uuid !== params.uuid);
            return new HttpResponse(null, { status: 204 });
        }),
    ];
}
