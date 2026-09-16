/**
 * Tests MessageSearchDialog — aide sous le seuil de 2 caractères (aucune
 * requête), requête GET search/?q=&limit= après debounce, résultats en cartes
 * (auteur, conversation, extrait), état vide « Aucun message ne correspond »,
 * erreur, « Ouvrir la conversation » (onClose puis onOpenConversation), bouton
 * « Effacer la recherche », fermeture, réinitialisation à la réouverture.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { setup, server, wait } from '@test/test-utils';
import {
    MOCK_OTHER_UUID,
    createMockConversation,
    createMockConversationMember,
    createMockMeApi,
    createMockMention,
    createMockMessage,
    createMockUserSummary,
} from '@test/mocks/messaging-handlers';
import { MessageSearchDialog } from './MessageSearchDialog';

const CONVERSATION_UUID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const GROUP_UUID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

/** Délai de debounce du dialogue (300 ms) + marge : « aucune requête » est vérifié après ce délai. */
const DEBOUNCE_SETTLE_MS = 450;

/** Laisse passer le debounce (sa mise à jour d'état est englobée dans `act`). */
const settleDebounce = () => act(() => wait(DEBOUNCE_SETTLE_MS));

const marie = () =>
    createMockUserSummary({ uuid: MOCK_OTHER_UUID, username: 'mmartin', first_name: 'Marie', last_name: 'Martin' });

/** Deux résultats : Marie dans la privée, moi dans un groupe. */
function buildResults() {
    const direct = createMockConversation({ uuid: CONVERSATION_UUID });
    const group = createMockConversation({
        uuid: GROUP_UUID,
        kind: 'group',
        name: 'Prépa tir 42',
        members: [createMockConversationMember(), createMockConversationMember(marie())],
    });
    return [
        createMockMention({
            conversation: direct,
            message: createMockMessage({
                conversation_uuid: CONVERSATION_UUID,
                author_uuid: MOCK_OTHER_UUID,
                author: marie(),
                body: 'Le rapport est prêt',
                created_at: '2020-03-05T10:00:00Z',
            }),
        }),
        createMockMention({
            conversation: group,
            message: createMockMessage({
                conversation_uuid: GROUP_UUID,
                body: 'Rapport envoyé au client',
                created_at: '2020-03-04T10:00:00Z',
            }),
        }),
    ];
}

/** Sert `me` + la recherche (résultats fixes) ; renvoie les URLs interrogées. */
function seedSearch(results: ReturnType<typeof createMockMention>[]) {
    const urls: string[] = [];
    server.use(
        http.get('/api/v1/auth/me/', () => HttpResponse.json(createMockMeApi())),
        http.get('/api/v1/conversations/search/', ({ request }) => {
            urls.push(request.url);
            return HttpResponse.json({ results });
        }),
    );
    return urls;
}

function renderDialog(open = true) {
    const onClose = vi.fn();
    const onOpenConversation = vi.fn();
    const utils = setup(<MessageSearchDialog open={open} onClose={onClose} onOpenConversation={onOpenConversation} />);
    return { ...utils, onClose, onOpenConversation };
}

const findDialog = () => screen.findByRole('dialog', { name: 'Rechercher dans les messages' });
const getInput = () => screen.getByRole('textbox', { name: 'Rechercher dans les messages' });
const findResults = () => screen.findByRole('list', { name: 'Résultats de la recherche' }, { timeout: 3000 });

