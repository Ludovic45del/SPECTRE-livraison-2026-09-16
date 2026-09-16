/**
 * FSEC Document Zod Schema - Validation & Transformation
 * @module entities/fsec-document/model
 *
 * Source of Truth: cible/domain/fsec/models/fsec_documents_bean.py
 */

import { z } from 'zod';

/**
 * Raw API response schema (snake_case from Backend)
 */
export const FsecDocumentApiSchema = z.object({
    uuid: z.string().uuid(),
    fsec_id: z.string().uuid(),
    subtype_id: z.number().int().nullable(),
    name: z.string(),
    path: z.string(),
    date: z.string().nullable(),
});

/**
 * Domain schema with camelCase transformation
 */
export const FsecDocumentSchema = FsecDocumentApiSchema.transform((api) => ({
    uuid: api.uuid,
    fsecId: api.fsec_id,
    subtypeId: api.subtype_id,
    name: api.name,
    path: api.path,
    date: api.date ? new Date(api.date) : null,
}));

export type FsecDocument = z.infer<typeof FsecDocumentSchema>;
export type FsecDocumentApi = z.input<typeof FsecDocumentSchema>;

/**
 * Schema for FSEC Document list response
 */
export const FsecDocumentListSchema = z.array(FsecDocumentSchema);
