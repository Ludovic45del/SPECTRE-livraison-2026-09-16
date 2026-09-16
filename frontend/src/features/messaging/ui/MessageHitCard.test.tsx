/**
 * Tests MessageHitCard — auteur (nom, avatar, « Utilisateur supprimé »),
 * titre de conversation (privée = autre membre, groupe = nom), horodatage
 * compact avec date complète en title, extrait, chips de références, nombre
 * de pièces jointes, message supprimé en italique, bouton « Ouvrir la
 * conversation » en mode lien (RouterLink) ou en mode callback (`onOpen`).
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';

import { setup } from '@test/test-utils';
import {
    MOCK_ME_UUID,
    MOCK_OTHER_UUID,
    createMockAttachment,
    createMockConversation,
    createMockConversationMember,
    createMockEntityRef,
    createMockMention,
    createMockMessage,
    createMockUserSummary,
} from '@test/mocks/messaging-handlers';
import { MentionSchema, type Mention } from '@entities/messaging';
import { MessageHitCard } from './MessageHitCard';

const CONVERSATION_UUID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const GROUP_UUID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const FSEC_UUID = 'f5ec0000-0000-4000-8000-000000000001';

const marie = () =>
    createMockUserSummary({
        uuid: MOCK_OTHER_UUID,
        username: 'mmartin',
        first_name: 'Marie',
        last_name: 'Martin',
        avatar_url: '/media/avatars/marie.png',
    });

const directConversation = () => createMockConversation({ uuid: CONVERSATION_UUID });

const groupConversation = () =>
    createMockConversation({
        uuid: GROUP_UUID,
        kind: 'group',
        name: 'Prépa tir 42',
        members: [createMockConversationMember(), createMockConversationMember(marie())],
    });

/** Mention typée (camelCase) : message de Marie dans la privée par défaut. */
function buildMention({
    conversation = directConversation(),
    message = {},
}: {
    conversation?: ReturnType<typeof createMockConversation>;
    message?: Record<string, unknown>;
} = {}): Mention {
    return MentionSchema.parse(
        createMockMention({
            conversation,
            message: createMockMessage({
                conversation_uuid: conversation.uuid,
                author_uuid: MOCK_OTHER_UUID,
                author: marie(),
                body: 'Regarde cette FSEC',
                created_at: '2020-03-05T10:00:00Z',
                updated_at: '2020-03-05T10:00:00Z',
                ...message,
            }),
        }),
    );
}

const getItem = () => screen.getByRole('listitem');

