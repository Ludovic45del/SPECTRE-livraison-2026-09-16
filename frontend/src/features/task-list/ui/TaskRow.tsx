/**
 * TaskRow — ligne de tâche d'une liste partagée.
 * @module features/task-list/ui
 *
 * Checkbox ronde (pattern TodosWidget), drapeau de priorité coloré, titre
 * (barré si terminée), chips discrets (échéance, assigné, commentaires, note)
 * et bouton supprimer révélé au survol. Le clic sur la ligne ouvre le détail.
 */

import { memo, useCallback } from 'react';
import { Avatar, Box, Checkbox, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FlagIcon from '@mui/icons-material/Flag';
import EventIcon from '@mui/icons-material/Event';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import NotesIcon from '@mui/icons-material/Notes';
import dayjs from 'dayjs';

import { PRIORITY_LABELS, PRIORITY_SX_COLORS, type TaskItem } from '@entities/task-list';
import { formatUserDisplayName, useUserLookup } from '@entities/user';
import { motion } from '@shared/ui/motion';

export interface TaskRowProps {
    readonly task: TaskItem;
    readonly onToggle: (task: TaskItem) => void;
    readonly onDelete: (task: TaskItem) => void;
    readonly onOpen: (task: TaskItem) => void;
}

/** Avatar 20px de l'assigné, résolu via l'annuaire (cache partagé). */
const AssigneeAvatar = memo(function AssigneeAvatar({ userUuid }: { readonly userUuid: string }) {
    const { data: users } = useUserLookup();
    const user = users?.find((u) => u.uuid === userUuid);
    const name = user ? formatUserDisplayName(user) : `${userUuid.slice(0, 8)}…`;
    const initials = user
        ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() ||
          user.username.slice(0, 2).toUpperCase()
        : '?';

    return (
        <Tooltip title={`Assignée à ${name}`} arrow>
            <Avatar
                src={user?.avatarUrl ?? undefined}
                alt={name}
                sx={{ width: 20, height: 20, fontSize: '0.6rem', fontWeight: 700, bgcolor: 'primary.main' }}
            >
                {initials}
            </Avatar>
        </Tooltip>
    );
});

export const TaskRow = memo(function TaskRow({ task, onToggle, onDelete, onOpen }: TaskRowProps) {
    const handleToggle = useCallback(() => onToggle(task), [onToggle, task]);
    const handleDelete = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onDelete(task);
        },
        [onDelete, task],
    );
    const handleOpen = useCallback(() => onOpen(task), [onOpen, task]);
    const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

    const isOverdue = Boolean(task.dueDate) && !task.done && dayjs(task.dueDate).isBefore(dayjs(), 'day');

    return (
        <Box
            onClick={handleOpen}
            data-testid={`task-row-${task.uuid}`}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                py: 0.75,
                px: 1,
                borderRadius: 1.5,
                cursor: 'pointer',
                transition: `background-color ${motion.fast}`,
                '&:hover': { bgcolor: 'action.hover' },
                '&:hover .task-delete': { opacity: 1, transform: 'translateX(0)' },
            }}
        >
            <Checkbox
                checked={task.done}
                onChange={handleToggle}
                onClick={stopPropagation}
                size="small"
                inputProps={{ 'aria-label': task.done ? `Décocher ${task.title}` : `Cocher ${task.title}` }}
                icon={<RadioButtonUncheckedIcon sx={{ fontSize: 20 }} />}
                checkedIcon={<CheckCircleIcon sx={{ fontSize: 20 }} />}
                sx={{
                    p: 0.5,
                    color: 'text.disabled',
                    '&.Mui-checked': { color: 'success.main' },
                }}
            />

            <Tooltip title={`Priorité : ${PRIORITY_LABELS[task.priority]}`} arrow>
                <FlagIcon
                    data-testid={`priority-flag-${task.priority}`}
                    sx={{ fontSize: 15, color: PRIORITY_SX_COLORS[task.priority], flexShrink: 0 }}
                />
            </Tooltip>

            <Typography
                variant="body2"
                sx={{
                    flex: 1,
                    minWidth: 0,
                    textDecoration: task.done ? 'line-through' : 'none',
                    color: task.done ? 'text.disabled' : 'text.primary',
                    fontSize: '0.875rem',
                    transition: `color ${motion.fast}`,
                    wordBreak: 'break-word',
                }}
            >
                {task.title}
            </Typography>

            {task.dueDate && (
                <Tooltip title={`Échéance : ${dayjs(task.dueDate).format('D MMMM YYYY')}`} arrow>
                    <Chip
                        size="small"
                        icon={<EventIcon sx={{ fontSize: 12 }} />}
                        label={dayjs(task.dueDate).format('D MMM')}
                        data-testid={isOverdue ? 'due-date-overdue' : 'due-date'}
                        sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: isOverdue ? 'error.main' : 'text.secondary',
                            bgcolor: 'transparent',
                            border: '1px solid',
                            borderColor: isOverdue ? 'error.main' : 'divider',
                            '& .MuiChip-icon': { color: 'inherit' },
                        }}
                    />
                </Tooltip>
            )}

            {task.assigneeUuid && <AssigneeAvatar userUuid={task.assigneeUuid} />}

            {task.commentCount > 0 && (
                <Tooltip title={`${task.commentCount} commentaire${task.commentCount > 1 ? 's' : ''}`} arrow>
                    <Box
                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color: 'text.secondary' }}
                        data-testid="comment-badge"
                    >
                        <ChatBubbleOutlineIcon sx={{ fontSize: 13 }} />
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                            {task.commentCount}
                        </Typography>
                    </Box>
                </Tooltip>
            )}

            {task.note.trim() !== '' && (
                <Tooltip title="Contient une note" arrow>
                    <NotesIcon sx={{ fontSize: 14, color: 'text.disabled' }} data-testid="note-icon" />
                </Tooltip>
            )}

            <IconButton
                className="task-delete"
                size="small"
                onClick={handleDelete}
                aria-label={`Supprimer la tâche ${task.title}`}
                sx={{
                    opacity: 0,
                    transform: 'translateX(4px)',
                    transition: motion.transition(['opacity', 'transform', 'color'], 'fast'),
                    p: 0.5,
                    color: 'text.disabled',
                    '&:hover': { color: 'error.main', bgcolor: 'transparent' },
                }}
            >
                <DeleteOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
        </Box>
    );
});
