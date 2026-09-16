/**
 * ConversationListItem — ligne de la liste des conversations.
 * @module features/messaging/ui
 *
 * Avatar (photo / initiales de l'autre membre pour une privée, icône groupe
 * sinon), titre (gras si non-lus), aperçu du dernier message (« Vous : » si
 * j'en suis l'auteur, italique pour un événement système), horodatage compact
 * et compteur de non-lus. Tout est tronqué sur une ligne (`noWrap`).
 *
 * Vague M4 : aperçu « Message supprimé » (italique) si le dernier message est
 * supprimé ; suffixe « · N pièce(s) jointe(s) » comme pour les références, ou
 * « Pièce jointe » seul quand le corps est vide.
 */

import { memo, useCallback } from 'react';
import { Avatar, Box, Chip, ListItem, ListItemAvatar, ListItemButton, Typography } from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';

import {
    formatConversationTimestamp,
    getConversationInitials,
    getConversationTitle,
    getOtherMember,
    type Conversation,
} from '@entities/messaging';
import { formatEntityRefCountSuffix } from '../lib/entity-refs';

export interface ConversationListItemProps {
    readonly conversation: Conversation;
    readonly meUuid: string | null;
    readonly selected: boolean;
    readonly onSelect: (uuid: string) => void;
}

/** Libellé affiché quand la conversation n'a encore aucun message. */
const NO_MESSAGE_LABEL = 'Aucun message';

/** Aperçu d'un dernier message supprimé. */
const DELETED_MESSAGE_LABEL = 'Message supprimé';

/** « 1 pièce jointe » / « N pièces jointes ». */
function formatAttachmentCount(count: number): string {
    return `${count} ${count > 1 ? 'pièces jointes' : 'pièce jointe'}`;
}

/**
 * Aperçu du dernier message : « Vous : … » si j'en suis l'auteur (messages
 * texte uniquement — un événement système est déjà rédigé à la 3e personne),
 * suffixé par le nombre de références et de pièces jointes. Corps vide avec
 * pièces jointes : « Pièce jointe » (ou « N pièces jointes ») seul. Message
 * supprimé : « Message supprimé ».
 */
function buildPreview(conversation: Conversation, meUuid: string | null): string {
    const last = conversation.lastMessage;
    if (!last) return NO_MESSAGE_LABEL;
    if (last.isDeleted) return DELETED_MESSAGE_LABEL;
    const isMine = last.kind === 'text' && meUuid !== null && last.authorUuid === meUuid;
    const prefix = isMine ? 'Vous : ' : '';
    if (last.body.length === 0 && last.attachmentCount > 0) {
        const label = last.attachmentCount > 1 ? formatAttachmentCount(last.attachmentCount) : 'Pièce jointe';
        return `${prefix}${label}${formatEntityRefCountSuffix(last.entityRefCount)}`;
    }
    const attachmentSuffix = last.attachmentCount > 0 ? ` · ${formatAttachmentCount(last.attachmentCount)}` : '';
    return `${prefix}${last.body}${formatEntityRefCountSuffix(last.entityRefCount)}${attachmentSuffix}`;
}

export const ConversationListItem = memo(function ConversationListItem({
    conversation,
    meUuid,
    selected,
    onSelect,
}: ConversationListItemProps) {
    const handleClick = useCallback(() => onSelect(conversation.uuid), [onSelect, conversation.uuid]);

    const me = meUuid ?? '';
    const isGroup = conversation.kind === 'group';
    const title = getConversationTitle(conversation, me);
    const other = getOtherMember(conversation, me);
    const hasUnread = conversation.unreadCount > 0;
    const isSystemPreview = conversation.lastMessage?.kind === 'system';
    const isDeletedPreview = conversation.lastMessage?.isDeleted === true;
    const preview = buildPreview(conversation, meUuid);
    const timestamp = formatConversationTimestamp(conversation.lastMessageAt);

    return (
        <ListItem disablePadding>
            <ListItemButton
                selected={selected}
                onClick={handleClick}
                dense
                aria-current={selected ? 'true' : undefined}
                sx={{
                    px: 1.5,
                    py: 1,
                    gap: 1.25,
                    alignItems: 'center',
                    borderLeft: '3px solid',
                    borderLeftColor: selected ? 'primary.main' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                }}
            >
                <ListItemAvatar sx={{ minWidth: 0 }}>
                    <Avatar
                        src={!isGroup ? (other?.avatarUrl ?? undefined) : undefined}
                        alt=""
                        sx={{ width: 38, height: 38, fontSize: '0.8rem', fontWeight: 600, bgcolor: 'primary.main' }}
                    >
                        {isGroup ? <GroupsRoundedIcon fontSize="small" /> : getConversationInitials(conversation, me)}
                    </Avatar>
                </ListItemAvatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                        <Typography
                            variant="body2"
                            noWrap
                            sx={{ flex: 1, minWidth: 0, fontWeight: hasUnread ? 700 : 500, lineHeight: 1.3 }}
                        >
                            {title}
                        </Typography>
                        {timestamp && (
                            <Typography
                                variant="caption"
                                sx={{
                                    flexShrink: 0,
                                    color: hasUnread ? 'primary.main' : 'text.secondary',
                                    fontWeight: hasUnread ? 600 : 400,
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {timestamp}
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                        <Typography
                            variant="caption"
                            noWrap
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                color: conversation.lastMessage ? 'text.secondary' : 'text.disabled',
                                fontStyle: isSystemPreview || isDeletedPreview ? 'italic' : 'normal',
                                fontWeight: hasUnread ? 600 : 400,
                            }}
                        >
                            {preview}
                        </Typography>
                        {hasUnread && (
                            <Chip
                                label={conversation.unreadCount}
                                color="primary"
                                size="small"
                                role="status"
                                aria-label={`${conversation.unreadCount} non lus`}
                                sx={{
                                    height: 18,
                                    minWidth: 18,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    '& .MuiChip-label': { px: 0.75 },
                                }}
                            />
                        )}
                    </Box>
                </Box>
            </ListItemButton>
        </ListItem>
    );
});
