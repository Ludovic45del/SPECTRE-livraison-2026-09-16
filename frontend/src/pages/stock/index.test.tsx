/**
 * Tests de la page Stock — redirection '/stock' → '/stock/catalogue' (R04).
 * @module pages/stock
 */
import { describe, it, expect, vi } from 'vitest';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders, screen } from '@test/test-utils';
import StockPage from './index';

// Les onglets tirent tout le module stock (queries, tableaux…) : on les
// neutralise pour isoler le test du routage.
vi.mock('./catalogue', () => ({
    CatalogTab: () => <div data-testid="catalog-tab">Catalogue</div>,
}));
vi.mock('./mouvements', () => ({
    MovementsTab: () => <div data-testid="movements-tab">Mouvements</div>,
}));
vi.mock('./alertes', () => ({
    AlertsTab: () => <div data-testid="alerts-tab">Alertes</div>,
}));

/** Affiche le pathname courant pour vérifier la redirection. */
function LocationProbe() {
    const { pathname } = useLocation();
    return <div data-testid="pathname">{pathname}</div>;
}

function renderStockAt(initialPath: string) {
    return renderWithProviders(
        <>
            <Routes>
                <Route path="/stock/*" element={<StockPage />} />
            </Routes>
            <LocationProbe />
        </>,
        { initialEntries: [initialPath] },
    );
}

describe('StockPage — redirection du chemin nu', () => {
    it("redirige '/stock' vers '/stock/catalogue' et affiche le catalogue", () => {
        renderStockAt('/stock');

        expect(screen.getByTestId('pathname')).toHaveTextContent('/stock/catalogue');
        expect(screen.getByTestId('catalog-tab')).toBeInTheDocument();
    });

    it("redirige aussi '/stock/' (slash final hérité)", () => {
        renderStockAt('/stock/');

        expect(screen.getByTestId('pathname')).toHaveTextContent('/stock/catalogue');
    });

    it("n'altère pas les sous-chemins existants ('/stock/mouvements')", () => {
        renderStockAt('/stock/mouvements');

        expect(screen.getByTestId('pathname')).toHaveTextContent('/stock/mouvements');
        expect(screen.getByTestId('movements-tab')).toBeInTheDocument();
    });

    it("n'altère pas '/stock/alertes'", () => {
        renderStockAt('/stock/alertes');

        expect(screen.getByTestId('pathname')).toHaveTextContent('/stock/alertes');
        expect(screen.getByTestId('alerts-tab')).toBeInTheDocument();
    });
});
