/**
 * Gas Filling HP (High Pressure) Step Schema
 * @module entities/steps/model
 *
 * Source: cible/domain/steps/models/gas_filling_hp_step_bean.py
 */

import { z } from 'zod';

export const GasFillingHpStepApiSchema = z.object({
    uuid: z.string().uuid(),
    fsec_version_id: z.string().uuid(),
    embase_id: z.string().uuid().nullable(),
    embase_identifier: z.string().nullable(),
    leak_rate_dtri: z.string().nullable(),
    gas_type: z.string().nullable(),
    experiment_pressure: z.number().nullable(),
    operator: z.string().nullable(),
    operator_user_uuid: z.string().uuid().nullable().optional(),
    date_of_fulfilment: z.string().nullable(),
    gas_base: z.number().int().nullable(),
    gas_container: z.number().int().nullable(),
    observations: z.string().nullable(),
});

export const GasFillingHpStepSchema = GasFillingHpStepApiSchema.transform((api) => ({
    uuid: api.uuid,
    fsecVersionId: api.fsec_version_id,
    embaseId: api.embase_id,
    embaseIdentifier: api.embase_identifier,
    leakRateDtri: api.leak_rate_dtri,
    gasType: api.gas_type,
    experimentPressure: api.experiment_pressure,
    operator: api.operator,
    operatorUserUuid: api.operator_user_uuid ?? null,
    dateOfFulfilment: api.date_of_fulfilment ? new Date(api.date_of_fulfilment) : null,
    gasBase: api.gas_base,
    gasContainer: api.gas_container,
    observations: api.observations,
}));

export type GasFillingHpStep = z.infer<typeof GasFillingHpStepSchema>;

export const GasFillingHpStepListSchema = z.array(GasFillingHpStepSchema);
