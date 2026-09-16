/**
 * FSEC Workflow Constants
 * Source: back/cible/domain/fsec/constants.py
 *
 * Workflow des étapes pour les FSECs sans gaz.
 * `hs` et `decision_moe` ne sont pas des étapes linéaires : ce sont des statuts
 * de mise en pause qui figent l'avancement.
 */

export const WORKFLOW_SANS_GAZ = [
    'design',
    'assembly',
    'metrology',
    'sealing',
    'sealing_verification',
    'pictures',
    'usable',
    'installed',
    'shot',
    'hs',
    'decision_moe',
] as const;

export type FsecWorkflowStep = (typeof WORKFLOW_SANS_GAZ)[number];

export const STEP_LABELS: Record<FsecWorkflowStep, string> = {
    design: 'Design',
    assembly: 'Assemblage',
    metrology: 'Métrologie',
    sealing: 'Scellement',
    sealing_verification: 'Vérification scellement',
    pictures: 'Photos',
    usable: 'Disponible',
    installed: 'Sur installation',
    shot: 'Tirée',
    hs: 'HS',
    decision_moe: 'Décision MOE',
};

export const REQUIRED_SUBTYPES_DOCS = [
    'Visrad initial',
    'Vues',
    '.STP Métro',
    'Fiches Car',
    'Fiche de réception',
    "Gamme d'assemblage",
] as const;

/** Maps subtype label to its DB id (matches fsec_document_subtypes.csv) */
export const SUBTYPE_DOC_IDS: Record<(typeof REQUIRED_SUBTYPES_DOCS)[number], number> = {
    'Visrad initial': 0,
    Vues: 1,
    '.STP Métro': 2,
    'Fiches Car': 3,
    'Fiche de réception': 4,
    "Gamme d'assemblage": 5,
};
