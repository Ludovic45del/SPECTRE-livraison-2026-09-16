/**
 * Embase Create/Update Schema & conversion function
 * @module entities/embase/model
 */

import { z } from 'zod';

import type { Embase } from './embase.schema';

// ============================================================================
// Create/Update Schema
// ============================================================================

export const EmbaseCreateSchema = z.object({
    identifier: z.string().min(1, "L'identifiant est requis"),
    type: z.enum(['jet_de_gaz', 'hp', 'bp'], { required_error: 'Le type est requis' }),
    nombreVoies: z.number().min(1).max(2).default(1),
    // VOIE V1
    souffletV1: z.string().default(''),
    capteurV1: z.string().default(''),
    offsetV1Mv: z.number().finite().nullable().default(null),
    mesurandeLieV1Mv: z.number().finite().nullable().default(null),
    sensibiliteV1Mv: z.number().finite().nullable().default(null),
    signalMeteocielV1Mv: z.number().finite().nullable().default(null),
    capteurCiblePfeifferMbar: z.number().finite().nullable().default(null),
    etendueV1Mbar: z.number().finite().nullable().default(null),
    testEtancheiteHe: z.string().default(''),
    testCapteurMrg: z.string().default(''),
    etalonnageDate: z.string().nullable().default(null),
    observationsV1: z.string().default(''),
    // MECA
    operationnelleAimant: z.boolean().default(false),
    operationnelleBroche: z.boolean().default(false),
    localisationActuelle: z.string().default(''),
    coteVe: z.number().finite().nullable().default(null),
    decalageAngulaire: z.string().default(''),
    chargementMcc: z.string().default(''),
    // VOIE V2
    souffletV2: z.string().default(''),
    capteurV2: z.string().default(''),
    offsetV2Mv: z.number().finite().nullable().default(null),
    mesurandeLieV2Mv: z.number().finite().nullable().default(null),
    sensibiliteV2Mv: z.number().finite().nullable().default(null),
    signalMeteocielV2Mv: z.number().finite().nullable().default(null),
    capteurCiblePfeifferV2Mbar: z.number().finite().nullable().default(null),
    etendueV2Mbar: z.number().finite().nullable().default(null),
    testEtancheiteHeV2: z.string().default(''),
    testCapteurMrgV2: z.string().default(''),
    observationsV2: z.string().default(''),
    electrovanne: z.boolean().default(false),
    // Historique FSECs
    fsecHistory: z.string().default(''),
});

export type EmbaseCreate = z.infer<typeof EmbaseCreateSchema>;

// ============================================================================
// Conversion functions
// ============================================================================

/** Maps an Embase domain object to EmbaseCreate form shape, with optional overrides. */
export function embaseToCreateForm(embase: Embase, overrides: Partial<EmbaseCreate> = {}): EmbaseCreate {
    return {
        identifier: embase.identifier,
        type: embase.type as EmbaseCreate['type'],
        nombreVoies: embase.nombreVoies,
        souffletV1: embase.souffletV1,
        capteurV1: embase.capteurV1,
        offsetV1Mv: embase.offsetV1Mv,
        mesurandeLieV1Mv: embase.mesurandeLieV1Mv,
        sensibiliteV1Mv: embase.sensibiliteV1Mv,
        signalMeteocielV1Mv: embase.signalMeteocielV1Mv,
        capteurCiblePfeifferMbar: embase.capteurCiblePfeifferMbar,
        etendueV1Mbar: embase.etendueV1Mbar,
        testEtancheiteHe: embase.testEtancheiteHe,
        testCapteurMrg: embase.testCapteurMrg,
        etalonnageDate: embase.etalonnageDate,
        observationsV1: embase.observationsV1,
        operationnelleAimant: embase.operationnelleAimant,
        operationnelleBroche: embase.operationnelleBroche,
        localisationActuelle: embase.localisationActuelle,
        coteVe: embase.coteVe,
        decalageAngulaire: embase.decalageAngulaire,
        chargementMcc: embase.chargementMcc,
        souffletV2: embase.souffletV2,
        capteurV2: embase.capteurV2,
        offsetV2Mv: embase.offsetV2Mv,
        mesurandeLieV2Mv: embase.mesurandeLieV2Mv,
        sensibiliteV2Mv: embase.sensibiliteV2Mv,
        signalMeteocielV2Mv: embase.signalMeteocielV2Mv,
        capteurCiblePfeifferV2Mbar: embase.capteurCiblePfeifferV2Mbar,
        etendueV2Mbar: embase.etendueV2Mbar,
        testEtancheiteHeV2: embase.testEtancheiteHeV2,
        testCapteurMrgV2: embase.testCapteurMrgV2,
        observationsV2: embase.observationsV2,
        electrovanne: embase.electrovanne,
        fsecHistory: embase.fsecHistory,
        ...overrides,
    };
}

// camelCase -> snake_case for API

export function embaseCreateToApi(data: EmbaseCreate): Record<string, unknown> {
    return {
        identifier: data.identifier,
        type: data.type,
        nombre_voies: data.nombreVoies,
        // VOIE V1
        soufflet_v1: data.souffletV1,
        capteur_v1: data.capteurV1,
        offset_v1_mv: data.offsetV1Mv,
        mesurande_lie_v1_mv: data.mesurandeLieV1Mv,
        sensibilite_v1_mv: data.sensibiliteV1Mv,
        signal_meteociel_v1_mv: data.signalMeteocielV1Mv,
        capteur_cible_pfeiffer_mbar: data.capteurCiblePfeifferMbar,
        etendue_v1_mbar: data.etendueV1Mbar,
        test_etancheite_he: data.testEtancheiteHe,
        test_capteur_mrg: data.testCapteurMrg,
        etalonnage_date: data.etalonnageDate,
        observations_v1: data.observationsV1,
        // MECA
        operationnelle_aimant: data.operationnelleAimant,
        operationnelle_broche: data.operationnelleBroche,
        localisation_actuelle: data.localisationActuelle,
        cote_ve: data.coteVe,
        decalage_angulaire: data.decalageAngulaire,
        chargement_mcc: data.chargementMcc,
        // VOIE V2
        soufflet_v2: data.souffletV2,
        capteur_v2: data.capteurV2,
        offset_v2_mv: data.offsetV2Mv,
        mesurande_lie_v2_mv: data.mesurandeLieV2Mv,
        sensibilite_v2_mv: data.sensibiliteV2Mv,
        signal_meteociel_v2_mv: data.signalMeteocielV2Mv,
        capteur_cible_pfeiffer_v2_mbar: data.capteurCiblePfeifferV2Mbar,
        etendue_v2_mbar: data.etendueV2Mbar,
        test_etancheite_he_v2: data.testEtancheiteHeV2,
        test_capteur_mrg_v2: data.testCapteurMrgV2,
        observations_v2: data.observationsV2,
        electrovanne: data.electrovanne,
        // Historique FSECs
        fsec_history: data.fsecHistory,
    };
}
