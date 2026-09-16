/**
 * MessageHitCard — carte d'un message trouvé hors de son fil (mention d'une
 * entité, résultat de recherche).
 * @module features/messaging/ui
 *
 * Avatar + nom de l'auteur, horodatage compact (date complète en `title`),
 * titre de la conversation, extrait du corps (3 lignes max), références du
 * message et bouton « Ouvrir la conversation » : lien vers
 * `/messagerie/<uuid>` par défaut, ou appel de `onOpen(uuid)` quand le parent
 * pilote lui-même la navigation (dialogue de recherche : fermer puis naviguer).
 *
 * Un message supprimé (jamais renvoyé par le backend, mais possible depuis un
 * cache) est rendu avec l'extrait « Message supprimé » en italique.
 *
 * Le titre de conversation est recalculé localement (`getMentionConversationTitle`) :
 * `getConversationTitle` attend une `Conversation` complète alors qu'une
 * mention ne porte que le contexte minimal (`uuid`, `kind`, `name`, `members`).
 */

import { memo, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Avatar, Box, Button, Card, CardContent, Typography } from '@mui/material';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import {
    formatConversationTimestamp,
    formatMessageFullDate,
    formatUserSummaryName,
    type Mention,
} from '@entities/messaging';
import { conversationPath, getMentionConversationTitle } from '../lib/entity-refs';
import { EntityRefChip } from './EntityRefChip';

export interface MessageHitCardProps {
    readonly mention: Mention;
    readonly meUuid: string;
    /** Si fourni, « Ouvrir la conversation » appelle ce callback au lieu d'être un lien. */
    readonly onOpen?: (conversationUuid: string) => void;
}

/** Libellé de repli quand l'auteur a été supprimé. */
const DELETED_AUTHOR_LABEL = 'Utilisateur supprimé';

/** Extrait affiché pour un message supprimé. */
const DELETED_MESSAGE_LABEL = 'Message supprimé';

const OPEN_LABEL = 'Ouvrir la conversation';

export const MessageHitCard = memo(function MessageHitCard({ mention, meUuid, onOpen }: MessageHitCardProps) {
    const { message, conversation } = mention;
    const authorName = message.author ? formatUserSummaryName(message.author) : DELETED_AUTHOR_LABEL;
    const title = getMentionConversationTitle(conversation, meUuid);
    const attachmentCount = message.attachments.length;

    const handleOpen = useCallback(() => onOpen?.(conversation.uuid), [onOpen, conversation.uuid]);

    const openButtonSx = { mt: 1, ml: -1, fontWeight: 600 } as const;

    return (
        <Card component="li" variant="outlined" sx={{ listStyle: 'none', borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', gap: 1.5, '&:last-child': { pb: 2 } }}>
                <Avatar
                    src={message.author?.avatarUrl ?? undefined}
                    alt=""
                    sx={{ width: 36, height: 36, fontSize: '0.8rem', fontWeight: 600, bgcolor: 'primary.main' }}
                >
                    {authorName.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {authorName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            dans {title}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            title={formatMessageFullDate(message.createdAt)}
                            sx={{ ml: 'auto', fontVariantNumeric: 'tabular-nums' }}
                        >
                            {formatConversationTimestamp(message.createdAt)}
                        </Typography>
                    </Box>
                    <Typography
                        variant="body2"
                        sx={{
                            mt: 0.5,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontStyle: message.isDeleted ? 'italic' : 'normal',
                            color: message.isDeleted ? 'text.secondary' : 'text.primary',
                        }}
                    >
                        {message.isDeleted ? DELETED_MESSAGE_LABEL : message.body}
                    </Typography>
                    {attachmentCount > 0 && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}
                        >
                            <AttachFileOutlinedIcon sx={{ fontSize: 14 }} aria-hidden />
                            {attachmentCount > 1 ? `${attachmentCount} pièces jointes` : '1 pièce jointe'}
                        </Typography>
                    )}
                    {message.entityRefs.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {message.entityRefs.map((ref) => (
                                <EntityRefChip
                                    key={`${ref.entityType}-${ref.entityUuid}`}
                                    entityRef={ref}
                                    size="small"
                                />
                            ))}
                        </Box>
                    )}
                    {onOpen ? (
                        <Button
                            type="button"
                            onClick={handleOpen}
                            size="small"
                            variant="text"
                            endIcon={<OpenInNewIcon fontSize="small" />}
                            sx={openButtonSx}
                        >
                            {OPEN_LABEL}
                        </Button>
                    ) : (
                        <Button
                            component={RouterLink}
                            to={conversationPath(conversation.uuid)}
                            size="small"
                            variant="text"
                            endIcon={<OpenInNewIcon fontSize="small" />}
                            sx={openButtonSx}
                        >
                            {OPEN_LABEL}
                        </Button>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
});
