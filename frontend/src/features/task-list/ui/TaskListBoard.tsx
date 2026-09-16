/**
 * TaskListBoard — corps d'une liste partagée.
 * @module features/task-list/ui
 *
 * Progression (X/Y terminées, %), saisie rapide avec sélecteur de priorité
 * inline (drapeau + menu), sections « À faire » (tri priorité desc puis
 * position) et « Terminées » (repliée par défaut si > 5), skeleton loading.
 */

import { memo, useCallback, useMemo, useState } from 'react';
import {
    Box,
    Collapse,
    IconButton,
    InputAdornment,
    LinearProgress,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Skeleton,
    Stack,
    TextField,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FlagIcon from '@mui/icons-material/Flag';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import {
    PRIORITIES_DESC,
    PRIORITY_LABELS,
    PRIORITY_SX_COLORS,
    comparePriority,
    useCreateTaskItem,
    useDeleteTaskItem,
    useTaskListDetail,
    useUpdateTaskItem,
    type TaskItem,
    type TaskPriority,
} from '@entities/task-list';
import { getErrorMessage } from '@shared/lib';
import { useNotification } from '@shared/ui';
import { motion } from '@shared/ui/motion';
import { TaskRow } from './TaskRow';
import { TaskDetailsDialog } from './TaskDetailsDialog';

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Barre de progression X/Y terminées + pourcentage (pattern TodosWidget). */
const BoardProgress = memo(function BoardProgress({ done, total }: { done: number; total: number }) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return (
        <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {done} / {total} terminée{total > 1 ? 's' : ''}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        color: pct === 100 ? 'success.main' : 'primary.main',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {pct}%
                </Typography>
            </Box>
            <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, isDark ? 0.15 : 0.08),
                    '& .MuiLinearProgress-bar': {
                        borderRadius: 2,
                        bgcolor: pct === 100 ? 'success.main' : 'primary.main',
                        transition: `transform ${motion.slow}, background-color ${motion.medium}`,
                    },
                }}
            />
        </Box>
    );
});

