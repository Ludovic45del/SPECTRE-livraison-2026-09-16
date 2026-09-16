/**
 * Shortcuts widget — external links grouped by category.
 * @module features/dashboard/ui/widgets
 */

import { memo, useCallback, useState, useMemo } from 'react';
import { Box, ButtonBase, IconButton, Stack, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

import { useDashboardPreferences, useUpdateDashboardPreferences, type Shortcut } from '@entities/dashboard-preferences';
import SectionCard from '@widgets/SectionCard';
import { Button } from '@shared/ui/Button';
import { useNotification } from '@shared/ui';
import { copyToClipboard, isNetworkPath, normalizeHref } from '@shared/lib';
import { ICON_MAP } from '../../lib/iconMap';
import { useDashboardStore } from '../../model/dashboard.store';
import ShortcutFormDialog from '../ShortcutFormDialog';
import { motion } from '@shared/ui/motion';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Stable hue derived from a string — gives each category a consistent accent color. */
function hueFromString(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) | 0;
    return Math.abs(hash) % 360;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Empty state when no shortcuts exist. */
const EmptyShortcuts = memo(function EmptyShortcuts({ onAdd }: { onAdd: () => void }) {
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
                <RocketLaunchIcon sx={{ fontSize: 26, color: 'primary.main' }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                Vos liens rapides ici
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Outils, docs, partages réseau...
            </Typography>
            <Button variant="primary" size="small" startIcon={<AddIcon />} onClick={onAdd}>
                Ajouter un raccourci
            </Button>
        </Box>
    );
});

/** A single shortcut rendered as a card-style button. */
interface ShortcutCardProps {
    readonly shortcut: Shortcut;
    readonly isEditMode: boolean;
    readonly onEdit: (shortcut: Shortcut) => void;
    readonly onDelete: (id: string) => void;
}

const ShortcutCard = memo(function ShortcutCard({ shortcut, isEditMode, onEdit, onDelete }: ShortcutCardProps) {
    const theme = useTheme();
    const { showNotification } = useNotification();
    const isDark = theme.palette.mode === 'dark';
    const IconComp = ICON_MAP[shortcut.icon] ?? LinkIcon;
    const hue = hueFromString(shortcut.category || shortcut.label);
    const accentBg = `hsla(${hue}, 70%, ${isDark ? 55 : 45}%, ${isDark ? 0.18 : 0.12})`;
    const accentFg = `hsl(${hue}, 70%, ${isDark ? 70 : 38}%)`;
    // Les chemins réseau (UNC, file:, smb:) ne peuvent pas être ouverts depuis
    // une page http(s) : le navigateur bloque silencieusement file://. Le clic
    // copie donc le chemin BRUT (collable dans l'Explorateur Windows).
    const isNetwork = isNetworkPath(shortcut.url);

    const handleClick = useCallback(() => {
        if (isNetwork) {
            void copyToClipboard(shortcut.url).then((ok) => {
                if (ok) {
                    showNotification("Chemin copié — collez-le dans la barre d'adresse de l'Explorateur", 'success');
                } else {
                    showNotification('Impossible de copier le chemin', 'error');
                }
            });
            return;
        }
        window.open(normalizeHref(shortcut.url), '_blank');
    }, [isNetwork, shortcut.url, showNotification]);
    const handleCopy = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            void copyToClipboard(shortcut.url).then((ok) => {
                if (ok) {
                    showNotification('Lien copié', 'success');
                } else {
                    showNotification('Impossible de copier le lien', 'error');
                }
            });
        },
        [shortcut.url, showNotification],
    );
    const handleEdit = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onEdit(shortcut);
        },
        [onEdit, shortcut],
    );
    const handleDelete = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onDelete(shortcut.id);
        },
        [onDelete, shortcut.id],
    );

    // Le tooltip porte le nom complet (le label est clampé à 2 lignes) + l'URL,
    // et annonce le comportement de copie pour les chemins réseau.
    const tooltipTitle = isNetwork
        ? `${shortcut.label} — ${shortcut.url} — clic : copier le chemin`
        : `${shortcut.label} — ${shortcut.url}`;

    return (
        <Tooltip title={tooltipTitle} arrow placement="top">
            <Box
                sx={{
                    position: 'relative',
                    '&:hover .shortcut-actions, &:focus-within .shortcut-actions': {
                        opacity: 1,
                        pointerEvents: 'auto',
                    },
                }}
            >
                <ButtonBase
                    onClick={handleClick}
                    focusRipple
                    sx={{
                        width: '100%',
                        minHeight: 48,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        p: 1,
                        pr: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        textAlign: 'left',
                        justifyContent: 'flex-start',
                        transition: motion.transition(['transform', 'border-color', 'box-shadow'], 'fast'),
                        '&:hover': {
                            transform: 'translateY(-1px)',
                            borderColor: alpha(accentFg, 0.5),
                            boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, isDark ? 0.4 : 0.08)}`,
                            '& .shortcut-open-hint': { opacity: 1 },
                        },
                        '&:focus-visible': { borderColor: accentFg },
                    }}
                >
                    <Box
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1.5,
                            bgcolor: accentBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <IconComp sx={{ fontSize: 18, color: accentFg }} />
                    </Box>
                    <Typography
                        variant="body2"
                        sx={{
                            flex: 1,
                            fontWeight: 500,
                            fontSize: '0.85rem',
                            color: 'text.primary',
                            // Clamp 2 lignes : les noms longs se replient au lieu
                            // d'être coupés ; le tooltip porte le nom complet.
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            wordBreak: 'break-word',
                            lineHeight: 1.3,
                        }}
                    >
                        {shortcut.label}
                    </Typography>
                    {isNetwork ? (
                        // Affordance honnête : le clic copie le chemin, il n'ouvre rien.
                        <ContentCopyIcon
                            className="shortcut-open-hint"
                            sx={{
                                fontSize: 14,
                                color: 'text.disabled',
                                opacity: 0,
                                transition: `opacity ${motion.fast}`,
                            }}
                        />
                    ) : (
                        <OpenInNewIcon
                            className="shortcut-open-hint"
                            sx={{
                                fontSize: 14,
                                color: 'text.disabled',
                                opacity: 0,
                                transition: `opacity ${motion.fast}`,
                            }}
                        />
                    )}
                </ButtonBase>
                <Box
                    className="shortcut-actions"
                    sx={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        display: 'flex',
                        gap: 0.5,
                        opacity: isEditMode ? 1 : 0,
                        pointerEvents: isEditMode ? 'auto' : 'none',
                        transition: `opacity ${motion.fast}`,
                    }}
                >
                    <Tooltip title="Copier le lien" arrow>
                        <IconButton
                            size="small"
                            onClick={handleCopy}
                            aria-label={`Copier le lien de ${shortcut.label}`}
                            sx={{
                                width: 20,
                                height: 20,
                                bgcolor: 'background.paper',
                                color: 'text.secondary',
                                border: '1px solid',
                                borderColor: 'divider',
                                boxShadow: 1,
                                '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                            }}
                        >
                            <ContentCopyIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Modifier" arrow>
                        <IconButton
                            size="small"
                            onClick={handleEdit}
                            aria-label={`Modifier ${shortcut.label}`}
                            sx={{
                                width: 20,
                                height: 20,
                                bgcolor: 'background.paper',
                                color: 'primary.main',
                                border: '1px solid',
                                borderColor: 'divider',
                                boxShadow: 1,
                                '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                            }}
                        >
                            <EditIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer" arrow>
                        <IconButton
                            size="small"
                            onClick={handleDelete}
                            aria-label={`Supprimer ${shortcut.label}`}
                            sx={{
                                width: 20,
                                height: 20,
                                bgcolor: 'error.main',
                                color: 'error.contrastText',
                                boxShadow: 1,
                                '&:hover': { bgcolor: 'error.dark' },
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
        </Tooltip>
    );
});

/** A category group header + its shortcut cards. */
interface ShortcutCategoryGroupProps {
    readonly category: string;
    readonly items: Shortcut[];
    readonly isEditMode: boolean;
    readonly onEdit: (shortcut: Shortcut) => void;
    readonly onDelete: (id: string) => void;
}

const ShortcutCategoryGroup = memo(function ShortcutCategoryGroup({
    category,
    items,
    isEditMode,
    onEdit,
    onDelete,
}: ShortcutCategoryGroupProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const hue = hueFromString(category);
    const dotColor = `hsl(${hue}, 70%, ${isDark ? 65 : 45}%)`;
    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, px: 0.25 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dotColor }} />
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'text.secondary',
                    }}
                >
                    {category}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                    · {items.length}
                </Typography>
            </Box>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 1,
                }}
            >
                {items.map((s) => (
                    <ShortcutCard key={s.id} shortcut={s} isEditMode={isEditMode} onEdit={onEdit} onDelete={onDelete} />
                ))}
            </Box>
        </Box>
    );
});

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default memo(function ShortcutsWidget() {
    const { data: savedPrefs } = useDashboardPreferences();
    const updatePrefs = useUpdateDashboardPreferences();
    const { isEditMode, draftPrefs, updateDraft } = useDashboardStore();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingShortcut, setEditingShortcut] = useState<Shortcut | null>(null);
    const handleOpenDialog = useCallback(() => {
        setEditingShortcut(null);
        setDialogOpen(true);
    }, []);
    const handleEdit = useCallback((shortcut: Shortcut) => {
        setEditingShortcut(shortcut);
        setDialogOpen(true);
    }, []);
    const handleCloseDialog = useCallback(() => {
        setDialogOpen(false);
        setEditingShortcut(null);
    }, []);

    const prefs = isEditMode ? draftPrefs : savedPrefs;
    // Référence stable (même pattern que TodosWidget) : évite de recalculer le
    // groupement à chaque render quand les préférences n'ont pas changé.
    const shortcuts = useMemo(() => prefs?.shortcuts ?? [], [prefs?.shortcuts]);
    const grouped = useMemo(() => {
        const map = new Map<string, Shortcut[]>();
        for (const s of shortcuts) {
            const cat = s.category || 'Autres';
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat)!.push(s);
        }
        return map;
    }, [shortcuts]);

    const handleDelete = useCallback(
        (id: string) => {
            if (!prefs) return;
            const filtered = prefs.shortcuts.filter((s) => s.id !== id);
            if (isEditMode) {
                updateDraft((draft) => ({ ...draft, shortcuts: filtered }));
            } else {
                updatePrefs.mutate({ ...prefs, shortcuts: filtered });
            }
        },
        [isEditMode, prefs, updateDraft, updatePrefs],
    );

    const handleSave = useCallback(
        (shortcut: Shortcut) => {
            if (!prefs) return;
            const existing = prefs.shortcuts.findIndex((s) => s.id === shortcut.id);
            const updated = [...prefs.shortcuts];
            if (existing >= 0) {
                updated[existing] = shortcut;
            } else {
                updated.push(shortcut);
            }
            if (isEditMode) {
                updateDraft((draft) => ({ ...draft, shortcuts: updated }));
            } else {
                updatePrefs.mutate({ ...prefs, shortcuts: updated });
            }
            setDialogOpen(false);
            setEditingShortcut(null);
        },
        [isEditMode, prefs, updateDraft, updatePrefs],
    );

    return (
        <>
            <SectionCard
                title="Raccourcis"
                action={
                    <Tooltip title="Ajouter un raccourci" arrow>
                        <IconButton
                            size="small"
                            onClick={handleOpenDialog}
                            sx={{
                                bgcolor: 'action.hover',
                                color: 'primary.main',
                                width: 28,
                                height: 28,
                                transition: `all ${motion.fast}`,
                                '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                            }}
                        >
                            <AddIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                }
            >
                {shortcuts.length === 0 ? (
                    <EmptyShortcuts onAdd={handleOpenDialog} />
                ) : (
                    <Stack spacing={2}>
                        {[...grouped.entries()].map(([category, items]) => (
                            <ShortcutCategoryGroup
                                key={category}
                                category={category}
                                items={items}
                                isEditMode={isEditMode}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                    </Stack>
                )}
            </SectionCard>

            <ShortcutFormDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                onSave={handleSave}
                shortcut={editingShortcut}
            />
        </>
    );
});
