/**
 * FSEC Zod Schema - Validation & Transformation
 * @module entities/fsec/model
 *
 * Source of Truth: cible/domain/fsec/models/fsec_bean.py
 * API Format: snake_case → Domain Format: camelCase
 */

import { z } from 'zod';
import { formatDateToIso } from '@shared/lib';
import { parsePlanAnnotations } from './assembly-plan.schema';

/**
 * Raw API response schema (snake_case from Backend)
 */
export const FsecApiSchema = z.object({
    // Versioning
    version_uuid: z.string().uuid(),
    fsec_uuid: z.string().uuid(),

    // Slug d'URL calculé (préfixé du contexte campagne) + slug de la campagne
    // parente pour la navigation croisée (null si FSEC orphelin).
    slug: z.string().optional(),
    campaign_slug: z.string().nullable().optional(),

    // Foreign Keys
    campaign_id: z.string().uuid().nullable(),
    status_id: z.number().int().nullable(),
    category_id: z.number().int().nullable(),
    rack_id: z.number().int().nullable(),

    // Base fields
    name: z.string(),
    // Nom complet d'affichage calculé côté backend :
    // « {year}-{installation}_{campagne}_{name} » (ex. 2026-LMJ_gorfou_2).
    // optional() pour rester rétro-compatible avec les FSECs sérialisées avant
    // l'ajout du champ (caches, snapshots de tests) : repli sur `name`.
    display_name: z.string().optional(),
    comments: z.string().nullable(),
    last_updated: z.string().nullable(),
    is_active: z.boolean(),
    created_at: z.string().nullable(),

    // Workflow fields
    delivery_date: z.string().nullable(),
    shooting_date: z.string().nullable(),
    preshooting_pressure: z.number().nullable(),
    experience_srxx: z.string().nullable(),
    localisation: z.string().nullable(),
    depressurization_failed: z.boolean().nullable(),

    // Photo de la vue d'ensemble (URL relative servie via MEDIA_URL).
    // optional() pour rester rétro-compatible avec les FSECs sérialisés avant
    // l'ajout du champ (caches navigateur, snapshots de tests).
    overview_image: z.string().nullable().optional(),

    // Vues / photos demandées (onglet Vue/Photo, R08) : texte libre porté par la
    // FSEC, indépendant de la session photo. Modifié uniquement via l'action
    // PATCH dédiée (useUpdateFsecRequestedViews) — jamais via le PUT global.
    requested_views: z.string().nullable().optional(),

    // Plan d'assemblage annotable (rubrique Assemblage).
    // `assembly_plan_image` : URL relative MEDIA ou null. `assembly_plan_annotations` :
    // calque brut toléré tel quel ici (validé/coercé via parsePlanAnnotations) pour
    // qu'une annotation corrompue ne casse pas le parsing du FSEC.
    assembly_plan_image: z.string().nullable().optional(),
    assembly_plan_annotations: z.array(z.unknown()).nullable().optional(),

    // Liens vers fichiers métiers (URL HTTP interne ou chemin UNC).
    alignment_file_link: z.string().nullable().optional(),
    fdie_link: z.string().nullable().optional(),

    // Fiche de livraison phase 2 (TCI : OK/KO + remarques + signature).
    delivery_validation: z.string().nullable().optional(),
    delivery_remarques: z.string().nullable().optional(),
    delivery_validated_by_username: z.string().nullable().optional(),
    delivery_validated_at: z.string().nullable().optional(),
});

/**
 * Domain schema with camelCase transformation
 */
