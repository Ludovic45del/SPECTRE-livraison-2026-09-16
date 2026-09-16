/**
 * FA List Page - Fiches d'Anomalie
 * @module pages/fas
 *
 * Style: Aligned with FsecsPage
 * Displays: Identifiant, FSEC, Statut, Criticité, Date évènement
 * Features: Sortable columns, pagination, filters
 */

import { useMemo, useCallback } from 'react';
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
import { useFas, Fa, sortFas, type FaSortColumn } from '@entities/fa';
import { FasToolbar, useFilterFasStore, type FaFilters, FaTableRow, CreateFaModal } from '@features/fa';
import { useEntityList, ROWS_PER_PAGE_OPTIONS } from '@shared/lib';
import { paths } from '@shared/config';
import { FasPageSkeleton } from './FasPageSkeleton';
import { FaKpiBar } from './FaKpiBar';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FaWithFsec extends Fa {
    fsecName: string;
    installation: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COLUMN_WIDTHS = {
    identifier: '18%',
    fsec: '18%',
    status: '13%',
    criticality: '13%',
    type5m: '13%',
    eventDate: '17%',
    actions: '8%',
} as const;

const COLUMNS: { key: FaSortColumn; label: string; width: string }[] = [
    { key: 'identifier', label: 'Identifiant', width: COLUMN_WIDTHS.identifier },
    { key: 'fsec', label: 'FSEC associée', width: COLUMN_WIDTHS.fsec },
    { key: 'status', label: 'Statut', width: COLUMN_WIDTHS.status },
    { key: 'criticality', label: 'Criticité', width: COLUMN_WIDTHS.criticality },
    { key: 'type5m', label: 'Type 5M', width: COLUMN_WIDTHS.type5m },
    { key: 'eventDate', label: 'Date évènement', width: COLUMN_WIDTHS.eventDate },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// fsec_name + installation sont désormais fournis directement par /fas/
// (cf. fa_mapper_bean_to_api côté backend) — plus besoin de re-fetcher /fsecs/.
const enrichFasWithFsec = (fas: Fa[] | undefined): FaWithFsec[] => {
    if (!fas) return [];
    return fas.map((fa) => ({
        ...fa,
        fsecName: fa.fsecDisplayName ?? fa.fsecName ?? 'N/A',
        installation: fa.installation ?? null,
    }));
};

const filterFas = (fas: FaWithFsec[], filters: FaFilters): FaWithFsec[] => {
    const { name, status, criticality, fsec, year, installation } = filters;
    const nameLower = name.toLowerCase();

    return fas.filter((fa) => {
        if (installation !== null && fa.installation && fa.installation !== installation) return false;
        if (name && !fa.identifier.toLowerCase().includes(nameLower)) return false;
        if (status !== null && fa.statusId !== status) return false;
        if (criticality !== null && fa.criticalityId !== criticality) return false;
        if (fsec !== null && fa.fsecVersionId !== fsec) return false;
        // Filter by year of eventDate
        if (year !== null && fa.eventDate) {
            const eventYear = new Date(fa.eventDate).getFullYear();
            if (eventYear !== year) return false;
        }
        return true;
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function FasPage() {
    const navigate = useNavigate();
    const { data: fas, isLoading, error } = useFas();
    const filters = useFilterFasStore((state) => state.filters);
    const {
        sortColumn,
        sortDirection,
        page,
        rowsPerPage,
        handleSort,
        handleChangePage,
        handleChangeRowsPerPage,
        paginate,
    } = useEntityList<FaSortColumn>({ defaultSortColumn: 'eventDate', defaultSortDirection: 'desc' });

    const processedFas = useMemo(() => {
        const enriched = enrichFasWithFsec(fas);
        const filtered = filterFas(enriched, filters);
        return sortFas(filtered, sortColumn, sortDirection);
    }, [fas, filters, sortColumn, sortDirection]);

    const paginatedFas = useMemo(() => paginate(processedFas), [paginate, processedFas]);

    const handleNavigateFa = useCallback((slug: string) => navigate(paths.fa.root(slug)), [navigate]);

    const handleNavigateFsec = useCallback(
        (e: React.MouseEvent, fsecSlug: string | null) => {
            e.stopPropagation();
            if (fsecSlug) navigate(paths.fsec.tab(fsecSlug, 'overview'));
        },
        [navigate],
    );

    // Loading state - Skeleton table
    if (isLoading) {
        return <FasPageSkeleton columns={COLUMNS} actionsWidth={COLUMN_WIDTHS.actions} />;
    }

    // Error state
    if (error) {
        return (
            <Container maxWidth={false} sx={{ py: 4 }}>
                <Alert severity="error">Erreur lors du chargement des Fiches d'Anomalie: {error.message}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <FasToolbar />

            <FaKpiBar fas={processedFas} />

            {/* Table Header */}
            <Paper variant="outlined" sx={{ borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', py: 1.25 }}>
                    {COLUMNS.map((col) => (
                        <Box key={col.key} sx={{ width: col.width, pl: 2 }}>
                            <TableSortLabel
                                active={sortColumn === col.key}
                                direction={sortColumn === col.key ? sortDirection : 'asc'}
                                onClick={() => handleSort(col.key)}
                                sx={{ fontWeight: 500, fontSize: '0.95rem' }}
                            >
                                {col.label}
                            </TableSortLabel>
                        </Box>
                    ))}
                    <Box sx={{ width: COLUMN_WIDTHS.actions }} />
                </Box>
            </Paper>

            {/* Table Body */}
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
                        {paginatedFas.map((fa) => (
                            <FaTableRow
                                key={fa.uuid}
                                fa={fa}
                                onNavigate={handleNavigateFa}
                                onNavigateFsec={handleNavigateFsec}
                            />
                        ))}
                        {paginatedFas.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <Typography color="text.secondary" sx={{ py: 4 }}>
                                        Aucune Fiche d'Anomalie trouvée
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={processedFas.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                    labelRowsPerPage="Lignes par page:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
                />
            </TableContainer>

            <CreateFaModal />
        </Container>
    );
}
