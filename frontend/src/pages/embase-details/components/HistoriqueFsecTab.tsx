import { useMemo, useCallback, useState, memo } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Skeleton,
    Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { type Embase, useEmbaseFsecHistory, type EmbaseFsecHistoryItem } from '@entities/embase';
import { paths } from '@shared/config';
import { FsecHistoryRow } from './FsecHistoryRow';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SortColumn = 'fsecName' | 'campaignName' | 'gasType' | 'dateOfFulfilment';
type SortDirection = 'asc' | 'desc';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COLUMN_WIDTHS = {
    fsecName: '30%',
    campaignName: '28%',
    gasType: '18%',
    dateOfFulfilment: '18%',
    actions: '6%',
} as const;

const COLUMNS: { key: SortColumn; label: string }[] = [
    { key: 'fsecName', label: 'FSEC' },
    { key: 'campaignName', label: 'Campagne' },
    { key: 'gasType', label: 'Type de gaz' },
    { key: 'dateOfFulfilment', label: 'Date de remplissage' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const sortItems = (
    items: EmbaseFsecHistoryItem[],
    column: SortColumn,
    direction: SortDirection,
): EmbaseFsecHistoryItem[] => {
    const sorted = [...items];
    const multiplier = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
        let comparison = 0;
        switch (column) {
            case 'fsecName':
                comparison = a.fsecName.localeCompare(b.fsecName);
                break;
            case 'campaignName':
                comparison = (a.campaignName ?? '').localeCompare(b.campaignName ?? '');
                break;
            case 'gasType':
                comparison = (a.gasType ?? '').localeCompare(b.gasType ?? '');
                break;
            case 'dateOfFulfilment': {
                const dateA = a.dateOfFulfilment ? new Date(a.dateOfFulfilment).getTime() : 0;
                const dateB = b.dateOfFulfilment ? new Date(b.dateOfFulfilment).getTime() : 0;
                comparison = dateA - dateB;
                break;
            }
        }
        return comparison * multiplier;
    });

    return sorted;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const TableColgroup = memo(function TableColgroup() {
    return (
        <colgroup>
            {Object.values(COLUMN_WIDTHS).map((width, i) => (
                <col key={i} style={{ width }} />
            ))}
        </colgroup>
    );
});

const LoadingSkeleton = memo(function LoadingSkeleton() {
    return (
        <Box role="status" aria-label="Chargement de l'historique FSEC">
            <TableContainer component={Paper} variant="outlined" sx={{ borderColor: 'divider', borderRadius: 1 }}>
                <Table sx={{ tableLayout: 'fixed' }}>
                    <TableColgroup />
                    <TableHead>
                        <TableRow>
                            {COLUMNS.map((col) => (
                                <TableCell key={col.key} sx={{ fontWeight: 600 }}>
                                    {col.label}
                                </TableCell>
                            ))}
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <Skeleton variant="text" width="80%" height={24} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="text" width="70%" height={24} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="text" width={60} height={24} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="text" width={80} height={24} />
                                </TableCell>
                                <TableCell align="center">
                                    <Skeleton variant="circular" width={32} height={32} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

function HistoriqueFsecTabComponent({ embase }: { embase: Embase }) {
    const navigate = useNavigate();
    const { data: fsecHistory, isLoading, error } = useEmbaseFsecHistory(embase.uuid);

    const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection }>({
        column: 'dateOfFulfilment',
        direction: 'desc',
    });

    const sortedItems = useMemo(() => {
        if (!fsecHistory) return [];
        return sortItems(fsecHistory, sort.column, sort.direction);
    }, [fsecHistory, sort.column, sort.direction]);

    const handleNavigate = useCallback(
        // L'historique ne porte que le version_uuid (pas de slug) : on navigue par
        // UUID, la page réécrit l'URL vers le slug canonique (rétro-compat).
        (fsecVersionUuid: string) => {
            navigate(paths.fsec.tab(fsecVersionUuid, 'overview'));
        },
        [navigate],
    );

    const handleSort = useCallback((column: SortColumn) => {
        setSort((prev) => ({
            column,
            direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    }, []);

    // Loading state
    if (isLoading) {
        return <LoadingSkeleton />;
    }

    // Error state
    if (error) {
        return (
            <Alert severity="error" role="alert">
                Erreur lors du chargement de l'historique FSEC: {error.message}
            </Alert>
        );
    }

    // Empty state
    if (!fsecHistory || fsecHistory.length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: 4, borderColor: 'divider', borderRadius: 1 }}>
                <Typography color="text.secondary" align="center">
                    Aucun FSEC associé. Cette embase n&apos;a pas encore été utilisée dans une étape gaz.
                </Typography>
            </Paper>
        );
    }

    return (
        <Box component="section" aria-label="Historique des FSECs de l'embase">
            <TableContainer component={Paper} variant="outlined" sx={{ borderColor: 'divider', borderRadius: 1 }}>
                <Table sx={{ tableLayout: 'fixed' }} aria-label="Tableau de l'historique FSEC">
                    <TableColgroup />
                    <TableHead>
                        <TableRow>
                            {COLUMNS.map((col) => (
                                <TableCell key={col.key} sx={{ fontWeight: 600 }}>
                                    <TableSortLabel
                                        active={sort.column === col.key}
                                        direction={sort.column === col.key ? sort.direction : 'asc'}
                                        onClick={() => handleSort(col.key)}
                                    >
                                        {col.label}
                                    </TableSortLabel>
                                </TableCell>
                            ))}
                            <TableCell aria-label="Actions" />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedItems.map((item) => (
                            <FsecHistoryRow key={item.fsecUuid} item={item} onNavigate={handleNavigate} />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'right' }} aria-live="polite">
                {sortedItems.length} FSEC{sortedItems.length > 1 ? 's' : ''}
            </Typography>
        </Box>
    );
}

export const HistoriqueFsecTab = memo(HistoriqueFsecTabComponent);
