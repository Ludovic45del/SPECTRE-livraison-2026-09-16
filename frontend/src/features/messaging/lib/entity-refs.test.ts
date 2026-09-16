/**
 * Tests des helpers de références : tri des campagnes (« Récentes » : année,
 * semestre, nom en collation française ; « A → Z » : nom numérique), tri
 * mémorisé en session (stockage indisponible toléré), regroupement par année,
 * sous-titre et rappel de troncature, filtre des campagnes (nom / slug /
 * année, casse et accents ignorés), filtre des options (exclusion, plafond).
 */
import { afterEach, describe, it, expect, vi } from 'vitest';

import {
    CAMPAIGN_SORT_STORAGE_KEY,
    MAX_CAMPAIGN_RESULTS,
    MAX_RESULTS_PER_GROUP,
    buildCampaignSearchText,
    filterCampaigns,
    filterEntityRefOptions,
    formatCampaignSubtitle,
    formatHiddenCampaignsHint,
    groupCampaignsByYear,
    readCampaignSortOrder,
    sortCampaigns,
    writeCampaignSortOrder,
    type EntityRefOption,
} from './entity-refs';

const campaign = (name: string, year: number, semester: string, slug = `${year}-${semester}-${name}`) => ({
    name,
    slug,
    year,
    semester,
});

describe('sortCampaigns', () => {
    it('trie par année décroissante, puis S2 avant S1, puis nom en collation française', () => {
        const sorted = sortCampaigns([
            campaign('Zêta', 2024, 'S2'),
            campaign('éclair', 2025, 'S1'),
            campaign('Beta', 2025, 'S2'),
            campaign('Alpha', 2025, 'S2'),
            campaign('Écho', 2025, 'S1'),
        ]);
        expect(sorted.map((c) => c.name)).toEqual(['Alpha', 'Beta', 'Écho', 'éclair', 'Zêta']);
    });

    it('« A → Z » trie par nom (numérique, accents ignorés), puis année décroissante, puis S2 avant S1', () => {
        const sorted = sortCampaigns(
            [
                campaign('Tir 10', 2025, 'S1'),
                campaign('Tir 2', 2024, 'S2'),
                campaign('Alpha', 2024, 'S1'),
                campaign('Alpha', 2025, 'S1'),
                campaign('Alpha', 2025, 'S2'),
                campaign('Écho', 2023, 'S1'),
            ],
            'alpha',
        );
        expect(sorted.map((c) => `${c.name} ${c.year} ${c.semester}`)).toEqual([
            'Alpha 2025 S2',
            'Alpha 2025 S1',
            'Alpha 2024 S1',
            'Écho 2023 S1',
            'Tir 2 2024 S2',
            'Tir 10 2025 S1',
        ]);
    });

    it('ne modifie pas le tableau d’origine', () => {
        const input = [campaign('B', 2024, 'S1'), campaign('A', 2025, 'S1')];
        const sorted = sortCampaigns(input);
        expect(sorted).not.toBe(input);
        expect(input.map((c) => c.name)).toEqual(['B', 'A']);
    });
});

describe('tri mémorisé en session', () => {
    afterEach(() => {
        sessionStorage.clear();
        vi.restoreAllMocks();
    });

    it('« Récentes » par défaut ; la valeur écrite est relue ; une valeur inconnue est ignorée', () => {
        expect(readCampaignSortOrder()).toBe('recent');
        writeCampaignSortOrder('alpha');
        expect(sessionStorage.getItem(CAMPAIGN_SORT_STORAGE_KEY)).toBe('alpha');
        expect(readCampaignSortOrder()).toBe('alpha');
        sessionStorage.setItem(CAMPAIGN_SORT_STORAGE_KEY, 'n-importe-quoi');
        expect(readCampaignSortOrder()).toBe('recent');
    });

    it('tolère un stockage indisponible (lecture par défaut, écriture silencieuse)', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        expect(readCampaignSortOrder()).toBe('recent');
        expect(() => writeCampaignSortOrder('alpha')).not.toThrow();
    });
});

