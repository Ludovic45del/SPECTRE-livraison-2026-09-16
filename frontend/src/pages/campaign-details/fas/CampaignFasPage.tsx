/**
 * Campaign FAs Page
 * @module pages/campaign-details/fas
 *
 * Displays FAs linked to FSECs of a specific campaign.
 * Features: Sortable columns, navigation to FA and FSEC details.
 */

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
import { paths } from '@shared/config';
import { useFsecsByCampaign, Fsec } from '@entities/fsec';
import { useFas, Fa, sortFas, type FaSortColumn } from '@entities/fa';
import { CampaignWithRelations } from '@entities/campaign';
import { FaTableRow } from '@features/fa';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CampaignFasPageProps {
    campaign: CampaignWithRelations;
}

type SortDirection = 'asc' | 'desc';

interface FaWithFsecName extends Fa {
    fsecName: string;
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

const buildCampaignFas = (fas: Fa[] | undefined, fsecs: Fsec[] | undefined): FaWithFsecName[] => {
    if (!fas || !fsecs) return [];
    const fsecMap = new Map(fsecs.map((f) => [f.versionUuid, f.displayName]));
    return fas
        .filter((fa) => fsecMap.has(fa.fsecVersionId))
        .map((fa) => ({ ...fa, fsecName: fsecMap.get(fa.fsecVersionId)! }));
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

function CampaignFasPageComponent({ campaign }: CampaignFasPageProps) {
    const navigate = useNavigate();
    const { data: fsecs, isLoading: isLoadingFsecs, error: fsecError } = useFsecsByCampaign(campaign.uuid);
    const { data: fas, isLoading: isLoadingFas, error: faError } = useFas();

    // Sort state - default: eventDate desc
    const [sortColumn, setSortColumn] = useState<FaSortColumn>('eventDate');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Memoized data transformations
    const campaignFas = useMemo(() => buildCampaignFas(fas, fsecs), [fas, fsecs]);

    const sortedFas = useMemo(
        () => sortFas(campaignFas, sortColumn, sortDirection),
        [campaignFas, sortColumn, sortDirection],
    );

    // Event handlers
    const handleNavigate = useCallback(
        (slug: string) => {
            navigate(paths.fa.root(slug));
        },
        [navigate],
    );

    const handleNavigateFsec = useCallback(
        (e: React.MouseEvent, fsecSlug: string | null) => {
            e.stopPropagation();
            if (fsecSlug) navigate(paths.fsec.tab(fsecSlug, 'overview'));
        },
        [navigate],
    );

    const handleSort = useCallback((column: FaSortColumn) => {
        setSortColumn((prevColumn) => {
            if (prevColumn === column) {
                setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            } else {
                setSortDirection('asc');
            }
            return column;
        });
    }, []);

    const isLoading = isLoadingFsecs || isLoadingFas;
    const error = fsecError || faError;

    // Loading state - Skeleton table
    if (isLoading) {
        return (
            <Box role="status" aria-label="Chargement des FA">
                <TableContainer component={Paper} variant="outlined" sx={{ borderColor: 'divider', borderRadius: 1 }}>
                    <Table sx={{ tableLayout: 'fixed' }}>
                        <colgroup>
                            {Object.values(COLUMN_WIDTHS).map((width, i) => (
                                <col key={i} style={{ width }} />
                            ))}
                        </colgroup>
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
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <Skeleton variant="text" width="80%" height={24} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="text" width="70%" height={24} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="rounded" width={80} height={24} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="rounded" width={80} height={24} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="rounded" width={80} height={24} />
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
    }

    // Error state
    if (error) {
        return (
            <Alert severity="error" role="alert">
                Erreur lors du chargement des Fiches d'Anomalie: {error.message}
            </Alert>
        );
    }

    // Empty state
    if (campaignFas.length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: 4, borderColor: 'divider', borderRadius: 1 }}>
                <Typography color="text.secondary" align="center">
                    Aucune Fiche d'Anomalie associée à cette campagne
                </Typography>
            </Paper>
        );
    }

    return (
        <Box component="section" aria-label="Liste des FA de la campagne">
            <TableContainer component={Paper} variant="outlined" sx={{ borderColor: 'divider', borderRadius: 1 }}>
                <Table sx={{ tableLayout: 'fixed' }} aria-label="Tableau des Fiches d'Anomalie">
                    <colgroup>
                        {Object.values(COLUMN_WIDTHS).map((width, i) => (
                            <col key={i} style={{ width }} />
                        ))}
                    </colgroup>
                    <TableHead>
                        <TableRow>
                            {COLUMNS.map((col) => (
                                <TableCell key={col.key} sx={{ fontWeight: 600 }}>
                                    <TableSortLabel
                                        active={sortColumn === col.key}
                                        direction={sortColumn === col.key ? sortDirection : 'asc'}
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
                        {sortedFas.map((fa) => (
                            <FaTableRow
                                key={fa.uuid}
                                fa={fa}
                                onNavigate={handleNavigate}
                                onNavigateFsec={handleNavigateFsec}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Count */}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'right' }} aria-live="polite">
                {sortedFas.length} FA{sortedFas.length > 1 ? 's' : ''}
            </Typography>
        </Box>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export with memo for performance optimization
// ─────────────────────────────────────────────────────────────────────────────

export const CampaignFasPage = memo(CampaignFasPageComponent);
