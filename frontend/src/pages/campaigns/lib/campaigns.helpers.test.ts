/**
 * Tests des helpers de la liste campagnes.
 *
 * « Année »/« Semestre » sont l'attribution de la campagne (clé d'unicité
 * backend) ; la période d'activité réelle (startDate/endDate) n'est plus
 * affichée dans la liste (cf. header de la fiche campagne).
 * @module pages/campaigns/lib
 */

import { describe, it, expect } from 'vitest';
import type { CampaignWithRelations } from '@entities/campaign';
import { COLUMNS, COLUMN_WIDTHS, sortCampaigns } from './campaigns.helpers';

/** Fabrique une campagne minimale (relations nulles) pour les helpers purs. */
function makeCampaign(overrides: Partial<CampaignWithRelations> = {}): CampaignWithRelations {
    return {
        uuid: '00000000-0000-4000-8000-000000000001',
        slug: 'test',
        name: 'Campagne test',
        year: 2027,
        semester: 'S1',
        lastUpdated: null,
        startDate: null,
        endDate: null,
        dtriNumber: null,
        description: null,
        type: null,
        status: null,
        installation: null,
        ...overrides,
    };
}

describe('COLUMNS / COLUMN_WIDTHS', () => {
    it('expose les colonnes attribution → nom → référentiels, sans « Période »', () => {
        const keys = COLUMNS.map((c) => c.key);
        expect(keys).toEqual(['year', 'semester', 'name', 'installation', 'type', 'status']);
        expect(COLUMNS.some((c) => c.label === 'Période')).toBe(false);
    });

    it('garde des largeurs équilibrées à 100 % (colgroup de la page)', () => {
        const total = Object.values(COLUMN_WIDTHS).reduce((sum, width) => sum + parseFloat(width), 0);
        expect(total).toBe(100);
        // L'ordre des clés pilote le colgroup : colonnes triables puis actions.
        expect(Object.keys(COLUMN_WIDTHS)).toEqual([...COLUMNS.map((c) => c.key), 'actions']);
    });
});

describe('sortCampaigns', () => {
    const early = makeCampaign({ uuid: 'a', name: 'Alpha', year: 2025, semester: 'S1' });
    const middle = makeCampaign({ uuid: 'b', name: 'Bravo', year: 2026, semester: 'S1' });
    const late = makeCampaign({ uuid: 'c', name: 'Charlie', year: 2027, semester: 'S2' });

    it('trie par année croissante (asc)', () => {
        const sorted = sortCampaigns([late, early, middle], 'year', 'asc');
        expect(sorted.map((c) => c.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('trie par semestre décroissant (desc)', () => {
        const sorted = sortCampaigns([early, late], 'semester', 'desc');
        expect(sorted.map((c) => c.name)).toEqual(['Charlie', 'Alpha']);
    });

    it("ne mute pas le tableau d'entrée", () => {
        const input = [late, early];
        sortCampaigns(input, 'name', 'asc');
        expect(input.map((c) => c.name)).toEqual(['Charlie', 'Alpha']);
    });
});
