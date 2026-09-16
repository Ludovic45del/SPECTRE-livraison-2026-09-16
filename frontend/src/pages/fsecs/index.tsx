/**
 * FSECs List Page
 * @module pages/fsecs
 *
 * Displays: Nom, Campagne associée, Année, Statut, Catégorie
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
import { useFsecs } from '@entities/fsec';
import { useCampaigns } from '@entities/campaign';
import { FsecsToolbar, useFilterFsecsStore } from '@features/fsec/filter-fsecs';
import { CreateFsecModal } from '@features/fsec/create-fsec';
import { useEntityList, ROWS_PER_PAGE_OPTIONS } from '@shared/lib';
import { paths } from '@shared/config';
import { COLUMNS, COLUMN_WIDTHS } from './constants';
import { FsecTableRow } from './components/FsecTableRow';
import { FsecsPageSkeleton } from './components/FsecsPageSkeleton';
import { createCampaignMap, enrichFsecsWithCampaign, filterFsecs, sortFsecs, type SortColumn } from './fsec-list-utils';

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function FsecsPage() {
    const navigate = useNavigate();
    const { data: fsecs, isLoading, error } = useFsecs();
    const { data: campaigns, isLoading: isLoadingCampaigns } = useCampaigns();
    const filters = useFilterFsecsStore((state) => state.filters);
    const {
        sortColumn,
        sortDirection,
        page,
        rowsPerPage,
        handleSort,
        handleChangePage,
        handleChangeRowsPerPage,
        paginate,
    } = useEntityList<SortColumn>({ defaultSortColumn: 'campaign' });

    const campaignMap = useMemo(() => createCampaignMap(campaigns), [campaigns]);

    const processedFsecs = useMemo(() => {
        const enriched = enrichFsecsWithCampaign(fsecs, campaignMap);
        const filtered = filterFsecs(enriched, filters);
        return sortFsecs(filtered, sortColumn, sortDirection);
    }, [fsecs, campaignMap, filters, sortColumn, sortDirection]);

    const paginatedFsecs = useMemo(() => paginate(processedFsecs), [paginate, processedFsecs]);

    // Event handlers
    const handleNavigateFsec = useCallback(
        (slug: string) => {
            navigate(paths.fsec.tab(slug, 'overview'));
        },
        [navigate],
    );

    const handleNavigateCampaign = useCallback(
        (e: React.MouseEvent, campaignSlug: string | null) => {
            e.stopPropagation();
            if (campaignSlug) {
                navigate(paths.campaign.tab(campaignSlug, 'overview'));
            }
        },
        [navigate],
    );

    // Loading state - Skeleton table
    if (isLoading || isLoadingCampaigns) {
        return <FsecsPageSkeleton />;
    }

    // Error state
    if (error) {
        return (
            <Container maxWidth={false} sx={{ py: 4 }}>
                <Alert severity="error">Erreur lors du chargement des FSEC: {error.message}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <FsecsToolbar />

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
                        {paginatedFsecs.map((fsec) => (
                            <FsecTableRow
                                key={fsec.versionUuid}
                                fsec={fsec}
                                onNavigate={handleNavigateFsec}
                                onNavigateCampaign={handleNavigateCampaign}
                            />
                        ))}
                        {paginatedFsecs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography color="text.secondary" sx={{ py: 4 }}>
                                        Aucun FSEC trouvé
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={processedFsecs.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                    labelRowsPerPage="Lignes par page:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
                />
            </TableContainer>

            <CreateFsecModal />
        </Container>
    );
}
