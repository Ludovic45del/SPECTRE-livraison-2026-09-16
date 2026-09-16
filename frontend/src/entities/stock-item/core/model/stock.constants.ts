/**
 * Stock Module Constants — miroir des constantes backend.
 *
 * Source de vérité backend : `backend/app/domain/stock/models/stock_constants.py`.
 * Voir aussi CDC §3.1, §3.2, §4.6.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Kind (type d'item)
// ─────────────────────────────────────────────────────────────────────────────

export const ITEM_KIND = {
    ELEMENT: 'element',
    CONSUMABLE: 'consumable',
} as const;

export type ItemKind = (typeof ITEM_KIND)[keyof typeof ITEM_KIND];

export const ITEM_KIND_VALUES: readonly ItemKind[] = [ITEM_KIND.ELEMENT, ITEM_KIND.CONSUMABLE];

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
    [ITEM_KIND.ELEMENT]: 'Élément sérialisé',
    [ITEM_KIND.CONSUMABLE]: 'Consommable',
};

/**
 * Couleur de référence par kind. Utilisée à la fois par `KindIcon`
 * (badge icône) et par les chips de sélection dans `CreateItemModal`.
 * `label` reste déclaré ici pour les consommateurs qui rendent une chip
 * texte (différent du label pluriel de `ITEM_KIND_LABELS`).
 */
