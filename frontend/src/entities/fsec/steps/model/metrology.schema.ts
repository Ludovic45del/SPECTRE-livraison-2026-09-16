/**
 * Metrology Step Schema
 * @module entities/steps/model
 *
 * Source: cible/domain/steps/models/metrology_step_bean.py
 */

import { z } from 'zod';

export const MetrologyStepApiSchema = z.object({
    uuid: z.string().uuid(),
    fsec_version_id: z.string().uuid(),
    rack_id: z.number().int().nullable(),
    metrologist_name: z.string().nullable(),
    // Champ singulier conservé (rétro-compat) + liste des métrologues.
    metrologist_user_uuid: z.string().uuid().nullable().optional(),
    metrologist_user_uuids: z.array(z.string().uuid()).default([]),
    date: z.string().nullable(),
    comments: z.string().nullable(),
    machine_uuids: z.array(z.string().uuid()),
    // Liens fichiers (URL HTTP ou chemin UNC) : fichier métro .txt et Visrad réalisé.
    metro_file_link: z.string().nullable().optional(),
    visrad_link: z.string().nullable().optional(),
});

export const MetrologyStepSchema = MetrologyStepApiSchema.transform((api) => ({
    uuid: api.uuid,
    fsecVersionId: api.fsec_version_id,
    rackId: api.rack_id,
    metrologistName: api.metrologist_name,
    metrologistUserUuid: api.metrologist_user_uuid ?? null,
    metrologistUserUuids: api.metrologist_user_uuids,
    date: api.date ? new Date(api.date) : null,
    comments: api.comments,
    machineUuids: api.machine_uuids,
    metroFileLink: api.metro_file_link ?? null,
    visradLink: api.visrad_link ?? null,
}));

export type MetrologyStep = z.infer<typeof MetrologyStepSchema>;

export const MetrologyStepListSchema = z.array(MetrologyStepSchema);