describe('groupCampaignsByYear', () => {
    it('regroupe les campagnes consécutives de même année, dans l’ordre reçu', () => {
        const groups = groupCampaignsByYear([
            campaign('A', 2025, 'S2'),
            campaign('B', 2025, 'S1'),
            campaign('C', 2024, 'S2'),
        ]);
        expect(groups.map((g) => [g.year, g.campaigns.map((c) => c.name)])).toEqual([
            [2025, ['A', 'B']],
            [2024, ['C']],
        ]);
        expect(groupCampaignsByYear([])).toEqual([]);
    });
});

describe('formatCampaignSubtitle / formatHiddenCampaignsHint', () => {
    it('affiche « semestre · installation », ou « année · semestre » sans installation', () => {
        expect(formatCampaignSubtitle({ ...campaign('A', 2025, 'S1'), installation: { label: 'LMJ' } })).toBe(
            'S1 · LMJ',
        );
        expect(formatCampaignSubtitle({ ...campaign('A', 2025, 'S1'), installation: null })).toBe('2025 · S1');
        expect(formatCampaignSubtitle(campaign('A', 2025, 'S2'))).toBe('2025 · S2');
    });

    it('accorde le rappel de troncature au singulier / pluriel (plafond de 50)', () => {
        expect(MAX_CAMPAIGN_RESULTS).toBe(50);
        expect(formatHiddenCampaignsHint(1)).toBe('1 campagne supplémentaire — affinez la recherche');
        expect(formatHiddenCampaignsHint(12)).toBe('12 campagnes supplémentaires — affinez la recherche');
    });
});

describe('filterCampaigns', () => {
    const campaigns = [
        campaign('Éprouvette Ø12', 2025, 'S1', '2025-s1-lmj-eprouvette'),
        campaign('Autre', 2024, 'S2', '2024-s2-omega-autre'),
    ];

    it('renvoie une copie complète sans filtre (ou filtre blanc)', () => {
        expect(filterCampaigns(campaigns, '')).toEqual(campaigns);
        expect(filterCampaigns(campaigns, '   ')).toEqual(campaigns);
        expect(filterCampaigns(campaigns, '')).not.toBe(campaigns);
    });

    it('filtre sur le nom sans tenir compte de la casse ni des accents', () => {
        expect(filterCampaigns(campaigns, 'EPROUVETTE').map((c) => c.name)).toEqual(['Éprouvette Ø12']);
    });

    it('filtre sur le slug et sur l’année', () => {
        expect(filterCampaigns(campaigns, 'omega').map((c) => c.name)).toEqual(['Autre']);
        expect(filterCampaigns(campaigns, '2025').map((c) => c.name)).toEqual(['Éprouvette Ø12']);
    });

    it('buildCampaignSearchText concatène nom, slug et année normalisés', () => {
        expect(buildCampaignSearchText(campaigns[0])).toBe('eprouvette ø12 2025-s1-lmj-eprouvette 2025');
    });
});

describe('filterEntityRefOptions', () => {
    const option = (label: string, uuid: string): EntityRefOption => ({
        entityType: 'fsec',
        entityUuid: uuid,
        label,
        slug: `slug-${label.toLowerCase()}`,
    });

    it('exclut les références attachées, filtre sur libellé / slug et plafonne à MAX_RESULTS_PER_GROUP', () => {
        const options = Array.from({ length: 10 }, (_, i) => option(`FSEC ${i}`, `uuid-${i}`));
        expect(filterEntityRefOptions(options, '', [{ entityType: 'fsec', entityUuid: 'uuid-0' }])).toHaveLength(
            MAX_RESULTS_PER_GROUP,
        );
        expect(filterEntityRefOptions(options, 'slug-fsec 9', []).map((o) => o.label)).toEqual(['FSEC 9']);
        expect(filterEntityRefOptions(options, 'fsec 1', [])).toHaveLength(1);
    });

    it('accepte un plafond explicite (Infinity pour compter le total)', () => {
        const options = Array.from({ length: 10 }, (_, i) => option(`FSEC ${i}`, `uuid-${i}`));
        expect(filterEntityRefOptions(options, '', [], Infinity)).toHaveLength(10);
        expect(filterEntityRefOptions(options, '', [], 3)).toHaveLength(3);
    });
});
