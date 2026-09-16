/**
 * Tests ConversationList — rendu des items (titre privée / groupe, badge non
 * lus, aperçu « Vous : », aperçu système en italique, horodatage), filtre de
 * recherche, états chargement / erreur / vide, callbacks onSelect / onCreate.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';

import { setup } from '@test/test-utils';
import {
    MOCK_ME_UUID,
    MOCK_OTHER_UUID,
    createMockConversation,
    createMockConversationMember,
    createMockUserSummary,
} from '@test/mocks/messaging-handlers';
import { ConversationListSchema, ConversationSchema, type Conversation } from '@entities/messaging';
import { ConversationList } from './ConversationList';

const THIRD_UUID = '33333333-3333-3333-3333-333333333333';
const DIRECT_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const GROUP_UUID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const EMPTY_UUID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

/** Aperçu (`last_message`) snake_case. */
const preview = (overrides: Record<string, unknown> = {}) => ({
    uuid: crypto.randomUUID(),
    author_uuid: MOCK_OTHER_UUID as string | null,
    kind: 'text',
    body: 'Salut Pierre',
    created_at: '2020-03-05T10:00:00Z',
    updated_at: '2020-03-05T10:00:00Z',
    ...overrides,
});

/** Jeu de données : une privée (2 non-lus, Marie écrit), un groupe (Vous : …), une vide. */
function buildConversations(): Conversation[] {
    return ConversationListSchema.parse([
        createMockConversation({
            uuid: DIRECT_UUID,
            unread_count: 2,
            last_message_at: '2020-03-05T10:00:00Z',
            last_message: preview({ body: 'Salut Pierre' }),
        }),
        createMockConversation({
            uuid: GROUP_UUID,
            kind: 'group',
            name: 'Prépa tir 42',
            members: [
                createMockConversationMember(),
                createMockConversationMember(createMockUserSummary({ uuid: MOCK_OTHER_UUID, username: 'mmartin' })),
                createMockConversationMember(createMockUserSummary({ uuid: THIRD_UUID, username: 'jbernard' })),
            ],
            last_message_at: '2020-03-04T09:00:00Z',
            last_message: preview({ author_uuid: MOCK_ME_UUID, body: 'On se voit demain' }),
        }),
        createMockConversation({ uuid: EMPTY_UUID, kind: 'group', name: 'Groupe vide' }),
    ]);
}

const baseProps = {
    selectedUuid: null,
    onSelect: vi.fn(),
    onCreate: vi.fn(),
    isLoading: false,
    isError: false,
    meUuid: MOCK_ME_UUID,
};

