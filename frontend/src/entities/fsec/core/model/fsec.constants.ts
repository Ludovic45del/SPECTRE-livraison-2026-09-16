/**
 * FSEC Constants - Shared referential data
 * @module entities/fsec/model
 */

export interface FsecStatusInfo {
    label: string;
    color: string;
}

export interface FsecCategoryInfo {
    label: string;
    color: string;
}

/** Named FSEC status IDs for use in business logic instead of magic numbers */
export const FSEC_STATUS_ID = {
    DESIGN: 0,
    EN_COURS_ASSEMBLAGE: 1,
    EN_ATTENTE_METROLOGIE: 2,
    EN_ATTENTE_SCELLEMENT: 3,
    PHOTOS_A_PRENDRE: 4,
    DISPONIBLE: 5,
    SUR_INSTALLATION: 6,
    TIREE: 7,
    HS: 8,
    REMPLISSAGE_HP: 9,
    TEST_ETANCHEITE_BP: 10,
    REMPLISSAGE_BP: 11,
    PERMEATION: 12,
    DEPRESSURISATION: 13,
    RE_PRESSURISATION: 14,
    DECISION_MOE: 15,
    VERIFICATION_SCELLEMENT: 16,
} as const;

/**
 * Statuts de mise en pause : hors de la progression linéaire, ils figent
 * l'avancement de la FSEC (aucune étape n'est considérée active ni terminée).
 * Source de vérité unique partagée par le stepper FSEC et la vue couloirs planning.
 */
export const PAUSED_FSEC_STATUS_IDS: readonly number[] = [FSEC_STATUS_ID.HS, FSEC_STATUS_ID.DECISION_MOE];

/** True si le statut fige l'avancement (HS ou Décision MOE). */
export const isPausedFsecStatus = (statusId: number | null): boolean =>
    statusId !== null && PAUSED_FSEC_STATUS_IDS.includes(statusId);

/**
 * Séquences de workflow (ids de statut, dans l'ordre) par catégorie de FSEC,
 * selon FSEC_CARTOGRAPHIE.md. La Vérification scellement (16) suit le
 * Scellement (3) pour toutes les catégories ; pour les cibles gaz, les Photos (4)
 * précèdent l'Étanchéité (10). Source de vérité unique partagée par le stepper
 * FSEC et les helpers de rang ci-dessous.
 * Cas particulier : la Re-pressurisation (14) ne s'insère qu'après la
 * Dépressurisation (13) de la catégorie 4, en cas d'échec de celle-ci.
 */
export const FSEC_WORKFLOW_SEQUENCES: Readonly<Record<number, readonly number[]>> = {
    0: [0, 1, 2, 3, 16, 4, 5, 6, 7],
    1: [0, 1, 2, 3, 16, 4, 10, 11, 5, 6, 7],
    2: [0, 1, 2, 3, 16, 4, 9, 5, 6, 7],
    3: [0, 1, 2, 3, 16, 4, 10, 11, 9, 5, 6, 7],
    4: [0, 1, 2, 3, 16, 4, 10, 12, 13, 11, 5, 6, 7],
};

/**
 * Ordre canonique global des statuts FSEC, toutes catégories confondues.
 * Chaque séquence de FSEC_WORKFLOW_SEQUENCES (Re-pressurisation incluse) en est
 * une sous-suite (garanti par test) : comparer deux statuts par leur RANG dans
 * cet ordre donne le même résultat que dans la séquence de n'importe quelle
 * catégorie. Indispensable car les ids ne sont pas monotones : 16 se situe
 * entre 3 et 4, les étapes gaz 9..14 entre 4 et 5. Les statuts de pause
 * (HS, Décision MOE) sont placés en fin, après Tirée.
 */
export const FSEC_STATUS_WORKFLOW_ORDER: readonly number[] = [
    FSEC_STATUS_ID.DESIGN,
    FSEC_STATUS_ID.EN_COURS_ASSEMBLAGE,
    FSEC_STATUS_ID.EN_ATTENTE_METROLOGIE,
    FSEC_STATUS_ID.EN_ATTENTE_SCELLEMENT,
    FSEC_STATUS_ID.VERIFICATION_SCELLEMENT,
    FSEC_STATUS_ID.PHOTOS_A_PRENDRE,
    FSEC_STATUS_ID.TEST_ETANCHEITE_BP,
    FSEC_STATUS_ID.PERMEATION,
    FSEC_STATUS_ID.DEPRESSURISATION,
    FSEC_STATUS_ID.RE_PRESSURISATION,
    FSEC_STATUS_ID.REMPLISSAGE_BP,
    FSEC_STATUS_ID.REMPLISSAGE_HP,
    FSEC_STATUS_ID.DISPONIBLE,
    FSEC_STATUS_ID.SUR_INSTALLATION,
    FSEC_STATUS_ID.TIREE,
    FSEC_STATUS_ID.HS,
    FSEC_STATUS_ID.DECISION_MOE,
];

