/**
 * Tests FsecFaIndicator (R17) — remontée des FA d'une cible dans le header.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';
import { renderWithProviders, server } from '@test/test-utils';
import { createMockFa } from '@test/mocks/handlers';
import { FsecFaIndicator } from './FsecFaIndicator';

const VERSION = '00000000-0000-4000-8000-0000000000b1';

function LocationDisplay() {
    const location = useLocation();
    return <div data-testid="location">{location.pathname}</div>;
}

const renderIndicator = () =>
    renderWithProviders(
        <>
            <FsecFaIndicator fsecVersionUuid={VERSION} />
            <LocationDisplay />
        </>,
        { initialEntries: ['/fsec-details/cible-1/overview'] },
    );

describe('FsecFaIndicator', () => {
    let fetched: boolean;

    const mountFas = (fas: ReturnType<typeof createMockFa>[]) => {
        server.use(
            http.get(`/api/v1/fas/fsec/${VERSION}/`, () => {
                fetched = true;
                return HttpResponse.json(fas);
            }),
        );
    };

    beforeEach(() => {
        fetched = false;
    });

    it('ne rend rien sans FA', async () => {
        mountFas([]);
        renderIndicator();

        await waitFor(() => expect(fetched).toBe(true));
        expect(screen.queryByTestId('fsec-fa-indicator')).not.toBeInTheDocument();
    });

    it('une FA non close : chip « 1 FA » en erreur, clic → fiche FA', async () => {
        const user = userEvent.setup();
        mountFas([createMockFa({ fsec_version_id: VERSION, slug: 'fa-2025-0007', status_id: 0 })]);
        renderIndicator();

        const chip = await screen.findByTestId('fsec-fa-indicator');
        expect(chip).toHaveTextContent('1 FA');
        expect(chip.className).toMatch(/MuiChip-colorError/);

        await user.click(chip);
        expect(screen.getByTestId('location')).toHaveTextContent('/fa-details/fa-2025-0007');
    });

    it('plusieurs FA toutes closes : chip en avertissement + menu de navigation', async () => {
        const user = userEvent.setup();
        mountFas([
            createMockFa({
                fsec_version_id: VERSION,
                slug: 'fa-2025-0001',
                identifier: 'FA-2025-0001',
                status_id: 2,
            }),
            createMockFa({
                fsec_version_id: VERSION,
                slug: 'fa-2025-0002',
                identifier: 'FA-2025-0002',
                status_id: 2,
            }),
        ]);
        renderIndicator();

        const chip = await screen.findByTestId('fsec-fa-indicator');
        expect(chip).toHaveTextContent('2 FA');
        expect(chip.className).toMatch(/MuiChip-colorWarning/);

        await user.click(chip);
        const menu = await screen.findByRole('menu', { name: "Fiches d'anomalie de la cible" });
        expect(within(menu).getAllByRole('menuitem')).toHaveLength(2);
        expect(within(menu).getAllByText('Clos')).toHaveLength(2);

        await user.click(within(menu).getByText('FA-2025-0002'));
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/fa-details/fa-2025-0002'));
    });

    it('menu : la chip expose aria-expanded / aria-controls reflétant l’ouverture', async () => {
        const user = userEvent.setup();
        mountFas([
            createMockFa({ fsec_version_id: VERSION, slug: 'fa-a', identifier: 'FA-A', status_id: 2 }),
            createMockFa({ fsec_version_id: VERSION, slug: 'fa-b', identifier: 'FA-B', status_id: 2 }),
        ]);
        renderIndicator();

        const chip = await screen.findByTestId('fsec-fa-indicator');
        expect(chip).toHaveAttribute('aria-haspopup', 'menu');
        expect(chip).toHaveAttribute('aria-expanded', 'false');
        // Menu non monté tant qu'il est fermé : aucune référence pendante.
        expect(chip).not.toHaveAttribute('aria-controls');

        await user.click(chip);
        const menu = await screen.findByRole('menu', { name: "Fiches d'anomalie de la cible" });
        expect(chip).toHaveAttribute('aria-expanded', 'true');
        expect(menu.id).not.toBe('');
        expect(chip).toHaveAttribute('aria-controls', menu.id);

        await user.keyboard('{Escape}');
        await waitFor(() => expect(chip).toHaveAttribute('aria-expanded', 'false'));
        expect(chip).not.toHaveAttribute('aria-controls');
    });

    it('une seule FA : pas de menu, donc ni aria-haspopup ni aria-expanded', async () => {
        mountFas([createMockFa({ fsec_version_id: VERSION, slug: 'fa-solo', status_id: 0 })]);
        renderIndicator();

        const chip = await screen.findByTestId('fsec-fa-indicator');
        expect(chip).not.toHaveAttribute('aria-haspopup');
        expect(chip).not.toHaveAttribute('aria-expanded');
        expect(chip).not.toHaveAttribute('aria-controls');
    });

    it('erreur de chargement : chip « FA : erreur » explicite (distincte de « aucune FA »), relance au clic', async () => {
        const user = userEvent.setup();
        let calls = 0;
        server.use(
            http.get(`/api/v1/fas/fsec/${VERSION}/`, () => {
                calls += 1;
                // Premier appel en échec, puis une FA non close.
                if (calls === 1) {
                    return HttpResponse.json({ error: 'boom' }, { status: 500 });
                }
                return HttpResponse.json([
                    createMockFa({ fsec_version_id: VERSION, slug: 'fa-2025-0009', status_id: 0 }),
                ]);
            }),
        );
        renderIndicator();

        const errorChip = await screen.findByTestId('fsec-fa-indicator-error');
        expect(errorChip).toHaveTextContent('FA : erreur');
        expect(errorChip).toHaveAttribute(
            'aria-label',
            "Fiches d'anomalie : erreur de chargement, cliquer pour réessayer",
        );
        expect(screen.queryByTestId('fsec-fa-indicator')).not.toBeInTheDocument();

        await user.click(errorChip);

        const chip = await screen.findByTestId('fsec-fa-indicator');
        expect(chip).toHaveTextContent('1 FA');
        expect(screen.queryByTestId('fsec-fa-indicator-error')).not.toBeInTheDocument();
        expect(calls).toBe(2);
    });

    it('plusieurs FA dont une ouverte : la chip passe en erreur', async () => {
        mountFas([
            createMockFa({ fsec_version_id: VERSION, slug: 'fa-a', identifier: 'FA-A', status_id: 2 }),
            createMockFa({ fsec_version_id: VERSION, slug: 'fa-b', identifier: 'FA-B', status_id: 1 }),
        ]);
        renderIndicator();

        const chip = await screen.findByTestId('fsec-fa-indicator');
        expect(chip.className).toMatch(/MuiChip-colorError/);
    });
});
