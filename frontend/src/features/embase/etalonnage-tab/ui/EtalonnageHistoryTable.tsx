/**
 * Etalonnage History Table Component
 * @module features/embase/etalonnage-tab
 *
 * Affiche l'historique des etalonnages sous forme de tableau avec suppression.
 */

import { memo, useCallback, useMemo } from 'react';
import {
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tooltip,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { type Etalonnage } from '@entities/etalonnage';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EtalonnageHistoryTableProps {
    sortedData: Etalonnage[];
    onDelete: (uuid: string) => void;
    isDeletingId: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Memoized table row (fixes R-PERF-03 and R-PERF-04)
// ─────────────────────────────────────────────────────────────────────────────

interface EtalonnageHistoryRowProps {
    etalonnage: Etalonnage;
    onDelete: (uuid: string) => void;
    isDeleting: boolean;
}

const EtalonnageHistoryRow = memo(function EtalonnageHistoryRow({
    etalonnage: etal,
    onDelete,
    isDeleting,
}: EtalonnageHistoryRowProps) {
    const handleDelete = useCallback(() => onDelete(etal.uuid), [onDelete, etal.uuid]);

    return (
        <TableRow hover>
            <TableCell>{etal.date ? new Date(etal.date).toLocaleDateString('fr-FR') : '-'}</TableCell>
            <TableCell>{etal.operateur || '-'}</TableCell>
            <TableCell align="right">{etal.offset0BarMv?.toFixed(2) ?? '-'}</TableCell>
            <TableCell align="right">{etal.mesurande0BarLie?.toFixed(2) ?? '-'}</TableCell>
            <TableCell align="right">{etal.signalEtendueMv?.toFixed(2) ?? '-'}</TableCell>
            <TableCell align="right">{etal.signalPaMeteociel?.toFixed(2) ?? '-'}</TableCell>
            <TableCell align="center">
                <Tooltip title="Supprimer">
                    <IconButton size="small" onClick={handleDelete} disabled={isDeleting}>
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const EtalonnageHistoryTable = memo(function EtalonnageHistoryTable({
    sortedData,
    onDelete,
    isDeletingId,
}: EtalonnageHistoryTableProps) {
    const reversedData = useMemo(() => [...sortedData].reverse(), [sortedData]);

    return (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3 }}>
                Historique des étalonnages
            </Typography>
            {sortedData.length === 0 ? (
                <Typography color="text.secondary">Aucun étalonnage enregistré.</Typography>
            ) : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Opérateur</TableCell>
                                <TableCell align="right">Offset (b) mV</TableCell>
                                <TableCell align="right">Mesurande LIE</TableCell>
                                <TableCell align="right">Sensibilité (a) mV</TableCell>
                                <TableCell align="right">Signal météociel</TableCell>
                                <TableCell align="center" width={60} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reversedData.map((etal) => (
                                <EtalonnageHistoryRow
                                    key={etal.uuid}
                                    etalonnage={etal}
                                    onDelete={onDelete}
                                    isDeleting={isDeletingId}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
});
