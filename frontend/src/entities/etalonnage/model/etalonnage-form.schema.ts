/**
 * Etalonnage form validation schema
 * @module entities/etalonnage/model
 */

import { z } from 'zod';

export const EtalonnageFormSchema = z.object({
    date: z.date({ required_error: 'Date requise' }),
    operateur: z.string().min(1, 'Champ requis'),
    offset0BarMv: z.number().finite().nullable().optional(),
    mesurande0BarLie: z.number().finite().nullable().optional(),
    signalEtendueMv: z.number().finite().nullable().optional(),
    signalPaMeteociel: z.number().finite().nullable().optional(),
});

export type EtalonnageFormData = z.infer<typeof EtalonnageFormSchema>;

export const EtalonnageCreateApiSchema = z.object({
    embase_uuid: z.string().uuid(),
    voie: z.union([z.literal(1), z.literal(2)]),
    date: z.string().nullable(),
    operateur: z.string().min(1),
    offset_0_bar_mv: z.number().finite().nullable(),
    mesurande_0_bar_lie: z.number().finite().nullable(),
    signal_etendue_mv: z.number().finite().nullable(),
    signal_pa_meteociel: z.number().finite().nullable(),
});

export type EtalonnageCreateApi = z.infer<typeof EtalonnageCreateApiSchema>;
