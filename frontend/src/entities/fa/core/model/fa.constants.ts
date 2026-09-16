/**
 * FA Constants - Shared referential data for Fiches d'Anomalie
 * @module entities/fa/model
 */

export interface ReferentialInfo {
    label: string;
    color: string;
}

/** FA Status referential (Ouvert, En cours, Clos) */
export const FA_STATUSES: Record<number, ReferentialInfo> = {
    0: { label: 'Ouvert', color: '#FFA726' },
    1: { label: 'En cours', color: '#42A5F5' },
    2: { label: 'Clos', color: '#66BB6A' },
} as const;

/** FA Type 5M referential (Moyen, Main d'œuvre, Matière, Milieu, Méthode) */
export const FA_TYPES: Record<number, ReferentialInfo> = {
    0: { label: 'Moyen', color: '#9C27B0' },
    1: { label: "Main d'œuvre", color: '#3F51B5' },
    2: { label: 'Matière', color: '#00BCD4' },
    3: { label: 'Milieu', color: '#009688' },
    4: { label: 'Méthode', color: '#795548' },
} as const;

/** FA Criticality referential (Niveau 0-3) */
export const FA_CRITICALITIES: Record<number, ReferentialInfo> = {
    0: { label: 'Niveau 0', color: '#4CAF50' },
    1: { label: 'Niveau 1', color: '#8BC34A' },
    2: { label: 'Niveau 2', color: '#FF9800' },
    3: { label: 'Niveau 3', color: '#F44336' },
} as const;

/** Status list for dropdowns */
export const FA_STATUS_LIST = Object.entries(FA_STATUSES).map(([id, info]) => ({
    id: Number(id),
    ...info,
}));

/** Type list for dropdowns */
export const FA_TYPE_LIST = Object.entries(FA_TYPES).map(([id, info]) => ({
    id: Number(id),
    ...info,
}));

/** Criticality list for dropdowns */
export const FA_CRITICALITY_LIST = Object.entries(FA_CRITICALITIES).map(([id, info]) => ({
    id: Number(id),
    ...info,
}));

/** Default fallback for unknown values */
const DEFAULT_INFO: ReferentialInfo = { label: '-', color: '#666' };

/** Get status info with fallback */
export const getFaStatusInfo = (statusId: number | null): ReferentialInfo => {
    if (statusId === null) return DEFAULT_INFO;
    return FA_STATUSES[statusId] ?? { label: `Statut ${statusId}`, color: '#666' };
};

/** Get type info with fallback */
export const getFaTypeInfo = (typeId: number | null): ReferentialInfo => {
    if (typeId === null) return DEFAULT_INFO;
    return FA_TYPES[typeId] ?? { label: `Type ${typeId}`, color: '#666' };
};

/** Get criticality info with fallback */
export const getFaCriticalityInfo = (criticalityId: number | null): ReferentialInfo => {
    if (criticalityId === null) return DEFAULT_INFO;
    return FA_CRITICALITIES[criticalityId] ?? { label: `Crit. ${criticalityId}`, color: '#666' };
};

// Alias for simpler imports in pages
export const getStatusInfo = getFaStatusInfo;
export const getTypeInfo = getFaTypeInfo;
export const getCriticalityInfo = getFaCriticalityInfo;

/** Named FSEC step IDs for use in business logic instead of magic numbers */
export const FSEC_STEP_ID = {
    DESIGN: 0,
    ASSEMBLAGE: 1,
    METROLOGIE: 2,
    SCELLEMENT: 3,
    GAZ: 4,
    LIVRAISON: 5,
    SUR_INSTALLATION: 6,
    AUTRE: 7,
} as const;

/** FSEC Steps referential (for recording where the anomaly was discovered) */
export const FSEC_STEPS: Record<number, string> = {
    0: 'Design',
    1: 'Assemblage',
    2: 'Métrologie',
    3: 'Scellement',
    4: 'Gaz',
    5: 'Livraison',
    6: 'Sur installation',
    7: 'Autre',
} as const;

/** FSEC Steps list for dropdowns */
export const FSEC_STEP_LIST = Object.entries(FSEC_STEPS).map(([id, label]) => ({
    id: Number(id),
    label,
}));

/** Get FSEC step label with fallback */
export const getFsecStepLabel = (stepId: number | null): string => {
    if (stepId === null) return '-';
    return FSEC_STEPS[stepId] ?? `Étape ${stepId}`;
};
