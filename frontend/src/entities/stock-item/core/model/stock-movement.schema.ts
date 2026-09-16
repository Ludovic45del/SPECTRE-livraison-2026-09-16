/**
 * Stock Movement — Zod schemas (validation + transformation).
 *
 * - `StockMovementCreatePayload` : payload envoyé au backend (snake_case).
 * - `StockMovementApiSchema` / `StockMovementSchema` : réponse backend
 *   (snake_case) → domaine (camelCase).
 *
 * Source de vérité : `backend/app/api/stock/serializers.py`
 * (StockMovementCreateSerializer / StockMovementReadSerializer) et
 * `backend/app/domain/stock/models/stock_constants.py` (MovementType).
 */

import { z } from 'zod';

import { MOVEMENT_TYPE_VALUES, type MovementType } from './stock.constants';

// ─────────────────────────────────────────────────────────────────────────────
// Payload de création (form/domaine → API snake_case)
// ─────────────────────────────────────────────────────────────────────────────

export interface StockMovementCreatePayload {
    catalog_item_uuid: string;
    movement_type: MovementType;
    /** Delta signé : positif pour une entrée, négatif pour une sortie. */
    quantite_delta: number;
    /** Date du mouvement au format ISO `YYYY-MM-DD`. */
    date?: string | null;
    remarque?: string | null;
    auteur_name?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Réponse API (snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

export const StockMovementApiSchema = z.object({
    uuid: z.string().uuid(),
    catalog_item_uuid: z.string().uuid(),
    movement_type: z.enum(MOVEMENT_TYPE_VALUES as [MovementType, ...MovementType[]]),
    quantite_delta: z.number().int(),
    quantite_apres: z.number().int().nullable(),
    date: z.string().nullable(),
    remarque: z.string().nullable(),
    auteur_name: z.string().nullable(),
    created_at: z.string().nullable(),
});

export const StockMovementSchema = StockMovementApiSchema.transform((api) => ({
    uuid: api.uuid,
    catalogItemUuid: api.catalog_item_uuid,
    movementType: api.movement_type,
    quantiteDelta: api.quantite_delta,
    quantiteApres: api.quantite_apres,
    date: api.date ? new Date(api.date) : null,
    remarque: api.remarque,
    auteurName: api.auteur_name,
    createdAt: api.created_at ? new Date(api.created_at) : null,
}));

export type StockMovement = z.infer<typeof StockMovementSchema>;
export type StockMovementApi = z.input<typeof StockMovementSchema>;
