/**
 * Tests RequestedViewsSection (R08) — édition inline des vues demandées.
 *
 * Le composant est rendu via `useFsec` (comme dans PicturesTab) pour vérifier
 * que la réponse du PATCH dédié est bien écrite dans le cache détail et que
 * l'affichage se rafraîchit sans refetch.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { createMockFsec } from '@test/mocks/handlers';
import { useFsec } from '@entities/fsec';
import { RequestedViewsSection } from './RequestedViewsSection';

const VERSION = '00000000-0000-4000-8000-0000000000a1';

function Harness() {
    const { data } = useFsec(VERSION);
    return data ? <RequestedViewsSection fsec={data} /> : null;
}

const EMPTY_TEXT = /Aucune vue demandée pour le moment/;

describe('RequestedViewsSection', () => {
    let patchBodies: Array<Record<string, unknown>>;
    let getCount: number;

    const mountServer = (requestedViews: string | null) => {
        const fsec = createMockFsec({
            version_uuid: VERSION,
            requested_views: requestedViews,
            last_updated: null,
            created_at: null,
        });
        server.use(
            http.get(`/api/v1/fsecs/${VERSION}/`, () => {
                getCount += 1;
                return HttpResponse.json(fsec);
            }),
            http.patch(`/api/v1/fsecs/${VERSION}/requested-views/`, async ({ request }) => {
                const body = (await request.json()) as Record<string, unknown>;
                patchBodies.push(body);
                return HttpResponse.json({ ...fsec, requested_views: body.requested_views ?? null });
            }),
        );
    };

    beforeEach(() => {
        patchBodies = [];
        getCount = 0;
    });

    it('affiche un état vide et le bouton d’édition sans session photo', async () => {
        mountServer(null);
        renderWithProviders(<Harness />);

        expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Modifier les vues demandées' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
    });

    it('expose une région nommée par son titre visible (accessibilité)', async () => {
        mountServer(null);
        renderWithProviders(<Harness />);

        const region = await screen.findByRole('region', { name: 'Vues demandées' });
        expect(region.tagName).toBe('SECTION');
        // Le nom provient du titre (aria-labelledby), pas d'un aria-label posé sur un div générique.
        expect(region).not.toHaveAttribute('aria-label');
        const titleId = region.getAttribute('aria-labelledby');
        expect(titleId).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Vues demandées' })).toHaveAttribute('id', titleId);
    });

    it('affiche le texte existant en conservant les retours à la ligne', async () => {
        mountServer('Vue de face\nVue de dessus');
        renderWithProviders(<Harness />);

        const text = await screen.findByText((_, el) => el?.textContent === 'Vue de face\nVue de dessus');
        expect(text).toHaveStyle({ whiteSpace: 'pre-wrap' });
    });

    it('édite, enregistre via PATCH dédié et rafraîchit l’affichage sans refetch', async () => {
        mountServer(null);
        const user = userEvent.setup();
        renderWithProviders(<Harness />);
        await screen.findByText(EMPTY_TEXT);
        const getsAfterLoad = getCount;

        await user.click(screen.getByRole('button', { name: 'Modifier les vues demandées' }));
        const input = screen.getByRole('textbox', { name: 'Vues demandées' });
        // Bouton Enregistrer inactif tant que rien n'a changé.
        expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();

        await user.type(input, 'Vue de face, zoom sur le joint');
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => expect(patchBodies).toHaveLength(1));
        expect(patchBodies[0]).toEqual({ requested_views: 'Vue de face, zoom sur le joint' });

        // Retour en lecture avec la nouvelle valeur, issue du cache (pas de GET).
        expect(await screen.findByText('Vue de face, zoom sur le joint')).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: 'Vues demandées' })).not.toBeInTheDocument();
        expect(getCount).toBe(getsAfterLoad);
    });

    it('efface la valeur en envoyant null quand le texte est vidé', async () => {
        mountServer('À effacer');
        const user = userEvent.setup();
        renderWithProviders(<Harness />);
        await screen.findByText('À effacer');

        await user.click(screen.getByRole('button', { name: 'Modifier les vues demandées' }));
        await user.clear(screen.getByRole('textbox', { name: 'Vues demandées' }));
        await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() => expect(patchBodies).toHaveLength(1));
        expect(patchBodies[0]).toEqual({ requested_views: null });
        expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument();
    });

    it('annuler restaure la valeur initiale sans appel réseau', async () => {
        mountServer('Valeur initiale');
        const user = userEvent.setup();
        renderWithProviders(<Harness />);
        await screen.findByText('Valeur initiale');

        await user.click(screen.getByRole('button', { name: 'Modifier les vues demandées' }));
        await user.type(screen.getByRole('textbox', { name: 'Vues demandées' }), ' modifiée');
        await user.click(screen.getByRole('button', { name: 'Annuler' }));

        expect(screen.getByText('Valeur initiale')).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: 'Vues demandées' })).not.toBeInTheDocument();
        expect(patchBodies).toHaveLength(0);
    });
});
