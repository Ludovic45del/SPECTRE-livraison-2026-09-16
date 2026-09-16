/**
 * FA Zod Schema - Validation & Transformation for Fiches d'Anomalie
 * @module entities/fa/model
 *
 * Source of Truth: backend/app/domain/fa/models/fa_bean.py
 * API Format: snake_case → Domain Format: camelCase
 */

import { z } from 'zod';
import { formatDateToIso } from '@shared/lib';

/**
 * Raw API response schema (snake_case from Backend)
 */
export const FaApiSchema = z.object({
    // Identifiant
    uuid: z.string().uuid(),
    // Slug d'URL calculé (slugify de l'identifier) + slugs des parents pour la
    // navigation croisée (null si FSEC/campagne parente sans contexte).
    slug: z.string().optional(),
    fsec_slug: z.string().nullable().optional(),
    campaign_slug: z.string().nullable().optional(),

    // Foreign Keys
    fsec_version_id: z.string(),
    status_id: z.number().int().nullable(),
    type_id: z.number().int().nullable(),
    criticality_id: z.number().int().nullable(),

    // Identifiant généré
    identifier: z.string(),

    // Phase Ouvert
    fsec_step_id: z.number().int().nullable(),
    fsec_step_other: z.string().nullable(),
    discoverer: z.string(),
    discoverer_user_uuid: z.string().uuid().nullable().optional(),
    event_date: z.string().nullable(),
    observation: z.string(),
    location_equipment: z.string().nullable(),
    quick_analysis: z.string(),
    immediate_measures: z.string().nullable(),
    iec_validation_open: z.boolean(),
    iec_validation_open_date: z.string().nullable(),
    iec_validation_open_name: z.string().nullable(),
    iec_validation_open_user_uuid: z.string().uuid().nullable().optional(),

    // Phase En cours (sans date de passage en cours)
    cause: z.string().nullable(),
    experience_impact: z.string().nullable(),
    iec_validation_progress: z.boolean(),
    iec_validation_progress_name: z.string().nullable(),
    iec_validation_progress_user_uuid: z.string().uuid().nullable().optional(),

    // Phase Clos
    closure_validation: z.string().nullable(),
    closure_date: z.string().nullable(),
    closure_validator_name: z.string().nullable(),
    closure_validator_user_uuid: z.string().uuid().nullable().optional(),

    // Metadata
    created_at: z.string().nullable(),
    last_updated: z.string().nullable(),

    // Champs dérivés exposés par /fas/ (évite un re-fetch /fsecs/ + /campaigns/ côté front).
    // Optionnels pour préserver la compatibilité avec d'éventuels payloads anciens.
    fsec_name: z.string().nullable().optional(),
    // Nom complet de la FSEC (« {year}-{installation}_{campagne}_{fsec} »).
    fsec_display_name: z.string().nullable().optional(),
    installation: z.string().nullable().optional(),
});

/**
 * Domain schema with camelCase transformation
 */
export const FaSchema = FaApiSchema.transform((api) => ({
    // Identifiant
    uuid: api.uuid,
    slug: api.slug ?? '',
    fsecSlug: api.fsec_slug ?? null,
    campaignSlug: api.campaign_slug ?? null,

    // Foreign Keys
    fsecVersionId: api.fsec_version_id,
    statusId: api.status_id,
    typeId: api.type_id,
    criticalityId: api.criticality_id,

    // Identifiant généré
    identifier: api.identifier,

    // Phase Ouvert
    fsecStepId: api.fsec_step_id,
    fsecStepOther: api.fsec_step_other,
    discoverer: api.discoverer,
    discovererUserUuid: api.discoverer_user_uuid ?? null,
    eventDate: api.event_date ? new Date(api.event_date) : null,
    observation: api.observation,
    locationEquipment: api.location_equipment,
    quickAnalysis: api.quick_analysis,
    immediateMeasures: api.immediate_measures,
    iecValidationOpen: api.iec_validation_open,
    iecValidationOpenDate: api.iec_validation_open_date ? new Date(api.iec_validation_open_date) : null,
    iecValidationOpenName: api.iec_validation_open_name,
    iecValidationOpenUserUuid: api.iec_validation_open_user_uuid ?? null,

    // Phase En cours (sans date de passage en cours)
    cause: api.cause,
    experienceImpact: api.experience_impact,
    iecValidationProgress: api.iec_validation_progress,
    iecValidationProgressName: api.iec_validation_progress_name,
    iecValidationProgressUserUuid: api.iec_validation_progress_user_uuid ?? null,

    // Phase Clos
    closureValidation: api.closure_validation,
    closureDate: api.closure_date ? new Date(api.closure_date) : null,
    closureValidatorName: api.closure_validator_name,
    closureValidatorUserUuid: api.closure_validator_user_uuid ?? null,

    // Metadata
    createdAt: api.created_at ? new Date(api.created_at) : null,
    lastUpdated: api.last_updated ? new Date(api.last_updated) : null,

    // Champs dérivés (lecture seule)
    fsecName: api.fsec_name ?? null,
    // Nom complet affiché partout ; repli sur le nom court pour un payload ancien.
    fsecDisplayName: api.fsec_display_name ?? api.fsec_name ?? null,
    installation: api.installation ?? null,
}));

