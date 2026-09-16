/**
 * AssemblyItemDetailModal — fiche d'une ligne du tableau récap (retour R14).
 *
 * Ouverte par double-clic sur une ligne (ou via le bouton « Voir la fiche »).
 * Affiche les informations catalogue de l'item (nom, référence, caractéristique,
 * fournisseur, emplacement, rubrique, état, matière, masse) et la remarque
 * COMPLÈTE de LA ligne (`row.uuid`), éditable via `usePatchAssemblyItem`.
 *
 * Un même consommable peut apparaître sur plusieurs lignes avec des remarques
 * différentes (R20) : la remarque est bien celle de la ligne, pas de l'item.
 * Lecture seule si `disabled` (FSEC tirée : le backend refuse de toute façon).
 */

import { useCallback, useEffect, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

import { usePatchAssemblyItem, type FsecAssemblyItemDetail } from '@entities/fsec-assembly-item';
import {
    CATEGORY_LABELS,
    ITEM_KIND,
    ITEM_KIND_LABELS,
    KindIcon,
    QuantityBadge,
    RubricBadge,
    StatusBadge,
    formatLocation,
} from '@entities/stock-item';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib/error-utils';
import { EMPTY_VALUE, formatMasseMg } from '../lib/format';

/** Limite alignée sur AddAssemblyItemModal (et le backend : remarque ≤ 1000). */
export const ASSEMBLY_REMARK_MAX_LENGTH = 1000;

interface AssemblyItemDetailModalProps {
    open: boolean;
    /** Ligne du tableau récap (null quand fermé). */
    item: FsecAssemblyItemDetail | null;
    fsecUuid: string;
    /** Lecture seule (FSEC verrouillée). */
    disabled?: boolean;
    onClose: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                {label}
            </Typography>
            {typeof children === 'string' ? (
                <Typography variant="body2" fontWeight={500}>
                    {children}
                </Typography>
            ) : (
                children
            )}
        </Box>
    );
}

export function AssemblyItemDetailModal({
    open,
    item,
    fsecUuid,
    disabled = false,
    onClose,
}: AssemblyItemDetailModalProps) {
    const patchMutation = usePatchAssemblyItem(fsecUuid);
    const { showNotification } = useNotification();
    const [remarque, setRemarque] = useState('');

    // Re-synchronise le brouillon à chaque ouverture / changement de ligne.
    useEffect(() => {
        if (open) setRemarque(item?.remarque ?? '');
    }, [open, item?.uuid, item?.remarque]);

    const handleClose = useCallback(() => {
        if (patchMutation.isPending) return;
        onClose();
    }, [onClose, patchMutation.isPending]);

    const handleSave = useCallback(async () => {
        if (!item) return;
        try {
            await patchMutation.mutateAsync({
                uuid: item.uuid,
                data: { remarque: remarque.trim() || null },
            });
            showNotification('Remarque enregistrée', 'success');
            onClose();
        } catch (err) {
            showNotification(getErrorMessage(err, "Erreur lors de l'enregistrement de la remarque"), 'error');
        }
    }, [item, remarque, patchMutation, showNotification, onClose]);

    if (!item) return null;

    const catalogItem = item.catalogItem;
    const isDirty = remarque.trim() !== (item.remarque ?? '').trim();

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth aria-labelledby="assembly-item-detail-title">
            <DialogTitle id="assembly-item-detail-title" sx={{ pb: 1 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <KindIcon kind={catalogItem.kind} />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" component="span" sx={{ display: 'block', fontWeight: 600 }}>
                            {catalogItem.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {ITEM_KIND_LABELS[catalogItem.kind]} · {CATEGORY_LABELS[catalogItem.category]}
                        </Typography>
                    </Box>
                </Stack>
            </DialogTitle>

            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Field label="Référence">{catalogItem.reference ?? EMPTY_VALUE}</Field>
                    </Grid>
                    <Grid item xs={6}>
                        <Field label="Caractéristique">{catalogItem.caracteristique ?? EMPTY_VALUE}</Field>
                    </Grid>
                    <Grid item xs={6}>
                        <Field label="Fournisseur">{catalogItem.fournisseur ?? EMPTY_VALUE}</Field>
                    </Grid>
                    <Grid item xs={6}>
                        <Field label="Emplacement">{formatLocation(catalogItem)}</Field>
                    </Grid>
                    <Grid item xs={6}>
                        <Field label="Rubrique">
                            <RubricBadge category={catalogItem.category} />
                        </Field>
                    </Grid>
                    <Grid item xs={6}>
                        <Field label="État / Stock">
                            {catalogItem.kind === ITEM_KIND.ELEMENT && catalogItem.status ? (
                                <StatusBadge status={catalogItem.status} />
                            ) : catalogItem.kind === ITEM_KIND.CONSUMABLE ? (
                                <QuantityBadge item={catalogItem} />
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    {EMPTY_VALUE}
                                </Typography>
                            )}
                        </Field>
                    </Grid>
                    <Grid item xs={6}>
                        <Field label="Matière">{catalogItem.matiere ?? EMPTY_VALUE}</Field>
                    </Grid>
                    <Grid item xs={6}>
                        <Field label="Masse [mg]">{formatMasseMg(catalogItem.masseMg)}</Field>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <TextField
                    label="Remarque"
                    value={remarque}
                    onChange={(e) => setRemarque(e.target.value)}
                    multiline
                    minRows={3}
                    maxRows={10}
                    size="small"
                    fullWidth
                    disabled={disabled}
                    inputProps={{ maxLength: ASSEMBLY_REMARK_MAX_LENGTH, 'aria-label': 'Remarque' }}
                    helperText={
                        disabled
                            ? 'FSEC verrouillée : remarque en lecture seule.'
                            : `${remarque.length} / ${ASSEMBLY_REMARK_MAX_LENGTH} caractères`
                    }
                />
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} color="inherit" disabled={patchMutation.isPending}>
                    Fermer
                </Button>
                {!disabled && (
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        startIcon={<SaveIcon />}
                        disabled={!isDirty || patchMutation.isPending}
                    >
                        {patchMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
