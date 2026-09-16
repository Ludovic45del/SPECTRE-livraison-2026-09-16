/**
 * Tests du référentiel FSEC : séquences de workflow et helpers de rang.
 * @module entities/fsec/model
 *
 * Les ids de statut ne sont pas monotones (16 Vérification scellement entre
 * 3 et 4, étapes gaz 9..14 entre 4 et 5) : toute logique d'ordre doit passer
 * par le rang de workflow, jamais par l'id brut.
 */
import { describe, it, expect } from 'vitest';
import {
    FSEC_STATUS_ID,
    FSEC_STATUSES,
    FSEC_WORKFLOW_SEQUENCES,
    FSEC_STATUS_WORKFLOW_ORDER,
    getFsecStatusRank,
    compareFsecStatusRank,
    hasFsecReachedStatus,
} from './fsec.constants';

/** True si `sub` est une sous-suite (ordre préservé) de `full`. */
function isSubsequence(sub: readonly number[], full: readonly number[]): boolean {
    let cursor = 0;
    for (const id of sub) {
        const idx = full.indexOf(id, cursor);
        if (idx === -1) return false;
        cursor = idx + 1;
    }
    return true;
}

describe('FSEC_WORKFLOW_SEQUENCES', () => {
    it('couvre les 5 catégories et place Vérification scellement (16) entre Scellement (3) et Photos (4)', () => {
        expect(Object.keys(FSEC_WORKFLOW_SEQUENCES).map(Number).sort()).toEqual([0, 1, 2, 3, 4]);
        for (const sequence of Object.values(FSEC_WORKFLOW_SEQUENCES)) {
            const sealing = sequence.indexOf(FSEC_STATUS_ID.EN_ATTENTE_SCELLEMENT);
            expect(sequence[sealing + 1]).toBe(FSEC_STATUS_ID.VERIFICATION_SCELLEMENT);
            expect(sequence[sealing + 2]).toBe(FSEC_STATUS_ID.PHOTOS_A_PRENDRE);
        }
    });

    it('pour les catégories gaz, Photos (4) précède la première étape gaz', () => {
        for (const categoryId of [1, 2, 3, 4]) {
            const sequence = FSEC_WORKFLOW_SEQUENCES[categoryId];
            const photos = sequence.indexOf(FSEC_STATUS_ID.PHOTOS_A_PRENDRE);
            expect([FSEC_STATUS_ID.TEST_ETANCHEITE_BP, FSEC_STATUS_ID.REMPLISSAGE_HP]).toContain(sequence[photos + 1]);
        }
    });
});

describe('FSEC_STATUS_WORKFLOW_ORDER', () => {
    it('contient chaque statut du référentiel exactement une fois', () => {
        const referentialIds = Object.keys(FSEC_STATUSES)
            .map(Number)
            .sort((a, b) => a - b);
        const orderIds = [...FSEC_STATUS_WORKFLOW_ORDER].sort((a, b) => a - b);
        expect(orderIds).toEqual(referentialIds);
    });

    it('chaque séquence de catégorie (Re-pressurisation incluse) en est une sous-suite', () => {
        for (const [categoryId, sequence] of Object.entries(FSEC_WORKFLOW_SEQUENCES)) {
            expect(isSubsequence(sequence, FSEC_STATUS_WORKFLOW_ORDER), `catégorie ${categoryId}`).toBe(true);
        }
        // Catégorie 4 avec échec de dépressurisation : 14 inséré après 13 (cf. stepper).
        const cat4 = FSEC_WORKFLOW_SEQUENCES[4];
        const depress = cat4.indexOf(FSEC_STATUS_ID.DEPRESSURISATION);
        const cat4WithRepress = [
            ...cat4.slice(0, depress + 1),
            FSEC_STATUS_ID.RE_PRESSURISATION,
            ...cat4.slice(depress + 1),
        ];
        expect(isSubsequence(cat4WithRepress, FSEC_STATUS_WORKFLOW_ORDER)).toBe(true);
    });
});

describe('getFsecStatusRank', () => {
    it('classe Vérification scellement (16) entre Scellement (3) et Photos (4)', () => {
        expect(getFsecStatusRank(16)).toBeGreaterThan(getFsecStatusRank(3));
        expect(getFsecStatusRank(16)).toBeLessThan(getFsecStatusRank(4));
    });

    it('classe les étapes gaz (9..14) entre Photos (4) et Disponible (5)', () => {
        for (const gasId of [9, 10, 11, 12, 13, 14]) {
            expect(getFsecStatusRank(gasId)).toBeGreaterThan(getFsecStatusRank(4));
            expect(getFsecStatusRank(gasId)).toBeLessThan(getFsecStatusRank(5));
        }
    });

    it('place les statuts de pause après Tirée, null avant tout et un id inconnu après tout', () => {
        expect(getFsecStatusRank(FSEC_STATUS_ID.HS)).toBeGreaterThan(getFsecStatusRank(FSEC_STATUS_ID.TIREE));
        expect(getFsecStatusRank(FSEC_STATUS_ID.DECISION_MOE)).toBeGreaterThan(getFsecStatusRank(FSEC_STATUS_ID.HS));
        expect(getFsecStatusRank(null)).toBe(-1);
        expect(getFsecStatusRank(99)).toBeGreaterThan(getFsecStatusRank(FSEC_STATUS_ID.DECISION_MOE));
    });
});

describe('compareFsecStatusRank', () => {
    it('trie par ordre de workflow et non par id brut', () => {
        const sorted = [7, 16, 10, 3, 8, 15, 4, 5, null, 9].sort(compareFsecStatusRank);
        expect(sorted).toEqual([null, 3, 16, 4, 10, 9, 5, 7, 8, 15]);
    });
});

describe('hasFsecReachedStatus', () => {
    it('Vérification scellement (16) a atteint Scellement (3) mais ni Photos (4) ni Disponible (5)', () => {
        expect(hasFsecReachedStatus(16, 3)).toBe(true);
        expect(hasFsecReachedStatus(16, 16)).toBe(true);
        expect(hasFsecReachedStatus(16, 4)).toBe(false);
        expect(hasFsecReachedStatus(16, 5)).toBe(false);
        expect(hasFsecReachedStatus(16, 7)).toBe(false);
    });

    it('une étape gaz (10) a atteint Photos (4) mais pas Disponible (5)', () => {
        expect(hasFsecReachedStatus(10, 4)).toBe(true);
        expect(hasFsecReachedStatus(10, 5)).toBe(false);
        expect(hasFsecReachedStatus(10, 6)).toBe(false);
    });

    it('Disponible (5) et Tirée (7) : seuils atteints selon le workflow', () => {
        expect(hasFsecReachedStatus(5, 5)).toBe(true);
        expect(hasFsecReachedStatus(5, 6)).toBe(false);
        expect(hasFsecReachedStatus(7, 7)).toBe(true);
        expect(hasFsecReachedStatus(7, 16)).toBe(true);
    });

    it('retourne false pour un statut null, inconnu, de pause, ou un seuil inconnu', () => {
        expect(hasFsecReachedStatus(null, 0)).toBe(false);
        expect(hasFsecReachedStatus(99, 0)).toBe(false);
        expect(hasFsecReachedStatus(FSEC_STATUS_ID.HS, 1)).toBe(false);
        expect(hasFsecReachedStatus(FSEC_STATUS_ID.DECISION_MOE, 1)).toBe(false);
        expect(hasFsecReachedStatus(7, 99)).toBe(false);
    });
});
