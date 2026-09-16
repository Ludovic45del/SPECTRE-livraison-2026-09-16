/**
 * Embase Zod Schemas - Validation & Transformation
 * @module entities/embase/model
 */

import { z } from 'zod';
import { EmbaseApiSchema } from './embase-api.schema';

// ============================================================================
// Domain Schema (camelCase for frontend)
// ============================================================================

export const EmbaseSchema = EmbaseApiSchema.transform((api) => ({
    uuid: api.uuid,
    slug: api.slug ?? '',
    identifier: api.identifier,
    type: api.type as 'jet_de_gaz' | 'hp' | 'bp',
    nombreVoies: api.nombre_voies as 1 | 2,
    // VOIE V1
    souffletV1: api.soufflet_v1,
    capteurV1: api.capteur_v1,
    offsetV1Mv: api.offset_v1_mv,
    mesurandeLieV1Mv: api.mesurande_lie_v1_mv,
    sensibiliteV1Mv: api.sensibilite_v1_mv,
    signalMeteocielV1Mv: api.signal_meteociel_v1_mv,
    capteurCiblePfeifferMbar: api.capteur_cible_pfeiffer_mbar,
    etendueV1Mbar: api.etendue_v1_mbar,
    testEtancheiteHe: api.test_etancheite_he,
    testCapteurMrg: api.test_capteur_mrg,
    etalonnageDate: api.etalonnage_date,
    observationsV1: api.observations_v1,
    // MECA
    operationnelleAimant: api.operationnelle_aimant,
    operationnelleBroche: api.operationnelle_broche,
    localisationActuelle: api.localisation_actuelle,
    coteVe: api.cote_ve,
    decalageAngulaire: api.decalage_angulaire,
    chargementMcc: api.chargement_mcc,
    // VOIE V2
    souffletV2: api.soufflet_v2,
    capteurV2: api.capteur_v2,
    offsetV2Mv: api.offset_v2_mv,
    mesurandeLieV2Mv: api.mesurande_lie_v2_mv,
    sensibiliteV2Mv: api.sensibilite_v2_mv,
    signalMeteocielV2Mv: api.signal_meteociel_v2_mv,
    capteurCiblePfeifferV2Mbar: api.capteur_cible_pfeiffer_v2_mbar,
    etendueV2Mbar: api.etendue_v2_mbar,
    testEtancheiteHeV2: api.test_etancheite_he_v2,
    testCapteurMrgV2: api.test_capteur_mrg_v2,
    observationsV2: api.observations_v2,
    electrovanne: api.electrovanne,
    // Historique FSECs
    fsecHistory: api.fsec_history,
    // Computed
    lastEtalonnageDate: api.last_etalonnage_date,
    lastEtalonnageDateV1: api.last_etalonnage_date_v1,
    lastEtalonnageDateV2: api.last_etalonnage_date_v2,
    // Metadata
    createdAt: api.created_at,
    updatedAt: api.updated_at,
}));

export type Embase = z.output<typeof EmbaseSchema>;

export const EmbaseListSchema = z.array(EmbaseSchema);

// ============================================================================
// Re-exports (preserve existing import paths)
// ============================================================================

export { EmbaseApiSchema } from './embase-api.schema';
export { EmbaseCreateSchema, type EmbaseCreate, embaseCreateToApi, embaseToCreateForm } from './embase-create.schema';
export {
    EmbaseFsecHistoryItemSchema,
    type EmbaseFsecHistoryItem,
    EmbaseFsecHistoryListSchema,
} from './embase-fsec-history.schema';
export {
    type EmbaseType,
    EMBASE_TYPE_LABELS,
    EMBASE_TYPE_COLORS,
    getEtalonnageStatus,
    type EtalonnageStatus,
} from './embase-helpers';
