/**
 * SharedTasksWidget — widget d'accueil « Listes partagées ».
 * @module features/task-list/ui
 *
 * Listes de tâches collaboratives à visibilité restreinte (owner + membres
 * invités). Sélecteur de liste (chips scrollables, Select au-delà de 3),
 * avatars des membres, actions owner/membre (gérer les membres, renommer,
 * quitter, supprimer) et corps TaskListBoard.
 */

import { memo, useCallback, useMemo, useState } from 'react';
import {
    Avatar,
    AvatarGroup,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Select,
    Skeleton,
    Stack,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { useDeleteTaskList, useRemoveTaskListMember, useTaskLists, type TaskListSummary } from '@entities/task-list';
import { formatUserDisplayName, useMe, useUserLookup } from '@entities/user';
import SectionCard from '@widgets/SectionCard';
import { getErrorMessage } from '@shared/lib';
import { ColorDot, useNotification } from '@shared/ui';
import { motion } from '@shared/ui/motion';
import { getListColorValue } from '../lib/list-colors';
import { TaskListBoard } from './TaskListBoard';
import { CreateTaskListDialog } from './CreateTaskListDialog';
import { ManageMembersDialog } from './ManageMembersDialog';

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** État vide : aucune liste visible — CTA de création. */
const EmptyLists = memo(function EmptyLists({ onCreate }: { readonly onCreate: () => void }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    return (
        <Box
            sx={{
                textAlign: 'center',
                py: 4,
                px: 2,
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: alpha(theme.palette.primary.main, isDark ? 0.04 : 0.025),
            }}
        >
            <Box
                sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.primary.main, isDark ? 0.15 : 0.08),
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1.5,
                }}
            >
                <PlaylistAddCheckIcon sx={{ fontSize: 26, color: 'primary.main' }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.25 }}>
                Aucune liste partagée
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Créez une liste et invitez des collègues pour collaborer
            </Typography>
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={onCreate}>
                Créer une liste
            </Button>
        </Box>
    );
});

/** Avatars des membres (owner en premier), noms résolus via l'annuaire. */
const MemberAvatars = memo(function MemberAvatars({ list }: { readonly list: TaskListSummary }) {
    const { data: users } = useUserLookup();

    const uuids = useMemo(
        () => [list.ownerUuid, ...list.memberUuids.filter((uuid) => uuid !== list.ownerUuid)],
        [list.ownerUuid, list.memberUuids],
    );

    return (
        <AvatarGroup
            max={4}
            sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.6rem', fontWeight: 700 } }}
        >
            {uuids.map((uuid) => {
                const user = users?.find((u) => u.uuid === uuid);
                const name = user ? formatUserDisplayName(user) : `${uuid.slice(0, 8)}…`;
                const initials = user
                    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() ||
                      user.username.slice(0, 2).toUpperCase()
                    : '?';
                const isOwner = uuid === list.ownerUuid;
                return (
                    <Tooltip key={uuid} title={isOwner ? `${name} (propriétaire)` : name} arrow>
                        <Avatar src={user?.avatarUrl ?? undefined} alt={name}>
                            {initials}
                        </Avatar>
                    </Tooltip>
                );
            })}
        </AvatarGroup>
    );
});

