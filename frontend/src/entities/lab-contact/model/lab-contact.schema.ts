/**
 * Lab Contact Zod Schemas — Validation & Transformation
 * @module entities/lab-contact/model
 *
 * Source of Truth : backend module labcontact — /api/v1/lab-contacts/
 * (annuaire des laboratoires : numéros utiles partagés, éditables par toute
 * l'équipe — retour utilisateur R07).
 *
 * API Format: snake_case -> Domain Format: camelCase.
 */

import { z } from 'zod';

/** Longueurs maximales — alignées sur l'entité backend (CharField) et le serializer. */
export const LAB_CONTACT_NAME_MAX_LENGTH = 150;
export const LAB_CONTACT_PHONE_MAX_LENGTH = 30;
export const LAB_CONTACT_COMMENT_MAX_LENGTH = 4000;

/* ------------------------------------------------------------------ */
/*  Réponse API (GET /lab-contacts/, POST, PUT)                        */
/* ------------------------------------------------------------------ */

/** Raw API response schema (snake_case from Backend). */
export const LabContactApiSchema = z.object({
    uuid: z.string().uuid(),
    name: z.string(),
    phone: z.string().nullable().default(''),
    comment: z.string().nullable().default(''),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
});

/** Domain schema with camelCase transformation. */
export const LabContactSchema = LabContactApiSchema.transform((api) => ({
    uuid: api.uuid,
    name: api.name,
    phone: api.phone ?? '',
    comment: api.comment ?? '',
    createdAt: api.created_at,
    updatedAt: api.updated_at,
}));
export type LabContact = z.infer<typeof LabContactSchema>;

export const LabContactListSchema = z.array(LabContactSchema);

/* ------------------------------------------------------------------ */
/*  Saisie (formulaire création / édition)                             */
/* ------------------------------------------------------------------ */

/**
 * Schéma du formulaire — messages FR. Les valeurs sont normalisées (trim) par
 * le parse : le payload envoyé au backend est donc déjà propre.
 */
export const LabContactInputSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Le nom est requis')
        .max(LAB_CONTACT_NAME_MAX_LENGTH, `Le nom ne doit pas dépasser ${LAB_CONTACT_NAME_MAX_LENGTH} caractères`),
    phone: z
        .string()
        .trim()
        .max(
            LAB_CONTACT_PHONE_MAX_LENGTH,
            `Le téléphone ne doit pas dépasser ${LAB_CONTACT_PHONE_MAX_LENGTH} caractères`,
        ),
    comment: z
        .string()
        .trim()
        .max(
            LAB_CONTACT_COMMENT_MAX_LENGTH,
            `Le commentaire ne doit pas dépasser ${LAB_CONTACT_COMMENT_MAX_LENGTH} caractères`,
        ),
});
export type LabContactInput = z.infer<typeof LabContactInputSchema>;

/** camelCase -> snake_case mapper pour POST /lab-contacts/ et PUT /lab-contacts/{uuid}/. */
export function labContactInputToApi(data: LabContactInput): Record<string, unknown> {
    return {
        name: data.name,
        phone: data.phone,
        comment: data.comment,
    };
}
