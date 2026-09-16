/**
 * AssemblyItemsTable — tableau récap des éléments/consommables liés à une FSEC.
 *
 * - Chargé via `useFsecAssemblyItems(fsecUuid)` (payload enrichi : catalog_item joint).
 * - Lecture seule si la FSEC est verrouillée (`disabled` prop).
 * - Suppression d'une ligne : confirmation puis libération côté backend.
 * - Fiche de l'item (R14) : double-clic sur la ligne ou bouton « Voir la fiche »
 *   → remarque complète (éditable si non verrouillé).
 * - Colonnes Matière / Masse [mg] (R03) remontées depuis le catalogue.
 *
 * Cf. CDC §5.3.
 */

import { memo, useCallback, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    Alert as MuiAlert,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { useFsecAssemblyItems, useRemoveAssemblyItem, type FsecAssemblyItemDetail } from '@entities/fsec-assembly-item';
import { QuantityBadge, RubricBadge, StatusBadge, formatLocation, type StockCatalogItem } from '@entities/stock-item';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib/error-utils';
import { EMPTY_VALUE, formatMasseMg } from '../lib/format';
import { AssemblyItemDetailModal } from './AssemblyItemDetailModal';

interface AssemblyItemsTableProps {
    fsecUuid: string;
    /** Si vrai, le tableau est en lecture seule (FSEC tirée). */
    disabled?: boolean;
}

export function AssemblyItemsTable({ fsecUuid, disabled = false }: AssemblyItemsTableProps) {
    const { data: items, isLoading, error } = useFsecAssemblyItems(fsecUuid);
    const removeMutation = useRemoveAssemblyItem(fsecUuid);
    const { showNotification } = useNotification();

    const [deleteTarget, setDeleteTarget] = useState<FsecAssemblyItemDetail | null>(null);
    const [detailTarget, setDetailTarget] = useState<FsecAssemblyItemDetail | null>(null);

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await removeMutation.mutateAsync(deleteTarget.uuid);
            showNotification(`« ${deleteTarget.catalogItem.name} » retiré du tableau récap`, 'success');
            setDeleteTarget(null);
        } catch (err) {
            showNotification(getErrorMessage(err, 'Erreur lors de la suppression'), 'error');
        }
    };

    const handleCloseDetail = useCallback(() => setDetailTarget(null), []);

    if (isLoading) {
        return <Skeleton variant="rounded" height={180} />;
    }

    if (error) {
        return (
            <MuiAlert severity="error" role="alert">
                Erreur de chargement des éléments : {error instanceof Error ? error.message : 'inconnue'}
            </MuiAlert>
        );
    }

    if (!items || items.length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                    Aucun élément ni consommable n'est associé à cette FSEC.
                </Typography>
            </Paper>
        );
    }

    return (
        <>
            <TableContainer component={Paper} variant="outlined" sx={{ borderColor: 'divider' }}>
                <Table size="small" aria-label="Tableau récap des éléments et consommables de la FSEC">
                    <TableHead>
                        <TableRow>
                            <TableCell>Nom</TableCell>
                            <TableCell>Référence</TableCell>
                            <TableCell>Rubrique</TableCell>
                            <TableCell>État / Stock</TableCell>
                            <TableCell>Matière</TableCell>
                            <TableCell align="right">Masse [mg]</TableCell>
                            <TableCell>Emplacement</TableCell>
                            <TableCell>Remarque</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((row) => (
                            <AssemblyItemRow
                                key={row.uuid}
                                row={row}
                                disabled={disabled}
                                onDelete={setDeleteTarget}
                                onOpenDetail={setDetailTarget}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Fiche de la ligne (R14) : la remarque affichée est celle de LA ligne. */}
            <AssemblyItemDetailModal
                open={Boolean(detailTarget)}
                item={detailTarget}
                fsecUuid={fsecUuid}
                disabled={disabled}
                onClose={handleCloseDetail}
            />

            <Dialog
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                aria-labelledby="confirm-delete-assembly-item"
            >
                <DialogTitle id="confirm-delete-assembly-item">Retirer cet élément ?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Vous êtes sur le point de retirer <strong>{deleteTarget?.catalogItem.name}</strong> du tableau
                        récap.
                        {deleteTarget?.catalogItem.kind === 'element' && (
                            <>
                                {' '}
                                L'élément redeviendra <em>disponible</em> dans le catalogue.
                            </>
                        )}
                    </DialogContentText>
                    {/* R20 : un consommable peut figurer sur plusieurs lignes homonymes —
                        la remarque désambiguïse la ligne visée. */}
                    {deleteTarget?.remarque && (
                        <DialogContentText sx={{ mt: 1.5 }}>
                            Remarque de la ligne : <em>« {deleteTarget.remarque} »</em>
                        </DialogContentText>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} color="inherit">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        color="error"
                        variant="contained"
                        disabled={removeMutation.isPending}
                    >
                        {removeMutation.isPending ? 'Suppression…' : 'Retirer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

interface AssemblyItemRowProps {
    row: FsecAssemblyItemDetail;
    disabled: boolean;
    onDelete: (row: FsecAssemblyItemDetail) => void;
    onOpenDetail: (row: FsecAssemblyItemDetail) => void;
}

const AssemblyItemRow = memo(function AssemblyItemRow({ row, disabled, onDelete, onOpenDetail }: AssemblyItemRowProps) {
    const item: StockCatalogItem = row.catalogItem;

    const handleOpenDetail = useCallback(() => onOpenDetail(row), [onOpenDetail, row]);
    const handleDelete = useCallback(() => onDelete(row), [onDelete, row]);
    // Les clics (simples ou doubles) sur la colonne Actions ne doivent pas
    // remonter au double-clic de la ligne (ouverture de la fiche).
    const stop = useCallback((e: React.SyntheticEvent) => e.stopPropagation(), []);

    return (
        <TableRow hover onDoubleClick={handleOpenDetail} sx={{ cursor: 'pointer' }} aria-label={`Ligne ${item.name}`}>
            <TableCell>
                <Stack spacing={0.25}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.name}
                    </Typography>
                    {item.caracteristique && (
                        <Typography variant="caption" color="text.secondary">
                            {item.caracteristique}
                        </Typography>
                    )}
                </Stack>
            </TableCell>
            <TableCell>
                <Typography variant="body2" color="text.secondary">
                    {item.reference ?? EMPTY_VALUE}
                </Typography>
            </TableCell>
            <TableCell>
                <RubricBadge category={item.category} />
            </TableCell>
            <TableCell>
                {item.kind === 'element' && item.status ? (
                    <StatusBadge status={item.status} />
                ) : item.kind === 'consumable' ? (
                    <QuantityBadge item={item} />
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        {EMPTY_VALUE}
                    </Typography>
                )}
            </TableCell>
            <TableCell>
                <Typography variant="body2" color={item.matiere ? 'text.primary' : 'text.secondary'}>
                    {item.matiere ?? EMPTY_VALUE}
                </Typography>
            </TableCell>
            <TableCell align="right">
                <Typography
                    variant="body2"
                    color={item.masseMg !== null ? 'text.primary' : 'text.secondary'}
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                    {formatMasseMg(item.masseMg)}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography variant="body2" color="text.secondary">
                    {formatLocation(item)}
                </Typography>
            </TableCell>
            <TableCell>
                {/* Aperçu tronqué ; texte complet au survol et dans la fiche (R14). */}
                <Tooltip title={row.remarque ?? ''} placement="top-start" enterDelay={300}>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            maxWidth: 240,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {row.remarque || EMPTY_VALUE}
                    </Typography>
                </Tooltip>
            </TableCell>
            <TableCell align="right" onClick={stop} onDoubleClick={stop}>
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Voir la fiche">
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={handleOpenDetail}
                            aria-label={`Voir la fiche de ${item.name}`}
                        >
                            <InfoOutlinedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    {!disabled && (
                        <Tooltip title="Retirer du tableau récap">
                            <span>
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={handleDelete}
                                    aria-label={`Retirer ${item.name}`}
                                >
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}
                </Stack>
            </TableCell>
        </TableRow>
    );
});
