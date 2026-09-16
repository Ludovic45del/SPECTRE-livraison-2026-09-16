/**
 * EditItemModal — modale d'édition d'un item du catalogue.
 *
 * - Charge l'item via `useCatalogItem(uuid)`.
 * - Affiche le shell adapté au kind (immuable après création — cf. CDC §5.1).
 * - Gère la suppression avec confirmation.
 */

import { useCallback, useState } from 'react';
import {
    Alert,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ITEM_KIND, ITEM_KIND_COLORS, useCatalogItem, useDeleteCatalogItem } from '@entities/stock-item';
import { useNotification } from '@shared/ui';
import { getErrorMessage, softChipSx } from '@shared/lib';
import { useEditItemStore } from '../model';
import { EditElementShell } from './EditElementShell';
import { EditConsumableShell } from './EditConsumableShell';

export function EditItemModal() {
    const isOpen = useEditItemStore((s) => s.isOpen);
    const uuid = useEditItemStore((s) => s.uuid);
    const close = useEditItemStore((s) => s.close);

    const { data: item, isLoading, error } = useCatalogItem(uuid ?? '');
    const deleteMutation = useDeleteCatalogItem();
    const { showNotification } = useNotification();

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const handleDelete = useCallback(async () => {
        if (!uuid || !item) return;
        try {
            await deleteMutation.mutateAsync(uuid);
            showNotification(`"${item.name}" supprimé du catalogue`, 'success');
            setConfirmDeleteOpen(false);
            close();
        } catch (err) {
            showNotification(getErrorMessage(err, 'Erreur lors de la suppression'), 'error');
            setConfirmDeleteOpen(false);
        }
    }, [close, deleteMutation, item, showNotification, uuid]);

    return (
        <>
            <Dialog open={isOpen} onClose={close} maxWidth="md" fullWidth aria-labelledby="edit-stock-item-title">
                <DialogTitle
                    id="edit-stock-item-title"
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <span>{item ? `Édition — ${item.name}` : 'Édition'}</span>
                        {item && (
                            <Chip
                                label={ITEM_KIND_COLORS[item.kind].label}
                                sx={softChipSx(ITEM_KIND_COLORS[item.kind].color)}
                            />
                        )}
                    </Stack>
                    <IconButton aria-label="Fermer" onClick={close} size="small">
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers>
                    {isLoading && (
                        <Stack alignItems="center" sx={{ py: 6 }}>
                            <CircularProgress />
                        </Stack>
                    )}
                    {error && !isLoading && (
                        <Alert severity="error">
                            Impossible de charger l'item : {error instanceof Error ? error.message : 'erreur inconnue'}
                        </Alert>
                    )}
                    {item &&
                        !isLoading &&
                        !error &&
                        (item.kind === ITEM_KIND.ELEMENT ? (
                            <EditElementShell
                                item={item}
                                onCancel={close}
                                onSuccess={close}
                                onDelete={() => setConfirmDeleteOpen(true)}
                            />
                        ) : (
                            <EditConsumableShell
                                item={item}
                                onCancel={close}
                                onSuccess={close}
                                onDelete={() => setConfirmDeleteOpen(true)}
                            />
                        ))}
                </DialogContent>
            </Dialog>

            {/* Confirmation suppression */}
            <Dialog
                open={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                maxWidth="xs"
                aria-labelledby="confirm-delete-title"
            >
                <DialogTitle id="confirm-delete-title">Confirmer la suppression</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        L'item «&nbsp;{item?.name}&nbsp;» sera désactivé du catalogue. Cette action est réservée aux
                        administrateurs et peut être refusée si l'item est référencé par une FSEC.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setConfirmDeleteOpen(false)} color="inherit">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleDelete}
                        color="error"
                        variant="contained"
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
