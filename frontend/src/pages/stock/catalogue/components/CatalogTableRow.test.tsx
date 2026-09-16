/**
 * CatalogTableRow — colonne « Campagne / FSEC » (R01) et bouton « Dupliquer » (R06).
 */
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Table, TableBody } from '@mui/material';

import { StockCatalogItemSchema, type StockCatalogItem } from '@entities/stock-item';
import { renderWithProviders, screen } from '@test/test-utils';
import { createMockStockCatalogItem } from '@test/mocks/stock-handlers';

import { CatalogTableRow } from './CatalogTableRow';

const item = (overrides: Parameters<typeof createMockStockCatalogItem>[0]) =>
    StockCatalogItemSchema.parse(createMockStockCatalogItem(overrides));

const renderRow = (
    row: StockCatalogItem,
    props: { onClick?: () => void; onDuplicate?: (i: StockCatalogItem) => void },
) =>
    renderWithProviders(
        <Table>
            <TableBody>
                <CatalogTableRow item={row} {...props} />
            </TableBody>
        </Table>,
    );

describe('CatalogTableRow — colonne Campagne / FSEC', () => {
    it('affiche la FSEC réservée (lien) et sa campagne en légende', () => {
        renderRow(
            item({
                kind: 'element',
                name: 'Écran Au',
                status: 'reservee',
                assigned_fsec_name: 'Cible-01',
                assigned_campaign_name: '2026-LMJ_Alpha',
                assigned_fsec_slug: '2026-lmj-alpha-cible-01',
            }),
            {},
        );

        const link = screen.getByRole('link', { name: 'Cible-01' });
        expect(link).toHaveAttribute('href', '/fsec-details/2026-lmj-alpha-cible-01');
        expect(screen.getByText('2026-LMJ_Alpha')).toBeInTheDocument();
    });

    it('affiche la FSEC réservée en texte simple sans slug', () => {
        renderRow(item({ kind: 'element', name: 'Écran Au', status: 'affectee', assigned_fsec_name: 'Cible-01' }), {});
        expect(screen.getByText('Cible-01')).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('affiche la destination déclarative préfixée pour un élément disponible', () => {
        renderRow(item({ kind: 'element', name: 'Écran Au', status: 'dispo', fsec_name: 'Cible-02' }), {});
        expect(screen.getByText('destination : Cible-02')).toBeInTheDocument();
    });

    it('affiche « — » pour un consommable', () => {
        renderRow(item({ kind: 'consumable', name: 'Araldite', quantite: 3, unite: 'tubes' }), {});
        // Plusieurs tirets (type, fournisseur…) : on vérifie juste qu'aucune FSEC n'apparaît.
        expect(screen.queryByText(/destination/)).not.toBeInTheDocument();
        expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });
});

describe('CatalogTableRow — actions', () => {
    it('affiche le bouton Dupliquer et appelle onDuplicate avec l’item', async () => {
        const user = userEvent.setup();
        const onDuplicate = vi.fn();
        const row = item({ kind: 'element', name: 'Écran Au', status: 'dispo' });
        renderRow(row, { onDuplicate, onClick: vi.fn() });

        await user.click(screen.getByRole('button', { name: 'Dupliquer Écran Au' }));

        expect(onDuplicate).toHaveBeenCalledTimes(1);
        expect(onDuplicate).toHaveBeenCalledWith(row);
        expect(screen.getByRole('button', { name: 'Voir le détail de Écran Au' })).toBeInTheDocument();
    });

    it("n'affiche pas le bouton Dupliquer sans onDuplicate", () => {
        renderRow(item({ kind: 'element', name: 'Écran Au', status: 'dispo' }), { onClick: vi.fn() });
        expect(screen.queryByRole('button', { name: /dupliquer/i })).not.toBeInTheDocument();
    });
});
