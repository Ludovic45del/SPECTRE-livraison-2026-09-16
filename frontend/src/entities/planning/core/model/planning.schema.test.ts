/**
 * Tests for planning Zod schemas: validation, transformation, and toApi converters.
 */
import { describe, it, expect } from 'vitest';

const uuid = () => crypto.randomUUID();

import {
    PlanningWeekStateApiSchema,
    PlanningWeekStateSchema,
    PlanningWeekStateCreateSchema,
    planningWeekStateCreateToApi,
    PlanningMemberPeriodApiSchema,
    PlanningMemberPeriodSchema,
    PlanningMemberPeriodCreateSchema,
    planningMemberPeriodCreateToApi,
    PlanningCellAnnotationSchema,
    PlanningCellAnnotationCreateSchema,
    planningCellAnnotationCreateToApi,
    PlanningFsecCellLinkSchema,
    planningFsecCellLinkCreateToApi,
    PlanningCampaignStepApiSchema,
    PlanningCampaignStepSchema,
    planningCampaignStepCreateToApi,
    PlanningStepSchema,
    PlanningStepListSchema,
    LabEventApiSchema,
    LabEventSchema,
    LabEventCreateSchema,
    labEventCreateToApi,
} from './planning.schema';

// ====================== WEEK STATE ======================

describe('PlanningWeekState schemas', () => {
    const validApi = { uuid: uuid(), year: 2025, week_num: 12, state: 'vacances' as const };

    it('ApiSchema parses valid data', () => {
        const parsed = PlanningWeekStateApiSchema.parse(validApi);
        expect(parsed.week_num).toBe(12);
    });

    it('Schema transforms snake_case to camelCase', () => {
        const parsed = PlanningWeekStateSchema.parse(validApi);
        expect(parsed.weekNum).toBe(12);
        expect((parsed as Record<string, unknown>)['week_num']).toBeUndefined();
    });

    it('ApiSchema rejects invalid state', () => {
        expect(() => PlanningWeekStateApiSchema.parse({ ...validApi, state: 'invalid' })).toThrow();
    });

    it('CreateSchema rejects week_num > 53', () => {
        expect(() => PlanningWeekStateCreateSchema.parse({ year: 2025, weekNum: 54, state: 'vacances' })).toThrow();
    });

    it('CreateSchema rejects week_num < 1', () => {
        expect(() => PlanningWeekStateCreateSchema.parse({ year: 2025, weekNum: 0, state: 'vacances' })).toThrow();
    });

    it('createToApi converts camelCase to snake_case', () => {
        const api = planningWeekStateCreateToApi({ year: 2025, weekNum: 10, state: 'fermeture' });
        expect(api).toEqual({ year: 2025, week_num: 10, state: 'fermeture' });
    });
});

// ====================== MEMBER PERIOD ======================

describe('PlanningMemberPeriod schemas', () => {
    const validApi = {
        uuid: uuid(),
        member_name: 'Marie',
        member_role: 'Assembleur',
        year: 2025,
        period_type: 'congés' as const,
        commentaire: 'Vacances',
        start_date: '2025-07-01',
        end_date: '2025-07-15',
    };

    it('Schema transforms to camelCase', () => {
        const parsed = PlanningMemberPeriodSchema.parse(validApi);
        expect(parsed.memberName).toBe('Marie');
        expect(parsed.periodType).toBe('congés');
        expect(parsed.startDate).toBe('2025-07-01');
    });

    it('ApiSchema accepts null commentaire', () => {
        const parsed = PlanningMemberPeriodApiSchema.parse({ ...validApi, commentaire: null });
        expect(parsed.commentaire).toBeNull();
    });

    it('ApiSchema rejects invalid period_type', () => {
        expect(() => PlanningMemberPeriodApiSchema.parse({ ...validApi, period_type: 'invalid' })).toThrow();
    });

    it('CreateSchema requires memberName', () => {
        expect(() =>
            PlanningMemberPeriodCreateSchema.parse({
                memberName: '',
                memberRole: 'IEC',
                year: 2025,
                periodType: 'congés',
                startDate: '2025-01-01',
                endDate: '2025-01-05',
            }),
        ).toThrow();
    });

    it('createToApi roundtrip preserves data', () => {
        const create = {
            memberName: 'Test',
            memberRole: 'CDL',
            year: 2025,
            periodType: 'formation' as const,
            commentaire: 'Stage',
            startDate: '2025-01-01',
            endDate: '2025-01-10',
        };
        const api = planningMemberPeriodCreateToApi(create);
        expect(api.member_name).toBe('Test');
        expect(api.period_type).toBe('formation');
        expect(api.commentaire).toBe('Stage');
    });

    it('createToApi defaults null commentaire', () => {
        const create = {
            memberName: 'X',
            memberRole: 'Y',
            year: 2025,
            periodType: 'rtt' as const,
            startDate: '2025-01-01',
            endDate: '2025-01-02',
        };
        const api = planningMemberPeriodCreateToApi(create);
        expect(api.commentaire).toBeNull();
    });
});

