/**
 * Generic Step Modal Layout Component
 * @module features/fsec/shared/ui
 *
 * Shared layout for all gas step modals with:
 * - Dialog wrapper with consistent styling
 * - Header with title and close button
 * - Footer with delete/save actions
 * - Delete confirmation flow
 */

import { memo, ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    Box,
    Typography,
    Divider,
    IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';

interface StepModalLayoutProps {
    open: boolean;
    onClose: () => void;
    title: string;
    editTitle: string;
    isEditMode: boolean;
    isPending: boolean;
    isDeleting: boolean;
    showDeleteConfirm: boolean;
    onShowDeleteConfirm: () => void;
    onHideDeleteConfirm: () => void;
    onDelete: () => void;
    onSubmit: (e?: React.BaseSyntheticEvent) => void;
    children: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg';
    hideDelete?: boolean;
    /** ID unique pour l'accessibilité (génère aria-labelledby et aria-describedby) */
    modalId?: string;
}

export const StepModalLayout = memo(function StepModalLayout({
    open,
    onClose,
    title,
    editTitle,
    isEditMode,
    isPending,
    isDeleting,
    showDeleteConfirm,
    onShowDeleteConfirm,
    onHideDeleteConfirm,
    onDelete,
    onSubmit,
    children,
    maxWidth = 'md',
    hideDelete = false,
    modalId = 'step-modal',
}: StepModalLayoutProps) {
    const titleId = `${modalId}-title`;
    const descId = `${modalId}-description`;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={maxWidth}
            fullWidth
            PaperProps={{ sx: { borderRadius: 2 } }}
            aria-labelledby={titleId}
            aria-describedby={descId}
            aria-modal="true"
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, pb: 0 }}>
                <Typography id={titleId} variant="h6" fontWeight={700}>
                    {isEditMode ? editTitle : title}
                </Typography>
                <IconButton onClick={onClose} size="small" aria-label="Fermer la modale">
                    <CloseIcon />
                </IconButton>
            </Box>

            <form onSubmit={onSubmit} aria-label="Formulaire de modification">
                <DialogContent sx={{ pt: 2 }} id={descId}>
                    {children}
                </DialogContent>

                <Divider />

                <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                    <Box>
                        {isEditMode && !hideDelete && !showDeleteConfirm && (
                            <Button
                                type="button"
                                onClick={onShowDeleteConfirm}
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<DeleteIcon />}
                                aria-label="Supprimer cet élément"
                            >
                                Supprimer
                            </Button>
                        )}
                        {isEditMode && !hideDelete && showDeleteConfirm && (
                            <Stack direction="row" spacing={1} alignItems="center" role="alert" aria-live="polite">
                                <Typography variant="body2" color="error" fontWeight={600}>
                                    Confirmer ?
                                </Typography>
                                <Button
                                    type="button"
                                    onClick={onDelete}
                                    variant="contained"
                                    color="error"
                                    size="small"
                                    disabled={isDeleting}
                                    aria-label="Confirmer la suppression"
                                >
                                    {isDeleting ? '...' : 'Oui'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={onHideDeleteConfirm}
                                    variant="text"
                                    size="small"
                                    aria-label="Annuler la suppression"
                                >
                                    Non
                                </Button>
                            </Stack>
                        )}
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="text"
                            color="inherit"
                            aria-label="Annuler et fermer"
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={isPending}
                            aria-label={isPending ? 'Enregistrement en cours' : 'Sauvegarder les modifications'}
                            aria-busy={isPending}
                        >
                            {isPending ? 'Enregistrement...' : 'Sauvegarder'}
                        </Button>
                    </Stack>
                </DialogActions>
            </form>
        </Dialog>
    );
});
