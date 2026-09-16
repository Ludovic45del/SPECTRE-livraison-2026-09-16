/**
 * Tests CampaignTableRow.
 *
 * Vérifie que la ligne affiche l'attribution (année + semestre) et les
 * référentiels, sans cellule « Période » d'activité (retirée de la liste).
 * @module pages/campaigns/components
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Table, TableBody } from '@mui/material';
import { renderWithProviders } from '@test/test-utils';
import type { CampaignWithRelations } from '@entities/campaign';
import { CampaignTableRow } from './CampaignTableRow';

function makeCampaign(overrides: Partial<CampaignWithRelations> = {}): CampaignWithRelations {
    return {
        uuid: '00000000-0000-4000-8000-000000000001',
        slug: '2027-s1-lmj-test',
        name: 'Campagne test',
        year: 2027,
        semester: 'S1',
        lastUpdated: null,
        startDate: null,
        endDate: null,
        dtriNumber: null,
        description: null,
        type: { id: 0, label: 'Campagne DAM', color: '#5856D6' },
        status: { id: 0, label: 'Brouillon', color: '#6B7280' },
        installation: { id: 0, label: 'LMJ', color: '#E91E63' },
        ...overrides,
    };
}

function renderRow(campaign: CampaignWithRelations) {
    // Un TableRow doit vivre dans <table><tbody> pour un DOM valide.
    return renderWithProviders(
        <Table>
            <TableBody>
                <CampaignTableRow campaign={campaign} onNavigate={vi.fn()} />
            </TableBody>
        </Table>,
    );
}

describe('CampaignTableRow', () => {
    it('affiche les informations principales de la campagne', () => {
        renderRow(makeCampaign());

        expect(screen.getByText('2027')).toBeInTheDocument();
        expect(screen.getByText('S1')).toBeInTheDocument();
        expect(screen.getByText('Campagne test')).toBeInTheDocument();
        expect(screen.getByText('LMJ')).toBeInTheDocument();
        expect(screen.getByText('Campagne DAM')).toBeInTheDocument();
        expect(screen.getByText('Brouillon')).toBeInTheDocument();
    });

    it("n'affiche pas la période d'activité même quand les dates sont renseignées", () => {
        renderRow(
            makeCampaign({
                startDate: new Date('2026-10-01'),
                endDate: new Date('2027-02-15'),
            }),
        );

        expect(screen.queryByText('2026-S2/2027-S1')).not.toBeInTheDocument();
        expect(screen.queryByText('2027-S1')).not.toBeInTheDocument();
    });

    it('affiche un tiret pour les référentiels manquants', () => {
        renderRow(makeCampaign({ type: null, status: null, installation: null }));

        expect(screen.getAllByText('-')).toHaveLength(3);
    });
});
