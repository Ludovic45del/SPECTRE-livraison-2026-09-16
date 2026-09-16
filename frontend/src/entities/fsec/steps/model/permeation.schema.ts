/**
 * Permeation Step Schema
 * @module entities/steps/model
 *
 * Source: cible/domain/steps/models/permeation_step_bean.py
 */

import { z } from 'zod';

export const PermeationStepApiSchema = z.object({
    uuid: z.string().uuid(),
    fsec_version_id: z.string().uuid(),
    gas_type: z.string().nullable(),
    target_pressure: z.number().nullable(),
    operator: z.string().nullable(),
    operator_user_uuid: z.string().uuid().nullable().optional(),
    start_date: z.string().nullable(),
    estimated_end_date: z.string().nullable(),
    sensor_pressure: z.number().nullable(),
    computed_shot_pressure: z.number().nullable(),
});

export const PermeationStepSchema = PermeationStepApiSchema.transform((api) => ({
    uuid: api.uuid,
    fsecVersionId: api.fsec_version_id,
    gasType: api.gas_type,
    targetPressure: api.target_pressure,
    operator: api.operator,
    operatorUserUuid: api.operator_user_uuid ?? null,
    startDate: api.start_date ? new Date(api.start_date) : null,
    estimatedEndDate: api.estimated_end_date ? new Date(api.estimated_end_date) : null,
    sensorPressure: api.sensor_pressure,
    computedShotPressure: api.computed_shot_pressure,
}));

export type PermeationStep = z.infer<typeof PermeationStepSchema>;

export const PermeationStepListSchema = z.array(PermeationStepSchema);
