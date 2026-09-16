/**
 * Campaign Referential Constants
 * @module entities/campaign/lib
 *
 * hardcoded values matching database initialization
 */

import { CampaignType, CampaignStatus, CampaignInstallation } from '../model';

export interface CampaignRole {
    id: number;
    label: string;
}

export const CAMPAIGN_ROLE_ID = {
    MOE: 0,
    RCE: 1,
    IEC: 2,
} as const;

export const CAMPAIGN_ROLES: Record<number, CampaignRole> = {
    [CAMPAIGN_ROLE_ID.MOE]: { id: CAMPAIGN_ROLE_ID.MOE, label: 'MOE' },
    [CAMPAIGN_ROLE_ID.RCE]: { id: CAMPAIGN_ROLE_ID.RCE, label: 'RCE' },
    [CAMPAIGN_ROLE_ID.IEC]: { id: CAMPAIGN_ROLE_ID.IEC, label: 'IEC' },
};

export interface CampaignDocumentType {
    id: number;
    code: string;
    label: string;
}

export const CAMPAIGN_DOCUMENT_TYPES: Record<number, CampaignDocumentType> = {
    0: { id: 0, code: 'DOCUMENTAIRE', label: 'Documentaire' },
    1: { id: 1, code: 'CAO', label: 'CAO' },
    2: { id: 2, code: 'ASSEMBLAGE', label: 'Assemblage' },
    3: { id: 3, code: 'METROLOGIE', label: 'Métrologie' },
    4: { id: 4, code: 'TRANSPORT', label: 'Transport' },
    5: { id: 5, code: 'FICHIERS_PALS', label: 'Fichiers PALS' },
};

export interface CampaignDocumentSubtype {
    id: number;
    label: string;
    typeId: number;
}

export interface CampaignFileType {
    id: number;
    label: string;
    subtypeId: number;
}

export const CAMPAIGN_FILE_TYPES: Record<number, CampaignFileType> = {
    0: { id: 0, label: 'Validé', subtypeId: 7 },
    1: { id: 1, label: 'Brouillon', subtypeId: 7 },
    2: { id: 2, label: 'Archives', subtypeId: 7 },
    11: { id: 11, label: 'Note de synthèse.docx', subtypeId: 7 },
    12: { id: 12, label: 'Budget prévisionnel.xlsx', subtypeId: 7 },
    13: { id: 13, label: 'Guide utilisateur.pdf', subtypeId: 7 },
};

export function getCampaignFileType(id: number | null): CampaignFileType | null {
    if (id === null || id === undefined) return null;
    return CAMPAIGN_FILE_TYPES[id] ?? { id, label: `FileType ${id}`, subtypeId: -1 };
}

export const CAMPAIGN_DOCUMENT_SUBTYPES: Record<number, CampaignDocumentSubtype> = {
    0: { id: 0, label: 'Document LIE', typeId: 0 },
    1: { id: 1, label: 'Document DTRI', typeId: 0 },
    2: { id: 2, label: 'Document DCRE', typeId: 0 },
    3: { id: 3, label: 'Mail', typeId: 0 },
    4: { id: 4, label: 'Autre document', typeId: 0 },
    5: { id: 5, label: 'CAO', typeId: 1 },
    6: { id: 6, label: 'Plan et STEP DTRI', typeId: 1 },
    7: { id: 7, label: 'Plan PDF', typeId: 1 },
    8: { id: 8, label: 'Plan 3D', typeId: 1 },
    9: { id: 9, label: 'Visrad', typeId: 1 },
    10: { id: 10, label: 'Echanges BE', typeId: 1 },
    11: { id: 11, label: 'Ametra', typeId: 1 },
    12: { id: 12, label: 'Autre Document', typeId: 1 },
    13: { id: 13, label: 'Recette pré-assemblage', typeId: 2 },
    14: { id: 14, label: 'Assemblage campagne', typeId: 2 },
    15: { id: 15, label: "Gamme d'assemblage", typeId: 2 },
    16: { id: 16, label: 'Autre document', typeId: 2 },
    17: { id: 17, label: 'CAO', typeId: 3 },
    18: { id: 18, label: 'Autre document', typeId: 3 },
    19: { id: 19, label: 'Réception', typeId: 4 },
    20: { id: 20, label: 'Autre document', typeId: 4 },
    21: { id: 21, label: 'Autre document', typeId: 5 },
    22: { id: 22, label: 'Assemblage', typeId: 5 },
};

export const CAMPAIGN_TYPES: Record<number, CampaignType> = {
    0: { id: 0, label: 'Campagne DAM', color: '#b6c9fd' },
    1: { id: 1, label: "Campagne d'installation", color: '#fdb9e3' },
    2: { id: 2, label: "Campagne d'ouverture", color: '#fcc6b6' },
};

export const CAMPAIGN_STATUSES: Record<number, CampaignStatus> = {
    0: { id: 0, label: 'Brouillon', color: '#c3c3c3' },
    1: { id: 1, label: 'Définition terminée', color: '#ecce18' },
    2: { id: 2, label: 'En réalisation', color: '#7a8ce0' },
    3: { id: 3, label: 'Terminée', color: '#a2d82b' },
};

export const CAMPAIGN_INSTALLATIONS: Record<number, CampaignInstallation> = {
    0: { id: 0, label: 'LMJ', color: '#7ac7f5' },
    1: { id: 1, label: 'OMEGA', color: '#c9a0dc' },
};

export function getCampaignType(id: number | null | undefined): CampaignType | null {
    if (id === null || id === undefined) return null;
    return CAMPAIGN_TYPES[id] ?? { id, label: `Type ${id}`, color: '#999' };
}

export function getCampaignStatus(id: number | null | undefined): CampaignStatus | null {
    if (id === null || id === undefined) return null;
    return CAMPAIGN_STATUSES[id] ?? { id, label: `Status ${id}`, color: '#999' };
}

export function getCampaignInstallation(id: number | null | undefined): CampaignInstallation | null {
    if (id === null || id === undefined) return null;
    return CAMPAIGN_INSTALLATIONS[id] ?? { id, label: `Installation ${id}` };
}

export function getCampaignRole(id: number | null): CampaignRole | null {
    if (id === null || id === undefined) return null;
    // Note: ID can be 0, so check strict null/undefined
    return CAMPAIGN_ROLES[id] ?? { id, label: `Role ${id}` };
}

export function getCampaignDocumentSubtype(id: number | null): CampaignDocumentSubtype | null {
    if (id === null || id === undefined) return null;
    return CAMPAIGN_DOCUMENT_SUBTYPES[id] ?? { id, label: `Subtype ${id}`, typeId: -1 };
}

export function getCampaignDocumentType(id: number | null): CampaignDocumentType | null {
    if (id === null || id === undefined) return null;
    return CAMPAIGN_DOCUMENT_TYPES[id] ?? { id, code: 'UNKNOWN', label: `Type ${id}` };
}
