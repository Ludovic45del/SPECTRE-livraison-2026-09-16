/**
 * Tests AssemblyItemDetailModal (R14) — fiche d'une ligne du tableau récap.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { createMockFsecAssemblyItem } from '@test/mocks/handlers';
import { createMockStockCatalogItem } from '@test/mocks/stock-handlers';
import { FsecAssemblyItemDetailSchema } from '@entities/fsec-assembly-item';
import { AssemblyItemDetailModal } from './AssemblyItemDetailModal';

const FSEC_UUID = '00000000-0000-4000-8000-0000000000f3';
const ROW_UUID = '00000000-0000-4000-8000-0000000000d1';

const row = FsecAssemblyItemDetailSchema.parse(
    createMockFsecAssemblyItem({
        uuid: ROW_UUID,
        fsec_uuid: FSEC_UUID,
        remarque: 'Remarque initiale',
        catalog_item: createMockStockCatalogItem({
            kind: 'element',
            category: 'structuration',
            structuration_type: 'standard',
            name: 'Structuration 12',
            reference: 'STR-12',
            caracteristique: 'Ø 3 mm',
            fournisseur: 'ACME',
            boite: 'B4',
            emplacement: 'Tiroir 2',
            status: 'affectee',
            installation: 'LMJ',
            matiere: 'Or',
            masse_mg: 12.5,
            unite: null,
            quantite: null,
            seuil_alerte: null,
        }),
    }),
);

describe('AssemblyItemDetailModal', () => {
    const onClose = vi.fn();
    let patchCalls: Array<{ uuid: string; body: Record<string, unknown> }>;

    beforeEach(() => {
        onClose.mockReset();
        patchCalls = [];
        server.use(
            http.patch('/api/v1/fsec-assembly-items/:uuid/', async ({ params, request }) => {
                const body = (await request.json()) as Record<string, unknown>;
                patchCalls.push({ uuid: String(params.uuid), body });
                return HttpResponse.json(createMockFsecAssemblyItem({ uuid: params.uuid, ...body }));
            }),
        );
    });

    it('affiche la fiche complète de l’item et la remarque de la ligne', () => {
        renderWithProviders(<AssemblyItemDetailModal open item={row} fsecUuid={FSEC_UUID} onClose={onClose} />);

        const dialog = screen.getByRole('dialog', { name: /Structuration 12/ });
        expect(within(dialog).getByText('STR-12')).toBeInTheDocument();
        expect(within(dialog).getByText('Ø 3 mm')).toBeInTheDocument();
        expect(within(dialog).getByText('ACME')).toBeInTheDocument();
        expect(within(dialog).getByText('B4 · Tiroir 2')).toBeInTheDocument();
        expect(within(dialog).getByText('Structuration')).toBeInTheDocument();
        expect(within(dialog).getByText('Affectée')).toBeInTheDocument();
        expect(within(dialog).getByText('Or')).toBeInTheDocument();
        expect(within(dialog).getByText('12,5')).toBeInTheDocument();
        expect(within(dialog).getByRole('textbox', { name: 'Remarque' })).toHaveValue('Remarque initiale');
    });

    it('enregistre la remarque (PATCH sur l’uuid de la ligne) puis ferme', async () => {
        const user = userEvent.setup();
        renderWithProviders(<AssemblyItemDetailModal open item={row} fsecUuid={FSEC_UUID} onClose={onClose} />);

        const remark = screen.getByRole('textbox', { name: 'Remarque' });
        await user.clear(remark);
        await user.type(remark, 'Nouvelle remarque');
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => expect(patchCalls).toHaveLength(1));
        expect(patchCalls[0]).toEqual({ uuid: ROW_UUID, body: { remarque: 'Nouvelle remarque' } });
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('envoie null quand la remarque est vidée', async () => {
        const user = userEvent.setup();
        renderWithProviders(<AssemblyItemDetailModal open item={row} fsecUuid={FSEC_UUID} onClose={onClose} />);

        await user.clear(screen.getByRole('textbox', { name: 'Remarque' }));
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => expect(patchCalls).toHaveLength(1));
        expect(patchCalls[0].body).toEqual({ remarque: null });
    });

    it('mode verrouillé : lecture seule, aucun bouton Enregistrer', () => {
        renderWithProviders(
            <AssemblyItemDetailModal open item={row} fsecUuid={FSEC_UUID} disabled onClose={onClose} />,
        );

        expect(screen.getByRole('textbox', { name: 'Remarque' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
        expect(screen.getByText(/FSEC verrouillée/)).toBeInTheDocument();
    });

    it('ne rend rien sans ligne', () => {
        renderWithProviders(<AssemblyItemDetailModal open item={null} fsecUuid={FSEC_UUID} onClose={onClose} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
