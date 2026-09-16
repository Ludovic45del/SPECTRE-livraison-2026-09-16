/**
 * Shared types for campaign planning components.
 */

export interface FsecInfo {
    versionUuid: string;
    fsecUuid: string;
    name: string;
    /** Nom complet d'affichage (« {year}-{installation}_{campagne}_{name} »). */
    displayName: string;
    categoryId: number | null;
    statusId: number | null;
    shootingDate: Date | null;
}