/** Saisie rapide : TextField + drapeau priorité (menu) + Entrée pour créer. */
const QuickAddInput = memo(function QuickAddInput({
    value,
    priority,
    disabled,
    onChange,
    onPriorityChange,
    onAdd,
}: {
    readonly value: string;
    readonly priority: TaskPriority;
    readonly disabled: boolean;
    readonly onChange: (v: string) => void;
    readonly onPriorityChange: (p: TaskPriority) => void;
    readonly onAdd: () => void;
}) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    const handleOpenMenu = useCallback((e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget), []);
    const handleCloseMenu = useCallback(() => setAnchor(null), []);
    const handlePick = useCallback(
        (p: TaskPriority) => {
            onPriorityChange(p);
            setAnchor(null);
        },
        [onPriorityChange],
    );
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onAdd();
            }
        },
        [onAdd],
    );

    return (
        <>
            <TextField
                size="small"
                placeholder="Ajouter une tâche..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                fullWidth
                sx={{
                    mb: 1.5,
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: 'action.hover',
                        transition: motion.transition(['background-color', 'box-shadow'], 'fast'),
                        '& fieldset': { borderColor: 'transparent' },
                        '&:hover fieldset': { borderColor: 'transparent' },
                        '&.Mui-focused': {
                            bgcolor: 'background.paper',
                            '& fieldset': { borderWidth: 1 },
                        },
                    },
                    '& .MuiOutlinedInput-input': { py: 1, fontSize: '0.875rem' },
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Tooltip title={`Priorité : ${PRIORITY_LABELS[priority]}`} arrow>
                                <IconButton
                                    size="small"
                                    onClick={handleOpenMenu}
                                    aria-label="Choisir la priorité"
                                    sx={{ p: 0.5 }}
                                >
                                    <FlagIcon sx={{ fontSize: 18, color: PRIORITY_SX_COLORS[priority] }} />
                                </IconButton>
                            </Tooltip>
                        </InputAdornment>
                    ),
                    endAdornment: (
                        <InputAdornment position="end">
                            <Tooltip title="Ajouter (Entrée)" arrow>
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={onAdd}
                                        disabled={disabled}
                                        color="primary"
                                        aria-label="Ajouter la tâche"
                                        sx={{
                                            bgcolor: disabled ? 'transparent' : 'primary.main',
                                            color: disabled ? 'text.disabled' : 'primary.contrastText',
                                            transition: `all ${motion.fast}`,
                                            '&:hover': { bgcolor: 'primary.dark' },
                                            '&.Mui-disabled': { bgcolor: 'transparent' },
                                            width: 26,
                                            height: 26,
                                        }}
                                    >
                                        <AddIcon sx={{ fontSize: 17 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </InputAdornment>
                    ),
                }}
            />
            <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={handleCloseMenu}>
                {PRIORITIES_DESC.map((p) => (
                    <MenuItem key={p} selected={p === priority} onClick={() => handlePick(p)}>
                        <ListItemIcon>
                            <FlagIcon sx={{ fontSize: 16, color: PRIORITY_SX_COLORS[p] }} />
                        </ListItemIcon>
                        <ListItemText primary={PRIORITY_LABELS[p]} primaryTypographyProps={{ variant: 'body2' }} />
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
});

/** Skeleton de chargement du corps de liste. */
const BoardSkeleton = memo(function BoardSkeleton() {
    return (
        <Stack spacing={1} data-testid="task-board-skeleton">
            <Skeleton variant="rounded" height={36} />
            <Skeleton variant="rounded" height={6} />
            <Skeleton variant="rounded" height={30} />
            <Skeleton variant="rounded" height={30} />
            <Skeleton variant="rounded" height={30} />
        </Stack>
    );
});

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const TaskListBoard = memo(function TaskListBoard({ listUuid }: { readonly listUuid: string }) {
    const { data: list, isLoading, isError } = useTaskListDetail(listUuid);
    const createTask = useCreateTaskItem();
    const updateTask = useUpdateTaskItem();
    const deleteTask = useDeleteTaskItem();
    const { showNotification } = useNotification();

    const [newTitle, setNewTitle] = useState('');
    const [newPriority, setNewPriority] = useState<TaskPriority>('normal');
    /** null = auto (déplié si ≤ 5 terminées). */
    const [completedOpen, setCompletedOpen] = useState<boolean | null>(null);
    const [selectedTaskUuid, setSelectedTaskUuid] = useState<string | null>(null);

    const tasks = useMemo(() => list?.tasks ?? [], [list?.tasks]);

    const { active, completed } = useMemo(() => {
        const a: TaskItem[] = [];
        const c: TaskItem[] = [];
        for (const t of tasks) (t.done ? c : a).push(t);
        const byPriorityThenPosition = (x: TaskItem, y: TaskItem) =>
            comparePriority(x.priority, y.priority) || x.position - y.position;
        a.sort(byPriorityThenPosition);
        c.sort(byPriorityThenPosition);
        return { active: a, completed: c };
    }, [tasks]);

    const isCompletedOpen = completedOpen ?? completed.length <= 5;
    const selectedTask = useMemo(
        () => tasks.find((t) => t.uuid === selectedTaskUuid) ?? null,
        [tasks, selectedTaskUuid],
    );

    const handleAdd = useCallback(() => {
        const title = newTitle.trim();
        if (!title || createTask.isPending) return;
        createTask.mutate(
            { listUuid, data: { title, priority: newPriority } },
            {
                onSuccess: () => setNewTitle(''),
                onError: (err) =>
                    showNotification(getErrorMessage(err, 'Erreur lors de la création de la tâche'), 'error'),
            },
        );
    }, [newTitle, newPriority, createTask, listUuid, showNotification]);

    const handleToggle = useCallback(
        (task: TaskItem) => {
            updateTask.mutate(
                { listUuid, taskUuid: task.uuid, data: { done: !task.done } },
                {
                    onError: (err) =>
                        showNotification(getErrorMessage(err, 'Erreur lors de la mise à jour de la tâche'), 'error'),
                },
            );
        },
        [updateTask, listUuid, showNotification],
    );

    const handleDelete = useCallback(
        (task: TaskItem) => {
            deleteTask.mutate(
                { listUuid, taskUuid: task.uuid },
                {
                    onError: (err) =>
                        showNotification(getErrorMessage(err, 'Erreur lors de la suppression de la tâche'), 'error'),
                },
            );
        },
        [deleteTask, listUuid, showNotification],
    );

    const handleOpenTask = useCallback((task: TaskItem) => setSelectedTaskUuid(task.uuid), []);
    const handleCloseTask = useCallback(() => setSelectedTaskUuid(null), []);
    const handleToggleCompleted = useCallback(() => setCompletedOpen(!isCompletedOpen), [isCompletedOpen]);

    if (isLoading) return <BoardSkeleton />;
    if (isError || !list) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                Impossible de charger la liste.
            </Typography>
        );
    }

    return (
        <Box>
            <QuickAddInput
                value={newTitle}
                priority={newPriority}
                disabled={!newTitle.trim() || createTask.isPending}
                onChange={setNewTitle}
                onPriorityChange={setNewPriority}
                onAdd={handleAdd}
            />

            {tasks.length === 0 ? (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', textAlign: 'center', py: 2 }}
                >
                    Aucune tâche — ajoutez-en une ci-dessus
                </Typography>
            ) : (
                <>
                    <BoardProgress done={completed.length} total={tasks.length} />

                    {active.length > 0 && (
                        <Stack spacing={0}>
                            {active.map((task) => (
                                <TaskRow
                                    key={task.uuid}
                                    task={task}
                                    onToggle={handleToggle}
                                    onDelete={handleDelete}
                                    onOpen={handleOpenTask}
                                />
                            ))}
                        </Stack>
                    )}

                    {completed.length > 0 && (
                        <>
                            <Box
                                onClick={handleToggleCompleted}
                                role="button"
                                aria-label={`${isCompletedOpen ? 'Replier' : 'Déplier'} les tâches terminées`}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    mt: active.length > 0 ? 1.5 : 0,
                                    mb: 0.5,
                                    px: 1,
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                }}
                            >
                                {isCompletedOpen ? (
                                    <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                                ) : (
                                    <ChevronRightIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                                )}
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.disabled',
                                        fontWeight: 600,
                                        fontSize: '0.7rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    Terminées · {completed.length}
                                </Typography>
                                <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
                            </Box>
                            <Collapse in={isCompletedOpen}>
                                <Stack spacing={0}>
                                    {completed.map((task) => (
                                        <TaskRow
                                            key={task.uuid}
                                            task={task}
                                            onToggle={handleToggle}
                                            onDelete={handleDelete}
                                            onOpen={handleOpenTask}
                                        />
                                    ))}
                                </Stack>
                            </Collapse>
                        </>
                    )}
                </>
            )}

            <TaskDetailsDialog list={list} task={selectedTask} onClose={handleCloseTask} />
        </Box>
    );
});