/** Sélecteur de liste : chips scrollables (≤ 3 listes) ou Select (> 3). */
const ListSelector = memo(function ListSelector({
    lists,
    selectedUuid,
    onSelect,
}: {
    readonly lists: TaskListSummary[];
    readonly selectedUuid: string;
    readonly onSelect: (uuid: string) => void;
}) {
    if (lists.length > 3) {
        return (
            <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
                <Select
                    value={selectedUuid}
                    onChange={(e) => onSelect(e.target.value)}
                    inputProps={{ 'aria-label': 'Choisir une liste' }}
                >
                    {lists.map((list) => {
                        const remaining = list.taskCount - list.doneCount;
                        return (
                            <MenuItem key={list.uuid} value={list.uuid}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                    <ColorDot color={getListColorValue(list.color)} size={8} />
                                    <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                                        {list.name}
                                    </Typography>
                                    {remaining > 0 && (
                                        <Typography variant="caption" color="text.secondary">
                                            {remaining} restante{remaining > 1 ? 's' : ''}
                                        </Typography>
                                    )}
                                </Box>
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>
        );
    }

    return (
        <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.5, mb: 1 }}>
            {lists.map((list) => {
                const remaining = list.taskCount - list.doneCount;
                const isSelected = list.uuid === selectedUuid;
                return (
                    <Chip
                        key={list.uuid}
                        icon={<ColorDot color={getListColorValue(list.color)} size={8} sx={{ ml: 0.75 }} />}
                        label={remaining > 0 ? `${list.name} · ${remaining}` : list.name}
                        onClick={() => onSelect(list.uuid)}
                        variant={isSelected ? 'filled' : 'outlined'}
                        color={isSelected ? 'primary' : 'default'}
                        size="small"
                        aria-pressed={isSelected}
                        sx={{ flexShrink: 0, fontWeight: 600, transition: `all ${motion.fast}` }}
                    />
                );
            })}
        </Box>
    );
});

/* ------------------------------------------------------------------ */
/*  Main widget                                                        */
/* ------------------------------------------------------------------ */

export default memo(function SharedTasksWidget() {
    const { data: lists, isLoading, isError } = useTaskLists();
    const { data: me } = useMe();
    const deleteList = useDeleteTaskList();
    const removeMember = useRemoveTaskListMember();
    const { showNotification } = useNotification();

    const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [membersOpen, setMembersOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    // Sélection persistée en state ; défaut = première liste, avec repli si la
    // liste sélectionnée a disparu (suppression / sortie).
    const selectedList = useMemo(() => {
        if (!lists || lists.length === 0) return null;
        return lists.find((l) => l.uuid === selectedUuid) ?? lists[0];
    }, [lists, selectedUuid]);

    const isOwner = Boolean(me && selectedList && me.uuid === selectedList.ownerUuid);

    const handleSelect = useCallback((uuid: string) => setSelectedUuid(uuid), []);
    const handleOpenMenu = useCallback((e: React.MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget), []);
    const handleCloseMenu = useCallback(() => setMenuAnchor(null), []);
    const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
    const handleCloseCreate = useCallback(() => setCreateOpen(false), []);
    const handleCloseEdit = useCallback(() => setEditOpen(false), []);
    const handleCloseMembers = useCallback(() => setMembersOpen(false), []);
    const handleCloseConfirmDelete = useCallback(() => setConfirmDeleteOpen(false), []);

    const handleMenuMembers = useCallback(() => {
        setMenuAnchor(null);
        setMembersOpen(true);
    }, []);
    const handleMenuEdit = useCallback(() => {
        setMenuAnchor(null);
        setEditOpen(true);
    }, []);
    const handleMenuDelete = useCallback(() => {
        setMenuAnchor(null);
        setConfirmDeleteOpen(true);
    }, []);

    const handleLeaveList = useCallback(async () => {
        setMenuAnchor(null);
        if (!me || !selectedList) return;
        try {
            await removeMember.mutateAsync({ listUuid: selectedList.uuid, userUuid: me.uuid });
            setSelectedUuid(null);
            showNotification('Vous avez quitté la liste', 'success');
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la sortie de la liste'), 'error');
        }
    }, [me, selectedList, removeMember, showNotification]);

    const handleConfirmDelete = useCallback(async () => {
        if (!selectedList) return;
        try {
            await deleteList.mutateAsync(selectedList.uuid);
            setConfirmDeleteOpen(false);
            setSelectedUuid(null);
            showNotification('Liste supprimée avec succès', 'success');
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la suppression de la liste'), 'error');
        }
    }, [selectedList, deleteList, showNotification]);

    const headerAction = (
        <Stack direction="row" spacing={0.5} alignItems="center">
            {selectedList && <MemberAvatars list={selectedList} />}
            <Tooltip title="Créer une liste" arrow>
                <IconButton size="small" onClick={handleOpenCreate} aria-label="Nouvelle liste" sx={{ p: 0.5 }}>
                    <AddIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </Tooltip>
            {selectedList && (
                <Tooltip title="Actions de la liste" arrow>
                    <IconButton size="small" onClick={handleOpenMenu} aria-label="Actions de la liste" sx={{ p: 0.5 }}>
                        <MoreVertIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
            )}
        </Stack>
    );

    return (
        <SectionCard title="Listes partagées" action={headerAction}>
            {isLoading && (
                <Stack spacing={1} data-testid="shared-tasks-skeleton">
                    <Skeleton variant="rounded" height={28} />
                    <Skeleton variant="rounded" height={36} />
                    <Skeleton variant="rounded" height={80} />
                </Stack>
            )}

            {isError && !isLoading && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    Impossible de charger les listes partagées.
                </Typography>
            )}

            {!isLoading && !isError && (!lists || lists.length === 0) && <EmptyLists onCreate={handleOpenCreate} />}

            {!isLoading && !isError && lists && lists.length > 0 && selectedList && (
                <>
                    <ListSelector lists={lists} selectedUuid={selectedList.uuid} onSelect={handleSelect} />
                    <TaskListBoard listUuid={selectedList.uuid} />
                </>
            )}

            <Menu open={Boolean(menuAnchor)} anchorEl={menuAnchor} onClose={handleCloseMenu}>
                <MenuItem onClick={handleMenuMembers}>
                    <ListItemIcon>
                        <GroupOutlinedIcon sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText
                        primary={isOwner ? 'Gérer les membres' : 'Voir les membres'}
                        primaryTypographyProps={{ variant: 'body2' }}
                    />
                </MenuItem>
                {isOwner && (
                    <MenuItem onClick={handleMenuEdit}>
                        <ListItemIcon>
                            <EditOutlinedIcon sx={{ fontSize: 18 }} />
                        </ListItemIcon>
                        <ListItemText primary="Renommer / couleur" primaryTypographyProps={{ variant: 'body2' }} />
                    </MenuItem>
                )}
                {!isOwner && (
                    <MenuItem onClick={handleLeaveList}>
                        <ListItemIcon>
                            <LogoutIcon sx={{ fontSize: 18 }} />
                        </ListItemIcon>
                        <ListItemText primary="Quitter la liste" primaryTypographyProps={{ variant: 'body2' }} />
                    </MenuItem>
                )}
                {isOwner && (
                    <MenuItem onClick={handleMenuDelete} sx={{ color: 'error.main' }}>
                        <ListItemIcon>
                            <DeleteOutlineIcon sx={{ fontSize: 18, color: 'error.main' }} />
                        </ListItemIcon>
                        <ListItemText primary="Supprimer la liste" primaryTypographyProps={{ variant: 'body2' }} />
                    </MenuItem>
                )}
            </Menu>

            <CreateTaskListDialog open={createOpen} onClose={handleCloseCreate} />
            {selectedList && <CreateTaskListDialog open={editOpen} onClose={handleCloseEdit} list={selectedList} />}
            {selectedList && (
                <ManageMembersDialog open={membersOpen} onClose={handleCloseMembers} list={selectedList} />
            )}

            <Dialog
                open={confirmDeleteOpen}
                onClose={handleCloseConfirmDelete}
                maxWidth="xs"
                fullWidth
                aria-label="Confirmer la suppression"
            >
                <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>Supprimer la liste ?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        La liste « {selectedList?.name} », ses tâches et ses commentaires seront définitivement
                        supprimés pour tous les membres.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button onClick={handleCloseConfirmDelete} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        variant="contained"
                        color="error"
                        size="small"
                        disabled={deleteList.isPending}
                    >
                        {deleteList.isPending ? 'Suppression...' : 'Supprimer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </SectionCard>
    );
});
