/**
 * Planning Constants — types, couleurs, largeurs de colonnes
 * @module features/planning/lib
 */

import type { PlanningStep } from '@entities/planning/core/model/planning.schema';

// ====================== Grid Layout ======================

export const GRID_LABEL_WIDTH = 180;
export const GRID_SUB_LABEL_WIDTH = 140;
export const GRID_FIXED_WIDTH = GRID_LABEL_WIDTH + GRID_SUB_LABEL_WIDTH;

export const COL_WIDTH = 56;
export const WEEKLY_COLS = 13;

// ====================== Drag visuals ======================

/**
 * Ombre portée du fantôme de déplacement (drag-to-move) : donne l'impression
 * que la barre saisie « décolle » de la grille et plane jusqu'à sa cible.
 */
export const DRAG_GHOST_SHADOW = '0 6px 16px rgba(0, 0, 0, 0.35)';

// ====================== Colors ======================

export interface PlanningColors {
    white: string;
    bg: string;
    border: string;
    borderStrong: string;
    accent: string;
    accentLight: string;
    blue: string;
    orange: string;
    headerBg: string;
    sectionBg: string;
    dragHighlight: string;
    vacances: string;
    fermeture: string;
    currentDay: string;
    weekend: string;
    cellBg: string;
    textPrimary: string;
    textSecondary: string;
    barText: string;
}

export const PLANNING_COLORS_LIGHT: PlanningColors = {
    white: '#FFFFFF',
    bg: '#F8F9FC',
    border: '#E2E5F1',
    borderStrong: '#CDD1E0',
    accent: '#1B336C',
    accentLight: '#3E4A84',
    blue: '#007AFF',
    orange: '#FFF7B9',
    headerBg: '#E8EDF5',
    sectionBg: '#DCE1EE',
    dragHighlight: 'rgba(0, 122, 255, 0.16)',
    vacances: '#DBEAFE',
    fermeture: '#EDEAF3',
    currentDay: '#FEF3C7',
    weekend: '#F1F5F9',
    cellBg: '#FFFFFF',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    barText: '#333333',
};

export const PLANNING_COLORS_DARK: PlanningColors = {
    white: '#1A1D27',
    bg: '#0F1117',
    border: '#282D3E',
    borderStrong: '#353B4F',
    accent: '#E8EAED',
    accentLight: '#9AA0A6',
    blue: '#007AFF',
    orange: '#5C5230',
    headerBg: '#1A1D27',
    sectionBg: '#1F2334',
    dragHighlight: 'rgba(0, 122, 255, 0.16)',
    vacances: '#1A2230',
    fermeture: '#231E2C',
    currentDay: '#3D3520',
    weekend: '#13151C',
    cellBg: '#141720',
    textPrimary: '#E8EAED',
    textSecondary: '#9AA0A6',
    barText: '#E8EAED',
};

// Variante « crème » : surfaces ivoire chaudes dérivées de creamGrey/creamPalette
// (cf. shared/ui/theme.ts), pour que la grille planning suive le thème crème au
// lieu de retomber sur le set clair froid. Teintes de statut volontairement
// réparties sur des familles de couleur distinctes (ambre / abricot / sauge /
// mauve / greige) mais désaturées vers le beige : lisibilité du texte foncé
// (#2B2118) validée à 10.9–12.8:1 sur chaque fond de statut.
export const PLANNING_COLORS_CREAM: PlanningColors = {
    white: '#F6EDD8',
    bg: '#ECE0C4',
    border: '#DCCDA9',
    borderStrong: '#CBB892',
    accent: '#443D2F',
    accentLight: '#5B523F',
    blue: '#007AFF',
    orange: '#F7D9A0',
    headerBg: '#EADFC6',
    sectionBg: '#DCCDA9',
    dragHighlight: 'rgba(0, 122, 255, 0.16)',
    vacances: '#CBDFC9',
    fermeture: '#E7D2D9',
    currentDay: '#FBE6B0',
    weekend: '#EEE4CB',
    cellBg: '#F6EDD8',
    textPrimary: '#2A2218',
    textSecondary: '#675A43',
    barText: '#2A2218',
};

// ====================== Bar Position ======================

export type BarPosition = 'start' | 'middle' | 'end' | 'single';

// ====================== Sections ======================

export const SECTION_IDS = {
    equipe: 'equipe',
    vieLabo: 'vie-labo',
    campagnes: 'campagnes',
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];

// ====================== Fonctions (rôles des membres) ======================

export interface Fonction {
    label: string;
    color: string;
}

export const FONCTIONS: Fonction[] = [
    { label: 'IEC', color: '#4F5E8C' },
    { label: 'REC', color: '#3F7A94' },
    { label: 'Métrologue', color: '#3F7D73' },
    { label: 'Assembleur', color: '#8C7044' },
    { label: 'CDL', color: '#805878' },
    { label: 'Cryo', color: '#665894' },
];

// ====================== Périodes (types de disponibilité) ======================

