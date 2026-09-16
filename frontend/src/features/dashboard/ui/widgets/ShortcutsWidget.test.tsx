/**
 * Tests du widget Raccourcis (R05 : noms longs lisibles, R10 : copier le lien).
 * @module features/dashboard/ui/widgets
 */
import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { setup, screen, waitFor, fireEvent } from '@test/test-utils';
import { useNotificationStore } from '@shared/lib/notification';
import { useDashboardStore } from '../../model/dashboard.store';
import ShortcutsWidget from './ShortcutsWidget';

const NETWORK_LABEL = 'Dossier photos campagne — nom particulièrement long';
const NETWORK_URL = '\\\\serveur\\partage\\photos';
const HTTP_LABEL = 'Intranet';
const HTTP_URL = 'https://intranet.example.com';

const { copyToClipboardMock, mutateSpy } = vi.hoisted(() => ({
    copyToClipboardMock: vi.fn<[string], Promise<boolean>>(),
    mutateSpy: vi.fn(),
}));

// Préférences mockées : un raccourci chemin réseau + un raccourci https.
vi.mock('@entities/dashboard-preferences', () => ({
    useDashboardPreferences: () => ({
        data: {
            layout: [],
            widgets: {},
            todos: [],
            shortcuts: [
                {
                    id: 's1',
                    label: 'Dossier photos campagne — nom particulièrement long',
                    url: '\\\\serveur\\partage\\photos',
                    icon: 'folder',
                    category: 'Partages',
                },
                {
                    id: 's2',
                    label: 'Intranet',
                    url: 'https://intranet.example.com',
                    icon: 'link',
                    category: 'Web',
                },
            ],
        },
    }),
    useUpdateDashboardPreferences: () => ({ mutate: mutateSpy }),
}));

// On mocke uniquement copyToClipboard, le reste de @shared/lib est réel.
vi.mock('@shared/lib', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shared/lib')>();
    return { ...actual, copyToClipboard: copyToClipboardMock };
});

describe('ShortcutsWidget', () => {
    let openSpy: MockInstance;

    beforeEach(() => {
        copyToClipboardMock.mockReset().mockResolvedValue(true);
        mutateSpy.mockReset();
        useNotificationStore.getState().clearAll();
        useDashboardStore.setState({ isEditMode: false, draftPrefs: null, snapshotPrefs: null });
        openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    });

    afterEach(() => {
        openSpy.mockRestore();
    });

    it('affiche le libellé complet dans le DOM (la troncature est purement CSS)', () => {
        setup(<ShortcutsWidget />);

        expect(screen.getByText(NETWORK_LABEL)).toBeInTheDocument();
    });

    it('copie le chemin BRUT au clic sur un raccourci réseau, sans window.open', async () => {
        const { user } = setup(<ShortcutsWidget />);

        await user.click(screen.getByRole('button', { name: NETWORK_LABEL }));

        expect(copyToClipboardMock).toHaveBeenCalledWith(NETWORK_URL);
        expect(openSpy).not.toHaveBeenCalled();
        // Notification explicative (le navigateur bloque l'ouverture file://).
        await waitFor(() => {
            const messages = useNotificationStore.getState().notifications.map((n) => n.message);
            expect(messages.some((m) => m.includes('Chemin copié'))).toBe(true);
        });
    });

    it('notifie une erreur si la copie du chemin réseau échoue', async () => {
        copyToClipboardMock.mockResolvedValue(false);
        const { user } = setup(<ShortcutsWidget />);

        await user.click(screen.getByRole('button', { name: NETWORK_LABEL }));

        await waitFor(() => {
            const notifs = useNotificationStore.getState().notifications;
            expect(notifs.some((n) => n.type === 'error')).toBe(true);
        });
        expect(openSpy).not.toHaveBeenCalled();
    });

    it('ouvre un nouvel onglet au clic sur un raccourci https (comportement inchangé)', async () => {
        const { user } = setup(<ShortcutsWidget />);

        await user.click(screen.getByRole('button', { name: HTTP_LABEL }));

        expect(openSpy).toHaveBeenCalledWith(HTTP_URL, '_blank');
        expect(copyToClipboardMock).not.toHaveBeenCalled();
    });

    it('offre un bouton « Copier le lien » pour TOUS les raccourcis (https inclus)', async () => {
        setup(<ShortcutsWidget />);

        // Le bouton est révélé au survol via CSS (:hover) — jsdom n'applique
        // pas les pseudo-classes, on déclenche donc le clic via fireEvent.
        fireEvent.click(screen.getByRole('button', { name: `Copier le lien de ${HTTP_LABEL}` }));

        expect(copyToClipboardMock).toHaveBeenCalledWith(HTTP_URL);
        // Le clic sur le bouton de copie ne doit pas ouvrir le lien.
        expect(openSpy).not.toHaveBeenCalled();
        await waitFor(() => {
            const messages = useNotificationStore.getState().notifications.map((n) => n.message);
            expect(messages).toContain('Lien copié');
        });
    });

    it('le tooltip porte « label — url » (nom complet accessible au survol)', async () => {
        const { user } = setup(<ShortcutsWidget />);

        await user.hover(screen.getByRole('button', { name: HTTP_LABEL }));

        expect(await screen.findByText(`${HTTP_LABEL} — ${HTTP_URL}`)).toBeInTheDocument();
    });

    it("le tooltip d'un chemin réseau annonce la copie au clic", async () => {
        const { user } = setup(<ShortcutsWidget />);

        await user.hover(screen.getByRole('button', { name: NETWORK_LABEL }));

        expect(await screen.findByText(/clic : copier le chemin/)).toBeInTheDocument();
    });
});
