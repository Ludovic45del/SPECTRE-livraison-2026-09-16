/**
 * ConversationThread — fil d'une conversation (en-tête, messages, saisie).
 * @module features/messaging/ui
 *
 * - Marquage lu : à l'ouverture si `unreadCount > 0`, puis à chaque nouveau
 *   message d'un autre auteur reçu pendant que le fil est affiché (jamais deux
 *   fois pour le même dernier message ; jamais si l'onglet est masqué).
 * - Zone messages `role="log"` : « Charger les messages précédents » en haut
 *   (position de scroll conservée), séparateurs de jour, bulles.
 * - Auto-scroll en bas au premier chargement, pour mes messages, ou si je suis
 *   déjà près du bas ; sinon un `Chip` flottant « Nouveaux messages ↓ ».
 * - Groupe : menu « Renommer » / « Supprimer le groupe » (propriétaire, avec
 *   confirmation) et « Quitter le groupe » (tous ; confirmation si propriétaire,
 *   la propriété est transférée par le backend). Après départ/suppression :
 *   `onLeft()` (la page navigue vers la liste).
 * - Messages (M4) : `canEdit` (auteur = moi, texte, non supprimé) et
 *   `canDelete` (auteur = moi, ou propriétaire du groupe) calculés par message ;
 *   « Modifier » ouvre `EditMessageDialog`, « Supprimer » une confirmation puis
 *   `useDeleteMessage` (le message est remplacé dans le fil, corps « Message
 *   supprimé »). Les pièces jointes du composer sont transmises à `usePostMessage`.
 *
 * jsdom n'a pas de mise en page : `scrollHeight`/`scrollTop` valent 0, toute la
 * logique de scroll est écrite pour rester inerte dans ce cas.
 */

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import MoreVertIcon from '@mui/icons-material/MoreVert';

import {
    getConversationInitials,
    getConversationTitle,
    getOtherMember,
    groupMessagesByDay,
    isConversationOwner,
    useConversation,
    useConversationMessages,
    useDeleteConversation,
    useDeleteMessage,
    useMarkConversationRead,
    usePostMessage,
    useRemoveConversationMember,
    type Conversation,
    type EntityRefInput,
    type Message,
} from '@entities/messaging';
import { getErrorMessage } from '@shared/lib';
import { useNotification } from '@shared/ui';
import { ConfirmDialog } from './ConfirmDialog';
import { DaySeparator } from './DaySeparator';
import { EditMessageDialog } from './EditMessageDialog';
import { ManageConversationMembersDialog } from './ManageConversationMembersDialog';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { RenameConversationDialog } from './RenameConversationDialog';

export interface ConversationThreadProps {
    readonly conversationUuid: string;
    readonly meUuid: string;
    /** Bouton retour (petit écran). */
    readonly onBack?: () => void;
    /** Appelé après « quitter » / « supprimer » : la conversation n'est plus visible. */
    readonly onLeft: () => void;
    /** Intervalle de polling des nouveaux messages (tests) — défaut : POLLING_INTERVAL_MS. */
    readonly pollingIntervalMs?: number;
}

/** Distance du bas (px) en deçà de laquelle l'utilisateur est considéré « en bas ». */
const NEAR_BOTTOM_PX = 80;

function isNearBottom(el: HTMLElement): boolean {
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
}

function scrollToBottom(el: HTMLElement): void {
    el.scrollTop = el.scrollHeight;
}

