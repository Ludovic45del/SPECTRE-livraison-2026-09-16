/**
 * Schema Zod pour la modale de validation IEC d'une phase FA (Ouvert ou En cours).
 * @module features/fa/validate-phase
 */

import { z } from 'zod';

export const ValidatePhaseFormSchema = z.object({
    validatorUserUuid: z.string().uuid('Validateur IEC requis'),
    validationDate: z.date({ required_error: 'Date de validation requise' }),
    /** Confirmation explicite (anti-clic accidentel sur action sensible). */
    confirmed: z.literal(true, {
        errorMap: () => ({ message: 'Cochez la case pour confirmer la validation' }),
    }),
});

export type ValidatePhaseFormData = z.infer<typeof ValidatePhaseFormSchema>;
