/**
 * MessageBubble — affichage d'un message du fil.
 * @module features/messaging/ui
 *
 * Message `system` : texte discret centré, sans bulle (`isMine` ignoré).
 * Message `text` : bulle à droite (mes messages, couleur primaire) ou à gauche
 * (autres membres, fond neutre), nom de l'auteur au-dessus du premier message
 * d'une suite (`showAuthor`), heure sous la bulle avec la date complète en `title`.
 * Références (`entityRefs`) : rangée de `EntityRefChip` sous la bulle, alignée
 * du même côté, hors du fond coloré.
 *
 * Vague M4 :
 * - supprimé (`isDeleted`) : bulle neutre italique « Message supprimé », sans
 *   chips, pièces jointes ni actions ;
 * - édité (`editedAt`) : suffixe « · modifié » après l'heure (date d'édition en `title`) ;
 * - pièces jointes : images en vignettes (lien vers le fichier, nouvel onglet),
 *   autres fichiers en `Chip` téléchargeable « nom · taille » ;
 * - actions : bouton « Actions du message » (⋮) rendu si `canEdit` ou
 *   `canDelete`, visible au survol / focus de la ligne (toujours dans l'ordre de
 *   tabulation), menu « Modifier » / « Supprimer » → `onEdit` / `onDelete`.
 */

