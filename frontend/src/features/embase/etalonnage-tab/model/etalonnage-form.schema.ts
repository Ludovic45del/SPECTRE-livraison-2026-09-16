/**
 * Etalonnage form validation schema
 * @module features/embase/etalonnage-tab/model
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