// ====================== CELL ANNOTATION ======================

describe('PlanningCellAnnotation schemas', () => {
    const validApi = {
        uuid: uuid(),
        campaign_uuid: uuid(),
        step_label: 'Assemblage',
        year: 2025,
        week_num: 15,
        text: 'RAS',
    };

    it('Schema transforms to camelCase', () => {
        const parsed = PlanningCellAnnotationSchema.parse(validApi);
        expect(parsed.campaignUuid).toBe(validApi.campaign_uuid);
        expect(parsed.stepLabel).toBe('Assemblage');
        expect(parsed.weekNum).toBe(15);
    });

    it('CreateSchema rejects text > 1000 chars', () => {
        expect(() =>
            PlanningCellAnnotationCreateSchema.parse({
                campaignUuid: uuid(),
                stepLabel: 'X',
                year: 2025,
                weekNum: 10,
                text: 'a'.repeat(1001),
            }),
        ).toThrow();
    });

    it('createToApi converts correctly', () => {
        const api = planningCellAnnotationCreateToApi({
            campaignUuid: 'c-uuid',
            stepLabel: 'Tir',
            year: 2025,
            weekNum: 20,
            text: 'Note',
        });
        expect(api).toEqual({
            campaign_uuid: 'c-uuid',
            step_label: 'Tir',
            year: 2025,
            week_num: 20,
            text: 'Note',
        });
    });
});

// ====================== FSEC CELL LINK ======================

describe('PlanningFsecCellLink schemas', () => {
    const validApi = {
        uuid: uuid(),
        campaign_uuid: uuid(),
        step_label: 'Métrologie',
        year: 2025,
        week_num: 20,
        fsec_uuid: uuid(),
    };

    it('Schema transforms to camelCase', () => {
        const parsed = PlanningFsecCellLinkSchema.parse(validApi);
        expect(parsed.fsecUuid).toBe(validApi.fsec_uuid);
        expect(parsed.campaignUuid).toBe(validApi.campaign_uuid);
    });

    it('createToApi converts correctly', () => {
        const cUuid = uuid();
        const fUuid = uuid();
        const api = planningFsecCellLinkCreateToApi({
            campaignUuid: cUuid,
            stepLabel: 'Livraison',
            year: 2025,
            weekNum: 30,
            fsecUuid: fUuid,
        });
        expect(api.campaign_uuid).toBe(cUuid);
        expect(api.fsec_uuid).toBe(fUuid);
        expect(api.week_num).toBe(30);
    });
});

// ====================== CAMPAIGN STEP ======================

