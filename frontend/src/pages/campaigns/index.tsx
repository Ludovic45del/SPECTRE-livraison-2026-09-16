/**
 * Campaigns List Page
 * @module pages/campaigns
 *
 * Displays: Année, Semestre, Nom, Installation, Type, Statut
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
    Skeleton,
    Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCampaigns } from '@entities/campaign';
import { paths } from '@shared/config';
import { CreateCampaignModal, useCreateCampaignStore } from '@features/campaign/create-campaign';
import { CampaignsToolbar, useFilterCampaignsStore } from '@features/campaign/filter-campaigns';
import { useEntityList, ROWS_PER_PAGE_OPTIONS } from '@shared/lib';
import { SortColumn, COLUMN_WIDTHS, COLUMNS, filterCampaigns, sortCampaigns } from './lib/campaigns.helpers';
import { CampaignTableRow } from './components/CampaignTableRow';

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
    const navigate = useNavigate();
    const { data: campaigns, isLoading, error } = useCampaigns();
    const openCreateModal = useCreateCampaignStore((state) => state.open);
    const filters = useFilterCampaignsStore((state) => state.filters);
    const {
        sortColumn,
        sortDirection,
        page,
        rowsPerPage,
        handleSort,
        handleChangePage,
        handleChangeRowsPerPage,
        paginate,
    } = useEntityList<SortColumn>({ defaultSortColumn: 'name' });

    const processedCampaigns = useMemo(() => {
        const filtered = filterCampaigns(campaigns, filters);
        return sortCampaigns(filtered, sortColumn, sortDirection);
    }, [campaigns, filters, sortColumn, sortDirection]);

    const paginatedCampaigns = useMemo(() => paginate(processedCampaigns), [paginate, processedCampaigns]);

    const handleNavigate = useCallback((slug: string) => navigate(paths.campaign.tab(slug, 'overview')), [navigate]);

    // Loading state - Skeleton table
    if (isLoading) {
        return (
            <Container maxWidth={false} sx={{ py: 4 }}>
                <CampaignsToolbar onAdd={openCreateModal} />
                <Paper variant="outlined" sx={{ borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', py: 1.25 }}>
                        {COLUMNS.map((col) => (
                            <Box key={col.key} sx={{ width: col.width, pl: 2 }}>
                                <Typography sx={{ fontWeight: 500, fontSize: '0.95rem' }}>{col.label}</Typography>
                            </Box>
                        ))}
                        <Box sx={{ width: COLUMN_WIDTHS.actions }} />
                    </Box>
                </Paper>
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
                            {[...Array(10)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <Skeleton variant="text" width={40} height={24} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="rounded" width={50} height={24} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="rounded" width={90} height={24} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="text" width="80%" height={24} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="rounded" width={70} height={24} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="rounded" width={80} height={24} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="rounded" width={80} height={24} />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Skeleton variant="circular" width={32} height={32} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Container>
        );
    }

    // Error state
    if (error) {
        return (
            <Container maxWidth={false} sx={{ py: 4 }}>
                <Alert severity="error">Erreur lors du chargement des campagnes: {error.message}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <CampaignsToolbar onAdd={openCreateModal} />

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
                        {paginatedCampaigns.map((campaign) => (
                            <CampaignTableRow key={campaign.uuid} campaign={campaign} onNavigate={handleNavigate} />
                        ))}
                        {paginatedCampaigns.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={COLUMNS.length + 1} align="center">
                                    <Typography color="text.secondary" sx={{ py: 4 }}>
                                        Aucune campagne trouvée
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={processedCampaigns.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                    labelRowsPerPage="Lignes par page:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
                />
            </TableContainer>

            <CreateCampaignModal />
        </Container>
    );
}
