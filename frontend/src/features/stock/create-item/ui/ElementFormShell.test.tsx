/**
 * Tests ElementFormShell — soumission du formulaire élément, dont le mode
 * « paquet » (création de plusieurs structurations numérotées d'un coup), la
 * duplication (R06), les champs Matière / Masse (R03) et le sélecteur FSEC
 * contextualisé (R02).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { StockCatalogItemSchema } from '@entities/stock-item';
import { renderWithProviders } from '@test/test-utils';
import { server } from '@test/mocks/server';
import { createMockStockCatalogItem } from '@test/mocks/stock-handlers';
import { createMockCampaign, createMockFsec } from '@test/mocks/handlers';
import { ElementFormShell } from './ElementFormShell';

const CAMPAIGN_UUID = '00000000-0000-4000-8000-000000000001';

const mockCampaigns = [createMockCampaign({ uuid: CAMPAIGN_UUID, name: 'Alpha', year: 2026, installation_id: 0 })];
// `last_updated` / `created_at` sont requis par FsecApiSchema (absents de la factory).
const mockFsecs = [
    createMockFsec({
        name: 'Cible-01',
        display_name: '2026-LMJ_Alpha_Cible-01',
        campaign_id: CAMPAIGN_UUID,
        status_id: 0,
        last_updated: null,
        created_at: null,
    }),
    createMockFsec({
        name: 'Cible-tiree',
        display_name: '2026-LMJ_Alpha_Cible-tiree',
        campaign_id: CAMPAIGN_UUID,
        status_id: 7,
        last_updated: null,
        created_at: null,
    }),
];

const FSEC_01_LABEL = '2026-LMJ_Alpha_Cible-01';

describe('ElementFormShell', () => {
    const onBack = vi.fn();
    const onCancel = vi.fn();
    const onSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        server.use(
            http.get('/api/v1/fsecs/', () => HttpResponse.json(mockFsecs)),
            http.get('/api/v1/campaigns/', () => HttpResponse.json(mockCampaigns)),
            http.get('/api/v1/stock/catalog/next-structuration-number/', () => HttpResponse.json({ next: 4 })),
        );
    });

    const setup = (prefill?: Parameters<typeof ElementFormShell>[0]['prefill']) => {
        const user = userEvent.setup();
        renderWithProviders(
            <ElementFormShell onBack={onBack} onCancel={onCancel} onSuccess={onSuccess} prefill={prefill} />,
        );
        return user;
    };

    const selectRubriqueStructuration = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByRole('combobox', { name: /rubrique/i }));
        await user.click(await screen.findByRole('option', { name: /structuration/i }));
    };

    /** Capture le body du prochain POST /stock/catalog/. */
    const captureCreate = () => {
        const captured: { body: Record<string, unknown> | null } = { body: null };
        server.use(
            http.post('/api/v1/stock/catalog/', async ({ request }) => {
                captured.body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(createMockStockCatalogItem(captured.body), { status: 201 });
            }),
        );
        return captured;
    };

    describe('mode paquet structuration', () => {
        it('crée un paquet de plusieurs structurations (quantité > 1)', async () => {
            let capturedBody: Record<string, unknown> | null = null;
            server.use(
                http.post('/api/v1/stock/catalog/batch-structuration/', async ({ request }) => {
                    capturedBody = (await request.json()) as Record<string, unknown>;
                    const qty = Number(capturedBody.quantity);
                    return HttpResponse.json(
                        Array.from({ length: qty }, (_, i) =>
                            createMockStockCatalogItem({
                                kind: 'element',
                                category: 'structuration',
                                structuration_type: capturedBody!.structuration_type as 'standard',
                                name: String(4 + i),
                                reference: null,
                                installation: 'LMJ',
                                status: 'dispo',
                            }),
                        ),
                        { status: 201 },
                    );
                }),
            );

            const user = setup();

            await selectRubriqueStructuration(user);

            // Type de structuration
            await user.click(screen.getByRole('combobox', { name: /^type$/i }));
            await user.click(await screen.findByRole('option', { name: /standard/i }));

            // Quantité = 3
            const qtyInput = screen.getByLabelText(/quantité/i);
            await user.clear(qtyInput);
            await user.type(qtyInput, '3');

            await user.click(screen.getByRole('button', { name: /ajouter au catalogue/i }));

            await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
            expect(capturedBody).toMatchObject({
                structuration_type: 'standard',
                installation: 'LMJ',
                quantity: 3,
            });
        });

        it("affiche l'aperçu de la plage de numéros en mode paquet", async () => {
            const user = setup();

            await selectRubriqueStructuration(user);

            const qtyInput = screen.getByLabelText(/quantité/i);
            await user.clear(qtyInput);
            await user.type(qtyInput, '5');

            // next=4, quantité 5 → n° 4 → n° 8
            expect(await screen.findByText(/n° 4 → n° 8/)).toBeInTheDocument();
        });
    });

    describe('Matière / Masse (R03)', () => {
        it('envoie matiere et masse_mg dans le payload de création', async () => {
            const captured = captureCreate();
            const user = setup();

            await user.type(screen.getByLabelText(/^nom/i), 'Écran Au');
            await user.type(screen.getByLabelText(/matière/i), 'Or');
            await user.type(screen.getByLabelText(/masse \[mg\]/i), '12.5');

            await user.click(screen.getByRole('button', { name: /ajouter au catalogue/i }));

            await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
            expect(captured.body).toMatchObject({ name: 'Écran Au', matiere: 'Or', masse_mg: 12.5 });
        });

        it('envoie null pour une matière / masse non renseignées', async () => {
            const captured = captureCreate();
            const user = setup();

            await user.type(screen.getByLabelText(/^nom/i), 'Écran Au');
            await user.click(screen.getByRole('button', { name: /ajouter au catalogue/i }));

            await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
            expect(captured.body).toMatchObject({ matiere: null, masse_mg: null });
        });

        it('refuse une masse négative', async () => {
            const captured = captureCreate();
            const user = setup();

            await user.type(screen.getByLabelText(/^nom/i), 'Écran Au');
            await user.type(screen.getByLabelText(/masse \[mg\]/i), '-3');
            await user.click(screen.getByRole('button', { name: /ajouter au catalogue/i }));

            expect(await screen.findByText(/la masse ne peut pas être négative/i)).toBeInTheDocument();
            expect(captured.body).toBeNull();
            expect(onSuccess).not.toHaveBeenCalled();
        });
    });

    describe('sélecteur FSEC contextualisé (R02)', () => {
        it('affiche le nom complet de la cible dans les options, sans les FSEC tirées', async () => {
            const user = setup();

            await user.click(screen.getByRole('combobox', { name: /^fsec/i }));
            // Les options apparaissent une fois les FSEC + campagnes chargées.
            const option = await screen.findByRole('option', { name: FSEC_01_LABEL });
            const listbox = screen.getByRole('listbox');

            expect(within(listbox).getByText(FSEC_01_LABEL)).toBeInTheDocument();
            expect(option).toBeInTheDocument();
            expect(within(listbox).queryByText(/Cible-tiree/)).not.toBeInTheDocument();
        });

        it('persiste fsec_name = nom brut de la FSEC (pas le libellé complet)', async () => {
            const captured = captureCreate();
            const user = setup();

            await user.type(screen.getByLabelText(/^nom/i), 'Écran Au');
            await user.click(screen.getByRole('combobox', { name: /^fsec/i }));
            await user.click(await screen.findByRole('option', { name: FSEC_01_LABEL }));

            // Le champ affiche le libellé complet…
            expect(screen.getByRole('combobox', { name: /^fsec/i })).toHaveValue(FSEC_01_LABEL);

            await user.click(screen.getByRole('button', { name: /ajouter au catalogue/i }));

            // …mais le backend reçoit le nom brut.
            await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
            expect(captured.body).toMatchObject({ fsec_name: 'Cible-01' });
        });
    });

    describe('duplication (R06)', () => {
        const source = StockCatalogItemSchema.parse(
            createMockStockCatalogItem({
                kind: 'element',
                category: 'pieces_elementaires',
                name: 'Écran Au 12',
                reference: 'ECR-012',
                fsec_name: 'Cible-01',
                installation: 'OMEGA',
                status: 'reservee',
                caracteristique: 'Épaisseur 50 µm',
                matiere: 'Or',
                masse_mg: 12.5,
                fournisseur: 'CEA',
                unite: null,
                quantite: null,
                seuil_alerte: null,
            }),
        );

        it('pré-remplit le formulaire (nom conservé, référence vidée)', async () => {
            setup(source);

            // R06 : « dupliquer et modifier juste la référence » — le nom est
            // repris tel quel, seule la référence est à re-saisir.
            expect(screen.getByLabelText(/^nom/i)).toHaveValue('Écran Au 12');
            expect(screen.getByLabelText(/référence/i)).toHaveValue('');
            expect(screen.getByLabelText(/caractéristique/i)).toHaveValue('Épaisseur 50 µm');
            expect(screen.getByLabelText(/matière/i)).toHaveValue('Or');
            expect(screen.getByLabelText(/masse \[mg\]/i)).toHaveValue(12.5);
            expect(screen.getByLabelText(/fournisseur/i)).toHaveValue('CEA');
            expect(screen.getByRole('radio', { name: /omega/i })).toBeChecked();
            // La destination déclarative est reprise et affichée avec son libellé complet.
            await waitFor(() => expect(screen.getByRole('combobox', { name: /^fsec/i })).toHaveValue(FSEC_01_LABEL));
        });

        it('crée l’item dupliqué avec le même nom, la nouvelle référence, sans copier le statut', async () => {
            const captured = captureCreate();
            const user = setup(source);

            await user.type(screen.getByLabelText(/référence/i), 'ECR-013');
            await user.click(screen.getByRole('button', { name: /ajouter au catalogue/i }));

            await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
            expect(captured.body).toMatchObject({
                name: 'Écran Au 12',
                reference: 'ECR-013',
                matiere: 'Or',
                masse_mg: 12.5,
                installation: 'OMEGA',
                fsec_name: 'Cible-01',
            });
            expect(captured.body).not.toHaveProperty('status');
        });
    });
});
