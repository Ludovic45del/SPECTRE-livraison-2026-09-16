/**
 * Tests de la sous-page « Annuaire des labos » (numéros utiles éditables).
 *
 * Couvre :
 * - état vide (aucun seed) invitant à ajouter un contact
 * - liste en cartes triée par nom (tri numérique) + recherche plein-texte
 * - ajout via le dialog (validation nom requis, POST snake_case, notification)
 * - modification (pré-remplissage, PUT complet)
 * - suppression avec confirmation (DELETE)
 *
 * Données via les handlers MSW `/api/v1/lab-contacts/` (liste vide par défaut).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, server, setup, waitFor, within } from '@test/test-utils';
import { createMockLabContact } from '@test/mocks/handlers';
import { useNotificationStore } from '@shared/lib/notification';
import EquipeLaboratoiresPage from './laboratoires';

const LABO_426_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LABO_215_UUID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function buildContacts() {
    // Volontairement dans le désordre : la page doit trier (215 avant 426, puis 1000).
    return [
        createMockLabContact({ uuid: LABO_426_UUID, name: 'Labo 426', phone: '426', comment: 'Salle blanche' }),
        createMockLabContact({ name: 'Labo 1000', phone: '' }),
        createMockLabContact({ uuid: LABO_215_UUID, name: 'Labo 215', phone: '215' }),
    ];
}

function listHandler(contacts: ReturnType<typeof createMockLabContact>[]) {
    return http.get('/api/v1/lab-contacts/', () => HttpResponse.json(contacts));
}

describe('EquipeLaboratoiresPage', () => {
    beforeEach(() => {
        useNotificationStore.getState().clearAll();
    });

    it("affiche l'état vide invitant à ajouter un contact (aucun seed)", async () => {
        setup(<EquipeLaboratoiresPage />);

        expect(await screen.findByText('Aucun contact pour l’instant')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ajouter un contact' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: 'Annuaire des laboratoires' })).toBeInTheDocument();
    });

    it('liste les contacts en cartes, triés par nom (tri numérique)', async () => {
        server.use(listHandler(buildContacts()));

        setup(<EquipeLaboratoiresPage />);

        expect(await screen.findByText('Labo 426')).toBeInTheDocument();
        const names = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
        expect(names).toEqual(['Labo 215', 'Labo 426', 'Labo 1000']);

        expect(screen.getByText('426')).toBeInTheDocument();
        expect(screen.getByText('Salle blanche')).toBeInTheDocument();
        expect(screen.getByText('Numéro non renseigné')).toBeInTheDocument();
    });

    it('filtre les contacts via la recherche plein-texte (nom ou numéro)', async () => {
        server.use(listHandler(buildContacts()));

        const { user } = setup(<EquipeLaboratoiresPage />);
        await screen.findByText('Labo 426');

        await user.type(screen.getByLabelText('Rechercher un contact de laboratoire'), '215');

        await waitFor(() => expect(screen.queryByText('Labo 426')).not.toBeInTheDocument());
        expect(screen.getByText('Labo 215')).toBeInTheDocument();

        await user.clear(screen.getByLabelText('Rechercher un contact de laboratoire'));
        await user.type(screen.getByLabelText('Rechercher un contact de laboratoire'), 'zzz-introuvable');

        expect(await screen.findByText('Aucun contact ne correspond à votre recherche.')).toBeInTheDocument();
    });

    it('ajoute un contact via le dialog (POST snake_case + notification)', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            http.post('/api/v1/lab-contacts/', async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(createMockLabContact({ name: 'Gardiennage', phone: '9' }), { status: 201 });
            }),
        );

        const { user } = setup(<EquipeLaboratoiresPage />);
        await user.click(await screen.findByRole('button', { name: 'Ajouter un contact' }));

        const dialog = await screen.findByRole('dialog', { name: 'Nouveau contact' });
        await user.type(within(dialog).getByLabelText(/^nom/i), '  Gardiennage ');
        await user.type(within(dialog).getByLabelText(/téléphone/i), '9');
        await user.click(within(dialog).getByRole('button', { name: 'Ajouter' }));

        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nouveau contact' })).not.toBeInTheDocument());
        // Le payload est normalisé (trim) et en snake_case.
        expect(sentBody).toEqual({ name: 'Gardiennage', phone: '9', comment: '' });
        const notifications = useNotificationStore.getState().notifications;
        expect(notifications.some((n) => n.message === "Contact ajouté à l'annuaire")).toBe(true);
    });

    it('bloque la soumission sans nom (validation zod FR) et garde le dialog ouvert', async () => {
        let posted = false;
        server.use(
            http.post('/api/v1/lab-contacts/', () => {
                posted = true;
                return HttpResponse.json(createMockLabContact(), { status: 201 });
            }),
        );

        const { user } = setup(<EquipeLaboratoiresPage />);
        await user.click(await screen.findByRole('button', { name: 'Ajouter un contact' }));

        const dialog = await screen.findByRole('dialog', { name: 'Nouveau contact' });
        await user.click(within(dialog).getByRole('button', { name: 'Ajouter' }));

        expect(await within(dialog).findByText('Le nom est requis')).toBeInTheDocument();
        expect(posted).toBe(false);
        expect(screen.getByRole('dialog', { name: 'Nouveau contact' })).toBeInTheDocument();
    });

    it('modifie un contact (pré-remplissage + PUT complet)', async () => {
        let sentBody: Record<string, unknown> | null = null;
        server.use(
            listHandler(buildContacts()),
            http.put(`/api/v1/lab-contacts/${LABO_426_UUID}/`, async ({ request }) => {
                sentBody = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(
                    createMockLabContact({
                        uuid: LABO_426_UUID,
                        name: 'Labo 426',
                        phone: '4260',
                        comment: 'Salle blanche',
                    }),
                );
            }),
        );

        const { user } = setup(<EquipeLaboratoiresPage />);
        await screen.findByText('Labo 426');

        await user.click(screen.getByRole('button', { name: 'Modifier Labo 426' }));

        const dialog = await screen.findByRole('dialog', { name: 'Modifier le contact' });
        expect(within(dialog).getByLabelText(/^nom/i)).toHaveValue('Labo 426');
        expect(within(dialog).getByLabelText(/téléphone/i)).toHaveValue('426');
        expect(within(dialog).getByLabelText(/commentaire/i)).toHaveValue('Salle blanche');

        await user.clear(within(dialog).getByLabelText(/téléphone/i));
        await user.type(within(dialog).getByLabelText(/téléphone/i), '4260');
        await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: 'Modifier le contact' })).not.toBeInTheDocument(),
        );
        expect(sentBody).toEqual({ name: 'Labo 426', phone: '4260', comment: 'Salle blanche' });
        const notifications = useNotificationStore.getState().notifications;
        expect(notifications.some((n) => n.message === 'Contact modifié')).toBe(true);
    });

    it('supprime un contact après confirmation (DELETE)', async () => {
        let deletedUuid: string | null = null;
        server.use(
            listHandler(buildContacts()),
            http.delete('/api/v1/lab-contacts/:uuid/', ({ params }) => {
                deletedUuid = String(params.uuid);
                return new HttpResponse(null, { status: 204 });
            }),
        );

        const { user } = setup(<EquipeLaboratoiresPage />);
        await screen.findByText('Labo 426');

        await user.click(screen.getByRole('button', { name: 'Supprimer Labo 426' }));

        const dialog = await screen.findByRole('dialog', { name: 'Supprimer le contact ?' });
        expect(within(dialog).getByText(/Labo 426/)).toBeInTheDocument();

        await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }));

        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: 'Supprimer le contact ?' })).not.toBeInTheDocument(),
        );
        expect(deletedUuid).toBe(LABO_426_UUID);
        const notifications = useNotificationStore.getState().notifications;
        expect(notifications.some((n) => n.message === 'Contact supprimé')).toBe(true);
    });

    it("annule la suppression sans appeler l'API", async () => {
        let deleted = false;
        server.use(
            listHandler(buildContacts()),
            http.delete('/api/v1/lab-contacts/:uuid/', () => {
                deleted = true;
                return new HttpResponse(null, { status: 204 });
            }),
        );

        const { user } = setup(<EquipeLaboratoiresPage />);
        await screen.findByText('Labo 426');

        await user.click(screen.getByRole('button', { name: 'Supprimer Labo 426' }));
        const dialog = await screen.findByRole('dialog', { name: 'Supprimer le contact ?' });
        await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));

        await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: 'Supprimer le contact ?' })).not.toBeInTheDocument(),
        );
        expect(deleted).toBe(false);
        expect(screen.getByText('Labo 426')).toBeInTheDocument();
    });

    it("affiche une erreur lisible si l'annuaire ne peut pas être chargé", async () => {
        server.use(http.get('/api/v1/lab-contacts/', () => HttpResponse.json({ error: 'boom' }, { status: 500 })));

        setup(<EquipeLaboratoiresPage />);

        expect(await screen.findByRole('alert')).toHaveTextContent(/Impossible de charger l'annuaire/);
    });
});
