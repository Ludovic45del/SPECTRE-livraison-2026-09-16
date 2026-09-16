/**
 * ManageMembersDialog — gestion des membres d'une liste partagée.
 * @module features/task-list/ui
 *
 * Owner : liste des membres (retirables) + invitation via UserMultiSelect.
 * Membre simple : consultation + bouton « Quitter la liste ».
 * L'owner est affiché en premier avec la mention « (propriétaire) », non retirable.
 */

import { memo, useCallback, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import LogoutIcon from '@mui/icons-material/Logout';

import { useAddTaskListMembers, useRemoveTaskListMember, type TaskListSummary } from '@entities/task-list';
import { UserChip, UserMultiSelect, useMe } from '@entities/user';
import { getErrorMessage } from '@shared/lib';
import { useNotification } from '@shared/ui';

export interface ManageMembersDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly list: TaskListSummary;
}

const MemberRow = memo(function MemberRow({
    userUuid,
    isOwnerRow,
    canRemove,
    onRemove,
}: {
    readonly userUuid: string;
    readonly isOwnerRow: boolean;
    readonly canRemove: boolean;
    readonly onRemove: (uuid: string) => void;
}) {
    const handleRemove = useCallback(() => onRemove(userUuid), [onRemove, userUuid]);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <UserChip userUuid={userUuid} />
                {isOwnerRow && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                        (propriétaire)
                    </Typography>
                )}
            </Box>
            {canRemove && (
                <Tooltip title="Retirer de la liste" arrow>
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

export const ManageMembersDialog = memo(function ManageMembersDialog({
    open,
    onClose,
    list,
}: ManageMembersDialogProps) {
    const { data: me } = useMe();
    const isOwner = Boolean(me && me.uuid === list.ownerUuid);
    const addMembers = useAddTaskListMembers();
    const removeMember = useRemoveTaskListMember();
    const { showNotification } = useNotification();

    const [inviteUuids, setInviteUuids] = useState<string[]>([]);

    /** Owner + membres déjà présents : exclus de la sélection d'invitation. */
    const excludedUuids = useMemo(
        () => new Set([list.ownerUuid, ...list.memberUuids]),
        [list.ownerUuid, list.memberUuids],
    );

    const handleInviteChange = useCallback(
        (uuids: string[]) => setInviteUuids(uuids.filter((uuid) => !excludedUuids.has(uuid))),
        [excludedUuids],
    );

    const handleInvite = useCallback(async () => {
        if (inviteUuids.length === 0) return;
        try {
            await addMembers.mutateAsync({ listUuid: list.uuid, userUuids: inviteUuids });
            setInviteUuids([]);
            showNotification('Membres invités avec succès', 'success');
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, "Erreur lors de l'invitation des membres"), 'error');
        }
    }, [inviteUuids, addMembers, list.uuid, showNotification]);

    const handleRemove = useCallback(
        async (userUuid: string) => {
            try {
                await removeMember.mutateAsync({ listUuid: list.uuid, userUuid });
                showNotification('Membre retiré de la liste', 'success');
            } catch (err: unknown) {
                showNotification(getErrorMessage(err, 'Erreur lors du retrait du membre'), 'error');
            }
        },
        [removeMember, list.uuid, showNotification],
    );

    const handleLeave = useCallback(async () => {
        if (!me) return;
        try {
            await removeMember.mutateAsync({ listUuid: list.uuid, userUuid: me.uuid });
            showNotification('Vous avez quitté la liste', 'success');
            onClose();
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la sortie de la liste'), 'error');
        }
    }, [me, removeMember, list.uuid, showNotification, onClose]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            aria-label="Gérer les membres"
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>Membres — {list.name}</DialogTitle>
            <DialogContent sx={{ pt: 0.5 }}>
                <Stack spacing={0.25}>
                    <MemberRow userUuid={list.ownerUuid} isOwnerRow canRemove={false} onRemove={handleRemove} />
                    {list.memberUuids.map((uuid) => (
                        <MemberRow
                            key={uuid}
                            userUuid={uuid}
                            isOwnerRow={false}
                            canRemove={isOwner}
                            onRemove={handleRemove}
                        />
                    ))}
                    {list.memberUuids.length === 0 && (
                        <Typography variant="caption" color="text.secondary">
                            Aucun membre invité pour le moment.
                        </Typography>
                    )}
                </Stack>

                {isOwner && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 2.5, alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                            <UserMultiSelect
                                value={inviteUuids}
                                onChange={handleInviteChange}
                                label="Ajouter des membres"
                                ariaLabel="Ajouter des membres"
                            />
                        </Box>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleInvite}
                            disabled={inviteUuids.length === 0 || addMembers.isPending}
                            sx={{ mt: 0.25 }}
                        >
                            {addMembers.isPending ? 'Envoi...' : 'Inviter'}
                        </Button>
                    </Box>
                )}
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 1.5, justifyContent: isOwner ? 'flex-end' : 'space-between' }}>
                {!isOwner && me && (
                    <Button
                        color="error"
                        variant="text"
                        startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
                        onClick={handleLeave}
                        disabled={removeMember.isPending}
                        sx={{ fontWeight: 600 }}
                    >
                        Quitter la liste
                    </Button>
                )}
                <Button onClick={onClose} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                    Fermer
                </Button>
            </DialogActions>
        </Dialog>
    );
});
