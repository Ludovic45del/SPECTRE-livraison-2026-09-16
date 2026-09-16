/**
 * Tests MessageBubble — bulle à droite (mes messages) / à gauche (autres),
 * nom de l'auteur, auteur supprimé, message système sans bulle, heure,
 * rangée de chips de références sous la bulle.
 * Vague M4 : message supprimé, suffixe « modifié », vignette image, chip
 * fichier téléchargeable, menu « Actions du message » selon canEdit / canDelete
 * (souris et clavier).
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import dayjs from 'dayjs';

import { renderWithProviders, setup } from '@test/test-utils';
import {
    MOCK_OTHER_UUID,
    createMockAttachment,
    createMockEntityRef,
    createMockMessage,
    createMockUserSummary,
} from '@test/mocks/messaging-handlers';
import { MessageSchema, type Message } from '@entities/messaging';
import { MessageBubble } from './MessageBubble';

const CREATED_AT = '2026-09-09T14:05:00Z';

const otherAuthor = () =>
    createMockUserSummary({ uuid: MOCK_OTHER_UUID, username: 'mmartin', first_name: 'Marie', last_name: 'Martin' });

function buildMessage(overrides: Record<string, unknown> = {}): Message {
    return MessageSchema.parse(createMockMessage({ created_at: CREATED_AT, updated_at: CREATED_AT, ...overrides }));
}

describe('MessageBubble', () => {
    it('affiche mon message à droite, sans nom d’auteur, avec l’heure', () => {
        renderWithProviders(<MessageBubble message={buildMessage({ body: 'Coucou' })} isMine showAuthor />);

        const bubble = screen.getByTestId('message-bubble');
        expect(bubble).toHaveAttribute('data-mine', 'true');
        expect(screen.getByText('Coucou')).toBeInTheDocument();
        expect(screen.queryByText('Pierre Dupont')).not.toBeInTheDocument();
        expect(screen.getByText(dayjs(CREATED_AT).format('HH:mm'))).toBeInTheDocument();
    });

    it('affiche le message d’un autre membre à gauche avec son nom si showAuthor', () => {
        renderWithProviders(
            <MessageBubble
                message={buildMessage({ author_uuid: MOCK_OTHER_UUID, author: otherAuthor(), body: 'Salut' })}
                isMine={false}
                showAuthor
            />,
        );

        expect(screen.getByTestId('message-bubble')).toHaveAttribute('data-mine', 'false');
        expect(screen.getByText('Marie Martin')).toBeInTheDocument();
        expect(screen.getByText('Salut')).toBeInTheDocument();
    });

    it('masque le nom de l’auteur quand showAuthor est faux', () => {
        renderWithProviders(
            <MessageBubble
                message={buildMessage({ author_uuid: MOCK_OTHER_UUID, author: otherAuthor() })}
                isMine={false}
                showAuthor={false}
            />,
        );

        expect(screen.queryByText('Marie Martin')).not.toBeInTheDocument();
    });

    it('affiche « Utilisateur supprimé » quand l’auteur est null', () => {
        renderWithProviders(
            <MessageBubble message={buildMessage({ author_uuid: null, author: null })} isMine={false} showAuthor />,
        );

        expect(screen.getByText('Utilisateur supprimé')).toBeInTheDocument();
    });

    it('affiche un message système centré, sans bulle ni auteur ni heure', () => {
        renderWithProviders(
            <MessageBubble
                message={buildMessage({ kind: 'system', body: 'Marie Martin a rejoint le groupe' })}
                isMine
                showAuthor
            />,
        );

        expect(screen.getByTestId('system-message')).toHaveTextContent('Marie Martin a rejoint le groupe');
        expect(screen.queryByTestId('message-bubble')).not.toBeInTheDocument();
        expect(screen.queryByText(dayjs(CREATED_AT).format('HH:mm'))).not.toBeInTheDocument();
    });

    it('porte la date complète en title sur l’heure', () => {
        renderWithProviders(<MessageBubble message={buildMessage()} isMine showAuthor={false} />);

        const time = screen.getByText(dayjs(CREATED_AT).format('HH:mm'));
        expect(time).toHaveAttribute('title', expect.stringContaining('2026'));
    });

    it('rend les références du message en chips sous la bulle (lien / supprimée)', () => {
        const message = buildMessage({
            body: 'Voir la FSEC',
            entity_refs: [
                createMockEntityRef({ label: 'FSEC-12', slug: 'fsec-12' }),
                createMockEntityRef({ entity_type: 'fa', label: 'FA-1', slug: null, exists: false }),
            ],
        });
        renderWithProviders(<MessageBubble message={message} isMine showAuthor={false} />);

        const bubble = screen.getByTestId('message-bubble');
        const refs = within(bubble).getByRole('group', { name: 'Références du message' });
        expect(within(refs).getByRole('link', { name: 'FSEC · FSEC-12' })).toHaveAttribute(
            'href',
            '/fsec-details/fsec-12',
        );
        expect(within(refs).getByText('FA-1 (supprimée)')).toBeInTheDocument();
        // Les chips sont hors du fond coloré de la bulle.
        expect(screen.getByText('Voir la FSEC')).not.toContainElement(refs);
    });

    it('n’affiche aucune rangée de références quand le message n’en a pas', () => {
        renderWithProviders(<MessageBubble message={buildMessage()} isMine={false} showAuthor />);

        expect(screen.queryByRole('group', { name: 'Références du message' })).not.toBeInTheDocument();
    });
});

/* ------------------------------------------------------------------ */
/*  Vague M4 — supprimé, modifié, pièces jointes, actions              */
/* ------------------------------------------------------------------ */