export interface Periode {
    label: string;
    value: 'congés' | 'mission' | 'formation' | 'rtt' | 'maladie' | 'télétravail';
    color: string;
}

export const PERIODES: Periode[] = [
    { label: 'Congés', value: 'congés', color: '#C0827A' },
    { label: 'Mission', value: 'mission', color: '#5E8EA8' },
    { label: 'Formation', value: 'formation', color: '#8475A0' },
    { label: 'RTT', value: 'rtt', color: '#6090B4' },
    { label: 'Maladie', value: 'maladie', color: '#B89850' },
    { label: 'Télétravail', value: 'télétravail', color: '#5A9A80' },
];

export const PERIODES_MAP = new Map<string, Periode>(PERIODES.map((p) => [p.value, p]));

export function getPeriodeMeta(value: string): Periode | undefined {
    return PERIODES_MAP.get(value);
}

// ====================== Étapes campagnes ======================

/**
 * Une étape de planning campagne.
 *
 * Référentiel servi par l'API (`usePlanningSteps()` → table `PLANNING_STEP`),
 * éditable via l'admin Django. Remplace l'ancienne constante figée `ETAPES`.
 */
export type Etape = PlanningStep;

// ====================== Disponibilité par étape ======================

/**
 * Config d'affichage du bloc de disponibilité d'une étape dans la modale de
 * planification : rôle (fonction membre) et salle de machines à présenter.
 */
export interface StepAvailabilityConfig {
    /** Fonction membre à filtrer (ex. 'Assembleur', 'Métrologue'). */
    fonctionFilter: string;
    /** Libellé de la section rôle (ex. 'Assembleurs', 'Métrologues'). */
    fonctionLabel: string;
    /** Code de la salle dont on affiche les machines (ex. 'B1', 'B2'). */
    salleName: string;
}

/**
 * Étapes disposant d'un bloc de disponibilité dans la modale de planification.
 *
 * Les clés sont les `label` accentués du référentiel `PLANNING_STEP`
 * (cf. `STEP_LABELS`). La présence d'une étape ici remplace l'ancien garde
 * `hasAvailabilityDialog` codé en dur dans `StepLanesRow`/`StepHeaderRow` ;
 * une étape absente n'affiche pas de bloc dispo.
 */
export const STEP_AVAILABILITY_CONFIG: Record<string, StepAvailabilityConfig> = {
    Assemblage: { fonctionFilter: 'Assembleur', fonctionLabel: 'Assembleurs', salleName: 'B1' },
    Métrologie: { fonctionFilter: 'Métrologue', fonctionLabel: 'Métrologues', salleName: 'B2' },
};

export function getStepAvailabilityConfig(label: string): StepAvailabilityConfig | undefined {
    return STEP_AVAILABILITY_CONFIG[label];
}

// ====================== Membre type ======================

export interface Membre {
    nom: string;
    fonction: string;
}

// ====================== Catégories événements labo ======================

export interface LabEventCategory {
    label: string;
    color: string;
}

export const LAB_EVENT_CATEGORIES: LabEventCategory[] = [
    { label: 'Maintenance', color: '#B89444' },
    { label: 'Panne', color: '#B06464' },
    { label: 'Installation', color: '#5E6A94' },
    { label: 'Calibration', color: '#4C8494' },
    { label: 'Nettoyage', color: '#3F8A80' },
    { label: 'Autre', color: '#7E8898' },
];

export const LAB_EVENT_CATEGORIES_MAP = new Map<string, LabEventCategory>(
    LAB_EVENT_CATEGORIES.map((c) => [c.label, c]),
);

export function getEventCategoryMeta(label: string): LabEventCategory | undefined {
    return LAB_EVENT_CATEGORIES_MAP.get(label);
}

// ====================== Filters ======================

export interface PlanningFilters {
    year: number | null;
    installations: string[];
    /** Étapes à afficher (par label). Vide = toutes les étapes (aucun filtre). */
    etapeLabels: string[];
    campaignUuid: string | null;
}

export const DEFAULT_FILTERS: PlanningFilters = {
    year: new Date().getFullYear(),
    installations: ['LMJ'],
    etapeLabels: [],
    campaignUuid: null,
};

// ====================== Row ID helpers ======================

export function memberRowId(nom: string): string {
    return `member:${nom}`;
}

export function labRowId(machineUuid: string): string {
    return `lab:${machineUuid}`;
}

export function campaignRowId(campaignUuid: string, stepLabel: string): string {
    return `campaign:${campaignUuid}#${stepLabel}`;
}

export function campaignStepHeaderRowId(campaignUuid: string, stepLabel: string): string {
    return `campaign-step:${campaignUuid}#${stepLabel}`;
}

export function campaignFsecRowId(campaignUuid: string, stepLabel: string, fsecUuid: string): string {
    return `campaign-fsec:${campaignUuid}#${stepLabel}#${fsecUuid}`;
}

export function machineUuidFromRowId(rowId: string): string | null {
    if (!rowId.startsWith('lab:')) return null;
    return rowId.slice(4);
}
