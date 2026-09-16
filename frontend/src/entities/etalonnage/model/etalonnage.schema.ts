/**
 * Etalonnage Zod Schemas - Validation & Transformation
 * @module entities/etalonnage/model
 */

import { z } from 'zod';

const EtalonnageApiSchema = z.object({
    uuid: z.string().uuid(),
    embase_uuid: z.string().uuid(),
    voie: z.number().min(1).max(2).default(1),
    offset_0_bar_mv: z.number().finite().nullable().default(null),
    mesurande_0_bar_lie: z.number().finite().nullable().default(null),
    signal_etendue_mv: z.number().finite().nullable().default(null),
    signal_pa_meteociel: z.number().finite().nullable().default(null),
    date: z.string().nullable().default(null),
    operateur: z.string().default(''),
    created_at: z.string().nullable().default(null),
    updated_at: z.string().nullable().default(null),
});

export const EtalonnageSchema = EtalonnageApiSchema.transform((api) => ({
    uuid: api.uuid,
    embaseUuid: api.embase_uuid,
    voie: api.voie as 1 | 2,
    offset0BarMv: api.offset_0_bar_mv,
    mesurande0BarLie: api.mesurande_0_bar_lie,
    signalEtendueMv: api.signal_etendue_mv,
    signalPaMeteociel: api.signal_pa_meteociel,
    date: api.date,
    operateur: api.operateur,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
}));

export type Etalonnage = z.output<typeof EtalonnageSchema>;

export const EtalonnageListSchema = z.array(EtalonnageSchema);

export type EtalonnageNumericField = 'offset0BarMv' | 'mesurande0BarLie' | 'signalEtendueMv' | 'signalPaMeteociel';

export const ETALONNAGE_FIELD_LABELS: Record<EtalonnageNumericField, string> = {
    offset0BarMv: 'Offset (b) à 0 barA (mV)',
    mesurande0BarLie: 'Mesurande à 0 barA au LIE',
    signalEtendueMv: 'Sensibilité (a) (mV)',
    signalPaMeteociel: 'Signal Pa météociel (mbar)',
};

export const ETALONNAGE_FIELD_COLORS: Record<EtalonnageNumericField, string> = {
    offset0BarMv: '#1976d2',
    mesurande0BarLie: '#9c27b0',
    signalEtendueMv: '#2e7d32',
    signalPaMeteociel: '#ed6c02',
};