/** Rang d'un statut absent du référentiel : après tous les statuts connus. */
const UNKNOWN_FSEC_STATUS_RANK = FSEC_STATUS_WORKFLOW_ORDER.length;

/**
 * Rang d'un statut dans le workflow (0 = Design). Sert de clé de tri :
 * `null` (statut non renseigné) vient avant tout statut, un id inconnu après.
 */
export const getFsecStatusRank = (statusId: number | null): number => {
    if (statusId === null) return -1;
    const rank = FSEC_STATUS_WORKFLOW_ORDER.indexOf(statusId);
    return rank === -1 ? UNKNOWN_FSEC_STATUS_RANK : rank;
};

/** Comparateur de tri croissant par rang de workflow (et non par id brut). */
export const compareFsecStatusRank = (a: number | null, b: number | null): number =>
    getFsecStatusRank(a) - getFsecStatusRank(b);

/**
 * True si la FSEC a atteint ou dépassé `thresholdStatusId` dans le workflow.
 * Compare les rangs, pas les ids : une FSEC en Vérification scellement (16)
 * n'a pas atteint Disponible (5). Retourne false pour un statut null, inconnu
 * ou de pause (HS, Décision MOE figent l'avancement), ainsi que pour un seuil
 * inconnu.
 */
export const hasFsecReachedStatus = (statusId: number | null, thresholdStatusId: number): boolean => {
    if (statusId === null || isPausedFsecStatus(statusId)) return false;
    const rank = FSEC_STATUS_WORKFLOW_ORDER.indexOf(statusId);
    const thresholdRank = FSEC_STATUS_WORKFLOW_ORDER.indexOf(thresholdStatusId);
    if (rank === -1 || thresholdRank === -1) return false;
    return rank >= thresholdRank;
};

/** FSEC Status referential from backend */
export const FSEC_STATUSES: Record<number, FsecStatusInfo> = {
    // Statuts de base
    0: { label: 'Design', color: '#c3c3c3' },
    1: { label: "En cours d'assemblage", color: '#ecce18' },
    2: { label: 'En attente de métrologie', color: '#7a8ce0' },
    3: { label: 'En attente de scellement', color: '#a2d82b' },
    4: { label: 'Photos à prendre', color: '#aa5485' },
    5: { label: 'Disponible', color: '#2a5486' },
    6: { label: 'Sur installation', color: '#2ee454' },
    7: { label: 'Tirée', color: '#123456' },
    8: { label: 'HS', color: '#dc2626' },
    // Statuts liés au gaz
    9: { label: 'Remplissage HP', color: '#f59e0b' },
    10: { label: 'Test étanchéité BP', color: '#8b5cf6' },
    11: { label: 'Remplissage BP', color: '#06b6d4' },
    12: { label: 'Perméation', color: '#ec4899' },
    13: { label: 'Dépressurisation', color: '#f97316' },
    14: { label: 'Re-pressurisation', color: '#22c55e' },
    // Statut de mise en pause (fige l'avancement, comme HS)
    15: { label: 'Décision MOE', color: '#64748b' },
    // Vérification du scellement (affichée entre Scellement et Photos dans la ligne de suivi)
    16: { label: 'Vérification scellement', color: '#7cb342' },
} as const;

/** FSEC Category referential from backend */
export const FSEC_CATEGORIES: Record<number, FsecCategoryInfo> = {
    0: { label: 'Sans Gaz', color: '#00FF66' },
    1: { label: 'Avec Gaz BP', color: '#1FDFED' },
    2: { label: 'Avec Gaz HP', color: '#1FEDB7' },
    3: { label: 'Avec Gaz BP + HP', color: '#1FED2B' },
    4: { label: 'Avec Gaz Permeation + HP', color: '#1F9DED' },
} as const;

/** Status list for dropdowns */
export const FSEC_STATUS_LIST = Object.entries(FSEC_STATUSES).map(([id, info]) => ({
    id: Number(id),
    ...info,
}));

/** Category list for dropdowns */
export const FSEC_CATEGORY_LIST = Object.entries(FSEC_CATEGORIES).map(([id, info]) => ({
    id: Number(id),
    ...info,
}));

/** Default fallback for unknown status/category */
const DEFAULT_INFO: FsecStatusInfo = { label: '-', color: '#666' };

/** Get status info with fallback */
export const getStatusInfo = (statusId: number | null): FsecStatusInfo => {
    if (statusId === null) return DEFAULT_INFO;
    return FSEC_STATUSES[statusId] ?? { label: `Statut ${statusId}`, color: '#666' };
};

/** Get category info with fallback */
export const getCategoryInfo = (categoryId: number | null): FsecCategoryInfo => {
    if (categoryId === null) return DEFAULT_INFO;
    return FSEC_CATEGORIES[categoryId] ?? { label: `Cat. ${categoryId}`, color: '#666' };
};