describe('MessageHitCard', () => {
    it('affiche l’auteur, son avatar, le titre d’une privée (autre membre), l’horodatage et l’extrait', () => {
        setup(<MessageHitCard mention={buildMention()} meUuid={MOCK_ME_UUID} />);

        const item = getItem();
        expect(within(item).getByText('Marie Martin')).toBeInTheDocument();
        expect(within(item).getByRole('presentation')).toHaveAttribute('src', '/media/avatars/marie.png');
        expect(within(item).getByText('dans Marie Martin')).toBeInTheDocument();
        expect(within(item).getByText('05/03/2020')).toHaveAttribute('title', expect.stringContaining('2020'));
        expect(within(item).getByText('Regarde cette FSEC')).toBeInTheDocument();
        expect(within(item).getByText('Regarde cette FSEC')).toHaveStyle({ fontStyle: 'normal' });
    });

    it('affiche le nom du groupe comme titre de conversation', () => {
        setup(<MessageHitCard mention={buildMention({ conversation: groupConversation() })} meUuid={MOCK_ME_UUID} />);

        expect(within(getItem()).getByText('dans Prépa tir 42')).toBeInTheDocument();
        expect(screen.queryByText('dans Marie Martin')).not.toBeInTheDocument();
    });

    it('affiche « Utilisateur supprimé » (initiale « U ») quand l’auteur est null', () => {
        setup(
            <MessageHitCard
                mention={buildMention({ message: { author_uuid: null, author: null } })}
                meUuid={MOCK_ME_UUID}
            />,
        );

        const item = getItem();
        expect(within(item).getByText('Utilisateur supprimé')).toBeInTheDocument();
        expect(within(item).getByText('U')).toBeInTheDocument();
    });

    it('rend les références du message en chips (lien vers l’entité)', () => {
        const mention = buildMention({
            message: {
                entity_refs: [
                    createMockEntityRef({ entity_uuid: FSEC_UUID, label: 'FSEC-12', slug: 'fsec-12' }),
                    createMockEntityRef({ entity_type: 'fa', label: 'FA-1', slug: null, exists: false }),
                ],
            },
        });
        setup(<MessageHitCard mention={mention} meUuid={MOCK_ME_UUID} />);

        const item = getItem();
        expect(within(item).getByRole('link', { name: 'FSEC · FSEC-12' })).toHaveAttribute(
            'href',
            '/fsec-details/fsec-12',
        );
        expect(within(item).getByText('FA-1 (supprimée)')).toBeInTheDocument();
    });

    it('n’affiche aucune chip ni compteur de pièces jointes quand le message n’en a pas', () => {
        setup(<MessageHitCard mention={buildMention({ message: { entity_refs: [] } })} meUuid={MOCK_ME_UUID} />);

        expect(screen.queryByRole('link', { name: /FSEC ·/ })).not.toBeInTheDocument();
        expect(screen.queryByText(/pièce(s)? jointe(s)?/)).not.toBeInTheDocument();
    });

    it('indique le nombre de pièces jointes (singulier / pluriel)', () => {
        const { rerender } = setup(
            <MessageHitCard
                mention={buildMention({ message: { attachments: [createMockAttachment()] } })}
                meUuid={MOCK_ME_UUID}
            />,
        );
        expect(within(getItem()).getByText('1 pièce jointe')).toBeInTheDocument();

        rerender(
            <MessageHitCard
                mention={buildMention({
                    message: {
                        attachments: [
                            createMockAttachment(),
                            createMockAttachment({ original_name: 'photo.png' }),
                            createMockAttachment({ original_name: 'liste.csv' }),
                        ],
                    },
                })}
                meUuid={MOCK_ME_UUID}
            />,
        );
        expect(within(getItem()).getByText('3 pièces jointes')).toBeInTheDocument();
    });

    it('affiche « Message supprimé » en italique pour un message supprimé', () => {
        setup(
            <MessageHitCard
                mention={buildMention({ message: { body: '', is_deleted: true, deleted_at: '2020-03-06T10:00:00Z' } })}
                meUuid={MOCK_ME_UUID}
            />,
        );

        const excerpt = within(getItem()).getByText('Message supprimé');
        expect(excerpt).toHaveStyle({ fontStyle: 'italic' });
    });

    it('mode lien (sans onOpen) : « Ouvrir la conversation » est un lien vers /messagerie/<uuid>', () => {
        setup(<MessageHitCard mention={buildMention()} meUuid={MOCK_ME_UUID} />);

        const link = within(getItem()).getByRole('link', { name: 'Ouvrir la conversation' });
        expect(link).toHaveAttribute('href', `/messagerie/${CONVERSATION_UUID}`);
        expect(screen.queryByRole('button', { name: 'Ouvrir la conversation' })).not.toBeInTheDocument();
    });

    it('mode callback (onOpen) : « Ouvrir la conversation » est un bouton qui appelle onOpen(uuid)', async () => {
        const onOpen = vi.fn();
        const { user } = setup(
            <MessageHitCard
                mention={buildMention({ conversation: groupConversation() })}
                meUuid={MOCK_ME_UUID}
                onOpen={onOpen}
            />,
        );

        const button = within(getItem()).getByRole('button', { name: 'Ouvrir la conversation' });
        expect(screen.queryByRole('link', { name: 'Ouvrir la conversation' })).not.toBeInTheDocument();

        await user.click(button);

        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(onOpen).toHaveBeenCalledWith(GROUP_UUID);
    });
});
