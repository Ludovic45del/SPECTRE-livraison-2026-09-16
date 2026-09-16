/**
 * Planning Zod Schemas - Validation & Transformation
 * @module entities/planning/model
 *
 * API Format: snake_case → Domain Format: camelCase
 */

import { z } from 'zod';

// ====================== SHARED ENUMS ======================

export const STEP_LABELS = ['Réception cibles', 'Assemblage', 'Métrologie', 'Gaz', 'Livraison', 'Tir'] as const;
export const LAB_EVENT_CATEGORIES = [
    'Maintenance',
    'Panne',
    'Installation',
    'Calibration',
    'Nettoyage',
    'Autre',
] as const;

// ====================== WEEK STATE ======================

export const PlanningWeekStateApiSchema = z.object({
    uuid: z.string().uuid(),
    year: z.number().int(),
    week_num: z.number().int(),
    state: z.enum(['vacances', 'fermeture']),
});

export const PlanningWeekStateSchema = PlanningWeekStateApiSchema.transform((api) => ({
    uuid: api.uuid,
    year: api.year,
    weekNum: api.week_num,
    state: api.state,
}));

export type PlanningWeekState = z.infer<typeof PlanningWeekStateSchema>;

export const PlanningWeekStateListSchema = z.array(PlanningWeekStateSchema);

export const PlanningWeekStateCreateSchema = z.object({
    year: z.number().int().min(2000).max(2100),
    weekNum: z.number().int().min(1).max(53),
    state: z.enum(['vacances', 'fermeture']),
});

export type PlanningWeekStateCreate = z.infer<typeof PlanningWeekStateCreateSchema>;

export function planningWeekStateCreateToApi(data: PlanningWeekStateCreate) {
    return {
        year: data.year,
        week_num: data.weekNum,
        state: data.state,
    };
}

// ====================== MEMBER PERIOD ======================

export const PERIOD_TYPES = ['congés', 'mission', 'formation', 'rtt', 'maladie', 'télétravail'] as const;

export const PlanningMemberPeriodApiSchema = z.object({
    uuid: z.string().uuid(),
    member_name: z.string(),
    member_role: z.string(),
    year: z.number().int(),
    period_type: z.enum(PERIOD_TYPES),
    commentaire: z.string().nullable(),
    start_date: z.string(),
    end_date: z.string(),
});

export const PlanningMemberPeriodSchema = PlanningMemberPeriodApiSchema.transform((api) => ({
    uuid: api.uuid,
    memberName: api.member_name,
    memberRole: api.member_role,
    year: api.year,
    periodType: api.period_type,
    commentaire: api.commentaire,
    startDate: api.start_date,
    endDate: api.end_date,
}));

export type PlanningMemberPeriod = z.infer<typeof PlanningMemberPeriodSchema>;

export const PlanningMemberPeriodListSchema = z.array(PlanningMemberPeriodSchema);

export const PlanningMemberPeriodCreateSchema = z.object({
    memberName: z.string().min(1),
    memberRole: z.string().min(1),
    year: z.number().int().min(2000).max(2100),
    periodType: z.enum(PERIOD_TYPES),
    commentaire: z.string().nullable().optional(),
    startDate: z.string(),
    endDate: z.string(),
});

export type PlanningMemberPeriodCreate = z.infer<typeof PlanningMemberPeriodCreateSchema>;

export function planningMemberPeriodCreateToApi(data: PlanningMemberPeriodCreate) {
    return {
        member_name: data.memberName,
        member_role: data.memberRole,
        year: data.year,
        period_type: data.periodType,
        commentaire: data.commentaire ?? null,
        start_date: data.startDate,
        end_date: data.endDate,
    };
}

// ====================== CELL ANNOTATION ======================

export const PlanningCellAnnotationApiSchema = z.object({
    uuid: z.string().uuid(),
    campaign_uuid: z.string().uuid(),
    step_label: z.string(),
    year: z.number().int(),
    week_num: z.number().int(),
    text: z.string(),
});

export const PlanningCellAnnotationSchema = PlanningCellAnnotationApiSchema.transform((api) => ({
    uuid: api.uuid,
    campaignUuid: api.campaign_uuid,
    stepLabel: api.step_label,
    year: api.year,
    weekNum: api.week_num,
    text: api.text,
}));

export type PlanningCellAnnotation = z.infer<typeof PlanningCellAnnotationSchema>;

export const PlanningCellAnnotationListSchema = z.array(PlanningCellAnnotationSchema);

export const PlanningCellAnnotationCreateSchema = z.object({
    campaignUuid: z.string().uuid(),
    stepLabel: z.string().min(1).max(50),
    year: z.number().int().min(2000).max(2100),
    weekNum: z.number().int().min(1).max(53),
    text: z.string().max(1000),
});

export type PlanningCellAnnotationCreate = z.infer<typeof PlanningCellAnnotationCreateSchema>;

export function planningCellAnnotationCreateToApi(data: PlanningCellAnnotationCreate) {
    return {
        campaign_uuid: data.campaignUuid,
        step_label: data.stepLabel,
        year: data.year,
        week_num: data.weekNum,
        text: data.text,
    };
}

