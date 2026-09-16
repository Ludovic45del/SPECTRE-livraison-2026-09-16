/**
 * Photo View Schema
 * @module entities/steps/model
 *
 * Source: backend/app/domain/steps/models/photo_view_bean.py
 */

import { z } from 'zod';

export const PhotoViewApiSchema = z.object({
    uuid: z.string().uuid(),
    pictures_step_id: z.string().uuid(),
    name: z.string(),
    link: z.string().nullable(),
});

export const PhotoViewSchema = PhotoViewApiSchema.transform((api) => ({
    uuid: api.uuid,
    picturesStepId: api.pictures_step_id,
    name: api.name,
    link: api.link,
}));

export type PhotoView = z.infer<typeof PhotoViewSchema>;

export const PhotoViewListSchema = z.array(PhotoViewSchema);
