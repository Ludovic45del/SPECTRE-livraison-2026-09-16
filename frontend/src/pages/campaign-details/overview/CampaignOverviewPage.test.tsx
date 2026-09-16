/**
 * Tests for CampaignOverviewPage
 * @module pages/campaign-details/overview
 *
 * Vérifie les compteurs de statistiques FSEC (buckets du donut) :
 * - « Prêtes » regroupe Disponible (5) et Sur installation (6)
 * - « Fabrication » couvre tout statut du workflow situé avant Disponible :
 *   Design → Photos (0..4), Vérification scellement (16) et étapes gaz (9..14),
 *   ids ajoutés hors du range historique sans renumérotation (comparaison par rang).
 */
import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { createMockFsec } from '@test/mocks/handlers';
import type { CampaignWithRelations } from '@entities/campaign';
import { CampaignOverviewPage } from './CampaignOverviewPage';

const MOCK_CAMPAIGN_UUID = '00000000-0000-0000-0000-00000000c001';

const mockCampaign: CampaignWithRelations = {
    uuid: MOCK_CAMPAIGN_UUID,
    slug: '2025-s1-lmj-campagne-test',
    name: 'Campagne Test',
    year: 2025,
    semester: 'S1',
    lastUpdated: null,
    startDate: null,
    endDate: null,
    dtriNumber: 12345,
    description: 'Campagne de test',
    type: { id: 0, label: 'Type Test', color: '#123456' },
    status: { id: 0, label: 'Brouillon', color: '#c3c3c3' },
    installation: { id: 0, label: 'LMJ', color: '#654321' },
};

/** Texte complet d'une entrée de légende du donut : label + valeur accolés. */
function legendEntry(label: string): string | undefined {
    return screen.getByText(label).parentElement?.textContent ?? undefined;
}

describe('CampaignOverviewPage', () => {
    it('should bucket FSEC statuses into the donut stats, including Vérification scellement (16) and gas steps in Fabrication', async () => {
        // 11 FSECs : 1 tirée (7), 2 prêtes (5 Disponible + 6 Sur installation),
        // 6 en fabrication (0, 4, 16, 16, 10 Étanchéité BP, 14 Re-pressurisation),
        // 1 HS (8), 1 Décision MOE (15).
        const statusIds = [7, 5, 6, 0, 4, 16, 16, 10, 14, 8, 15];
        server.use(
            http.get('/api/v1/fsecs/campaign/:campaignUuid/', () =>
                HttpResponse.json(
                    statusIds.map((statusId, index) =>
                        // last_updated/created_at requis par FsecApiSchema mais absents de la factory.
                        createMockFsec({
                            status_id: statusId,
                            name: `FSEC ${index}`,
                            last_updated: '2025-01-15T10:00:00Z',
                            created_at: '2025-01-15T10:00:00Z',
                        }),
                    ),
                ),
            ),
        );

        renderWithProviders(<CampaignOverviewPage campaign={mockCampaign} />);

        // Le total (11 cibles) s'affiche au centre du donut une fois la liste chargée.
        await waitFor(() => {
            expect(screen.getByText('11')).toBeInTheDocument();
        });

        expect(legendEntry('Tirées')).toBe('Tirées1');
        expect(legendEntry('Prêtes')).toBe('Prêtes2');
        expect(legendEntry('Fabrication')).toBe('Fabrication6');
        expect(legendEntry('HS')).toBe('HS1');
        expect(legendEntry('Décision MOE')).toBe('Décision MOE1');
    });

    it('should render zeroed stats when the campaign has no FSEC', async () => {
        server.use(http.get('/api/v1/fsecs/campaign/:campaignUuid/', () => HttpResponse.json([])));

        renderWithProviders(<CampaignOverviewPage campaign={mockCampaign} />);

        await waitFor(() => {
            expect(legendEntry('Fabrication')).toBe('Fabrication0');
        });
        expect(legendEntry('Tirées')).toBe('Tirées0');
        expect(legendEntry('Prêtes')).toBe('Prêtes0');
    });
});
