/**
 * EntityRangeDialog — coquille générique et homogène des modales de période
 * (labo & membre), agnostique du métier.
 *
 * Layout : header (titre + pastille + fermer) → typologie (slot injecté) →
 * calendrier de plage → champ note → actions (Supprimer en édition / Enregistrer).
 * Ancrée en Popover sur la cellule cliquée (comportement conservé).
 * @module features/planning/ui/shared
 */
import { type ReactNode, useId } from 'react';
import { Box, Button, IconButton, Popover, TextField, Typography } from '@mui/material';
import { Close } from '@mui/icons-material';
import { usePlanningColors } from '../../lib/planning.hooks';
import { RangeCalendar } from '@shared/ui';
import type { DateRange } from '@shared/lib';

export interface EntityRangeDialogProps {
    anchorEl: HTMLElement;
    title: string;
    /** Couleur d'accent (titre, pastille, plage, bouton Enregistrer). */
    accentColor: string;
    /** Sélecteur de typologie (ex. ColoredSelect) contrôlé par l'appelant. */
    typologySlot: ReactNode;
    range: DateRange;
    onRangeChange: (range: DateRange) => void;
    note: { label: string; value: string; onChange: (value: string) => void };
    mode: 'create' | 'edit';
    /** Active le bouton Enregistrer (typologie + plage complètes). */
    canSave: boolean;
    isSaving: boolean;
    isDeleting?: boolean;
    onSave: () => void;
    /** Présent ⇒ affiche le bouton Supprimer (mode édition). */
    onDelete?: () => void;
    onClose: () => void;
}

export function EntityRangeDialog({
    anchorEl,
    title,
    accentColor,
    typologySlot,
    range,
    onRangeChange,
    note,
    mode,
    canSave,
    isSaving,
    isDeleting = false,
    onSave,
    onDelete,
    onClose,
}: EntityRangeDialogProps) {
    const colors = usePlanningColors();
    const titleId = useId();

    return (
        <Popover
            open
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            slotProps={{ paper: { role: 'dialog', 'aria-labelledby': titleId, sx: { p: 2.5, width: 360 } } }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: accentColor, flexShrink: 0 }} />
                    <Typography id={titleId} fontSize={13} fontWeight={700} color={colors.accent}>
                        {title}
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ p: 0.2 }} aria-label="Fermer">
                    <Close sx={{ fontSize: 16 }} />
                </IconButton>
            </Box>

            <Box sx={{ mb: 1.5 }}>{typologySlot}</Box>

            <RangeCalendar value={range} onChange={onRangeChange} accentColor={accentColor} />

            <TextField
                fullWidth
                multiline
                minRows={1}
                maxRows={3}
                size="small"
                label={note.label}
                value={note.value}
                onChange={(e) => note.onChange(e.target.value)}
                sx={{ mt: 1, mb: 1.5, '& .MuiInputBase-input': { fontSize: 12 } }}
            />

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                {mode === 'edit' && onDelete ? (
                    <Button
                        size="small"
                        color="error"
                        onClick={onDelete}
                        disabled={isDeleting}
                        sx={{ fontSize: 11, textTransform: 'none' }}
                    >
                        {isDeleting ? 'Suppression...' : 'Supprimer'}
                    </Button>
                ) : (
                    <span />
                )}
                <Button
                    size="small"
                    variant="contained"
                    onClick={onSave}
                    disabled={!canSave || isSaving}
                    sx={{
                        fontSize: 11,
                        textTransform: 'none',
                        bgcolor: accentColor,
                        '&:hover': { bgcolor: accentColor, filter: 'brightness(0.9)' },
                    }}
                >
                    {isSaving ? 'En cours...' : mode === 'edit' ? 'Modifier' : 'Ajouter'}
                </Button>
            </Box>
        </Popover>
    );
}