/** Vrai si le document est visible (pas de marquage lu en arrière-plan). */
function isDocumentVisible(): boolean {
    return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

/** Premier message d'une suite du même auteur (les messages système coupent la suite). */
function isFirstOfRun(messages: Message[], index: number): boolean {
    const previous = messages[index - 1];
    return !previous || previous.kind === 'system' || previous.authorUuid !== messages[index].authorUuid;
}

/** Droits sur un message texte non supprimé : édition (auteur) et suppression (auteur ou propriétaire du groupe). */
function computeMessagePermissions(
    message: Message,
    meUuid: string,
    isGroupOwner: boolean,
): { canEdit: boolean; canDelete: boolean } {
    if (message.kind !== 'text' || message.isDeleted) return { canEdit: false, canDelete: false };
    const isAuthor = message.authorUuid === meUuid;
    return { canEdit: isAuthor, canDelete: isAuthor || isGroupOwner };
}

/* ------------------------------------------------------------------ */
/*  Sous-composants                                                    */
/* ------------------------------------------------------------------ */

/**
 * Bulle d'un message du fil : fige les callbacks `onEdit` / `onDelete` par
 * message (la `MessageBubble` reste mémoïsée malgré les rendus du fil).
 */
const ThreadMessage = memo(function ThreadMessage({
    message,
    isMine,
    showAuthor,
    canEdit,
    canDelete,
    onRequestEdit,
    onRequestDelete,
}: {
    readonly message: Message;
    readonly isMine: boolean;
    readonly showAuthor: boolean;
    readonly canEdit: boolean;
    readonly canDelete: boolean;
    readonly onRequestEdit: (message: Message) => void;
    readonly onRequestDelete: (message: Message) => void;
}) {
    const handleEdit = useCallback(() => onRequestEdit(message), [onRequestEdit, message]);
    const handleDelete = useCallback(() => onRequestDelete(message), [onRequestDelete, message]);
    return (
        <MessageBubble
            message={message}
            isMine={isMine}
            showAuthor={showAuthor}
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={canEdit ? handleEdit : undefined}
            onDelete={canDelete ? handleDelete : undefined}
        />
    );
});

const ThreadHeader = memo(function ThreadHeader({
    conversation,
    meUuid,
    onBack,
    onOpenMembers,
    onRename,
    onLeave,
    onDelete,
}: {
    readonly conversation: Conversation;
    readonly meUuid: string;
    readonly onBack?: () => void;
    readonly onOpenMembers: () => void;
    readonly onRename: () => void;
    readonly onLeave: () => void;
    readonly onDelete: () => void;
}) {
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const isGroup = conversation.kind === 'group';
    const isOwner = isConversationOwner(conversation, meUuid);
    const title = getConversationTitle(conversation, meUuid);
    const other = getOtherMember(conversation, meUuid);
    const memberCount = conversation.members.length;
    const subtitle = isGroup ? `${memberCount} ${memberCount > 1 ? 'membres' : 'membre'}` : 'Conversation privée';

    const handleOpenMenu = useCallback((event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget), []);
    const handleCloseMenu = useCallback(() => setMenuAnchor(null), []);
    const handleRename = useCallback(() => {
        setMenuAnchor(null);
        onRename();
    }, [onRename]);
    const handleLeave = useCallback(() => {
        setMenuAnchor(null);
        onLeave();
    }, [onLeave]);
    const handleDelete = useCallback(() => {
        setMenuAnchor(null);
        onDelete();
    }, [onDelete]);

    return (
        <Box
            component="header"
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.25,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            {onBack && (
                <IconButton onClick={onBack} aria-label="Retour à la liste" size="small" edge="start">
                    <ArrowBackIcon />
                </IconButton>
            )}
            <Avatar
                src={other?.avatarUrl ?? undefined}
                alt={title}
                sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: '0.9rem', fontWeight: 700 }}
            >
                {isGroup ? <GroupsRoundedIcon fontSize="small" /> : getConversationInitials(conversation, meUuid)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" component="h2" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                    {title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="p">
                    {subtitle}
                </Typography>
            </Box>
            <Tooltip title="Membres" arrow>
                <IconButton onClick={onOpenMembers} aria-label="Membres" size="small">
                    <GroupOutlinedIcon />
                </IconButton>
            </Tooltip>
            {isGroup && (
                <>
                    <Tooltip title="Actions" arrow>
                        <IconButton
                            onClick={handleOpenMenu}
                            aria-label="Actions de la conversation"
                            aria-haspopup="menu"
                            aria-expanded={Boolean(menuAnchor)}
                            size="small"
                        >
                            <MoreVertIcon />
                        </IconButton>
                    </Tooltip>
                    <Menu
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={handleCloseMenu}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                        {isOwner && <MenuItem onClick={handleRename}>Renommer</MenuItem>}
                        <MenuItem onClick={handleLeave}>Quitter le groupe</MenuItem>
                        {isOwner && (
                            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                                Supprimer le groupe
                            </MenuItem>
                        )}
                    </Menu>
                </>
            )}
        </Box>
    );
});