describe('ConversationList', () => {
    it("affiche l'en-tête (titre, bouton nouvelle conversation, recherche)", () => {
        setup(<ConversationList {...baseProps} conversations={[]} />);

        expect(screen.getByRole('heading', { name: 'Messagerie' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Nouvelle conversation' })).toBeInTheDocument();
        expect(screen.getByLabelText('Rechercher une conversation')).toBeInTheDocument();
    });

    it("affiche le titre d'une privée (autre membre) et le nom d'un groupe", () => {
        setup(<ConversationList {...baseProps} conversations={buildConversations()} />);

        const list = screen.getByRole('list', { name: 'Liste des conversations' });
        expect(within(list).getByText('Marie Martin')).toBeInTheDocument();
        expect(within(list).getByText('Prépa tir 42')).toBeInTheDocument();
        expect(within(list).getByText('Groupe vide')).toBeInTheDocument();
        // Titre privée = l'autre membre : mon propre nom n'est jamais un titre.
        expect(within(list).queryByText('Pierre Dupont')).not.toBeInTheDocument();
    });

    it('affiche le badge des non-lus et met le titre en gras', () => {
        setup(<ConversationList {...baseProps} conversations={buildConversations()} />);

        const badge = screen.getByLabelText('2 non lus');
        expect(badge).toHaveTextContent('2');
        expect(screen.getByText('Marie Martin')).toHaveStyle({ fontWeight: 700 });
        expect(screen.getByText('Prépa tir 42')).not.toHaveStyle({ fontWeight: 700 });
        expect(screen.queryByLabelText(/^0 non lus/)).not.toBeInTheDocument();
    });

    it("préfixe l'aperçu par « Vous : » quand je suis l'auteur, pas sinon", () => {
        setup(<ConversationList {...baseProps} conversations={buildConversations()} />);

        expect(screen.getByText('Vous : On se voit demain')).toBeInTheDocument();
        expect(screen.getByText('Salut Pierre')).toBeInTheDocument();
        expect(screen.queryByText('Vous : Salut Pierre')).not.toBeInTheDocument();
    });

    it('affiche « Aucun message » pour une conversation sans message', () => {
        setup(<ConversationList {...baseProps} conversations={buildConversations()} />);
        expect(screen.getByText('Aucun message')).toBeInTheDocument();
    });

    it("affiche l'aperçu d'un message système en italique, sans préfixe « Vous : »", () => {
        const conversations = ConversationListSchema.parse([
            createMockConversation({
                uuid: GROUP_UUID,
                kind: 'group',
                name: 'Prépa tir 42',
                last_message_at: '2020-03-05T10:00:00Z',
                last_message: preview({
                    kind: 'system',
                    author_uuid: MOCK_ME_UUID,
                    body: 'Pierre Dupont a ajouté Marie Martin',
                }),
            }),
        ]);
        setup(<ConversationList {...baseProps} conversations={conversations} />);

        const previewText = screen.getByText('Pierre Dupont a ajouté Marie Martin');
        expect(previewText).toHaveStyle({ fontStyle: 'italic' });
        expect(screen.queryByText(/^Vous :/)).not.toBeInTheDocument();
    });

    it("affiche l'horodatage compact du dernier message (année différente → DD/MM/YYYY)", () => {
        setup(<ConversationList {...baseProps} conversations={buildConversations()} />);

        expect(screen.getByText('05/03/2020')).toBeInTheDocument();
        expect(screen.getByText('04/03/2020')).toBeInTheDocument();
    });

    it("affiche l'avatar de l'autre membre pour une privée (photo si disponible)", () => {
        const conversations = ConversationListSchema.parse([
            createMockConversation({
                uuid: DIRECT_UUID,
                members: [
                    createMockConversationMember(),
                    createMockConversationMember(
                        createMockUserSummary({
                            uuid: MOCK_OTHER_UUID,
                            first_name: 'Marie',
                            last_name: 'Martin',
                            avatar_url: '/media/avatars/marie.png',
                        }),
                    ),
                ],
            }),
        ]);
        setup(<ConversationList {...baseProps} conversations={conversations} />);

        const button = screen.getByRole('button', { name: /Marie Martin/ });
        expect(within(button).getByRole('presentation')).toHaveAttribute('src', '/media/avatars/marie.png');
    });

    it('filtre la liste sur le titre et sur l’aperçu (insensible à la casse)', async () => {
        const { user } = setup(<ConversationList {...baseProps} conversations={buildConversations()} />);
        const search = screen.getByLabelText('Rechercher une conversation');

        await user.type(search, 'PRÉPA');
        expect(screen.getByText('Prépa tir 42')).toBeInTheDocument();
        expect(screen.queryByText('Marie Martin')).not.toBeInTheDocument();
        expect(screen.queryByText('Groupe vide')).not.toBeInTheDocument();

        await user.clear(search);
        await user.type(search, 'salut');
        expect(screen.getByText('Marie Martin')).toBeInTheDocument();
        expect(screen.queryByText('Prépa tir 42')).not.toBeInTheDocument();
    });

    it('affiche « Aucune conversation ne correspond » quand la recherche ne trouve rien', async () => {
        const { user } = setup(<ConversationList {...baseProps} conversations={buildConversations()} />);

        await user.type(screen.getByLabelText('Rechercher une conversation'), 'zzz-introuvable');

        expect(screen.getByText('Aucune conversation ne correspond')).toBeInTheDocument();
        expect(screen.queryByRole('list', { name: 'Liste des conversations' })).not.toBeInTheDocument();
    });

    it('affiche les squelettes pendant le chargement', () => {
        setup(<ConversationList {...baseProps} conversations={[]} isLoading />);

        expect(screen.getByRole('status', { name: 'Chargement des conversations' })).toBeInTheDocument();
        expect(screen.queryByText(/Aucune conversation/)).not.toBeInTheDocument();
    });

    it("affiche une alerte en cas d'erreur", () => {
        setup(<ConversationList {...baseProps} conversations={[]} isError />);

        expect(screen.getByRole('alert')).toHaveTextContent('Impossible de charger les conversations');
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it("affiche l'état vide quand il n'y a aucune conversation", () => {
        setup(<ConversationList {...baseProps} conversations={[]} />);

        expect(screen.getByText('Aucune conversation. Démarrez-en une avec le bouton +')).toBeInTheDocument();
    });

    it('appelle onSelect avec l’uuid au clic sur une conversation', async () => {
        const onSelect = vi.fn();
        const { user } = setup(
            <ConversationList {...baseProps} conversations={buildConversations()} onSelect={onSelect} />,
        );

        await user.click(screen.getByRole('button', { name: /Prépa tir 42/ }));

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(GROUP_UUID);
    });

    it('marque la conversation sélectionnée (aria-current)', () => {
        setup(<ConversationList {...baseProps} conversations={buildConversations()} selectedUuid={DIRECT_UUID} />);

        expect(screen.getByRole('button', { name: /Marie Martin/ })).toHaveAttribute('aria-current', 'true');
        expect(screen.getByRole('button', { name: /Prépa tir 42/ })).not.toHaveAttribute('aria-current');
    });

    it('appelle onCreate au clic sur « Nouvelle conversation »', async () => {
        const onCreate = vi.fn();
        const { user } = setup(<ConversationList {...baseProps} conversations={[]} onCreate={onCreate} />);

        await user.click(screen.getByRole('button', { name: 'Nouvelle conversation' }));

        expect(onCreate).toHaveBeenCalledTimes(1);
    });

    it('reste affichable sans utilisateur courant (meUuid null : titre de repli, pas de « Vous : »)', () => {
        const conversation = ConversationSchema.parse(
            createMockConversation({
                uuid: DIRECT_UUID,
                last_message_at: '2020-03-05T10:00:00Z',
                last_message: preview({ author_uuid: MOCK_ME_UUID, body: 'Bonjour' }),
            }),
        );
        setup(<ConversationList {...baseProps} conversations={[conversation]} meUuid={null} />);

        // Sans meUuid, « l'autre membre » est le premier membre ≠ '' : Pierre Dupont.
        expect(screen.getByText('Pierre Dupont')).toBeInTheDocument();
        expect(screen.getByText('Bonjour')).toBeInTheDocument();
        expect(screen.queryByText('Vous : Bonjour')).not.toBeInTheDocument();
    });

    it("suffixe l'aperçu par le nombre de références du dernier message (singulier / pluriel)", () => {
        const conversations = ConversationListSchema.parse([
            createMockConversation({
                uuid: DIRECT_UUID,
                last_message_at: '2020-03-05T10:00:00Z',
                last_message: preview({ body: 'Salut Pierre', entity_ref_count: 1 }),
            }),
            createMockConversation({
                uuid: GROUP_UUID,
                kind: 'group',
                name: 'Prépa tir 42',
                last_message_at: '2020-03-04T09:00:00Z',
                last_message: preview({ author_uuid: MOCK_ME_UUID, body: 'Trois refs', entity_ref_count: 3 }),
            }),
        ]);
        setup(<ConversationList {...baseProps} conversations={conversations} />);

        expect(screen.getByText('Salut Pierre · 1 référence')).toBeInTheDocument();
        expect(screen.getByText('Vous : Trois refs · 3 références')).toBeInTheDocument();
    });
});

/* ------------------------------------------------------------------ */
/*  Vague M4 — aperçu supprimé / pièces jointes, bouton recherche      */
/* ------------------------------------------------------------------ */

/** Une conversation privée dont le dernier message est `last`. */
const withLastMessage = (last: Record<string, unknown>, overrides: Record<string, unknown> = {}) =>
    ConversationListSchema.parse([
        createMockConversation({
            uuid: DIRECT_UUID,
            last_message_at: '2020-03-05T10:00:00Z',
            last_message: preview(last),
            ...overrides,
        }),
    ]);

describe('ConversationList — aperçu M4 (supprimé, pièces jointes)', () => {
    it('affiche « Message supprimé » en italique quand le dernier message est supprimé', () => {
        setup(<ConversationList {...baseProps} conversations={withLastMessage({ body: '', is_deleted: true })} />);

        const previewText = screen.getByText('Message supprimé');
        expect(previewText).toHaveStyle({ fontStyle: 'italic' });
    });

    it('un message supprimé dont je suis l’auteur n’est pas préfixé « Vous : » ni suffixé', () => {
        setup(
            <ConversationList
                {...baseProps}
                conversations={withLastMessage({
                    author_uuid: MOCK_ME_UUID,
                    body: '',
                    is_deleted: true,
                    entity_ref_count: 2,
                    attachment_count: 3,
                })}
            />,
        );

        expect(screen.getByText('Message supprimé')).toBeInTheDocument();
        expect(screen.queryByText(/Vous :/)).not.toBeInTheDocument();
        expect(screen.queryByText(/pièce/)).not.toBeInTheDocument();
    });

    it('suffixe l’aperçu par le nombre de pièces jointes (singulier / pluriel), après les références', () => {
        const conversations = ConversationListSchema.parse([
            createMockConversation({
                uuid: DIRECT_UUID,
                last_message_at: '2020-03-05T10:00:00Z',
                last_message: preview({ body: 'Salut Pierre', attachment_count: 2 }),
            }),
            createMockConversation({
                uuid: GROUP_UUID,
                kind: 'group',
                name: 'Prépa tir 42',
                last_message_at: '2020-03-04T09:00:00Z',
                last_message: preview({
                    author_uuid: MOCK_ME_UUID,
                    body: 'Le rapport',
                    entity_ref_count: 1,
                    attachment_count: 1,
                }),
            }),
        ]);
        setup(<ConversationList {...baseProps} conversations={conversations} />);

        expect(screen.getByText('Salut Pierre · 2 pièces jointes')).toBeInTheDocument();
        expect(screen.getByText('Vous : Le rapport · 1 référence · 1 pièce jointe')).toBeInTheDocument();
        expect(screen.getByText('Salut Pierre · 2 pièces jointes')).toHaveStyle({ fontStyle: 'normal' });
    });

    it('affiche « Pièce jointe » seul quand le corps est vide (« N pièces jointes » au pluriel, « Vous : » si moi)', () => {
        const { rerender } = setup(
            <ConversationList {...baseProps} conversations={withLastMessage({ body: '', attachment_count: 1 })} />,
        );
        expect(screen.getByText('Pièce jointe')).toBeInTheDocument();

        rerender(
            <ConversationList
                {...baseProps}
                conversations={withLastMessage({ author_uuid: MOCK_ME_UUID, body: '', attachment_count: 3 })}
            />,
        );
        expect(screen.getByText('Vous : 3 pièces jointes')).toBeInTheDocument();
        expect(screen.queryByText(/^Vous : $/)).not.toBeInTheDocument();
    });

    it('corps vide avec pièce jointe et références : « Pièce jointe · N références »', () => {
        setup(
            <ConversationList
                {...baseProps}
                conversations={withLastMessage({ body: '', attachment_count: 1, entity_ref_count: 2 })}
            />,
        );

        expect(screen.getByText('Pièce jointe · 2 références')).toBeInTheDocument();
    });

    it('n’ajoute aucun suffixe quand attachment_count vaut 0', () => {
        setup(<ConversationList {...baseProps} conversations={withLastMessage({ body: 'Sans fichier' })} />);

        expect(screen.getByText('Sans fichier')).toBeInTheDocument();
        expect(screen.queryByText(/pièce/)).not.toBeInTheDocument();
    });
});

describe('ConversationList — recherche dans les messages (M4)', () => {
    it('n’affiche pas le bouton « Rechercher dans les messages » sans onSearch', () => {
        setup(<ConversationList {...baseProps} conversations={[]} />);

        expect(screen.queryByRole('button', { name: 'Rechercher dans les messages' })).not.toBeInTheDocument();
        // Le filtre local reste disponible.
        expect(screen.getByLabelText('Rechercher une conversation')).toBeInTheDocument();
    });

    it('affiche le bouton avec onSearch et l’appelle au clic', async () => {
        const onSearch = vi.fn();
        const onCreate = vi.fn();
        const { user } = setup(
            <ConversationList {...baseProps} conversations={[]} onSearch={onSearch} onCreate={onCreate} />,
        );

        await user.click(screen.getByRole('button', { name: 'Rechercher dans les messages' }));

        expect(onSearch).toHaveBeenCalledTimes(1);
        expect(onCreate).not.toHaveBeenCalled();
    });
});