export const FsecSchema = FsecApiSchema.transform((api) => ({
    // Versioning
    versionUuid: api.version_uuid,
    fsecUuid: api.fsec_uuid,

    // Slugs d'URL
    slug: api.slug ?? '',
    campaignSlug: api.campaign_slug ?? null,

    // Foreign Keys
    campaignId: api.campaign_id,
    statusId: api.status_id,
    categoryId: api.category_id,
    rackId: api.rack_id,

    // Base fields
    name: api.name,
    // Nom complet : c'est CE libellé qui s'affiche partout dans l'application ;
    // `name` (nom court) ne sert qu'aux formulaires et à la persistance.
    displayName: api.display_name ?? api.name,
    comments: api.comments,
    lastUpdated: api.last_updated ? new Date(api.last_updated) : null,
    isActive: api.is_active,
    createdAt: api.created_at ? new Date(api.created_at) : null,

    // Workflow fields
    deliveryDate: api.delivery_date ? new Date(api.delivery_date) : null,
    shootingDate: api.shooting_date ? new Date(api.shooting_date) : null,
    preshootingPressure: api.preshooting_pressure,
    experienceSrxx: api.experience_srxx,
    localisation: api.localisation,
    depressurizationFailed: api.depressurization_failed,

    // Photo de la vue d'ensemble (null si absente).
    overviewImage: api.overview_image ?? null,

    // Vues / photos demandées (null si aucune consigne).
    requestedViews: api.requested_views ?? null,

    // Plan d'assemblage annotable.
    assemblyPlanImage: api.assembly_plan_image ?? null,
    assemblyPlanAnnotations: parsePlanAnnotations(api.assembly_plan_annotations),

    // Liens vers fichiers métiers.
    alignmentFileLink: api.alignment_file_link ?? null,
    fdieLink: api.fdie_link ?? null,

    // Fiche de livraison phase 2.
    deliveryValidation: api.delivery_validation ?? null,
    deliveryRemarques: api.delivery_remarques ?? null,
    deliveryValidatedByUsername: api.delivery_validated_by_username ?? null,
    deliveryValidatedAt: api.delivery_validated_at ? new Date(api.delivery_validated_at) : null,
}));

export type Fsec = z.infer<typeof FsecSchema>;
export type FsecApi = z.input<typeof FsecSchema>;

/**
 * Schema for FSEC list response
 */
export const FsecListSchema = z.array(FsecSchema);

/**
 * Schema for creating a FSEC (input to API)
 */
export const FsecCreateSchema = z.object({
    name: z.string().min(1, 'Le nom est requis'),
    campaignId: z.string().uuid().nullable().optional(),
    statusId: z.number().int().nullable().optional(),
    categoryId: z.number().int().nullable().optional(),
    rackId: z.number().int().nullable().optional(),
    comments: z.string().nullable().optional(),
    deliveryDate: z.date().nullable().optional(),
    shootingDate: z.date().nullable().optional(),
    preshootingPressure: z.number().nullable().optional(),
    experienceSrxx: z.string().nullable().optional(),
    localisation: z.string().nullable().optional(),
    depressurizationFailed: z.boolean().nullable().optional(),
    alignmentFileLink: z.string().nullable().optional(),
    fdieLink: z.string().nullable().optional(),
});

export type FsecCreate = z.infer<typeof FsecCreateSchema>;

/**
 * Schema for FSEC general info inline form validation (OverviewTab)
 */
export const FsecGeneralFormSchema = z.object({
    localisation: z.string().max(500, 'Localisation trop longue (max 500 caractères)'),
    comments: z.string().max(4000, 'Remarques trop longues (max 4000 caractères)'),
});

/**
 * Transform FsecCreate to API format (camelCase → snake_case)
 */
export function fsecCreateToApi(data: FsecCreate): Record<string, unknown> {
    return {
        name: data.name,
        campaign_id: data.campaignId ?? null,
        status_id: data.statusId ?? null,
        category_id: data.categoryId ?? null,
        rack_id: data.rackId ?? null,
        comments: data.comments ?? null,
        // DateField backend : sérialisation en composantes locales (pas de J-1 UTC).
        delivery_date: formatDateToIso(data.deliveryDate),
        shooting_date: formatDateToIso(data.shootingDate),
        preshooting_pressure: data.preshootingPressure ?? null,
        experience_srxx: data.experienceSrxx ?? null,
        localisation: data.localisation ?? null,
        depressurization_failed: data.depressurizationFailed ?? null,
        alignment_file_link: data.alignmentFileLink ?? null,
        fdie_link: data.fdieLink ?? null,
    };
}