const EDITED_AT = '2026-09-09T15:30:00Z';

const getActionsButton = () => screen.getByRole('button', { name: 'Actions du message' });
const queryActionsButton = () => screen.queryByRole('button', { name: 'Actions du message' });

describe('MessageBubble — message supprimé (M4)', () => {
    const deletedMessage = () =>
        buildMessage({
            body: '',
            is_deleted: true,
            deleted_at: EDITED_AT,
            edited_at: EDITED_AT,
            entity_refs: [createMockEntityRef({ label: 'FSEC-12', slug: 'fsec-12' })],
            attachments: [createMockAttachment()],
        });

    it('affiche « Message supprimé » en italique, sans chips ni pièces jointes', () => {
        renderWithProviders(<MessageBubble message={deletedMessage()} isMine showAuthor={false} />);

        const bubble = screen.getByTestId('message-bubble');
        expect(bubble).toHaveAttribute('data-deleted', 'true');
        const label = within(bubble).getByText('Message supprimé');
        expect(label).toHaveStyle({ fontStyle: 'italic' });
        expect(within(bubble).queryByRole('group', { name: 'Références du message' })).not.toBeInTheDocument();
        expect(within(bubble).queryByRole('group', { name: 'Pièces jointes du message' })).not.toBeInTheDocument();
        expect(within(bubble).queryByText(/FSEC-12/)).not.toBeInTheDocument();
        expect(within(bubble).queryByText(/rapport\.pdf/)).not.toBeInTheDocument();
        // L'heure reste affichée, sans suffixe « modifié ».
        expect(within(bubble).getByText(dayjs(CREATED_AT).format('HH:mm'))).toBeInTheDocument();
        expect(within(bubble).queryByText(/modifié/)).not.toBeInTheDocument();
    });

    it('ne propose aucune action même avec canEdit / canDelete', () => {
        renderWithProviders(
            <MessageBubble
                message={deletedMessage()}
                isMine
                showAuthor={false}
                canEdit
                canDelete
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        expect(queryActionsButton()).not.toBeInTheDocument();
    });

    it('un message non supprimé ne porte pas data-deleted', () => {
        renderWithProviders(<MessageBubble message={buildMessage()} isMine showAuthor={false} />);

        expect(screen.getByTestId('message-bubble')).not.toHaveAttribute('data-deleted');
    });
});

describe('MessageBubble — message modifié (M4)', () => {
    it('ajoute le suffixe « · modifié » après l’heure, avec la date d’édition en title', () => {
        renderWithProviders(
            <MessageBubble
                message={buildMessage({ body: 'Corrigé', edited_at: EDITED_AT })}
                isMine
                showAuthor={false}
            />,
        );

        const suffix = screen.getByText('· modifié');
        expect(suffix).toHaveAttribute('title', expect.stringMatching(/^Modifié le .*2026/));
        expect(screen.getByText(dayjs(CREATED_AT).format('HH:mm'))).toBeInTheDocument();
    });

    it('n’affiche pas le suffixe quand le message n’a jamais été modifié', () => {
        renderWithProviders(<MessageBubble message={buildMessage({ edited_at: null })} isMine showAuthor={false} />);

        expect(screen.queryByText(/modifié/)).not.toBeInTheDocument();
    });
});

describe('MessageBubble — pièces jointes (M4)', () => {
    it('rend une image en vignette (img alt = nom) dans un lien vers le fichier, nouvel onglet', () => {
        const attachment = createMockAttachment({ original_name: 'photo.png', content_type: 'image/png', size: 2048 });
        renderWithProviders(
            <MessageBubble
                message={buildMessage({ body: 'Regarde', attachments: [attachment] })}
                isMine
                showAuthor={false}
            />,
        );

        const group = screen.getByRole('group', { name: 'Pièces jointes du message' });
        const img = within(group).getByRole('img', { name: 'photo.png' });
        expect(img).toHaveAttribute('src', attachment.url);
        const link = img.closest('a') as HTMLAnchorElement;
        expect(link).toHaveAttribute('href', attachment.url);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener');
        expect(link).toHaveAttribute('title', 'photo.png · 2 Ko');
        // Le corps reste affiché dans la bulle.
        expect(screen.getByText('Regarde')).toBeInTheDocument();
    });

    it('rend un fichier en chip « nom · taille » téléchargeable (href + download)', () => {
        const attachment = createMockAttachment({ original_name: 'rapport.pdf', size: 12 * 1024 });
        renderWithProviders(
            <MessageBubble message={buildMessage({ attachments: [attachment] })} isMine={false} showAuthor />,
        );

        const group = screen.getByRole('group', { name: 'Pièces jointes du message' });
        const chip = within(group).getByRole('link', { name: 'rapport.pdf · 12 Ko' });
        expect(chip).toHaveAttribute('href', attachment.url);
        expect(chip).toHaveAttribute('download', 'rapport.pdf');
        expect(within(group).queryByRole('img')).not.toBeInTheDocument();
    });

    it('rend un fichier sans URL en chip non cliquable', () => {
        const attachment = createMockAttachment({ original_name: 'archive.zip', url: null, size: 1536 * 1024 });
        renderWithProviders(
            <MessageBubble message={buildMessage({ attachments: [attachment] })} isMine showAuthor={false} />,
        );

        const group = screen.getByRole('group', { name: 'Pièces jointes du message' });
        expect(within(group).getByText('archive.zip · 1,5 Mo')).toBeInTheDocument();
        expect(within(group).queryByRole('link')).not.toBeInTheDocument();
    });

    it('rend plusieurs pièces jointes (image + fichier) et les références côte à côte', () => {
        const message = buildMessage({
            body: 'Tout est là',
            attachments: [createMockAttachment({ original_name: 'photo.jpg' }), createMockAttachment()],
            entity_refs: [createMockEntityRef({ label: 'FSEC-12', slug: 'fsec-12' })],
        });
        renderWithProviders(<MessageBubble message={message} isMine showAuthor={false} />);

        const attachments = screen.getByRole('group', { name: 'Pièces jointes du message' });
        expect(within(attachments).getByRole('img', { name: 'photo.jpg' })).toBeInTheDocument();
        expect(within(attachments).getByRole('link', { name: 'rapport.pdf · 12 Ko' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Références du message' })).toBeInTheDocument();
    });

    it('un message sans corps mais avec pièce jointe n’affiche pas de bulle vide', () => {
        renderWithProviders(
            <MessageBubble
                message={buildMessage({ body: '', attachments: [createMockAttachment()] })}
                isMine
                showAuthor={false}
            />,
        );

        const bubble = screen.getByTestId('message-bubble');
        expect(within(bubble).getByRole('group', { name: 'Pièces jointes du message' })).toBeInTheDocument();
        // Aucun élément « bulle » (fond coloré, pre-wrap) n'est rendu pour un corps vide.
        const bodyBoxes = Array.from(bubble.querySelectorAll('div')).filter(
            (el) => getComputedStyle(el).whiteSpace === 'pre-wrap',
        );
        expect(bodyBoxes).toHaveLength(0);
    });

    it('n’affiche aucune rangée de pièces jointes quand le message n’en a pas', () => {
        renderWithProviders(<MessageBubble message={buildMessage()} isMine showAuthor={false} />);

        expect(screen.queryByRole('group', { name: 'Pièces jointes du message' })).not.toBeInTheDocument();
    });
});

describe('MessageBubble — actions (M4)', () => {
    it('n’affiche pas le bouton d’actions sans canEdit ni canDelete', () => {
        renderWithProviders(<MessageBubble message={buildMessage()} isMine showAuthor={false} />);

        expect(queryActionsButton()).not.toBeInTheDocument();
    });

    it('n’affiche pas le bouton d’actions sur un message système', () => {
        renderWithProviders(
            <MessageBubble
                message={buildMessage({ kind: 'system', body: 'Marie Martin a rejoint le groupe' })}
                isMine={false}
                showAuthor={false}
                canEdit
                canDelete
            />,
        );

        expect(queryActionsButton()).not.toBeInTheDocument();
    });

    it('canEdit + canDelete : le menu propose « Modifier » et « Supprimer » ; « Modifier » appelle onEdit', async () => {
        const onEdit = vi.fn();
        const onDelete = vi.fn();
        const { user } = setup(
            <MessageBubble
                message={buildMessage()}
                isMine
                showAuthor={false}
                canEdit
                canDelete
                onEdit={onEdit}
                onDelete={onDelete}
            />,
        );

        const button = getActionsButton();
        expect(button).toHaveAttribute('aria-haspopup', 'menu');
        expect(button).toHaveAttribute('aria-expanded', 'false');

        await user.click(button);

        const menu = await screen.findByRole('menu');
        expect(button).toHaveAttribute('aria-expanded', 'true');
        expect(within(menu).getAllByRole('menuitem')).toHaveLength(2);
        await user.click(within(menu).getByRole('menuitem', { name: 'Modifier' }));

        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(onDelete).not.toHaveBeenCalled();
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('canDelete seul (propriétaire du groupe) : uniquement « Supprimer », qui appelle onDelete', async () => {
        const onEdit = vi.fn();
        const onDelete = vi.fn();
        const { user } = setup(
            <MessageBubble
                message={buildMessage({ author_uuid: MOCK_OTHER_UUID, author: otherAuthor() })}
                isMine={false}
                showAuthor
                canDelete
                onEdit={onEdit}
                onDelete={onDelete}
            />,
        );

        await user.click(getActionsButton());

        const menu = await screen.findByRole('menu');
        expect(within(menu).getAllByRole('menuitem')).toHaveLength(1);
        expect(within(menu).queryByRole('menuitem', { name: 'Modifier' })).not.toBeInTheDocument();
        await user.click(within(menu).getByRole('menuitem', { name: 'Supprimer' }));

        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(onEdit).not.toHaveBeenCalled();
    });

    it('canEdit seul : uniquement « Modifier »', async () => {
        const { user } = setup(
            <MessageBubble message={buildMessage()} isMine showAuthor={false} canEdit onEdit={vi.fn()} />,
        );

        await user.click(getActionsButton());

        const menu = await screen.findByRole('menu');
        expect(within(menu).getAllByRole('menuitem')).toHaveLength(1);
        expect(within(menu).getByRole('menuitem', { name: 'Modifier' })).toBeInTheDocument();
    });

    it('le bouton d’actions est atteignable au clavier : Tab, Entrée ouvre le menu, flèches + Entrée choisissent', async () => {
        const onDelete = vi.fn();
        const { user } = setup(
            <MessageBubble
                message={buildMessage()}
                isMine
                showAuthor={false}
                canEdit
                canDelete
                onEdit={vi.fn()}
                onDelete={onDelete}
            />,
        );

        await user.tab();
        expect(getActionsButton()).toHaveFocus();

        await user.keyboard('{Enter}');
        const menu = await screen.findByRole('menu');
        // MUI place le focus sur le premier item du menu.
        await user.keyboard('{ArrowDown}');
        expect(within(menu).getByRole('menuitem', { name: 'Supprimer' })).toHaveFocus();
        await user.keyboard('{Enter}');

        expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('Échap referme le menu sans rien appeler', async () => {
        const onEdit = vi.fn();
        const onDelete = vi.fn();
        const { user } = setup(
            <MessageBubble
                message={buildMessage()}
                isMine
                showAuthor={false}
                canEdit
                canDelete
                onEdit={onEdit}
                onDelete={onDelete}
            />,
        );

        await user.click(getActionsButton());
        await screen.findByRole('menu');
        await user.keyboard('{Escape}');

        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(onEdit).not.toHaveBeenCalled();
        expect(onDelete).not.toHaveBeenCalled();
        expect(getActionsButton()).toHaveAttribute('aria-expanded', 'false');
    });
});