export type Fa = z.infer<typeof FaSchema>;

/**
 * Schema for FA list response
 */
export const FaListSchema = z.array(FaSchema);

/**
 * Schema for creating a FA (input to API - Phase Ouvert only)
 */
export const FaCreateSchema = z.object({
    fsecVersionId: z.string().uuid('FSEC requis'),
    fsecStepId: z.number().int().nullable().optional(),
    fsecStepOther: z.string().nullable().optional(),
    discovererUserUuid: z.string().uuid('Découvreur requis'),
    eventDate: z.date({ required_error: 'Date requise' }),
    observation: z.string().min(1, 'Constat requis'),
    locationEquipment: z.string().nullable().optional(),
    quickAnalysis: z.string().min(1, 'Analyse rapide requise'),
    immediateMeasures: z.string().nullable().optional(),
});

export type FaCreate = z.infer<typeof FaCreateSchema>;

/**
 * Schema for updating a FA (Phase En cours)
 */
export const FaUpdateSchema = z.object({
    uuid: z.string().uuid(),
    // Status (for workflow stepper)
    statusId: z.number().int().nullable().optional(),
    // Phase Ouvert (can be updated)
    fsecStepId: z.number().int().nullable().optional(),
    fsecStepOther: z.string().nullable().optional(),
    discoverer: z.string().min(1, 'Découvreur requis').optional(),
    discovererUserUuid: z.string().uuid().nullable().optional(),
    eventDate: z.date().optional(),
    observation: z.string().min(1, 'Constat requis').optional(),
    locationEquipment: z.string().nullable().optional(),
    quickAnalysis: z.string().min(1, 'Analyse rapide requise').optional(),
    immediateMeasures: z.string().nullable().optional(),
    // Phase En cours
    cause: z.string().nullable().optional(),
    typeId: z.number().int().nullable().optional(),
    experienceImpact: z.string().nullable().optional(),
    criticalityId: z.number().int().nullable().optional(),
    // Phase Clos
    closureValidation: z.string().nullable().optional(),
    closureDate: z.date().nullable().optional(),
    closureValidatorName: z.string().nullable().optional(),
    closureValidatorUserUuid: z.string().uuid().nullable().optional(),
});

export type FaUpdate = z.infer<typeof FaUpdateSchema>;

/**
 * Validation schema for Phase Ouvert edit form (field length limits)
 */
export const PhaseOuvertEditSchema = z.object({
    fsecStepOther: z.string().max(200, 'Précision trop longue (max 200 caractères)'),
    // Découvreur : FK UserProfile (source de vérité). null = pas de sélection —
    // l'exigence « FK ou texte legacy » est vérifiée dans useFaPhaseOuvertForm.
    discovererUserUuid: z.string().uuid('Découvreur invalide').nullable(),
    observation: z.string().max(4000, 'Constat trop long (max 4000 caractères)'),
    locationEquipment: z.string().max(500, 'Lieu/Équipement trop long (max 500 caractères)'),
    quickAnalysis: z.string().max(4000, 'Analyse rapide trop longue (max 4000 caractères)'),
    immediateMeasures: z.string().max(4000, 'Mesures immédiates trop longues (max 4000 caractères)'),
});

