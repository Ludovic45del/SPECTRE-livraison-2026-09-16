/**
 * Depressurization Step Schema
 * @module entities/steps/model
 *
 * Source: cible/domain/steps/models/depressurization_step_bean.py
 */

import { z } from 'zod';

export const DepressurizationStepApiSchema = z.object({
    uuid: z.string().uuid(),
    fsec_version_id: z.string().uuid(),
    operator: z.string().nullable(),
    operator_user_uuid: z.string().uuid().nullable().optional(),
    date_of_fulfilment: z.string().nullable(),
    pressure_gauge: z.number().nullable(),
    enclosure_pressure_measured: z.number().nullable(),
    start_time: z.string().nullable(),
    end_time: z.string().nullable(),
    observations: z.string().nullable(),
    depressurization_time_before_firing: z.number().nullable(),
    computed_pressure_before_firing: z.number().nullable(),
});

export const DepressurizationStepSchema = DepressurizationStepApiSchema.transform((api) => ({
    uuid: api.uuid,
    fsecVersionId: api.fsec_version_id,
    operator: api.operator,
    operatorUserUuid: api.operator_user_uuid ?? null,
    dateOfFulfilment: api.date_of_fulfilment ? new Date(api.date_of_fulfilment) : null,
    pressureGauge: api.pressure_gauge,
    enclosurePressureMeasured: api.enclosure_pressure_measured,
    startTime: api.start_time ? new Date(api.start_time) : null,
    endTime: api.end_time ? new Date(api.end_time) : null,
    observations: api.observations,
    depressurizationTimeBeforeFiring: api.depressurization_time_before_firing,
    computedPressureBeforeFiring: api.computed_pressure_before_firing,
}));

export type DepressurizationStep = z.infer<typeof DepressurizationStepSchema>;

export const DepressurizationStepListSchema = z.array(DepressurizationStepSchema);
