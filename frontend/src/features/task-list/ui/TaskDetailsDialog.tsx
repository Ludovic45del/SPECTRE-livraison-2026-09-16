/**
 * TaskDetailsDialog — édition complète d'une tâche + fil de commentaires.
 * @module features/task-list/ui
 *
 * Titre / note enregistrés au blur (PATCH partiel) ; priorité / échéance /
 * assigné enregistrés au changement. L'assigné est limité aux membres + owner
 * de la liste (filtre client sur l'annuaire). Les commentaires sont ajoutés /
 * supprimés en direct (suppression réservée à l'auteur ou à l'owner).
 */

import { memo, useCallback, useMemo, useState } from 'react';
import {
    Avatar,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import {
    PRIORITIES_DESC,
    PRIORITY_LABELS,
    PRIORITY_SX_COLORS,
    useAddTaskComment,
    useDeleteTaskComment,
    useTaskComments,
    useUpdateTaskItem,
    type TaskComment,
    type TaskItem,
    type TaskItemPatch,
    type TaskListDetail,
    type TaskPriority,
} from '@entities/task-list';
import { formatUserDisplayName, useMe, useUserLookup, type UserLookup } from '@entities/user';
import { getErrorMessage } from '@shared/lib';
import { useNotification } from '@shared/ui';

dayjs.extend(relativeTime);

export interface TaskDetailsDialogProps {
    readonly list: TaskListDetail;
    /** Tâche à éditer — null ferme le dialog. */
    readonly task: TaskItem | null;
    readonly onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Commentaires                                                       */
/* ------------------------------------------------------------------ */

const CommentRow = memo(function CommentRow({
    comment,
    canDelete,
    onDelete,
}: {
    readonly comment: TaskComment;
    readonly canDelete: boolean;
    readonly onDelete: (comment: TaskComment) => void;
}) {
    const { data: users } = useUserLookup();
    const author = comment.authorUuid ? users?.find((u) => u.uuid === comment.authorUuid) : undefined;
    const name = author ? formatUserDisplayName(author) : 'Utilisateur inconnu';
    const initials = author
        ? `${author.firstName?.[0] ?? ''}${author.lastName?.[0] ?? ''}`.toUpperCase() ||
          author.username.slice(0, 2).toUpperCase()
        : '?';

    const handleDelete = useCallback(() => onDelete(comment), [onDelete, comment]);

    return (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', '&:hover .comment-delete': { opacity: 1 } }}>
            <Avatar
                src={author?.avatarUrl ?? undefined}
                alt={name}
                sx={{ width: 24, height: 24, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'primary.main', mt: 0.25 }}
            >
                {initials}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                        {name}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                        {dayjs(comment.createdAt).fromNow()}
                    </Typography>
                </Box>
                <Typography
                    variant="body2"
                    sx={{ fontSize: '0.825rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                    {comment.text}
                </Typography>
            </Box>
            {canDelete && (
                <IconButton
                    className="comment-delete"
                    size="small"
                    onClick={handleDelete}
                    aria-label="Supprimer le commentaire"
                    sx={{ opacity: 0, p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                >
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
            )}
        </Box>
    );
});

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const TaskDetailsDialog = memo(function TaskDetailsDialog({ list, task, onClose }: TaskDetailsDialogProps) {
    const open = Boolean(task);
    const { data: me } = useMe();
    const { data: users } = useUserLookup();
    const updateTask = useUpdateTaskItem();
    const commentsQuery = useTaskComments(list.uuid, task?.uuid ?? null, open);
    const addComment = useAddTaskComment();
    const deleteComment = useDeleteTaskComment();
    const { showNotification } = useNotification();

    const [title, setTitle] = useState('');
    const [note, setNote] = useState('');
    const [commentText, setCommentText] = useState('');
    const [editedUuid, setEditedUuid] = useState<string | null>(null);

    // Réinitialise les champs locaux quand on ouvre une autre tâche
    // (pattern React "derive state during render", pas d'effet).
    if (task && task.uuid !== editedUuid) {
        setEditedUuid(task.uuid);
        setTitle(task.title);
        setNote(task.note);
        setCommentText('');
    }

    /** Options d'assignation limitées aux owner + membres de la liste. */
    const assigneeOptions = useMemo<UserLookup[]>(() => {
        const allowed = new Set([list.ownerUuid, ...list.memberUuids]);
        return (users ?? []).filter((u) => allowed.has(u.uuid));
    }, [users, list.ownerUuid, list.memberUuids]);

    const patch = useCallback(
        (data: TaskItemPatch) => {
            if (!task) return;
            updateTask.mutate(
                { listUuid: list.uuid, taskUuid: task.uuid, data },
                {
                    onError: (err) =>
                        showNotification(getErrorMessage(err, 'Erreur lors de la mise à jour de la tâche'), 'error'),
                },
            );
        },
        [task, list.uuid, updateTask, showNotification],
    );

    const handleTitleBlur = useCallback(() => {
        if (!task) return;
        const trimmed = title.trim();
        if (!trimmed) {
            setTitle(task.title);
            return;
        }
        if (trimmed !== task.title) patch({ title: trimmed });
    }, [task, title, patch]);

    const handleNoteBlur = useCallback(() => {
        if (!task) return;
        if (note !== task.note) patch({ note });
    }, [task, note, patch]);

    const handlePriorityChange = useCallback((priority: TaskPriority) => patch({ priority }), [patch]);

    const handleDueDateChange = useCallback(
        (value: Dayjs | null) => {
            if (value !== null && !value.isValid()) return;
            patch({ dueDate: value ? value.format('YYYY-MM-DD') : null });
        },
        [patch],
    );

    const handleAssigneeChange = useCallback((value: string) => patch({ assigneeUuid: value || null }), [patch]);

    const handleAddComment = useCallback(() => {
        if (!task) return;
        const text = commentText.trim();
        if (!text || addComment.isPending) return;
        addComment.mutate(
            { listUuid: list.uuid, taskUuid: task.uuid, text },
            {
                onSuccess: () => setCommentText(''),
                onError: (err) =>
                    showNotification(getErrorMessage(err, "Erreur lors de l'ajout du commentaire"), 'error'),
            },
        );
    }, [task, commentText, addComment, list.uuid, showNotification]);

    const handleDeleteComment = useCallback(
        (comment: TaskComment) => {
            if (!task) return;
            deleteComment.mutate(
                { listUuid: list.uuid, taskUuid: task.uuid, commentUuid: comment.uuid },
                {
                    onError: (err) =>
                        showNotification(getErrorMessage(err, 'Erreur lors de la suppression du commentaire'), 'error'),
                },
            );
        },
        [task, deleteComment, list.uuid, showNotification],
    );

    const handleCommentKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddComment();
            }
        },
        [handleAddComment],
    );

    const canDeleteComment = useCallback(
        (comment: TaskComment) => Boolean(me && (comment.authorUuid === me.uuid || me.uuid === list.ownerUuid)),
        [me, list.ownerUuid],
    );

    const comments = commentsQuery.data ?? [];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-label="Détails de la tâche">
            <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem', pb: 1 }}>Détails de la tâche</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ pt: 0.5 }}>
                    <TextField
                        label="Titre"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        fullWidth
                        required
                        inputProps={{ maxLength: 300, 'aria-label': 'Titre de la tâche' }}
                    />
                    <TextField
                        label="Note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onBlur={handleNoteBlur}
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={6}
                        inputProps={{ maxLength: 4000, 'aria-label': 'Note de la tâche' }}
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="task-priority-label">Priorité</InputLabel>
                            <Select
                                labelId="task-priority-label"
                                label="Priorité"
                                value={task?.priority ?? 'normal'}
                                onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                                inputProps={{ 'aria-label': 'Priorité de la tâche' }}
                            >
                                {PRIORITIES_DESC.map((p) => (
                                    <MenuItem key={p} value={p}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <FlagIcon sx={{ fontSize: 14, color: PRIORITY_SX_COLORS[p] }} />
                                            {PRIORITY_LABELS[p]}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <DatePicker
                            label="Échéance"
                            value={task?.dueDate ? dayjs(task.dueDate) : null}
                            onChange={handleDueDateChange}
                            slotProps={{
                                textField: { fullWidth: true, size: 'small' },
                                field: { clearable: true },
                            }}
                        />
                    </Stack>
                    <FormControl fullWidth size="small">
                        <InputLabel id="task-assignee-label">Assignée à</InputLabel>
                        <Select
                            labelId="task-assignee-label"
                            label="Assignée à"
                            value={task?.assigneeUuid ?? ''}
                            onChange={(e) => handleAssigneeChange(e.target.value)}
                            inputProps={{ 'aria-label': 'Assignée à' }}
                        >
                            <MenuItem value="">
                                <em>Non assignée</em>
                            </MenuItem>
                            {assigneeOptions.map((u) => (
                                <MenuItem key={u.uuid} value={u.uuid}>
                                    {formatUserDisplayName(u)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Divider />

                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            Commentaires {comments.length > 0 ? `(${comments.length})` : ''}
                        </Typography>
                        {commentsQuery.isLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                                <CircularProgress size={18} />
                            </Box>
                        ) : comments.length === 0 ? (
                            <Typography variant="caption" color="text.secondary">
                                Aucun commentaire pour le moment.
                            </Typography>
                        ) : (
                            <Stack spacing={1.25}>
                                {comments.map((comment) => (
                                    <CommentRow
                                        key={comment.uuid}
                                        comment={comment}
                                        canDelete={canDeleteComment(comment)}
                                        onDelete={handleDeleteComment}
                                    />
                                ))}
                            </Stack>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                            <TextField
                                size="small"
                                placeholder="Ajouter un commentaire..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={handleCommentKeyDown}
                                fullWidth
                                multiline
                                maxRows={3}
                                inputProps={{ maxLength: 2000, 'aria-label': 'Nouveau commentaire' }}
                            />
                            <Tooltip title="Envoyer (Entrée)" arrow>
                                <span>
                                    <IconButton
                                        color="primary"
                                        onClick={handleAddComment}
                                        disabled={!commentText.trim() || addComment.isPending}
                                        aria-label="Envoyer le commentaire"
                                    >
                                        <SendIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5 }}>
                <Button onClick={onClose} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                    Fermer
                </Button>
            </DialogActions>
        </Dialog>
    );
});
