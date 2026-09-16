/**
 * Pictures Step Schema
 * @module entities/steps/model
 *
 * Source: backend/app/domain/steps/models/pictures_step_bean.py
 */

import { z } from 'zod';

export const PicturesStepApiSchema = z.object({
    uuid: z.string().uuid(),
    fsec_version_id: z.string().uuid(),
    operator: z.string().nullable(),
    operator_user_uuid: z.string().uuid().nullable().optional(),
    date: z.string().nullable(),
    comments: z.string().nullable(),
});

export const PicturesStepSchema = PicturesStepApiSchema.transform((api) => ({
    uuid: api.uuid,
    fsecVersionId: api.fsec_version_id,
    operator: api.operator,
    operatorUserUuid: api.operator_user_uuid ?? null,
    date: api.date ? new Date(api.date) : null,
    comments: api.comments,
}));

export type PicturesStep = z.infer<typeof PicturesStepSchema>;

export const PicturesStepListSchema = z.array(PicturesStepSchema);