describe('MessageSearchDialog', () => {
    afterEach(() => {
        server.events.removeAllListeners();
    });

    it('affiche le champ (autoFocus, maxLength) et l’invite de saisie sans requête', async () => {
        const urls = seedSearch([]);
        renderDialog();

        const dialog = await findDialog();
        const input = getInput();
        expect(input).toHaveFocus();
        expect(input).toHaveAttribute('maxlength', '100');
        expect(within(dialog).getByText('Saisissez un mot ou une expression à rechercher')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Effacer la recherche' })).not.toBeInTheDocument();

        await settleDebounce();
        expect(urls).toHaveLength(0);
    });

    it('ne rend rien quand open=false', () => {
        seedSearch([]);
        renderDialog(false);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('sous 2 caractères : aide « Au moins 2 caractères » et aucune requête', async () => {
        const urls = seedSearch([]);
        const { user } = renderDialog();

        await findDialog();
        await user.type(getInput(), 'a');

        expect(screen.getAllByText('Au moins 2 caractères').length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByRole('status', { name: 'Recherche en cours' })).not.toBeInTheDocument();

        await settleDebounce();
        expect(urls).toHaveLength(0);
        expect(screen.queryByRole('list', { name: 'Résultats de la recherche' })).not.toBeInTheDocument();
    });

    it('des espaces seuls ne déclenchent pas de recherche', async () => {
        const urls = seedSearch([]);
        const { user } = renderDialog();

        await findDialog();
        await user.type(getInput(), '   ');

        await settleDebounce();
        expect(urls).toHaveLength(0);
        expect(screen.getByText('Saisissez un mot ou une expression à rechercher')).toBeInTheDocument();
    });

    it('à partir de 2 caractères : GET search/?q=&limit= après debounce, résultats en cartes', async () => {
        const urls = seedSearch(buildResults());
        const { user } = renderDialog();

        await findDialog();
        await user.type(getInput(), 'rapport');

        const list = await findResults();
        await waitFor(() => expect(urls.length).toBeGreaterThanOrEqual(1));
        const params = new URL(urls[urls.length - 1]).searchParams;
        expect(params.get('q')).toBe('rapport');
        expect(params.get('limit')).toBe('20');
        // Le debounce a regroupé la frappe : pas une requête par caractère.
        expect(urls.length).toBeLessThan('rapport'.length);

        const items = within(list).getAllByRole('listitem');
        expect(items).toHaveLength(2);
        expect(within(items[0]).getByText('Marie Martin')).toBeInTheDocument();
        expect(within(items[0]).getByText('dans Marie Martin')).toBeInTheDocument();
        expect(within(items[0]).getByText('Le rapport est prêt')).toBeInTheDocument();
        expect(within(items[1]).getByText('Pierre Dupont')).toBeInTheDocument();
        expect(within(items[1]).getByText('dans Prépa tir 42')).toBeInTheDocument();
        expect(within(items[1]).getByText('Rapport envoyé au client')).toBeInTheDocument();
        // Les cartes du dialogue pilotent la navigation via le parent : boutons, pas de liens.
        expect(within(list).getAllByRole('button', { name: 'Ouvrir la conversation' })).toHaveLength(2);
        expect(within(list).queryByRole('link', { name: 'Ouvrir la conversation' })).not.toBeInTheDocument();
    });

    it('affiche « Aucun message ne correspond » quand la recherche ne renvoie rien', async () => {
        seedSearch([]);
        const { user } = renderDialog();

        await findDialog();
        await user.type(getInput(), 'introuvable');

        expect(await screen.findByText('Aucun message ne correspond', {}, { timeout: 3000 })).toBeInTheDocument();
        expect(screen.queryByRole('list', { name: 'Résultats de la recherche' })).not.toBeInTheDocument();
    });

    it('affiche une alerte quand la recherche échoue', async () => {
        server.use(
            http.get('/api/v1/auth/me/', () => HttpResponse.json(createMockMeApi())),
            http.get('/api/v1/conversations/search/', () => new HttpResponse(null, { status: 500 })),
        );
        const { user } = renderDialog();

        await findDialog();
        await user.type(getInput(), 'rapport');

        expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent(
            'Impossible de rechercher dans les messages',
        );
    });

    it('« Ouvrir la conversation » ferme le dialogue puis appelle onOpenConversation(uuid)', async () => {
        seedSearch(buildResults());
        const { user, onClose, onOpenConversation } = renderDialog();

        await findDialog();
        await user.type(getInput(), 'rapport');
        const list = await findResults();
        const [, groupItem] = within(list).getAllByRole('listitem');

        await user.click(within(groupItem).getByRole('button', { name: 'Ouvrir la conversation' }));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onOpenConversation).toHaveBeenCalledTimes(1);
        expect(onOpenConversation).toHaveBeenCalledWith(GROUP_UUID);
        // Fermeture avant navigation.
        expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(onOpenConversation.mock.invocationCallOrder[0]);
    });

    it('« Effacer la recherche » vide le champ et retire les résultats', async () => {
        seedSearch(buildResults());
        const { user } = renderDialog();

        await findDialog();
        await user.type(getInput(), 'rapport');
        await findResults();

        await user.click(screen.getByRole('button', { name: 'Effacer la recherche' }));

        expect(getInput()).toHaveValue('');
        expect(screen.queryByRole('list', { name: 'Résultats de la recherche' })).not.toBeInTheDocument();
        expect(screen.getByText('Saisissez un mot ou une expression à rechercher')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Effacer la recherche' })).not.toBeInTheDocument();
    });

    it('le bouton « Fermer » appelle onClose sans ouvrir de conversation', async () => {
        seedSearch([]);
        const { user, onClose, onOpenConversation } = renderDialog();

        await findDialog();
        await user.click(screen.getByRole('button', { name: 'Fermer' }));

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onOpenConversation).not.toHaveBeenCalled();
    });

    it('réinitialise la recherche à la réouverture', async () => {
        seedSearch(buildResults());
        const { user, onClose, onOpenConversation, rerender } = renderDialog();

        await findDialog();
        await user.type(getInput(), 'rapport');
        await findResults();

        rerender(<MessageSearchDialog open={false} onClose={onClose} onOpenConversation={onOpenConversation} />);
        rerender(<MessageSearchDialog open onClose={onClose} onOpenConversation={onOpenConversation} />);

        await findDialog();
        await waitFor(() => expect(getInput()).toHaveValue(''));
        expect(screen.queryByRole('list', { name: 'Résultats de la recherche' })).not.toBeInTheDocument();
        expect(screen.getByText('Saisissez un mot ou une expression à rechercher')).toBeInTheDocument();
    });
});
