/**
 * Tests MonthlyLineChart — transformation série mensuelle → points de chart (R19).
 *
 * Régression R19 : les séries backend peuvent contenir des clés hors période
 * (ex. '2026-08' dans la vue 2027, campagne démarrée avant sa période
 * d'attribution) et arriver dans un ordre d'insertion quelconque. Les points
 * doivent être triés chronologiquement et, dès que la série couvre plusieurs
 * années, le libellé doit porter l'année ('Août 2026' avant 'Janv. 2027') —
 * sans quoi un simple 'Août' placé avant 'Janvier' est perçu comme un tri cassé.
 * @module pages/indicateurs/components
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import MonthlyLineChart from './MonthlyLineChart';
import { toMonthlyChartData } from '../lib/monthly-chart';

/** Série 2027 complète (12 buckets pré-remplis) + un démarrage hors période. */
function buildMultiYearSeries(): Record<string, number> {
    const series: Record<string, number> = {};
    for (let month = 1; month <= 12; month += 1) {
        series[`2027-${String(month).padStart(2, '0')}`] = 0;
    }
    // Clé hors période insérée EN DERNIER (ordre d'insertion volontairement désordonné).
    series['2026-08'] = 1;
    return series;
}

describe('toMonthlyChartData', () => {
    it('trie chronologiquement une série multi-années désordonnée et suffixe les années', () => {
        const data = toMonthlyChartData(buildMultiYearSeries());

        expect(data).toHaveLength(13);
        // Le point hors période (chronologiquement premier) arrive en tête, année visible.
        expect(data[0]).toEqual({ month: 'Août 2026', count: 1 });
        expect(data[1]).toEqual({ month: 'Janv. 2027', count: 0 });
        expect(data[12]).toEqual({ month: 'Déc. 2027', count: 0 });
    });

    it('désambiguïse deux mêmes mois sur deux années différentes', () => {
        const data = toMonthlyChartData({ '2027-08': 2, '2026-08': 1 });

        expect(data.map((p) => p.month)).toEqual(['Août 2026', 'Août 2027']);
        expect(data.map((p) => p.count)).toEqual([1, 2]);
    });

    it("n'affiche pas l'année pour une série mono-année", () => {
        const data = toMonthlyChartData({
            '2027-03': 4,
            '2027-01': 2,
            '2027-02': 0,
        });

        // Tri chronologique conservé, libellés courts sans année.
        expect(data).toEqual([
            { month: 'Janv.', count: 2 },
            { month: 'Févr.', count: 0 },
            { month: 'Mars', count: 4 },
        ]);
    });

    it('retombe sur la clé brute pour un mois non reconnu (pas de crash)', () => {
        const data = toMonthlyChartData({ '2027-13': 1, '2027-01': 0 });

        expect(data.map((p) => p.month)).toEqual(['Janv.', '2027-13']);
    });

    it('retourne un tableau vide pour une série vide', () => {
        expect(toMonthlyChartData({})).toEqual([]);
    });
});

describe('MonthlyLineChart', () => {
    it('rend le titre du graphique', () => {
        renderWithProviders(<MonthlyLineChart title="Campagnes démarrées par mois" series={buildMultiYearSeries()} />);

        expect(screen.getByText('Campagnes démarrées par mois')).toBeInTheDocument();
    });
});