export const ITEM_KIND_COLORS: Record<ItemKind, { bg: string; color: string; label: string }> = {
    [ITEM_KIND.ELEMENT]: { bg: '#f3e8ff', color: '#8b5cf6', label: 'Élément' },
    [ITEM_KIND.CONSUMABLE]: { bg: '#cffafe', color: '#0e7490', label: 'Consommable' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Rubriques (catégories métier figées) — cf. CDC §4.6
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORY = {
    PIECES_ELEMENTAIRES: 'pieces_elementaires',
    STRUCTURATION: 'structuration',
    COLLES: 'colles',
    AUTRES: 'autres',
} as const;

export type CategoryCode = (typeof CATEGORY)[keyof typeof CATEGORY];

export const CATEGORY_VALUES: readonly CategoryCode[] = [
    CATEGORY.PIECES_ELEMENTAIRES,
    CATEGORY.STRUCTURATION,
    CATEGORY.COLLES,
    CATEGORY.AUTRES,
];

export const CATEGORY_LABELS: Record<CategoryCode, string> = {
    [CATEGORY.PIECES_ELEMENTAIRES]: 'Pièces élémentaires',
    [CATEGORY.STRUCTURATION]: 'Structuration',
    [CATEGORY.COLLES]: 'Colles',
    [CATEGORY.AUTRES]: 'Autres',
};

/** Liste des rubriques autorisées par kind (cf. CDC §4.6). */
export const CATEGORIES_BY_KIND: Record<ItemKind, readonly CategoryCode[]> = {
    [ITEM_KIND.ELEMENT]: [CATEGORY.PIECES_ELEMENTAIRES, CATEGORY.STRUCTURATION],
    [ITEM_KIND.CONSUMABLE]: [CATEGORY.COLLES, CATEGORY.AUTRES],
};

/** Couleurs UI par rubrique (Tailwind-like, cf. maquette). */
export const CATEGORY_COLORS: Record<CategoryCode, { bg: string; text: string }> = {
    [CATEGORY.PIECES_ELEMENTAIRES]: { bg: '#f3e8ff', text: '#6b21a8' },
    [CATEGORY.STRUCTURATION]: { bg: '#e0e7ff', text: '#3730a3' },
    [CATEGORY.COLLES]: { bg: '#cffafe', text: '#0e7490' },
    [CATEGORY.AUTRES]: { bg: '#f1f5f9', text: '#475569' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Type de structuration — sous-classification de la rubrique "structuration".
// Requis quand category === 'structuration', null sinon.
// ─────────────────────────────────────────────────────────────────────────────

export const STRUCTURATION_TYPE = {
    STANDARD: 'standard',
    SPECIALE: 'speciale',
    EC: 'ec',
} as const;

export type StructurationType = (typeof STRUCTURATION_TYPE)[keyof typeof STRUCTURATION_TYPE];

export const STRUCTURATION_TYPE_VALUES: readonly StructurationType[] = [
    STRUCTURATION_TYPE.STANDARD,
    STRUCTURATION_TYPE.SPECIALE,
    STRUCTURATION_TYPE.EC,
];

export const STRUCTURATION_TYPE_LABELS: Record<StructurationType, string> = {
    [STRUCTURATION_TYPE.STANDARD]: 'Standard',
    [STRUCTURATION_TYPE.SPECIALE]: 'Spéciale',
    [STRUCTURATION_TYPE.EC]: 'EC',
};

/** Couleurs UI par type de structuration (reprend les anciennes couleurs de rubrique). */
export const STRUCTURATION_TYPE_COLORS: Record<StructurationType, { bg: string; text: string }> = {
    [STRUCTURATION_TYPE.STANDARD]: { bg: '#e0e7ff', text: '#3730a3' },
    [STRUCTURATION_TYPE.SPECIALE]: { bg: '#fce7f3', text: '#9d174d' },
    [STRUCTURATION_TYPE.EC]: { bg: '#ccfbf1', text: '#115e59' },
};

/**
 * Borne haute du nombre de structurations créables en un seul paquet.
 * Miroir de `STRUCTURATION_BATCH_MAX` (backend stock_constants.py).
 */
export const STRUCTURATION_BATCH_MAX = 500;

// ─────────────────────────────────────────────────────────────────────────────
// Cycle de vie élément sérialisé
// ─────────────────────────────────────────────────────────────────────────────

export const ELEMENT_STATUS = {
    DISPO: 'dispo',
    RESERVEE: 'reservee',
    AFFECTEE: 'affectee',
    TIREE: 'tiree',
} as const;

export type ElementStatus = (typeof ELEMENT_STATUS)[keyof typeof ELEMENT_STATUS];

export const ELEMENT_STATUS_VALUES: readonly ElementStatus[] = [
    ELEMENT_STATUS.DISPO,
    ELEMENT_STATUS.RESERVEE,
    ELEMENT_STATUS.AFFECTEE,
    ELEMENT_STATUS.TIREE,
];

export const ELEMENT_STATUS_LABELS: Record<ElementStatus, string> = {
    [ELEMENT_STATUS.DISPO]: 'Disponible',
    [ELEMENT_STATUS.RESERVEE]: 'Réservée',
    [ELEMENT_STATUS.AFFECTEE]: 'Affectée',
    [ELEMENT_STATUS.TIREE]: 'Tirée',
};

// ─────────────────────────────────────────────────────────────────────────────
// Mouvement
// ─────────────────────────────────────────────────────────────────────────────

export const MOVEMENT_TYPE = {
    ENTREE: 'entree',
    SORTIE: 'sortie',
    AJUSTEMENT: 'ajustement',
} as const;

export type MovementType = (typeof MOVEMENT_TYPE)[keyof typeof MOVEMENT_TYPE];

export const MOVEMENT_TYPE_VALUES: readonly MovementType[] = [
    MOVEMENT_TYPE.ENTREE,
    MOVEMENT_TYPE.SORTIE,
    MOVEMENT_TYPE.AJUSTEMENT,
];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
    [MOVEMENT_TYPE.ENTREE]: 'Entrée',
    [MOVEMENT_TYPE.SORTIE]: 'Sortie',
    [MOVEMENT_TYPE.AJUSTEMENT]: 'Ajustement',
};

// ─────────────────────────────────────────────────────────────────────────────
// Installation
// ─────────────────────────────────────────────────────────────────────────────

export const INSTALLATION = {
    LMJ: 'LMJ',
    OMEGA: 'OMEGA',
} as const;

export type Installation = (typeof INSTALLATION)[keyof typeof INSTALLATION];

export const INSTALLATION_VALUES: readonly Installation[] = [INSTALLATION.LMJ, INSTALLATION.OMEGA];

export const INSTALLATION_LABELS: Record<Installation, string> = {
    [INSTALLATION.LMJ]: 'LMJ',
    [INSTALLATION.OMEGA]: 'OMEGA',
};

// ─────────────────────────────────────────────────────────────────────────────
// Seuils (alertes)
// ─────────────────────────────────────────────────────────────────────────────

/** Nb de jours avant péremption à partir duquel l'alerte se déclenche (cf. CDC §4.5). */
export const EXPIRATION_WARNING_DAYS = 30;

// ─────────────────────────────────────────────────────────────────────────────
// Codes d'erreur métier (pour matching UI)
// ─────────────────────────────────────────────────────────────────────────────

export const STOCK_ERROR_CODE = {
    FSEC_LOCKED: 'FSEC_LOCKED',
    ELEMENT_ALREADY_USED: 'ELEMENT_ALREADY_USED',
    INVALID_KIND_OPERATION: 'INVALID_KIND_OPERATION',
    INVALID_KIND_CATEGORY: 'INVALID_KIND_CATEGORY',
    CATALOG_ITEM_IN_USE: 'CATALOG_ITEM_IN_USE',
} as const;
