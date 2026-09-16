/**
 * Tests AddAssemblyItemModal — multi-ajout des consommables (R20) : un
 * consommable déjà lié reste sélectionnable, un élément sérialisé déjà lié
 * reste bloqué.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { createMockFsecAssemblyItem } from '@test/mocks/handlers';
import { createMockStockCatalogItem } from '@test/mocks/stock-handlers';
import { AddAssemblyItemModal } from './AddAssemblyItemModal';

const FSEC_UUID = '00000000-0000-4000-8000-0000000000f2';

const elementItem = createMockStockCatalogItem({
    kind: 'element',
    category: 'pieces_elementaires',
    name: 'Écran Cu',
    reference: 'ECR-001',
    status: 'reservee',
    installation: 'LMJ',
    unite: null,
    quantite: null,
    seuil_alerte: null,
});

const consumableItem = createMockStockCatalogItem({
    kind: 'consumable',
    category: 'colles',
    name: 'Colle Epoxy',
    reference: 'EPX-9',
});

const freeConsumable = createMockStockCatalogItem({
    kind: 'consumable',
    category: 'autres',
    name: 'Ruban Kapton',
    reference: 'KPT-1',
});

const rowButton = (name: string) => {
    const el = screen.getByText(name).closest('[role="button"]');
    if (!el) throw new Error(`Ligne ${name} introuvable`);
    return el as HTMLElement;
};

describe('AddAssemblyItemModal (R20)', () => {
    let postBodies: Array<Record<string, unknown>>;
    const onClose = vi.fn();

    beforeEach(() => {
        postBodies = [];
        onClose.mockReset();
        server.use(
            http.get(`/api/v1/stock/catalog/available-for-fsec/${FSEC_UUID}/`, () =>
                HttpResponse.json([elementItem, consumableItem, freeConsumable]),
            ),
            http.get(`/api/v1/fsec-assembly-items/fsec/${FSEC_UUID}/`, () =>
                HttpResponse.json([
                    createMockFsecAssemblyItem({
                        fsec_uuid: FSEC_UUID,
                        catalog_item_uuid: elementItem.uuid,
                        catalog_item: elementItem,
                    }),
                    createMockFsecAssemblyItem({
                        fsec_uuid: FSEC_UUID,
                        catalog_item_uuid: consumableItem.uuid,
                        remarque: 'Première occurrence',
                        catalog_item: consumableItem,
                    }),
                ]),
            ),
            http.post('/api/v1/fsec-assembly-items/', async ({ request }) => {
                const body = (await request.json()) as Record<string, unknown>;
                postBodies.push(body);
                return HttpResponse.json(createMockFsecAssemblyItem(body), { status: 201 });
            }),
        );
    });

    it('un élément déjà lié reste bloqué, un consommable déjà lié est ré-sélectionnable', async () => {
        renderWithProviders(<AddAssemblyItemModal open fsecUuid={FSEC_UUID} onClose={onClose} />);
        await screen.findByText('Écran Cu');

        // Attendre le marquage « déjà ajouté » (seconde requête).
        await waitFor(() => expect(rowButton('Écran Cu')).toHaveAttribute('aria-disabled', 'true'));
        expect(screen.getByText('Déjà ajouté')).toBeInTheDocument();

        expect(rowButton('Colle Epoxy')).toHaveAttribute('aria-disabled', 'false');
        expect(screen.getByText('Déjà ajouté — ré-ajout possible')).toBeInTheDocument();

        expect(rowButton('Ruban Kapton')).toHaveAttribute('aria-disabled', 'false');
        expect(screen.getAllByText(/Déjà ajouté/)).toHaveLength(2);
    });

    it('cliquer un élément bloqué ne le sélectionne pas', async () => {
        const user = userEvent.setup();
        renderWithProviders(<AddAssemblyItemModal open fsecUuid={FSEC_UUID} onClose={onClose} />);
        await screen.findByText('Écran Cu');
        await waitFor(() => expect(rowButton('Écran Cu')).toHaveAttribute('aria-disabled', 'true'));

        await user.click(rowButton('Écran Cu'));

        expect(rowButton('Écran Cu')).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByRole('button', { name: 'Ajouter au tableau' })).toBeDisabled();
    });

    it('ré-ajoute un consommable déjà lié avec une remarque distincte', async () => {
        const user = userEvent.setup();
        renderWithProviders(<AddAssemblyItemModal open fsecUuid={FSEC_UUID} onClose={onClose} />);
        await screen.findByText('Colle Epoxy');
        await waitFor(() => expect(screen.getByText('Déjà ajouté — ré-ajout possible')).toBeInTheDocument());

        await user.click(rowButton('Colle Epoxy'));
        expect(rowButton('Colle Epoxy')).toHaveAttribute('aria-pressed', 'true');

        await user.type(screen.getByRole('textbox', { name: /Remarque/ }), 'Seconde occurrence — 40 mm');
        await user.click(screen.getByRole('button', { name: 'Ajouter au tableau' }));

        await waitFor(() => expect(postBodies).toHaveLength(1));
        expect(postBodies[0]).toEqual({
            fsec_uuid: FSEC_UUID,
            catalog_item_uuid: consumableItem.uuid,
            remarque: 'Seconde occurrence — 40 mm',
        });
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('trie : seuls les éléments bloqués descendent en bas de liste', async () => {
        renderWithProviders(<AddAssemblyItemModal open fsecUuid={FSEC_UUID} onClose={onClose} />);
        await screen.findByText('Écran Cu');
        await waitFor(() => expect(rowButton('Écran Cu')).toHaveAttribute('aria-disabled', 'true'));

        const names = screen
            .getAllByRole('button', { pressed: false })
            .map((el) => el.textContent ?? '')
            .filter((t) => /Écran Cu|Colle Epoxy|Ruban Kapton/.test(t));
        // Consommables (dont celui déjà lié) avant l'élément bloqué.
        expect(names[names.length - 1]).toMatch(/Écran Cu/);
        expect(names[0]).toMatch(/Colle Epoxy/);
    });
});
