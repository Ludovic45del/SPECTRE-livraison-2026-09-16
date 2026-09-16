/**
 * Dialog for creating/editing a shortcut.
 * @module features/dashboard/ui
 */

import { memo, useCallback, useEffect } from 'react';
import {
    Autocomplete,
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    TextField,
    Tooltip,
    IconButton,
    alpha,
    useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import type { Shortcut } from '@entities/dashboard-preferences';
import { Button } from '@shared/ui/Button';
import { ICON_MAP, ICON_NAMES } from '../lib/iconMap';

/* ---------- sub-components ---------- */

interface IconPickerGridProps {
    readonly control: Control<Omit<Shortcut, 'id'>>;
    readonly selectedIcon: string;
    readonly isDark: boolean;
    readonly theme: Theme;
}

const IconPickerGrid = memo(function IconPickerGrid({ control, selectedIcon, isDark, theme }: IconPickerGridProps) {
    return (
        <Controller
            name="icon"
            control={control}
            render={({ field }) => (
                <Box>
                    <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>Icône</Box>
                    <Grid container spacing={0.5}>
                        {ICON_NAMES.map((name) => {
                            const Icon = ICON_MAP[name];
                            const isSelected = selectedIcon === name;
                            return (
                                <Grid key={name}>
                                    <Tooltip title={name} arrow>
                                        <IconButton
                                            size="small"
                                            onClick={() => field.onChange(name)}
                                            sx={{
                                                border: '2px solid',
                                                borderColor: isSelected ? 'primary.main' : 'transparent',
                                                bgcolor: isSelected
                                                    ? alpha(theme.palette.primary.main, isDark ? 0.15 : 0.08)
                                                    : 'transparent',
                                                borderRadius: 1,
                                            }}
                                        >
                                            <Icon sx={{ fontSize: 20 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>
            )}
        />
    );
});

interface ShortcutFieldsProps {
    readonly control: Control<Omit<Shortcut, 'id'>>;
}

const CATEGORIES = ['Outils', 'Documentation', 'Fichiers', 'Interne', 'Autres'];

const ShortcutFields = memo(function ShortcutFields({ control }: ShortcutFieldsProps) {
    return (
        <>
            <Controller
                name="label"
                control={control}
                rules={{ required: 'Le nom est requis' }}
                render={({ field, fieldState }) => (
                    <TextField
                        {...field}
                        label="Nom"
                        fullWidth
                        size="small"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        sx={{ mb: 2, mt: 1 }}
                    />
                )}
            />
            <Controller
                name="url"
                control={control}
                rules={{ required: "L'URL est requise" }}
                render={({ field, fieldState }) => (
                    <TextField
                        {...field}
                        label="URL ou chemin"
                        placeholder="https://... ou \\serveur\partage"
                        fullWidth
                        size="small"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        sx={{ mb: 2 }}
                    />
                )}
            />
            <Controller
                name="category"
                control={control}
                render={({ field }) => (
                    <Autocomplete
                        freeSolo
                        options={CATEGORIES}
                        value={field.value}
                        onInputChange={(_e, v) => field.onChange(v)}
                        renderInput={(params) => (
                            <TextField {...params} label="Catégorie" size="small" sx={{ mb: 2 }} />
                        )}
                    />
                )}
            />
        </>
    );
});

/* ---------- main component ---------- */

interface Props {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onSave: (shortcut: Shortcut) => void;
    readonly shortcut: Shortcut | null;
}

export default function ShortcutFormDialog({ open, onClose, onSave, shortcut }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { control, handleSubmit, reset, watch } = useForm<Omit<Shortcut, 'id'>>({
        defaultValues: { label: '', url: '', icon: 'Link', category: '' },
    });

    useEffect(() => {
        if (open) {
            reset(
                shortcut
                    ? { label: shortcut.label, url: shortcut.url, icon: shortcut.icon, category: shortcut.category }
                    : { label: '', url: '', icon: 'Link', category: '' },
            );
        }
    }, [open, shortcut, reset]);

    const selectedIcon = watch('icon');

    const onSubmit = useCallback(
        (data: Omit<Shortcut, 'id'>) => {
            onSave({ id: shortcut?.id ?? crypto.randomUUID(), ...data });
        },
        [shortcut, onSave],
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {shortcut ? 'Modifier le raccourci' : 'Ajouter un raccourci'}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <ShortcutFields control={control} />
                    <IconPickerGrid control={control} selectedIcon={selectedIcon} isDark={isDark} theme={theme} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button variant="text" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button variant="primary" type="submit">
                        Enregistrer
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
