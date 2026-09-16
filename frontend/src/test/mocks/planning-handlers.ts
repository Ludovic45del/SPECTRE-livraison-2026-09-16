/**
 * Planning MSW handlers & mock data factories for tests.
 */
import { http, HttpResponse } from 'msw';

export const createMockWeekState = (overrides: Record<string, unknown> = {}) => ({
    uuid: crypto.randomUUID(),
    year: 2025,
    week_num: 10,
    state: 'vacances' as const,
    ...overrides,
});

export const createMockMemberPeriod = (overrides: Record<string, unknown> = {}) => ({
    uuid: crypto.randomUUID(),
    member_name: 'Dupont Jean',
    member_role: 'Assembleur',
    year: 2025,
    period_type: 'congés' as const,
    commentaire: null,
    start_date: '2025-03-10',
    end_date: '2025-03-14',
    ...overrides,
});

export const createMockCampaignStep = (overrides: Record<string, unknown> = {}) => ({
    uuid: crypto.randomUUID(),
    campaign_uuid: crypto.randomUUID(),
    fsec_uuid: crypto.randomUUID(),
    step_label: 'Assemblage',
    year: 2025,
    start_date: '2025-04-01',
    end_date: '2025-04-15',
    ...overrides,
});

export const createMockPlanningStep = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    label: 'Assemblage',
    color: '#5B7FC7',
    display_order: 1,
    min_status_for_done: 2,
    use_shooting_date: false,
    gas_only: false,
    ...overrides,
});

/** Référentiel d'étapes par défaut — reflète le seed de la migration 0066. */
export const DEFAULT_PLANNING_STEPS = [
    createMockPlanningStep({
        id: 0,
        label: 'Réception cibles',
        color: '#C47A9A',
        display_order: 0,
        min_status_for_done: 1,
    }),
    createMockPlanningStep({ id: 1, label: 'Assemblage', color: '#5B7FC7', display_order: 1, min_status_for_done: 2 }),
    createMockPlanningStep({ id: 2, label: 'Métrologie', color: '#4BAFB5', display_order: 2, min_status_for_done: 3 }),
    createMockPlanningStep({
        id: 3,
        label: 'Gaz',
        color: '#8b5cf6',
        display_order: 3,
        min_status_for_done: 5,
        gas_only: true,
    }),
    createMockPlanningStep({ id: 4, label: 'Livraison', color: '#C4A035', display_order: 4, min_status_for_done: 6 }),
    createMockPlanningStep({ id: 5, label: 'Tir', color: '#D4915C', display_order: 5, min_status_for_done: 7 }),
];

/**
 * Mutation handlers (POST/PATCH/DELETE) pour campaign-steps, lab-events et
 * member-periods. Ils renvoient l'entité en écho (uuid + corps de requête),
 * ce qui permet aux tests d'asserter le payload envoyé et au schéma Zod de
 * parser la réponse. Les GET seuls étaient mockés jusqu'ici.
 */
export const planningMutationHandlers = [
    // ----- Campaign steps -----
    http.post('/api/v1/planning/campaign-steps/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ uuid: crypto.randomUUID(), ...body }, { status: 201 });
    }),
    http.patch('/api/v1/planning/campaign-steps/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ uuid: params.uuid, ...body });
    }),
    http.delete('/api/v1/planning/campaign-steps/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ----- Lab events -----
    http.post('/api/v1/planning/lab-events/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ uuid: crypto.randomUUID(), ...body }, { status: 201 });
    }),
    http.patch('/api/v1/planning/lab-events/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ uuid: params.uuid, ...body });
    }),
    http.delete('/api/v1/planning/lab-events/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ----- Member periods -----
    http.post('/api/v1/planning/member-periods/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ uuid: crypto.randomUUID(), ...body }, { status: 201 });
    }),
    http.patch('/api/v1/planning/member-periods/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ uuid: params.uuid, ...body });
    }),
    http.delete('/api/v1/planning/member-periods/:uuid/', () => new HttpResponse(null, { status: 204 })),
];

/** Default planning handlers — return empty arrays (sauf le référentiel d'étapes) */
export const planningHandlers = [
    http.get('/api/v1/planning/week-states/', () => HttpResponse.json([])),
    http.get('/api/v1/planning/member-periods/', () => HttpResponse.json([])),
    http.get('/api/v1/planning/cell-annotations/', () => HttpResponse.json([])),
    http.get('/api/v1/planning/fsec-cell-links/', () => HttpResponse.json([])),
    http.get('/api/v1/planning/campaign-steps/', () => HttpResponse.json([])),
    http.get('/api/v1/planning/planning-steps/', () => HttpResponse.json(DEFAULT_PLANNING_STEPS)),
    http.get('/api/v1/planning/lab-events/', () => HttpResponse.json([])),
    http.get('/api/v1/campaigns/', () => HttpResponse.json([])),
    http.get('/api/v1/fsecs/', () => HttpResponse.json([])),
    ...planningMutationHandlers,
];

/** Planning handlers with custom data */
export function planningHandlersWithData(data: {
    weekStates?: unknown[];
    memberPeriods?: unknown[];
    cellAnnotations?: unknown[];
    fsecCellLinks?: unknown[];
    campaignSteps?: unknown[];
    planningSteps?: unknown[];
    labEvents?: unknown[];
    campaigns?: unknown[];
    fsecs?: unknown[];
}) {
    return [
        http.get('/api/v1/planning/week-states/', () => HttpResponse.json(data.weekStates ?? [])),
        http.get('/api/v1/planning/member-periods/', () => HttpResponse.json(data.memberPeriods ?? [])),
        http.get('/api/v1/planning/cell-annotations/', () => HttpResponse.json(data.cellAnnotations ?? [])),
        http.get('/api/v1/planning/fsec-cell-links/', () => HttpResponse.json(data.fsecCellLinks ?? [])),
        http.get('/api/v1/planning/campaign-steps/', () => HttpResponse.json(data.campaignSteps ?? [])),
        http.get('/api/v1/planning/planning-steps/', () =>
            HttpResponse.json(data.planningSteps ?? DEFAULT_PLANNING_STEPS),
        ),
        http.get('/api/v1/planning/lab-events/', () => HttpResponse.json(data.labEvents ?? [])),
        http.get('/api/v1/campaigns/', () => HttpResponse.json(data.campaigns ?? [])),
        http.get('/api/v1/fsecs/', () => HttpResponse.json(data.fsecs ?? [])),
        ...planningMutationHandlers,
    ];
}
