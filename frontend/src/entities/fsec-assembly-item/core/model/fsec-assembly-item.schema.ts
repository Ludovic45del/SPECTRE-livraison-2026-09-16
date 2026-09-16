/**
 * FsecAssemblyItem — Zod schemas (validation + transformation).
 *
 * Endpoint principal : GET /fsec-assembly-items/fsec/:fsec_uuid/ qui retourne
 * un payload enrichi (catalog_item joint pour éviter le N+1, cf. CDC §5.3).
 */

import { z } from 'zod';

import { StockCatalogItemApiSchema, StockCatalogItemSchema } from '@entities/stock-item';

// ─────────────────────────────────────────────────────────────────────────────
// Bean simple (POST/PATCH responses)
// ─────────────────────────────────────────────────────────────────────────────

export const FsecAssemblyItemApiSchema = z.object({
    uuid: z.string().uuid(),
    fsec_uuid: z.string().uuid(),
    catalog_item_uuid: z.string().uuid(),
    sort_order: z.number().int(),
    remarque: z.string().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
});

export const FsecAssemblyItemSchema = FsecAssemblyItemApiSchema.transform((api) => ({
    uuid: api.uuid,
    fsecUuid: api.fsec_uuid,
    catalogItemUuid: api.catalog_item_uuid,
    sortOrder: api.sort_order,
    remarque: api.remarque,
    createdAt: api.created_at ? new Date(api.created_at) : null,
    updatedAt: api.updated_at ? new Date(api.updated_at) : null,
}));

export type FsecAssemblyItem = z.infer<typeof FsecAssemblyItemSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Detail (avec catalog_item joint) — réponse de GET /fsec/:uuid/
// ─────────────────────────────────────────────────────────────────────────────

export const FsecAssemblyItemDetailApiSchema = FsecAssemblyItemApiSchema.extend({
    catalog_item: StockCatalogItemApiSchema,
});

export const FsecAssemblyItemDetailSchema = FsecAssemblyItemDetailApiSchema.transform((api) => ({
    uuid: api.uuid,
    fsecUuid: api.fsec_uuid,
    catalogItemUuid: api.catalog_item_uuid,
    sortOrder: api.sort_order,
    remarque: api.remarque,
    createdAt: api.created_at ? new Date(api.created_at) : null,
    updatedAt: api.updated_at ? new Date(api.updated_at) : null,
    catalogItem: StockCatalogItemSchema.parse(api.catalog_item),
}));

export type FsecAssemblyItemDetail = z.infer<typeof FsecAssemblyItemDetailSchema>;

export const FsecAssemblyItemDetailListSchema = z.array(FsecAssemblyItemDetailSchema);

// ─────────────────────────────────────────────────────────────────────────────
// Payloads (POST / PATCH)
// ─────────────────────────────────────────────────────────────────────────────

export interface FsecAssemblyItemCreatePayload {
    fsec_uuid: string;
    catalog_item_uuid: string;
    sort_order?: number;
    remarque?: string | null;
}

export interface FsecAssemblyItemPatchPayload {
    sort_order?: number;
    remarque?: string | null;
}
