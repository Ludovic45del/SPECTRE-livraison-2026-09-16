/**
 * Assembly Step Schema
 * @module entities/steps/model
 *
 * Source: cible/domain/steps/models/assembly_step_bean.py
 */

import { z } from 'zod';

export const AssemblyStepApiSchema = z.object({
    uuid: z.string().uuid(),
    fsec_version_id: z.string().uuid(),
    operator: z.string().nullable(),
    // Champ singulier conservé (rétro-compat) + liste des assembleurs.
    operator_user_uuid: z.string().uuid().nullable(),
    operator_user_uuids: z.array(z.string().uuid()).default([]),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    comments: z.string().nullable(),
    machine_uuids: z.array(z.string().uuid()),
});

export const AssemblyStepSchema = AssemblyStepApiSchema.transform((api) => ({
    uuid: api.uuid,
    fsecVersionId: api.fsec_version_id,
    operator: api.operator,
    operatorUserUuid: api.operator_user_uuid,
    operatorUserUuids: api.operator_user_uuids,
    startDate: api.start_date ? new Date(api.start_date) : null,
    endDate: api.end_date ? new Date(api.end_date) : null,
    comments: api.comments,
    machineUuids: api.machine_uuids,
}));

export type AssemblyStep = z.infer<typeof AssemblyStepSchema>;

export const AssemblyStepListSchema = z.array(AssemblyStepSchema);