describe('PlanningCampaignStep schemas', () => {
    const validApi = {
        uuid: uuid(),
        campaign_uuid: uuid(),
        fsec_uuid: uuid(),
        step_label: 'Assemblage',
        year: 2025,
        start_date: '2025-03-01',
        end_date: '2025-03-15',
    };

    it('Schema transforms to camelCase', () => {
        const parsed = PlanningCampaignStepSchema.parse(validApi);
        expect(parsed.campaignUuid).toBe(validApi.campaign_uuid);
        expect(parsed.fsecUuid).toBe(validApi.fsec_uuid);
        expect(parsed.startDate).toBe('2025-03-01');
    });

    it('ApiSchema accepts null dates', () => {
        const parsed = PlanningCampaignStepApiSchema.parse({ ...validApi, start_date: null, end_date: null });
        expect(parsed.start_date).toBeNull();
    });

    it('createToApi converts correctly', () => {
        const api = planningCampaignStepCreateToApi({
            campaignUuid: 'cu',
            fsecUuid: 'fu',
            stepLabel: 'Tir',
            year: 2025,
            startDate: '2025-04-01',
            endDate: '2025-04-10',
        });
        expect(api).toEqual({
            campaign_uuid: 'cu',
            fsec_uuid: 'fu',
            step_label: 'Tir',
            year: 2025,
            start_date: '2025-04-01',
            end_date: '2025-04-10',
        });
    });
});

// ====================== PLANNING STEP ======================

describe('PlanningStep schemas', () => {
    const validApi = {
        id: 3,
        label: 'Gaz',
        color: '#8b5cf6',
        display_order: 3,
        min_status_for_done: 5,
        use_shooting_date: false,
        gas_only: true,
    };

    it('Schema transforms to camelCase', () => {
        const parsed = PlanningStepSchema.parse(validApi);
        expect(parsed.displayOrder).toBe(3);
        expect(parsed.minStatusForDone).toBe(5);
        expect(parsed.useShootingDate).toBe(false);
        expect(parsed.gasOnly).toBe(true);
        expect(parsed.label).toBe('Gaz');
    });

    it('Schema accepts null min_status_for_done', () => {
        const parsed = PlanningStepSchema.parse({ ...validApi, min_status_for_done: null });
        expect(parsed.minStatusForDone).toBeNull();
    });

    it('ListSchema parses an array', () => {
        const parsed = PlanningStepListSchema.parse([validApi, { ...validApi, id: 4, label: 'Tir' }]);
        expect(parsed).toHaveLength(2);
    });
});

// ====================== LAB EVENT ======================

describe('LabEvent schemas', () => {
    const validApi = {
        uuid: uuid(),
        machine_uuid: uuid(),
        category: 'Maintenance',
        description: 'Nettoyage',
        start_date: '2025-05-01',
        end_date: '2025-05-03',
    };

    it('Schema transforms to camelCase', () => {
        const parsed = LabEventSchema.parse(validApi);
        expect(parsed.machineUuid).toBe(validApi.machine_uuid);
        expect(parsed.startDate).toBe('2025-05-01');
    });

    it('ApiSchema accepts null dates', () => {
        const parsed = LabEventApiSchema.parse({ ...validApi, start_date: null, end_date: null });
        expect(parsed.start_date).toBeNull();
    });

    it('CreateSchema defaults description to empty string', () => {
        const parsed = LabEventCreateSchema.parse({
            machineUuid: uuid(),
            category: 'Panne',
            startDate: '2025-05-01',
            endDate: '2025-05-01',
        });
        expect(parsed.description).toBe('');
    });

    it('CreateSchema rejects empty category', () => {
        expect(() =>
            LabEventCreateSchema.parse({
                machineUuid: uuid(),
                category: '',
                startDate: '2025-01-01',
                endDate: '2025-01-01',
            }),
        ).toThrow();
    });

    it('createToApi converts correctly', () => {
        const api = labEventCreateToApi({
            machineUuid: 'mu',
            category: 'Calibration',
            description: 'Annual',
            startDate: '2025-06-01',
            endDate: '2025-06-02',
        });
        expect(api).toEqual({
            machine_uuid: 'mu',
            category: 'Calibration',
            description: 'Annual',
            start_date: '2025-06-01',
            end_date: '2025-06-02',
        });
    });
});
