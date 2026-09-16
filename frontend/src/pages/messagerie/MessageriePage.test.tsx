/**
 * Tests de la page Messagerie — orchestration liste / fil pilotée par l'URL.
 *
 * Couvre :
 * - liste + emplacement vide sans sélection ;
 * - clic sur une conversation → navigation vers `/messagerie/:uuid` et fil affiché ;
 * - URL directe avec un uuid connu → fil affiché ;
 * - uuid inconnu (404 backend) → alerte « Conversation introuvable » + retour à la liste.
 *
 * Données via `messagingHandlersWithData` (MSW) ; l'utilisateur courant via
 * `createMockMeApi` (`/auth/me/`).
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { setup, screen, server, waitFor, within } from '@test/test-utils';
import {
    MOCK_ME_UUID,
    MOCK_OTHER_UUID,
    createMockConversation,
    createMockConversationMember,
    createMockMeApi,
    createMockMessage,
    messagingHandlersWithData,
} from '@test/mocks/messaging-handlers';
import MessageriePage from './index';

const CONVERSATION_UUID = '33333333-3333-4333-8333-333333333333';
const UNKNOWN_UUID = '99999999-9999-4999-8999-999999999999';

/** Affiche le pathname courant pour vérifier la navigation déclenchée. */
function LocationProbe() {
    const { pathname } = useLocation();
    return <div data-testid="pathname">{pathname}</div>;
}

/** Monte la page sur la vraie route (segment optionnel) pour exercer `useParams`. */
function renderPage(initialPath: string) {
    return setup(
        <>
            <Routes>
                <Route path="/messagerie/:conversationUuid?" element={<MessageriePage />} />
            </Routes>
            <LocationProbe />
        </>,
        { initialEntries: [initialPath] },
    );
}

const directWithMarie = () =>
    createMockConversation({
        uuid: CONVERSATION_UUID,
        kind: 'direct',
        members: [
            createMockConversationMember({ uuid: MOCK_ME_UUID, first_name: 'Pierre', last_name: 'Dupont' }),
            createMockConversationMember({ uuid: MOCK_OTHER_UUID, first_name: 'Marie', last_name: 'Martin' }),
        ],
        last_message_at: '2026-09-09T10:00:00+00:00',
        last_message: {
            uuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            author_uuid: MOCK_OTHER_UUID,
            kind: 'text',
            body: 'Bonjour Pierre',
            created_at: '2026-09-09T10:00:00+00:00',
            updated_at: '2026-09-09T10:00:00+00:00',
        },
    });

describe('MessageriePage', () => {
    beforeEach(() => {
        server.use(
            http.get('/api/v1/auth/me/', () => HttpResponse.json(createMockMeApi())),
            ...messagingHandlersWithData({
                conversations: [directWithMarie()],
                messages: [
                    createMockMessage({
                        uuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                        conversation_uuid: CONVERSATION_UUID,
                        author_uuid: MOCK_OTHER_UUID,
                        body: 'Bonjour Pierre',
                        created_at: '2026-09-09T10:00:00+00:00',
                        updated_at: '2026-09-09T10:00:00+00:00',
                    }),
                ],
            }),
        );
    });

    it('affiche la liste des conversations et l’invitation à en choisir une', async () => {
        renderPage('/messagerie');

        expect(await screen.findByText('Marie Martin')).toBeInTheDocument();
        expect(screen.getByText('Sélectionnez une conversation ou créez-en une nouvelle')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: 'Messagerie' })).toBeInTheDocument();
    });

    it('ouvre le fil au clic sur une conversation (URL mise à jour)', async () => {
        const { user } = renderPage('/messagerie');

        await user.click(await screen.findByText('Marie Martin'));

        expect(screen.getByTestId('pathname')).toHaveTextContent(`/messagerie/${CONVERSATION_UUID}`);
        const log = await screen.findByRole('log', { name: 'Messages' });
        expect(await within(log).findByText('Bonjour Pierre')).toBeInTheDocument();
        expect(screen.queryByText('Sélectionnez une conversation ou créez-en une nouvelle')).not.toBeInTheDocument();
    });

    it('affiche directement le fil pour une URL profonde', async () => {
        renderPage(`/messagerie/${CONVERSATION_UUID}`);

        const log = await screen.findByRole('log', { name: 'Messages' });
        expect(await within(log).findByText('Bonjour Pierre')).toBeInTheDocument();
        expect(screen.getByLabelText('Nouveau message')).toBeInTheDocument();
    });

    it('signale une conversation introuvable et permet de revenir à la liste', async () => {
        const { user } = renderPage(`/messagerie/${UNKNOWN_UUID}`);

        expect(await screen.findByText('Conversation introuvable')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Retour à la liste' }));

        await waitFor(() => expect(screen.getByTestId('pathname')).toHaveTextContent('/messagerie'));
        expect(screen.getByTestId('pathname')).not.toHaveTextContent(UNKNOWN_UUID);
    });

    it('recherche un message et ouvre la conversation du résultat', async () => {
        const { user } = renderPage('/messagerie');
        await screen.findByText('Marie Martin');

        await user.click(screen.getByRole('button', { name: 'Rechercher dans les messages' }));
        const dialog = await screen.findByRole('dialog');
        await user.type(within(dialog).getByRole('textbox'), 'Bonjour');

        await user.click(await within(dialog).findByRole('button', { name: /Ouvrir la conversation/ }));

        await waitFor(() =>
            expect(screen.getByTestId('pathname')).toHaveTextContent(`/messagerie/${CONVERSATION_UUID}`),
        );
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('ouvre le dialogue de création depuis la liste', async () => {
        const { user } = renderPage('/messagerie');
        await screen.findByText('Marie Martin');

        await user.click(screen.getByRole('button', { name: 'Nouvelle conversation' }));

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });
});