/* ------------------------------------------------------------------ */
/*  Composant principal                                                */
/* ------------------------------------------------------------------ */

interface ScrollState {
    conversationUuid: string;
    count: number;
    firstUuid: string;
    latestUuid: string;
}

interface ReadState {
    conversationUuid: string;
    /** Dernier message pour lequel le marquage a été évalué. */
    latestUuid: string | null;
}

export const ConversationThread = memo(function ConversationThread({
    conversationUuid,
    meUuid,
    onBack,
    onLeft,
    pollingIntervalMs,
}: ConversationThreadProps) {
    const conversationQuery = useConversation(conversationUuid);
    const conversation = conversationQuery.data;
    const { messages, isLoading, isError, hasOlder, fetchOlder, isFetchingOlder } = useConversationMessages(
        conversationUuid,
        { pollingIntervalMs },
    );
    const { mutate: markRead } = useMarkConversationRead();
    const { mutateAsync: postMessageAsync, isPending: isSending } = usePostMessage();
    const { mutateAsync: deleteConversationAsync } = useDeleteConversation();
    const { mutateAsync: removeMemberAsync } = useRemoveConversationMember();
    const { mutateAsync: deleteMessageAsync } = useDeleteMessage();
    const { showNotification } = useNotification();

    const [membersOpen, setMembersOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
    /** Message en cours d'édition / de suppression (null : dialogue fermé). */
    const [editTarget, setEditTarget] = useState<Message | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
    const [hasNewMessages, setHasNewMessages] = useState(false);
    // Visibilité de l'onglet : aucun marquage lu en arrière-plan ; la ré-apparition
    // de l'onglet ré-évalue le marquage (messages arrivés pendant qu'il était masqué).
    const [isVisible, setIsVisible] = useState(isDocumentVisible);
    useEffect(() => {
        const handleVisibility = () => setIsVisible(isDocumentVisible());
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    const logRef = useRef<HTMLDivElement>(null);
    const nearBottomRef = useRef(true);
    const pendingOlderHeightRef = useRef<number | null>(null);
    const scrollStateRef = useRef<ScrollState | null>(null);
    const readStateRef = useRef<ReadState | null>(null);

    const latest = messages.length > 0 ? messages[messages.length - 1] : undefined;
    const latestUuid = latest?.uuid ?? null;
    const latestAuthorUuid = latest?.authorUuid ?? null;
    const firstUuid = messages[0]?.uuid ?? '';
    const conversationLoaded = Boolean(conversation);
    const unreadCount = conversation?.unreadCount ?? 0;
    const isOwner = conversation ? isConversationOwner(conversation, meUuid) : false;

    /* ---------- Marquage lu ---------- */
    useEffect(() => {
        // Onglet masqué : on n'avance pas l'état, l'évaluation reprendra à la ré-apparition.
        if (!conversationLoaded || isLoading || !isVisible) return;
        const state = readStateRef.current;
        if (!state || state.conversationUuid !== conversationUuid) {
            readStateRef.current = { conversationUuid, latestUuid };
            if (unreadCount > 0) markRead(conversationUuid);
            return;
        }
        if (latestUuid && latestUuid !== state.latestUuid) {
            state.latestUuid = latestUuid;
            if (latestAuthorUuid !== meUuid) markRead(conversationUuid);
        }
    }, [
        conversationLoaded,
        isLoading,
        isVisible,
        conversationUuid,
        latestUuid,
        latestAuthorUuid,
        unreadCount,
        meUuid,
        markRead,
    ]);

    /* ---------- Scroll ---------- */
    useLayoutEffect(() => {
        const el = logRef.current;
        const count = messages.length;
        const next: ScrollState = { conversationUuid, count, firstUuid, latestUuid: latestUuid ?? '' };
        const prev = scrollStateRef.current;
        scrollStateRef.current = next;

        if (!prev || prev.conversationUuid !== conversationUuid) {
            // Changement de conversation : état initial.
            nearBottomRef.current = true;
            pendingOlderHeightRef.current = null;
            setHasNewMessages(false);
            if (el && count > 0) scrollToBottom(el);
            return;
        }
        if (!el || count === 0) return;

        if (prev.count === 0) {
            scrollToBottom(el);
        } else if (pendingOlderHeightRef.current !== null && firstUuid !== prev.firstUuid) {
            // Messages plus anciens préfixés : conserver la position visuelle.
            el.scrollTop += el.scrollHeight - pendingOlderHeightRef.current;
            pendingOlderHeightRef.current = null;
        } else if (next.latestUuid !== prev.latestUuid) {
            if (latestAuthorUuid === meUuid || nearBottomRef.current) {
                scrollToBottom(el);
            } else {
                setHasNewMessages(true);
            }
        }
    }, [messages, conversationUuid, firstUuid, latestUuid, latestAuthorUuid, meUuid]);

    const handleScroll = useCallback(() => {
        const el = logRef.current;
        if (!el) return;
        nearBottomRef.current = isNearBottom(el);
        if (nearBottomRef.current) setHasNewMessages(false);
    }, []);

    const handleJumpToLatest = useCallback(() => {
        const el = logRef.current;
        if (el) scrollToBottom(el);
        nearBottomRef.current = true;
        setHasNewMessages(false);
    }, []);

    const handleLoadOlder = useCallback(() => {
        const el = logRef.current;
        pendingOlderHeightRef.current = el ? el.scrollHeight : null;
        fetchOlder();
    }, [fetchOlder]);

    /* ---------- Envoi ---------- */
    const handleSend = useCallback(
        async (body: string, entityRefs: EntityRefInput[], attachments: File[]) => {
            await postMessageAsync({ uuid: conversationUuid, body, entityRefs, attachments });
        },
        [postMessageAsync, conversationUuid],
    );

    /* ---------- Édition / suppression d'un message ---------- */
    const handleRequestEditMessage = useCallback((message: Message) => setEditTarget(message), []);
    const handleCloseEditMessage = useCallback(() => setEditTarget(null), []);
    const handleRequestDeleteMessage = useCallback((message: Message) => setDeleteTarget(message), []);
    const handleCancelDeleteMessage = useCallback(() => setDeleteTarget(null), []);

    const handleConfirmDeleteMessage = useCallback(async () => {
        const target = deleteTarget;
        setDeleteTarget(null);
        if (!target) return;
        try {
            await deleteMessageAsync({ uuid: conversationUuid, messageUuid: target.uuid });
            showNotification('Message supprimé', 'success');
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la suppression du message'), 'error');
        }
    }, [deleteTarget, deleteMessageAsync, conversationUuid, showNotification]);

    /* ---------- Actions de groupe ---------- */
    const handleOpenMembers = useCallback(() => setMembersOpen(true), []);
    const handleCloseMembers = useCallback(() => setMembersOpen(false), []);
    const handleOpenRename = useCallback(() => setRenameOpen(true), []);
    const handleCloseRename = useCallback(() => setRenameOpen(false), []);
    const handleRequestDelete = useCallback(() => setConfirmDeleteOpen(true), []);
    const handleCancelDelete = useCallback(() => setConfirmDeleteOpen(false), []);
    const handleCancelLeave = useCallback(() => setConfirmLeaveOpen(false), []);

    const handleConfirmDelete = useCallback(async () => {
        setConfirmDeleteOpen(false);
        try {
            await deleteConversationAsync(conversationUuid);
            showNotification('Groupe supprimé', 'success');
            onLeft();
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la suppression du groupe'), 'error');
        }
    }, [deleteConversationAsync, conversationUuid, showNotification, onLeft]);

    const performLeave = useCallback(async () => {
        setConfirmLeaveOpen(false);
        try {
            await removeMemberAsync({ uuid: conversationUuid, memberUuid: meUuid });
            showNotification('Vous avez quitté le groupe', 'success');
            onLeft();
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la sortie du groupe'), 'error');
        }
    }, [removeMemberAsync, conversationUuid, meUuid, showNotification, onLeft]);

    const handleRequestLeave = useCallback(() => {
        if (isOwner) {
            setConfirmLeaveOpen(true);
        } else {
            void performLeave();
        }
    }, [isOwner, performLeave]);

    const dayGroups = useMemo(() => groupMessagesByDay(messages), [messages]);
    const isGroupOwner = conversation?.kind === 'group' && isOwner;

    /* ---------- Rendu ---------- */
    if (conversationQuery.isLoading || isLoading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
                <CircularProgress aria-label="Chargement de la conversation" />
            </Box>
        );
    }

    // Une erreur de rafraîchissement n'efface pas des données déjà affichées :
    // l'état d'erreur n'est rendu que sans conversation ni message chargés.
    if (!conversation || (isError && messages.length === 0)) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">Impossible de charger la conversation</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, minWidth: 0 }}>
            <ThreadHeader
                conversation={conversation}
                meUuid={meUuid}
                onBack={onBack}
                onOpenMembers={handleOpenMembers}
                onRename={handleOpenRename}
                onLeave={handleRequestLeave}
                onDelete={handleRequestDelete}
            />

            <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <Box ref={logRef} onScroll={handleScroll} sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
                    {hasOlder && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                            {isFetchingOlder ? (
                                <CircularProgress size={20} aria-label="Chargement des messages précédents" />
                            ) : (
                                <Button size="small" variant="text" onClick={handleLoadOlder}>
                                    Charger les messages précédents
                                </Button>
                            )}
                        </Box>
                    )}

                    {/* Région live limitée aux messages : le bouton de chargement n'est pas annoncé. */}
                    <Box role="log" aria-live="polite" aria-label="Messages">
                        {messages.length === 0 ? (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ textAlign: 'center', mt: 4, fontStyle: 'italic' }}
                            >
                                Aucun message. Écrivez le premier !
                            </Typography>
                        ) : (
                            dayGroups.map((group) => (
                                <Box key={group.dayKey}>
                                    <DaySeparator label={group.label} />
                                    {group.messages.map((message, index) => {
                                        const { canEdit, canDelete } = computeMessagePermissions(
                                            message,
                                            meUuid,
                                            isGroupOwner,
                                        );
                                        return (
                                            <ThreadMessage
                                                key={message.uuid}
                                                message={message}
                                                isMine={message.authorUuid === meUuid}
                                                showAuthor={isFirstOfRun(group.messages, index)}
                                                canEdit={canEdit}
                                                canDelete={canDelete}
                                                onRequestEdit={handleRequestEditMessage}
                                                onRequestDelete={handleRequestDeleteMessage}
                                            />
                                        );
                                    })}
                                </Box>
                            ))
                        )}
                    </Box>
                </Box>

                {hasNewMessages && (
                    <Chip
                        label="Nouveaux messages ↓"
                        color="primary"
                        size="small"
                        onClick={handleJumpToLatest}
                        sx={{
                            position: 'absolute',
                            bottom: 12,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            boxShadow: 3,
                            fontWeight: 600,
                        }}
                    />
                )}
            </Box>

            <MessageComposer onSend={handleSend} isSending={isSending} />

            <ManageConversationMembersDialog
                open={membersOpen}
                onClose={handleCloseMembers}
                conversation={conversation}
                meUuid={meUuid}
                onLeft={onLeft}
            />
            {conversation.kind === 'group' && (
                <RenameConversationDialog open={renameOpen} onClose={handleCloseRename} conversation={conversation} />
            )}
            <ConfirmDialog
                open={confirmDeleteOpen}
                title="Supprimer le groupe ?"
                text="Cette action est définitive : la conversation et tous ses messages seront supprimés."
                confirmLabel="Supprimer"
                ariaLabel="Confirmer la suppression du groupe"
                onCancel={handleCancelDelete}
                onConfirm={handleConfirmDelete}
            />
            <ConfirmDialog
                open={confirmLeaveOpen}
                title="Quitter le groupe ?"
                text="Vous êtes propriétaire de ce groupe. La propriété sera transférée au membre le plus ancien."
                confirmLabel="Quitter"
                ariaLabel="Confirmer le départ du groupe"
                onCancel={handleCancelLeave}
                onConfirm={performLeave}
            />
            <EditMessageDialog
                open={editTarget !== null}
                onClose={handleCloseEditMessage}
                conversationUuid={conversationUuid}
                message={editTarget}
            />
            <ConfirmDialog
                open={deleteTarget !== null}
                title="Supprimer le message ?"
                text="Le message sera remplacé par « Message supprimé » pour tous les membres. Ses références et pièces jointes seront retirées."
                confirmLabel="Supprimer"
                ariaLabel="Confirmer la suppression du message"
                onCancel={handleCancelDeleteMessage}
                onConfirm={handleConfirmDeleteMessage}
            />
        </Box>
    );
});
