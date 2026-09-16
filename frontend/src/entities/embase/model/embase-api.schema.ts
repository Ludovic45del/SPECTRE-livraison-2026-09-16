/**
 * Embase API Schema - Raw snake_case fields from backend
 * @module entities/embase/model
 */

import { z } from 'zod';

export const EmbaseApiSchema = z.object({
    uuid: z.string().uuid(),
    // Slug d'URL calculé côté backend (slugify de l'identifier).
    slug: z.string().optional(),
    identifier: z.string(),
    type: z.enum(['jet_de_gaz', 'hp', 'bp']),
    nombre_voies: z.number().default(1),
    // VOIE V1
    soufflet_v1: z.string().default(''),
    capteur_v1: z.string().default(''),
    offset_v1_mv: z.number().finite().nullable().default(null),
    mesurande_lie_v1_mv: z.number().finite().nullable().default(null),
    sensibilite_v1_mv: z.number().finite().nullable().default(null),
    signal_meteociel_v1_mv: z.number().finite().nullable().default(null),
    capteur_cible_pfeiffer_mbar: z.number().finite().nullable().default(null),
    etendue_v1_mbar: z.number().finite().nullable().default(null),
    test_etancheite_he: z.string().default(''),
    test_capteur_mrg: z.string().default(''),
    etalonnage_date: z.string().nullable().default(null),
    observations_v1: z.string().default(''),
    // MECA
    operationnelle_aimant: z.boolean().default(false),
    operationnelle_broche: z.boolean().default(false),
    localisation_actuelle: z.string().default(''),
    cote_ve: z.number().finite().nullable().default(null),
    decalage_angulaire: z.string().default(''),
    chargement_mcc: z.string().default(''),
    // VOIE V2
    soufflet_v2: z.string().default(''),
    capteur_v2: z.string().default(''),
    offset_v2_mv: z.number().finite().nullable().default(null),
    mesurande_lie_v2_mv: z.number().finite().nullable().default(null),
    sensibilite_v2_mv: z.number().finite().nullable().default(null),
    signal_meteociel_v2_mv: z.number().finite().nullable().default(null),
    capteur_cible_pfeiffer_v2_mbar: z.number().finite().nullable().default(null),
    etendue_v2_mbar: z.number().finite().nullable().default(null),
    test_etancheite_he_v2: z.string().default(''),
    test_capteur_mrg_v2: z.string().default(''),
    observations_v2: z.string().default(''),
    electrovanne: z.boolean().default(false),
    // Historique FSECs
    fsec_history: z.string().default(''),
    // Computed
    last_etalonnage_date: z.string().nullable().default(null),
    last_etalonnage_date_v1: z.string().nullable().default(null),
    last_etalonnage_date_v2: z.string().nullable().default(null),
    // Metadata
    created_at: z.string().nullable().default(null),
    updated_at: z.string().nullable().default(null),
});
