/**
 * Embases List Page - Sorting, Filtering & Display Utilities
 * @module pages/embases
 */

import type { Embase } from '@entities/embase';
import type { EmbaseFilters } from '@features/embase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SortColumn =
    | 'identifier'
    | 'type'
    | 'status'
    | 'localisation'
    | 'etancheite'
    | 'etalonne'
    | 'mcc'
    | 'electrovanne';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const VOIE_COLORS: Record<number, string> = { 1: '#1976d2', 2: '#9c27b0' };

export const TYPE_COLORS: Record<string, string> = {
    jet_de_gaz: '#1976d2',
    hp: '#9c27b0',
    bp: '#ed6c02',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getStatut(embase: Embase): { label: string; color: string } {
    if (embase.operationnelleAimant) return { label: 'Aimant', color: '#1976d2' };
    if (embase.operationnelleBroche) return { label: 'Broche', color: '#7b1fa2' };
    return { label: '-', color: '' };
}

export function getEtancheiteStatus(value: string): { label: string; color: string } {
    if (!value) return { label: '-', color: '' };
    const upper = value.toUpperCase();
    if (upper.startsWith('OK')) return { label: 'OK', color: '#4caf50' };
    if (upper.startsWith('KO')) return { label: 'KO', color: '#f44336' };
    return { label: value.substring(0, 20), color: '#ff9800' };
}

export function getMccStatus(value: string): { label: string; color: string } {
    if (!value) return { label: '-', color: '' };
    const upper = value.toUpperCase();
    if (upper === 'OK') return { label: 'OK', color: '#4caf50' };
    if (upper === 'KO') return { label: 'KO', color: '#f44336' };
    return { label: value, color: '#ff9800' };
}

export const filterEmbases = (embases: Embase[], filters: EmbaseFilters): Embase[] => {
    const { name, type, nombreVoies } = filters;
    const nameLower = name.toLowerCase();

    return embases.filter((embase) => {
        if (name && !embase.identifier.toLowerCase().includes(nameLower)) return false;
        if (type !== null && embase.type !== type) return false;
        if (nombreVoies.length > 0 && !nombreVoies.includes(embase.nombreVoies as 1 | 2)) return false;
        return true;
    });
};

export const sortEmbases = (embases: Embase[], column: SortColumn, direction: 'asc' | 'desc'): Embase[] => {
    const sorted = [...embases];
    const m = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
        let cmp = 0;
        switch (column) {
            case 'identifier':
                cmp = a.identifier.localeCompare(b.identifier, undefined, { numeric: true });
                break;
            case 'type':
                cmp = a.type.localeCompare(b.type);
                break;
            case 'status':
                cmp = getStatut(a).label.localeCompare(getStatut(b).label);
                break;
            case 'localisation':
                cmp = a.localisationActuelle.localeCompare(b.localisationActuelle);
                break;
            case 'etancheite':
                cmp = a.testEtancheiteHe.localeCompare(b.testEtancheiteHe);
                break;
            case 'etalonne':
                cmp = (a.lastEtalonnageDate ? 1 : 0) - (b.lastEtalonnageDate ? 1 : 0);
                break;
            case 'mcc':
                cmp = a.chargementMcc.localeCompare(b.chargementMcc);
                break;
            case 'electrovanne':
                cmp = (a.electrovanne ? 1 : 0) - (b.electrovanne ? 1 : 0);
                break;
        }
        return cmp * m;
    });

    return sorted;
};
