/**
 * AdjustStockDialog — ajout / retrait de stock pour un consommable.
 *
 * Crée un mouvement de stock (`entree` ou `sortie`) via `useCreateStockMovement`.
 * Le backend met à jour la quantité de l'item de façon atomique.
 *
 * - Mode (Ajouter / Retirer) via ToggleButtonGroup.
 * - Quantité (entier > 0), date (défaut aujourd'hui), remarque (optionnelle).
 * - Aperçu de la quantité résultante + garde-fou : un retrait ne peut pas
 *   faire passer le stock sous 0.
 *
 * Style aligné sur EditItemModal (DialogTitle + close, DialogContent dividers).
 */

import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';
import { MOVEMENT_TYPE, useCreateStockMovement } from '@entities/stock-item';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { useAdjustStockStore } from '../model';

type AdjustMode = 'add' | 'remove';

/** Date du jour au format ISO `YYYY-MM-DD` (timezone locale). */
function todayIso(): string {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function AdjustStockDialog() {
    const isOpen = useAdjustStockStore((s) => s.isOpen);
    const item = useAdjustStockStore((s) => s.item);
    const close = useAdjustStockStore((s) => s.close);

    const createMovement = useCreateStockMovement();
    const { showNotification } = useNotification();

    const [mode, setMode] = useState<AdjustMode>('add');
    const [quantity, setQuantity] = useState<string>('');
    const [date, setDate] = useState<string>(todayIso());
    const [remarque, setRemarque] = useState<string>('');

    // Réinitialise le formulaire à chaque (ré)ouverture sur un item.
    useEffect(() => {
        if (isOpen) {
            setMode('add');
            setQuantity('');
            setDate(todayIso());
            setRemarque('');
        }
    }, [isOpen, item?.uuid]);

    const currentQty = item?.quantite ?? 0;
    const unite = item?.unite ?? '';

    const parsedQty = useMemo(() => {
        const n = Number(quantity);
        return Number.isInteger(n) && n > 0 ? n : null;
    }, [quantity]);

    const resultingQty = useMemo(() => {
        if (parsedQty === null) return currentQty;
        return mode === 'add' ? currentQty + parsedQty : currentQty - parsedQty;
    }, [currentQty, mode, parsedQty]);

    const isBelowZero = mode === 'remove' && parsedQty !== null && resultingQty < 0;
    const hasQtyError = quantity.trim() !== '' && parsedQty === null;
    const canSubmit = parsedQty !== null && !isBelowZero && date !== '' && !createMovement.isPending;

    const handleSubmit = async () => {
        if (!item || parsedQty === null) return;
        const isAdd = mode === 'add';
        try {
            await createMovement.mutateAsync({
                catalog_item_uuid: item.uuid,
                movement_type: isAdd ? MOVEMENT_TYPE.ENTREE : MOVEMENT_TYPE.SORTIE,
                quantite_delta: isAdd ? parsedQty : -parsedQty,
                date: date || null,
                remarque: remarque.trim() || null,
            });
            showNotification(
                isAdd
                    ? `+${parsedQty} ${unite} ajouté(s) à « ${item.name} »`
                    : `−${parsedQty} ${unite} retiré(s) de « ${item.name} »`,
                'success',
            );
            close();
        } catch (err) {
            showNotification(getErrorMessage(err, 'Erreur lors de l’enregistrement du mouvement'), 'error');
        }
    };

    return (
        <Dialog open={isOpen} onClose={close} maxWidth="xs" fullWidth aria-labelledby="adjust-stock-title">
            <DialogTitle
                id="adjust-stock-title"
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}
            >
                <span>Ajuster le stock</span>
                <IconButton aria-label="Fermer" onClick={close} size="small">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2.5}>
                    {item && (
                        <Box>
                            <Typography sx={{ fontWeight: 500 }}>{item.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Stock actuel&nbsp;:{' '}
                                <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                                    {currentQty} {unite}
                                </Box>
                            </Typography>
                        </Box>
                    )}

                    <ToggleButtonGroup
                        value={mode}
                        exclusive
                        fullWidth
                        size="small"
                        onChange={(_e, next: AdjustMode | null) => {
                            if (next) setMode(next);
                        }}
                        aria-label="Mode d'ajustement"
                    >
                        <ToggleButton value="add" aria-label="Ajouter du stock">
                            <AddIcon fontSize="small" sx={{ mr: 0.5 }} />
                            Ajouter
                        </ToggleButton>
                        <ToggleButton value="remove" aria-label="Retirer du stock">
                            <RemoveIcon fontSize="small" sx={{ mr: 0.5 }} />
                            Retirer
                        </ToggleButton>
                    </ToggleButtonGroup>

                    <TextField
                        label="Quantité"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        fullWidth
                        size="small"
                        autoFocus
                        required
                        inputProps={{ min: 1, step: 1 }}
                        InputProps={
                            unite
                                ? { endAdornment: <Typography color="text.secondary">{unite}</Typography> }
                                : undefined
                        }
                        error={hasQtyError}
                        helperText={hasQtyError ? 'Saisissez un entier strictement positif.' : ' '}
                    />

                    <TextField
                        label="Date du mouvement"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                    />

                    <TextField
                        label="Remarque (optionnelle)"
                        value={remarque}
                        onChange={(e) => setRemarque(e.target.value)}
                        fullWidth
                        size="small"
                        multiline
                        minRows={2}
                    />

                    {/* Aperçu de la quantité résultante */}
                    <Box
                        sx={{
                            px: 1.5,
                            py: 1,
                            borderRadius: 1,
                            bgcolor: 'action.hover',
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            Stock après opération
                        </Typography>
                        <Typography sx={{ fontWeight: 700, color: isBelowZero ? 'error.main' : 'text.primary' }}>
                            {resultingQty} {unite}
                        </Typography>
                    </Box>

                    {isBelowZero && (
                        <Alert severity="error" variant="outlined">
                            Un retrait ne peut pas faire passer le stock sous 0 (stock actuel&nbsp;: {currentQty}{' '}
                            {unite}).
                        </Alert>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={close} color="inherit" disabled={createMovement.isPending}>
                    Annuler
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color={mode === 'remove' ? 'error' : 'primary'}
                    disabled={!canSubmit}
                    startIcon={mode === 'add' ? <AddIcon /> : <RemoveIcon />}
                >
                    {createMovement.isPending ? 'Enregistrement…' : mode === 'add' ? 'Ajouter' : 'Retirer'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
