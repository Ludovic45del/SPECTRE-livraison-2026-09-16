/**
 * Embases List Page - Embases à gaz
 * @module pages/embases
 *
 * Style: Aligned with FsecsPage
 * Displays: Identifiant, Type, Statut opérationnel, Localisation, Étanchéité He, Étalonné, MCC, Electrovanne
 * Features: Sortable columns, pagination, filters
 */

import { memo, useMemo, useCallback } from 'react';
import {
    Box,
    Typography,
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TablePagination,
    TableSortLabel,
    Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEmbases } from '@entities/embase';
import { EmbasesToolbar, useFilterEmbasesStore, useCreateEmbaseStore } from '@features/embase';
import { CreateEmbaseModal } from '@features/embase';
import { useEntityList, ROWS_PER_PAGE_OPTIONS } from '@shared/lib';
import { paths } from '@shared/config';
import { type SortColumn, filterEmbases, sortEmbases } from './embase-list-utils';
import { EmbaseTableRow } from './components/EmbaseTableRow';
import { EmbaseTableSkeleton } from './components/EmbaseTableSkeleton';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COLUMN_WIDTHS = {
    identifier: '12%',
    type: '12%',
    status: '14%',
    localisation: '12%',
    etancheite: '14%',
    etalonne: '14%',
    mcc: '10%',
    electrovanne: '6%',
    actions: '6%',
} as const;

const COLUMNS: { key: SortColumn; label: string; width: string }[] = [
    { key: 'identifier', label: 'Identifiant', width: COLUMN_WIDTHS.identifier },
    { key: 'type', label: 'Type', width: COLUMN_WIDTHS.type },
    { key: 'status', label: 'Statut', width: COLUMN_WIDTHS.status },
    { key: 'localisation', label: 'Localisation', width: COLUMN_WIDTHS.localisation },
    { key: 'etancheite', label: 'Étanchéité He', width: COLUMN_WIDTHS.etancheite },
    { key: 'etalonne', label: 'Étalonné', width: COLUMN_WIDTHS.etalonne },
    { key: 'mcc', label: 'MCC', width: COLUMN_WIDTHS.mcc },
    { key: 'electrovanne', label: 'EV', width: COLUMN_WIDTHS.electrovanne },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Sortable column header bar
// ─────────────────────────────────────────────────────────────────────────────

interface EmbaseTableHeaderProps {
    columns: typeof COLUMNS;
    sortColumn: SortColumn;
    sortDirection: 'asc' | 'desc';
    onSort: (col: SortColumn) => void;
    actionsWidth: string;
}

const EmbaseTableHeader = memo(function EmbaseTableHeader({
    columns,
    sortColumn,
    sortDirection,
    onSort,
    actionsWidth,
}: EmbaseTableHeaderProps) {
    return (
        <Paper variant="outlined" sx={{ borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', py: 1.25 }}>
                {columns.map((col) => (
                    <Box key={col.key} sx={{ width: col.width, pl: 2 }}>
                        <TableSortLabel
                            active={sortColumn === col.key}
                            direction={sortColumn === col.key ? sortDirection : 'asc'}
                            onClick={() => onSort(col.key)}
                            sx={{ fontWeight: 500, fontSize: '0.95rem' }}
                        >
                            {col.label}
                        </TableSortLabel>
                    </Box>
                ))}
                <Box sx={{ width: actionsWidth }} />
            </Box>
        </Paper>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function EmbasesPage() {
    const navigate = useNavigate();
    const { data: embases, isLoading, error } = useEmbases();
    const filters = useFilterEmbasesStore((state) => state.filters);
    const openCreateModal = useCreateEmbaseStore((state) => state.open);
    const {
        sortColumn,
        sortDirection,
        page,
        rowsPerPage,
        handleSort,
        handleChangePage,
        handleChangeRowsPerPage,
        paginate,
    } = useEntityList<SortColumn>({ defaultSortColumn: 'identifier' });

    const processedEmbases = useMemo(() => {
        if (!embases) return [];
        const filtered = filterEmbases(embases, filters);
        return sortEmbases(filtered, sortColumn, sortDirection);
    }, [embases, filters, sortColumn, sortDirection]);

    const paginatedEmbases = useMemo(() => paginate(processedEmbases), [paginate, processedEmbases]);

    const handleNavigate = useCallback((slug: string) => navigate(paths.embase.tab(slug, 'voie-v1')), [navigate]);

    // Loading state - Skeleton table
    if (isLoading) {
        return (
            <Container maxWidth={false} sx={{ py: 4 }}>
                <EmbasesToolbar onAdd={openCreateModal} />
                <EmbaseTableSkeleton columns={COLUMNS} columnWidths={COLUMN_WIDTHS} />
            </Container>
        );
    }

    // Error state
    if (error) {
        return (
            <Container maxWidth={false} sx={{ py: 4 }}>
                <Alert severity="error">Erreur lors du chargement des embases: {error.message}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <EmbasesToolbar onAdd={openCreateModal} />
            <EmbaseTableHeader
                columns={COLUMNS}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                actionsWidth={COLUMN_WIDTHS.actions}
            />

            <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ borderColor: 'divider', borderRadius: 1, mt: 3 }}
            >
                <Table sx={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        {Object.values(COLUMN_WIDTHS).map((width, i) => (
                            <col key={i} style={{ width }} />
                        ))}
                    </colgroup>
                    <TableBody>
                        {paginatedEmbases.map((embase) => (
                            <EmbaseTableRow key={embase.uuid} embase={embase} onNavigate={handleNavigate} />
                        ))}
                        {paginatedEmbases.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} align="center">
                                    <Typography color="text.secondary" sx={{ py: 4 }}>
                                        Aucune embase trouvée
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={processedEmbases.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                    labelRowsPerPage="Lignes par page:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
                />
            </TableContainer>

            <CreateEmbaseModal />
        </Container>
    );
}
