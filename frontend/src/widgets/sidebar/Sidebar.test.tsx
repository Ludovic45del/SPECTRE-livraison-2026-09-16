/**
 * Tests du widget Sidebar.
 *
 * Cible le comportement « flyout » : quand la sidebar est repliée, cliquer sur
 * une rubrique à sous-items (Équipe et Carte, Indicateurs, Stock) n'effectue
 * plus de navigation directe mais ouvre un menu de choix ; la navigation se
 * fait au clic sur un sous-item. Les rubriques sans sous-item naviguent
 * directement.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useLocation } from 'react-router-dom';
import { setup, screen, waitFor } from '@test/test-utils';
import { Sidebar } from './Sidebar';
import { useSidebarStore } from './sidebar.store';

// La sidebar consomme useStockAlerts pour le badge « Alertes » ; on le neutralise
// ici afin d'isoler le test du flyout (pas de requête async → pas de warning act).
vi.mock('@entities/stock-item', () => ({
    useStockAlerts: () => ({ data: undefined }),
}));

// Idem pour le compteur de messages non lus (badge « Messagerie ») : mock
// contrôlable par test via `unreadCountMock`.
const unreadCountMock = vi.hoisted(() =>
    vi.fn<[], { data: { totalUnread: number } | undefined }>(() => ({ data: undefined })),
);
vi.mock('@entities/messaging', () => ({
    useUnreadCount: () => unreadCountMock(),
}));

const ROLE_LABELS = { CHEF_DE_LABO: 'Chef de labo' };

/** Affiche le pathname courant pour vérifier la navigation déclenchée. */
function LocationProbe() {
    const { pathname } = useLocation();
    return <div data-testid="pathname">{pathname}</div>;
}

function renderCollapsedSidebar() {
    return setup(
        <>
            <Sidebar roleLabels={ROLE_LABELS} />
            <LocationProbe />
        </>,
        { initialEntries: ['/'] },
    );
}

describe('Sidebar — flyout en mode replié', () => {
    beforeEach(() => {
        // Force l'état replié (collapsed) avant chaque rendu.
        useSidebarStore.setState({ isOpen: false });
    });

    afterEach(() => {
        useSidebarStore.setState({ isOpen: true });
    });

    it('ouvre un menu de choix au clic sur Stock sans naviguer', async () => {
        const { user } = renderCollapsedSidebar();

        await user.click(screen.getByRole('button', { name: 'Stock' }));

        // Le menu propose les trois sous-rubriques…
        const menu = await screen.findByRole('menu', { name: 'Stock' });
        expect(menu).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Catalogue' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Mouvements' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /Alertes/ })).toBeInTheDocument();

        // …et aucune navigation n'a eu lieu (toujours sur l'accueil).
        expect(screen.getByTestId('pathname')).toHaveTextContent('/');
    });

    it('navigue vers le sous-item choisi puis ferme le menu', async () => {
        const { user } = renderCollapsedSidebar();

        await user.click(screen.getByRole('button', { name: 'Équipe et Carte' }));
        await user.click(await screen.findByRole('menuitem', { name: 'Carte' }));

        expect(screen.getByTestId('pathname')).toHaveTextContent('/equipe/carte');
        await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    });

    it('navigue directement pour une rubrique sans sous-item', async () => {
        const { user } = renderCollapsedSidebar();

        const campagnes = screen.getByRole('button', { name: 'Campagnes' });
        expect(campagnes).not.toHaveAttribute('aria-haspopup');

        await user.click(campagnes);

        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(screen.getByTestId('pathname')).toHaveTextContent('/campagnes');
    });

    it('propose « Annuaire des labos » dans le flyout Équipe et Carte et y navigue', async () => {
        const { user } = renderCollapsedSidebar();

        await user.click(screen.getByRole('button', { name: 'Équipe et Carte' }));

        // Les trois sous-rubriques de la section (Équipe / Carte / Annuaire des labos).
        await screen.findByRole('menu', { name: 'Équipe et Carte' });
        expect(screen.getByRole('menuitem', { name: 'Équipe' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Carte' })).toBeInTheDocument();

        await user.click(screen.getByRole('menuitem', { name: 'Annuaire des labos' }));

        expect(screen.getByTestId('pathname')).toHaveTextContent('/equipe/laboratoires');
        await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    });
});

describe('Sidebar — sous-items dépliés en mode ouvert', () => {
    beforeEach(() => {
        useSidebarStore.setState({ isOpen: true });
    });

    it('déplie « Annuaire des labos » sous Équipe et Carte quand la section est active', () => {
        setup(
            <>
                <Sidebar roleLabels={ROLE_LABELS} />
                <LocationProbe />
            </>,
            { initialEntries: ['/equipe/laboratoires'] },
        );

        expect(screen.getByRole('button', { name: 'Annuaire des labos' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Équipe' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Carte' })).toBeInTheDocument();
        // Une section inactive reste repliée.
        expect(screen.queryByRole('button', { name: 'Catalogue' })).not.toBeInTheDocument();
    });
});

describe('Sidebar — badge de messages non lus', () => {
    beforeEach(() => {
        useSidebarStore.setState({ isOpen: true });
    });

    afterEach(() => {
        unreadCountMock.mockReturnValue({ data: undefined });
    });

    it('navigue vers la messagerie et n’affiche aucun badge sans non-lus', async () => {
        const { user } = setup(
            <>
                <Sidebar roleLabels={ROLE_LABELS} />
                <LocationProbe />
            </>,
            { initialEntries: ['/'] },
        );

        expect(screen.queryByLabelText(/non lus/)).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Messagerie' }));

        expect(screen.getByTestId('pathname')).toHaveTextContent('/messagerie');
    });

    it('affiche le compteur de non-lus à côté de « Messagerie » (sidebar ouverte)', () => {
        unreadCountMock.mockReturnValue({ data: { totalUnread: 3 } });

        setup(<Sidebar roleLabels={ROLE_LABELS} />, { initialEntries: ['/'] });

        const badge = screen.getByLabelText('3 non lus');
        expect(badge).toHaveTextContent('3');
        expect(screen.getByRole('button', { name: /Messagerie/ })).toContainElement(badge);
    });

    it('affiche le compteur en pastille sur l’icône (sidebar repliée)', () => {
        useSidebarStore.setState({ isOpen: false });
        unreadCountMock.mockReturnValue({ data: { totalUnread: 12 } });

        setup(<Sidebar roleLabels={ROLE_LABELS} />, { initialEntries: ['/'] });

        expect(screen.getByLabelText('12 non lus')).toHaveTextContent('12');
        useSidebarStore.setState({ isOpen: true });
    });
});
