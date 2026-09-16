/**
 * ManageConversationMembersDialog — membres d'une conversation.
 * @module features/messaging/ui
 *
 * Groupe : liste des membres (propriétaire en premier, mention
 * « (propriétaire) », badge « inactif »), retrait par le propriétaire,
 * ajout via UserMultiSelect (tout membre), pied « Quitter le groupe » (tous ;
 * confirmation si je suis propriétaire : la propriété est transférée).
 * Conversation privée : liste des 2 membres en lecture seule, aucune action.
 * Après un départ réussi : `onLeft()` (la page navigue vers la liste).
 */

import { memo, useCallback, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import LogoutIcon from '@mui/icons-material/Logout';

import {
    formatUserSummaryName,
    getConversationTitle,
    isConversationOwner,
    useAddConversationMembers,
    useRemoveConversationMember,
    type Conversation,
    type ConversationMember,
} from '@entities/messaging';
import { UserChip, UserMultiSelect } from '@entities/user';
import { getErrorMessage } from '@shared/lib';
import { useNotification } from '@shared/ui';

export interface ManageConversationMembersDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly conversation: Conversation;
    readonly meUuid: string;
    /** Appelé après que l'utilisateur a quitté le groupe (la conversation n'est plus visible). */
    readonly onLeft: () => void;
}

const MemberRow = memo(function MemberRow({
    member,
    isOwnerRow,
    canRemove,
    onRemove,
}: {
    readonly member: ConversationMember;
    readonly isOwnerRow: boolean;
    readonly canRemove: boolean;
    readonly onRemove: (uuid: string) => void;
}) {
    const handleRemove = useCallback(() => onRemove(member.uuid), [onRemove, member.uuid]);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <UserChip userUuid={member.uuid} fallbackText={formatUserSummaryName(member)} />
                {isOwnerRow && (
                    <Typography component="span" variant="caption" color="text.secondary">
                        (propriétaire)
                    </Typography>
                )}
                {!member.isActive && <Chip label="inactif" size="small" variant="outlined" color="default" />}
            </Box>
            {canRemove && (
                <Tooltip title="Retirer du groupe" arrow>
                    <IconButton
                        size="small"
                        onClick={handleRemove}
                        aria-label="Retirer le membre"
                        sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                    >
                        <PersonRemoveIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    );
});

/** Propriétaire en premier, puis par ordre d'adhésion. */
function sortMembers(members: ConversationMember[], ownerUuid: string): ConversationMember[] {
    return [...members].sort((a, b) => {
        if (a.uuid === ownerUuid) return -1;
        if (b.uuid === ownerUuid) return 1;
        return a.joinedAt < b.joinedAt ? -1 : a.joinedAt > b.joinedAt ? 1 : 0;
    });
}

export const ManageConversationMembersDialog = memo(function ManageConversationMembersDialog({
    open,
    onClose,
    conversation,
    meUuid,
    onLeft,
}: ManageConversationMembersDialogProps) {
    const isGroup = conversation.kind === 'group';
    const isOwner = isConversationOwner(conversation, meUuid);
    const addMembers = useAddConversationMembers();
    const removeMember = useRemoveConversationMember();
    const { showNotification } = useNotification();

    const [addUuids, setAddUuids] = useState<string[]>([]);
    const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

    const sortedMembers = useMemo(
        () => sortMembers(conversation.members, conversation.ownerUuid),
        [conversation.members, conversation.ownerUuid],
    );

    /** Membres déjà présents : exclus de la sélection d'ajout. */
    const memberUuids = useMemo(() => new Set(conversation.members.map((m) => m.uuid)), [conversation.members]);

    const handleAddChange = useCallback(
        (uuids: string[]) => setAddUuids(uuids.filter((uuid) => !memberUuids.has(uuid))),
        [memberUuids],
    );

    const handleAdd = useCallback(async () => {
        if (addUuids.length === 0) return;
        try {
            await addMembers.mutateAsync({ uuid: conversation.uuid, memberUuids: addUuids });
            setAddUuids([]);
            showNotification('Membres ajoutés au groupe', 'success');
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, "Erreur lors de l'ajout des membres"), 'error');
        }
    }, [addUuids, addMembers, conversation.uuid, showNotification]);

    const handleRemove = useCallback(
        async (memberUuid: string) => {
            try {
                await removeMember.mutateAsync({ uuid: conversation.uuid, memberUuid });
                showNotification('Membre retiré du groupe', 'success');
            } catch (err: unknown) {
                showNotification(getErrorMessage(err, 'Erreur lors du retrait du membre'), 'error');
            }
        },
        [removeMember, conversation.uuid, showNotification],
    );

    const performLeave = useCallback(async () => {
        setConfirmLeaveOpen(false);
        try {
            await removeMember.mutateAsync({ uuid: conversation.uuid, memberUuid: meUuid });
            showNotification('Vous avez quitté le groupe', 'success');
            onClose();
            onLeft();
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la sortie du groupe'), 'error');
        }
    }, [removeMember, conversation.uuid, meUuid, showNotification, onClose, onLeft]);

    const handleLeaveClick = useCallback(() => {
        if (isOwner) {
            setConfirmLeaveOpen(true);
        } else {
            void performLeave();
        }
    }, [isOwner, performLeave]);

    const handleCancelLeave = useCallback(() => setConfirmLeaveOpen(false), []);

    const title = getConversationTitle(conversation, meUuid);

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="xs"
                fullWidth
                aria-label="Membres de la conversation"
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>Membres — {title}</DialogTitle>
                <DialogContent sx={{ pt: 0.5 }}>
                    <Stack spacing={0.25}>
                        {sortedMembers.map((member) => (
                            <MemberRow
                                key={member.uuid}
                                member={member}
                                isOwnerRow={member.uuid === conversation.ownerUuid}
                                canRemove={isGroup && isOwner && member.uuid !== meUuid}
                                onRemove={handleRemove}
                            />
                        ))}
                    </Stack>

                    {isGroup && (
                        <Box sx={{ display: 'flex', gap: 1, mt: 2.5, alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1 }}>
                                <UserMultiSelect
                                    value={addUuids}
                                    onChange={handleAddChange}
                                    label="Ajouter des membres"
                                    ariaLabel="Ajouter des membres"
                                />
                            </Box>
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleAdd}
                                disabled={addUuids.length === 0 || addMembers.isPending}
                                sx={{ mt: 0.25 }}
                            >
                                {addMembers.isPending ? 'Envoi...' : 'Ajouter'}
                            </Button>
                        </Box>
                    )}
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5, justifyContent: isGroup ? 'space-between' : 'flex-end' }}>
                    {isGroup && (
                        <Button
                            color="error"
                            variant="text"
                            startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
                            onClick={handleLeaveClick}
                            disabled={removeMember.isPending}
                            sx={{ fontWeight: 600 }}
                        >
                            Quitter le groupe
                        </Button>
                    )}
                    <Button onClick={onClose} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                        Fermer
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmLeaveOpen}
                onClose={handleCancelLeave}
                maxWidth="xs"
                fullWidth
                aria-label="Confirmer le départ du groupe"
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>Quitter le groupe ?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Vous êtes propriétaire de ce groupe. La propriété sera transférée au membre le plus ancien.
                    </DialogContentText>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button onClick={handleCancelLeave} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                        Annuler
                    </Button>
                    <Button onClick={performLeave} variant="contained" color="error" size="small">
                        Quitter
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
});