// ====================== FSEC CELL LINK ======================

export const PlanningFsecCellLinkApiSchema = z.object({
    uuid: z.string().uuid(),
    campaign_uuid: z.string().uuid(),
    step_label: z.string(),
    year: z.number().int(),
    week_num: z.number().int(),
    fsec_uuid: z.string().uuid(),
});

export const PlanningFsecCellLinkSchema = PlanningFsecCellLinkApiSchema.transform((api) => ({
    uuid: api.uuid,
    campaignUuid: api.campaign_uuid,
    stepLabel: api.step_label,
    year: api.year,
    weekNum: api.week_num,
    fsecUuid: api.fsec_uuid,
}));

export type PlanningFsecCellLink = z.infer<typeof PlanningFsecCellLinkSchema>;

export const PlanningFsecCellLinkListSchema = z.array(PlanningFsecCellLinkSchema);

export const PlanningFsecCellLinkCreateSchema = z.object({
    campaignUuid: z.string().uuid(),
    stepLabel: z.string().min(1).max(50),
    year: z.number().int().min(2000).max(2100),
    weekNum: z.number().int().min(1).max(53),
    fsecUuid: z.string().uuid(),
});

export type PlanningFsecCellLinkCreate = z.infer<typeof PlanningFsecCellLinkCreateSchema>;

export function planningFsecCellLinkCreateToApi(data: PlanningFsecCellLinkCreate) {
    return {
        campaign_uuid: data.campaignUuid,
        step_label: data.stepLabel,
        year: data.year,
        week_num: data.weekNum,
        fsec_uuid: data.fsecUuid,
    };
}

// ====================== CAMPAIGN STEP ======================

export const PlanningCampaignStepApiSchema = z.object({
    uuid: z.string().uuid(),
    campaign_uuid: z.string().uuid(),
    fsec_uuid: z.string().uuid(),
    step_label: z.string(),
    year: z.number().int(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
});

export const PlanningCampaignStepSchema = PlanningCampaignStepApiSchema.transform((api) => ({
    uuid: api.uuid,
    campaignUuid: api.campaign_uuid,
    fsecUuid: api.fsec_uuid,
    stepLabel: api.step_label,
    year: api.year,
    startDate: api.start_date,
    endDate: api.end_date,
}));

export type PlanningCampaignStep = z.infer<typeof PlanningCampaignStepSchema>;

export const PlanningCampaignStepListSchema = z.array(PlanningCampaignStepSchema);

export const PlanningCampaignStepCreateSchema = z.object({
    campaignUuid: z.string().uuid(),
    fsecUuid: z.string().uuid(),
    stepLabel: z.string().min(1).max(50),
    year: z.number().int().min(2000).max(2100),
    startDate: z.string(),
    endDate: z.string(),
});

export type PlanningCampaignStepCreate = z.infer<typeof PlanningCampaignStepCreateSchema>;

export function planningCampaignStepCreateToApi(data: PlanningCampaignStepCreate) {
    return {
        campaign_uuid: data.campaignUuid,
        fsec_uuid: data.fsecUuid,
        step_label: data.stepLabel,
        year: data.year,
        start_date: data.startDate,
        end_date: data.endDate,
    };
}

// ====================== PLANNING STEP (referentiel) ======================

export const PlanningStepApiSchema = z.object({
    id: z.number().int(),
    label: z.string(),
    color: z.string(),
    display_order: z.number().int(),
    min_status_for_done: z.number().int().nullable(),
    use_shooting_date: z.boolean(),
    gas_only: z.boolean(),
});

export const PlanningStepSchema = PlanningStepApiSchema.transform((api) => ({
    id: api.id,
    label: api.label,
    color: api.color,
    displayOrder: api.display_order,
    minStatusForDone: api.min_status_for_done,
    useShootingDate: api.use_shooting_date,
    gasOnly: api.gas_only,
}));

export type PlanningStep = z.infer<typeof PlanningStepSchema>;

export const PlanningStepListSchema = z.array(PlanningStepSchema);

// ====================== LAB EVENT ======================

export const LabEventApiSchema = z.object({
    uuid: z.string().uuid(),
    machine_uuid: z.string().uuid(),
    category: z.string(),
    description: z.string(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
});

export const LabEventSchema = LabEventApiSchema.transform((api) => ({
    uuid: api.uuid,
    machineUuid: api.machine_uuid,
    category: api.category,
    description: api.description,
    startDate: api.start_date,
    endDate: api.end_date,
}));

export type LabEvent = z.infer<typeof LabEventSchema>;

export const LabEventListSchema = z.array(LabEventSchema);

export const LabEventCreateSchema = z.object({
    machineUuid: z.string().uuid(),
    category: z.string().min(1).max(50),
    description: z.string().optional().default(''),
    startDate: z.string(),
    endDate: z.string(),
});

export type LabEventCreate = z.infer<typeof LabEventCreateSchema>;

export function labEventCreateToApi(data: LabEventCreate) {
    return {
        machine_uuid: data.machineUuid,
        category: data.category,
        description: data.description,
        start_date: data.startDate,
        end_date: data.endDate,
    };
}