/**
 * Validation schema for Phase En Cours edit form (field length limits)
 */
export const PhaseEnCoursEditSchema = z.object({
    cause: z.string().max(4000, 'Cause trop longue (max 4000 caractères)'),
    experienceImpact: z.string().max(4000, 'Impact trop long (max 4000 caractères)'),
});

/**
 * Transform FaCreate to API format (camelCase → snake_case)
 */
export function faCreateToApi(data: FaCreate): Record<string, unknown> {
    return {
        fsec_version_id: data.fsecVersionId,
        fsec_step_id: data.fsecStepId ?? null,
        fsec_step_other: data.fsecStepOther ?? null,
        // discoverer (texte legacy) reste vide : la source de verite est la FK.
        discoverer: '',
        discoverer_user_uuid: data.discovererUserUuid,
        // DateField backend : sérialisation en composantes locales (pas de J-1 UTC).
        event_date: formatDateToIso(data.eventDate),
        observation: data.observation,
        location_equipment: data.locationEquipment ?? null,
        quick_analysis: data.quickAnalysis,
        immediate_measures: data.immediateMeasures ?? null,
    };
}

/**
 * Transform FaUpdate to API format (camelCase → snake_case)
 */
export function faUpdateToApi(data: FaUpdate): Record<string, unknown> {
    const result: Record<string, unknown> = {
        uuid: data.uuid,
    };

    // Status (for workflow stepper)
    if (data.statusId !== undefined) result.status_id = data.statusId;
    // Phase Ouvert
    if (data.fsecStepId !== undefined) result.fsec_step_id = data.fsecStepId;
    if (data.fsecStepOther !== undefined) result.fsec_step_other = data.fsecStepOther ?? null;
    if (data.discoverer !== undefined) result.discoverer = data.discoverer;
    if (data.discovererUserUuid !== undefined) result.discoverer_user_uuid = data.discovererUserUuid;
    if (data.eventDate !== undefined) result.event_date = formatDateToIso(data.eventDate);
    if (data.observation !== undefined) result.observation = data.observation;
    if (data.locationEquipment !== undefined) result.location_equipment = data.locationEquipment ?? null;
    if (data.quickAnalysis !== undefined) result.quick_analysis = data.quickAnalysis;
    if (data.immediateMeasures !== undefined) result.immediate_measures = data.immediateMeasures ?? null;
    // Phase En cours
    if (data.cause !== undefined) result.cause = data.cause ?? null;
    if (data.typeId !== undefined) result.type_id = data.typeId ?? null;
    if (data.experienceImpact !== undefined) result.experience_impact = data.experienceImpact ?? null;
    if (data.criticalityId !== undefined) result.criticality_id = data.criticalityId ?? null;
    // Phase Clos
    if (data.closureValidation !== undefined) result.closure_validation = data.closureValidation ?? null;
    if (data.closureDate !== undefined) result.closure_date = formatDateToIso(data.closureDate);
    if (data.closureValidatorName !== undefined) result.closure_validator_name = data.closureValidatorName ?? null;
    if (data.closureValidatorUserUuid !== undefined)
        result.closure_validator_user_uuid = data.closureValidatorUserUuid ?? null;

    return result;
}

/**
 * Photo de galerie FA (phase Ouvert).
 * Source of Truth: backend/app/domain/fa/models/fa_photo_bean.py
 */
export const FaPhotoApiSchema = z.object({
    uuid: z.string().uuid(),
    fa_uuid: z.string(),
    image: z.string().nullable(),
    caption: z.string().nullable().optional(),
    order: z.number().int(),
    created_at: z.string().nullable(),
});

export const FaPhotoSchema = FaPhotoApiSchema.transform((api) => ({
    uuid: api.uuid,
    faUuid: api.fa_uuid,
    imageUrl: api.image,
    caption: api.caption ?? null,
    order: api.order,
    createdAt: api.created_at,
}));

export const FaPhotoListSchema = z.array(FaPhotoSchema);

export type FaPhoto = z.infer<typeof FaPhotoSchema>;
