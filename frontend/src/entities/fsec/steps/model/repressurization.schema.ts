/**
 * Repressurization Step Schema
 * @module entities/steps/model
 *
 * Source: cible/domain/steps/models/repressurization_step_bean.py
 */

import { z } from 'zod';

export const RepressurizationStepApiSchema = z.object({
    uuid: z.string().uuid(),
    fsec_version_id: z.string().uuid(),
    operator: z.string().nullable(),
    operator_user_uuid: z.string().uuid().nullable().optional(),
    gas_type: z.string().nullable(),
    start_date: z.string().nullable(),
    estimated_end_date: z.string().nullable(),
    sensor_pressure: z.number().nullable(),
    computed_pressure: z.number().nullable(),
});

export const RepressurizationStepSchema = RepressurizationStepApiSchema.transform((api) => ({
    uuid: api.uuid,
    fsecVersionId: api.fsec_version_id,
    operator: api.operator,
    operatorUserUuid: api.operator_user_uuid ?? null,
    gasType: api.gas_type,
    startDate: api.start_date ? new Date(api.start_date) : null,
    estimatedEndDate: api.estimated_end_date ? new Date(api.estimated_end_date) : null,
    sensorPressure: api.sensor_pressure,
    computedPressure: api.computed_pressure,
}));

export type RepressurizationStep = z.infer<typeof RepressurizationStepSchema>;

export const RepressurizationStepListSchema = z.array(RepressurizationStepSchema);