import { memo, useCallback, useState, type MouseEvent } from 'react';
import { Box, Chip, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import {
    formatFileSize,
    formatMessageFullDate,
    formatMessageTime,
    formatUserSummaryName,
    type Attachment,
    type Message,
} from '@entities/messaging';
import { EntityRefChip } from './EntityRefChip';

export interface MessageBubbleProps {
    readonly message: Message;
    /** Vrai si l'utilisateur courant est l'auteur (bulle à droite). */
    readonly isMine: boolean;
    /** Vrai pour le premier message d'une suite du même auteur (calculé par le parent). */
    readonly showAuthor: boolean;
    /** « Modifier » proposé dans le menu d'actions (auteur, message texte non supprimé). */
    readonly canEdit?: boolean;
    /** « Supprimer » proposé dans le menu d'actions (auteur ou propriétaire du groupe). */
    readonly canDelete?: boolean;
    readonly onEdit?: () => void;
    readonly onDelete?: () => void;
}

/** Libellé de repli quand l'auteur a été supprimé. */
const DELETED_AUTHOR_LABEL = 'Utilisateur supprimé';

/** Corps affiché à la place d'un message supprimé. */
const DELETED_MESSAGE_LABEL = 'Message supprimé';

/** Largeur / hauteur maximales d'une vignette image. */
const THUMBNAIL_MAX_PX = 160;

/** Largeur maximale de la bulle et de ses rangées annexes. */
const BUBBLE_MAX_WIDTH = 'min(72%, 760px)';

/* ------------------------------------------------------------------ */
/*  Pièces jointes                                                     */
/* ------------------------------------------------------------------ */

const AttachmentItem = memo(function AttachmentItem({ attachment }: { readonly attachment: Attachment }) {
    const label = `${attachment.originalName} · ${formatFileSize(attachment.size)}`;

    if (attachment.isImage && attachment.url) {
        return (
            <Box
                component="a"
                href={attachment.url}
                target="_blank"
                rel="noopener"
                title={label}
                sx={{ display: 'inline-block', borderRadius: 1.5, overflow: 'hidden', lineHeight: 0 }}
            >
                <Box
                    component="img"
                    src={attachment.url}
                    alt={attachment.originalName}
                    loading="lazy"
                    sx={{ maxWidth: THUMBNAIL_MAX_PX, maxHeight: THUMBNAIL_MAX_PX, display: 'block' }}
                />
            </Box>
        );
    }

    const common = {
        label,
        size: 'small' as const,
        icon: <InsertDriveFileOutlinedIcon fontSize="small" />,
        variant: 'outlined' as const,
        sx: { maxWidth: '100%', bgcolor: 'background.paper' },
    };
    if (!attachment.url) {
        return <Chip {...common} />;
    }
    return <Chip {...common} component="a" href={attachment.url} download={attachment.originalName} clickable />;
});

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

const MessageActions = memo(function MessageActions({
    canEdit,
    canDelete,
    onEdit,
    onDelete,
}: Pick<MessageBubbleProps, 'canEdit' | 'canDelete' | 'onEdit' | 'onDelete'>) {
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const handleOpen = useCallback((event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget), []);
    const handleClose = useCallback(() => setMenuAnchor(null), []);
    const handleEdit = useCallback(() => {
        setMenuAnchor(null);
        onEdit?.();
    }, [onEdit]);
    const handleDelete = useCallback(() => {
        setMenuAnchor(null);
        onDelete?.();
    }, [onDelete]);

    const open = Boolean(menuAnchor);

    return (
        <>
            <IconButton
                onClick={handleOpen}
                aria-label="Actions du message"
                aria-haspopup="menu"
                aria-expanded={open}
                size="small"
                className="message-actions"
                sx={{
                    alignSelf: 'center',
                    opacity: open ? 1 : 0,
                    transition: 'opacity 120ms',
                    '&:focus-visible': { opacity: 1 },
                }}
            >
                <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
                anchorEl={menuAnchor}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                {canEdit && <MenuItem onClick={handleEdit}>Modifier</MenuItem>}
                {canDelete && (
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        Supprimer
                    </MenuItem>
                )}
            </Menu>
        </>
    );
});

/* ------------------------------------------------------------------ */
/*  Bulle                                                              */
/* ------------------------------------------------------------------ */

export const MessageBubble = memo(function MessageBubble({
    message,
    isMine,
    showAuthor,
    canEdit = false,
    canDelete = false,
    onEdit,
    onDelete,
}: MessageBubbleProps) {
    if (message.kind === 'system') {
        return (
            <Typography
                variant="caption"
                color="text.secondary"
                component="p"
                data-testid="system-message"
                sx={{ textAlign: 'center', fontStyle: 'italic', my: 1, px: 2 }}
            >
                {message.body}
            </Typography>
        );
    }

    const authorName = message.author ? formatUserSummaryName(message.author) : DELETED_AUTHOR_LABEL;
    const deleted = message.isDeleted;
    const hasActions = !deleted && (canEdit || canDelete);
    const attachments = deleted ? [] : message.attachments;
    const entityRefs = deleted ? [] : message.entityRefs;
    const hasBody = message.body.length > 0;

    return (
        <Box
            data-testid="message-bubble"
            data-mine={isMine ? 'true' : 'false'}
            data-deleted={deleted ? 'true' : undefined}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start',
                mb: 1,
                // Le bouton d'actions n'apparaît qu'au survol / focus de la ligne.
                '&:hover .message-actions, &:focus-within .message-actions': { opacity: 1 },
            }}
        >
            {showAuthor && !isMine && (
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, ml: 1.5, mb: 0.25 }}>
                    {authorName}
                </Typography>
            )}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: isMine ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: 0.5,
                    // La largeur maximale se calcule ici, sur la ligne (largeur définie),
                    // et non sur la bulle : un pourcentage sur un parent en largeur
                    // « ajustée au contenu » comprimait le texte sur quelques mots.
                    maxWidth: BUBBLE_MAX_WIDTH,
                }}
            >
                {(hasBody || deleted || attachments.length === 0) && (
                    <Box
                        sx={{
                            minWidth: 0,
                            borderRadius: 3,
                            px: 1.5,
                            py: 1,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            bgcolor: deleted ? 'action.hover' : isMine ? 'primary.main' : 'action.hover',
                            color: deleted ? 'text.secondary' : isMine ? 'primary.contrastText' : 'text.primary',
                            fontStyle: deleted ? 'italic' : 'normal',
                            typography: 'body2',
                        }}
                    >
                        {deleted ? DELETED_MESSAGE_LABEL : message.body}
                    </Box>
                )}
                {hasActions && (
                    <MessageActions canEdit={canEdit} canDelete={canDelete} onEdit={onEdit} onDelete={onDelete} />
                )}
            </Box>
            {attachments.length > 0 && (
                <Box
                    role="group"
                    aria-label="Pièces jointes du message"
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.75,
                        mt: 0.5,
                        maxWidth: BUBBLE_MAX_WIDTH,
                        justifyContent: isMine ? 'flex-end' : 'flex-start',
                    }}
                >
                    {attachments.map((attachment) => (
                        <AttachmentItem key={attachment.uuid} attachment={attachment} />
                    ))}
                </Box>
            )}
            {entityRefs.length > 0 && (
                <Box
                    role="group"
                    aria-label="Références du message"
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        mt: 0.5,
                        maxWidth: BUBBLE_MAX_WIDTH,
                        justifyContent: isMine ? 'flex-end' : 'flex-start',
                    }}
                >
                    {entityRefs.map((ref) => (
                        <EntityRefChip key={`${ref.entityType}-${ref.entityUuid}`} entityRef={ref} size="small" />
                    ))}
                </Box>
            )}
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.25, mx: 1 }}>
                <Box component="span" title={formatMessageFullDate(message.createdAt)}>
                    {formatMessageTime(message.createdAt)}
                </Box>
                {!deleted && message.editedAt && (
                    <Box component="span" title={`Modifié le ${formatMessageFullDate(message.editedAt)}`}>
                        {' · modifié'}
                    </Box>
                )}
            </Typography>
        </Box>
    );
});
