/**
 * Tests AssemblyItemsTable — colonnes Matière / Masse (R03), fiche de ligne par
 * double-clic avec remarque complète éditable (R14), désambiguïsation des
 * lignes homonymes dans le dialog de suppression (R20).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { createMockFsecAssemblyItem } from '@test/mocks/handlers';
import { createMockStockCatalogItem } from '@test/mocks/stock-handlers';
import { AssemblyItemsTable } from './AssemblyItemsTable';

const FSEC_UUID = '00000000-0000-4000-8000-0000000000f1';
const ROW_ELEMENT_UUID = '00000000-0000-4000-8000-0000000000e1';
const ROW_CONSUMABLE_UUID = '00000000-0000-4000-8000-0000000000c1';
const ROW_CONSUMABLE_2_UUID = '00000000-0000-4000-8000-0000000000c2';

const LONG_REMARK =
    'Longueur 120 mm à découper sur place, vérifier la compatibilité avec la colle référencée dans le dossier ' +
    'de montage avant application, puis contrôler visuellement la planéité.';

const elementItem = createMockStockCatalogItem({
    kind: 'element',
    category: 'pieces_elementaires',
    name: 'Écran Cu',
    reference: 'ECR-001',
    status: 'reservee',
    installation: 'LMJ',
    matiere: 'Cuivre',
    masse_mg: 0.1 + 0.2,
    unite: null,
    quantite: null,
    seuil_alerte: null,
});

const consumableItem = createMockStockCatalogItem({
    kind: 'consumable',
    category: 'colles',
    name: 'Colle Epoxy',
    reference: 'EPX-9',
    matiere: null,
    masse_mg: null,
});

const rows = [
    createMockFsecAssemblyItem({
        uuid: ROW_ELEMENT_UUID,
        fsec_uuid: FSEC_UUID,
        catalog_item_uuid: elementItem.uuid,
        remarque: null,
        catalog_item: elementItem,
    }),
    createMockFsecAssemblyItem({
        uuid: ROW_CONSUMABLE_UUID,
        fsec_uuid: FSEC_UUID,
        catalog_item_uuid: consumableItem.uuid,
        sort_order: 1,
        remarque: LONG_REMARK,
        catalog_item: consumableItem,
    }),
    createMockFsecAssemblyItem({
        uuid: ROW_CONSUMABLE_2_UUID,
        fsec_uuid: FSEC_UUID,
        catalog_item_uuid: consumableItem.uuid,
        sort_order: 2,
        remarque: 'Seconde occurrence — 40 mm',
        catalog_item: consumableItem,
    }),
];

describe('AssemblyItemsTable', () => {
    let patchCalls: Array<{ uuid: string; body: Record<string, unknown> }>;

    beforeEach(() => {
        patchCalls = [];
        server.use(
            http.get(`/api/v1/fsec-assembly-items/fsec/${FSEC_UUID}/`, () => HttpResponse.json(rows)),
            http.patch('/api/v1/fsec-assembly-items/:uuid/', async ({ params, request }) => {
                const body = (await request.json()) as Record<string, unknown>;
                patchCalls.push({ uuid: String(params.uuid), body });
                return HttpResponse.json(createMockFsecAssemblyItem({ uuid: params.uuid, ...body }));
            }),
        );
    });

    it('affiche les colonnes Matière et Masse [mg] avec une précision contrôlée', async () => {
        renderWithProviders(<AssemblyItemsTable fsecUuid={FSEC_UUID} />);

        expect(await screen.findByText('Écran Cu')).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Matière' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Masse [mg]' })).toBeInTheDocument();

        const elementRow = screen.getByRole('row', { name: 'Ligne Écran Cu' });
        expect(within(elementRow).getByText('Cuivre')).toBeInTheDocument();
        // 0.1 + 0.2 = 0.30000000000000004 → affiché « 0,3 ».
        expect(within(elementRow).getByText('0,3')).toBeInTheDocument();
        expect(within(elementRow).queryByText('0.30000000000000004')).not.toBeInTheDocument();

        const consumableRows = screen.getAllByRole('row', { name: 'Ligne Colle Epoxy' });
        expect(consumableRows).toHaveLength(2);
        // Matière + masse absentes → « — » (2 cellules sur cette ligne).
        expect(within(consumableRows[1]).getAllByText('—').length).toBeGreaterThanOrEqual(2);
    });

    it('ouvre la fiche au double-clic avec la remarque complète de LA ligne', async () => {
        const user = userEvent.setup();
        renderWithProviders(<AssemblyItemsTable fsecUuid={FSEC_UUID} />);
        await screen.findByText('Écran Cu');

        const [firstConsumableRow] = screen.getAllByRole('row', { name: 'Ligne Colle Epoxy' });
        await user.dblClick(firstConsumableRow);

        const dialog = await screen.findByRole('dialog', { name: /Colle Epoxy/ });
        const remark = within(dialog).getByRole('textbox', { name: 'Remarque' });
        expect(remark).toHaveValue(LONG_REMARK);
        expect(within(dialog).getByText('EPX-9')).toBeInTheDocument();
        expect(within(dialog).getByText('Colles')).toBeInTheDocument();
    });

    it('le bouton « Voir la fiche » ouvre la fiche de la bonne occurrence', async () => {
        const user = userEvent.setup();
        renderWithProviders(<AssemblyItemsTable fsecUuid={FSEC_UUID} />);
        await screen.findByText('Écran Cu');

        const [, secondConsumableRow] = screen.getAllByRole('row', { name: 'Ligne Colle Epoxy' });
        await user.click(within(secondConsumableRow).getByRole('button', { name: 'Voir la fiche de Colle Epoxy' }));

        const dialog = await screen.findByRole('dialog', { name: /Colle Epoxy/ });
        expect(within(dialog).getByRole('textbox', { name: 'Remarque' })).toHaveValue('Seconde occurrence — 40 mm');
    });

    it('enregistre la remarque modifiée via PATCH sur l’uuid de la ligne', async () => {
        const user = userEvent.setup();
        renderWithProviders(<AssemblyItemsTable fsecUuid={FSEC_UUID} />);
        await screen.findByText('Écran Cu');

        await user.dblClick(screen.getByRole('row', { name: 'Ligne Écran Cu' }));
        const dialog = await screen.findByRole('dialog', { name: /Écran Cu/ });
        const remark = within(dialog).getByRole('textbox', { name: 'Remarque' });
        expect(remark).toHaveValue('');
        expect(within(dialog).getByRole('button', { name: 'Enregistrer' })).toBeDisabled();

        await user.type(remark, 'Position 3, face avant');
        await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => expect(patchCalls).toHaveLength(1));
        expect(patchCalls[0]).toEqual({
            uuid: ROW_ELEMENT_UUID,
            body: { remarque: 'Position 3, face avant' },
        });
        await waitFor(() => expect(screen.queryByRole('dialog', { name: /Écran Cu/ })).not.toBeInTheDocument());
    });

    it('FSEC verrouillée : fiche consultable mais remarque en lecture seule, pas de suppression', async () => {
        const user = userEvent.setup();
        renderWithProviders(<AssemblyItemsTable fsecUuid={FSEC_UUID} disabled />);
        await screen.findByText('Écran Cu');

        expect(screen.queryByRole('button', { name: /^Retirer / })).not.toBeInTheDocument();

        await user.dblClick(screen.getByRole('row', { name: 'Ligne Écran Cu' }));
        const dialog = await screen.findByRole('dialog', { name: /Écran Cu/ });
        expect(within(dialog).getByRole('textbox', { name: 'Remarque' })).toBeDisabled();
        expect(within(dialog).queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
        expect(within(dialog).getByText('Cuivre')).toBeInTheDocument();
    });

    it('le bouton Supprimer n’ouvre pas la fiche et le dialog affiche la remarque (R20)', async () => {
        const user = userEvent.setup();
        renderWithProviders(<AssemblyItemsTable fsecUuid={FSEC_UUID} />);
        await screen.findByText('Écran Cu');

        const [, secondConsumableRow] = screen.getAllByRole('row', { name: 'Ligne Colle Epoxy' });
        await user.dblClick(within(secondConsumableRow).getByRole('button', { name: 'Retirer Colle Epoxy' }));

        const confirm = await screen.findByRole('dialog', { name: 'Retirer cet élément ?' });
        expect(within(confirm).getByText(/Seconde occurrence — 40 mm/)).toBeInTheDocument();
        // La fiche (remarque éditable) ne s'est pas ouverte en parallèle.
        expect(screen.queryByRole('textbox', { name: 'Remarque' })).not.toBeInTheDocument();
    });
});
