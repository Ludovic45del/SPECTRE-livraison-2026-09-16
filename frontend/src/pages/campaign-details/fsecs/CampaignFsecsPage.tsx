/**
 * Campaign FSECs Page
 * @module pages/campaign-details/fsecs
 *
 * Displays FSECs linked to a specific campaign.
 * Features: Sortable columns, navigation to FSEC details.
 * Optimized with React.memo and extracted row components.
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
    IconButton,
    Tooltip,
    alpha,
    useTheme,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { useFsecsByCampaign, Fsec, getStatusInfo, getCategoryInfo } from '@entities/fsec';
import { CampaignWithRelations } from '@entities/campaign';
import { DataChip } from '@widgets/data-chip';
import { motion } from '@shared/ui/motion';
import { paths } from '@shared/config';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CampaignFsecsPageProps {
    campaign: CampaignWithRelations;
}

type SortColumn = 'name' | 'status' | 'category';
type SortDirection = 'asc' | 'desc';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COLUMN_WIDTHS = {
    name: '50%',
    status: '22%',
    category: '22%',
    actions: '6%',
} as const;

const COLUMNS: { key: SortColumn; label: string; width: string }[] = [
    { key: 'name', label: 'Nom', width: COLUMN_WIDTHS.name },
    { key: 'status', label: 'Statut', width: COLUMN_WIDTHS.status },
    { key: 'category', label: 'Catégorie', width: COLUMN_WIDTHS.category },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const sortFsecs = (fsecs: Fsec[], column: SortColumn, direction: SortDirection): Fsec[] => {
    const sorted = [...fsecs];
    const multiplier = direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
        let comparison = 0;
        switch (column) {
            case 'name':
                comparison = a.displayName.localeCompare(b.displayName);
                break;
            case 'status':
                comparison = (a.statusId ?? 0) - (b.statusId ?? 0);
                break;
            case 'category':
                comparison = (a.categoryId ?? 0) - (b.categoryId ?? 0);
                break;
        }
        return comparison * multiplier;
    });

    return sorted;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (memoized for performance)
// ─────────────────────────────────────────────────────────────────────────────

interface FsecTableRowProps {
    fsec: Fsec;
    onNavigate: (slug: string) => void;
}

const FsecTableRow = memo(function FsecTableRow({ fsec, onNavigate }: FsecTableRowProps) {
    const theme = useTheme();
    const status = getStatusInfo(fsec.statusId);
    const category = getCategoryInfo(fsec.categoryId);

    const handleDoubleClick = useCallback(() => {
        onNavigate(fsec.slug);
    }, [fsec.slug, onNavigate]);

    const handleButtonClick = useCallback(() => {
        onNavigate(fsec.slug);
    }, [fsec.slug, onNavigate]);

    return (
        <TableRow
            hover
            sx={{
                cursor: 'pointer',
                transition: `background-color ${motion.fast}`,
                '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
            }}
            onDoubleClick={handleDoubleClick}
        >
            <TableCell>
                <Typography fontWeight={500}>{fsec.displayName}</Typography>
            </TableCell>
            <TableCell>
                <DataChip label={status.label} color={status.color} />
            </TableCell>
            <TableCell>
                <DataChip label={category.label} color={category.color} />
            </TableCell>
            <TableCell align="center">
                <Tooltip title="Voir les détails">
                    <IconButton
                        size="small"
                        onClick={handleButtonClick}
                        aria-label={`Voir les détails de ${fsec.displayName}`}
                    >
                        <ArrowForwardIcon />
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

function CampaignFsecsPageComponent({ campaign }: CampaignFsecsPageProps) {
    const navigate = useNavigate();
    const { data: fsecs, isLoading, error } = useFsecsByCampaign(campaign.uuid);

    // Sort state - default: name
    const [sortColumn, setSortColumn] = useState<SortColumn>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Memoized data transformations
    const sortedFsecs = useMemo(() => {
        if (!fsecs) return [];
        return sortFsecs(fsecs, sortColumn, sortDirection);
    }, [fsecs, sortColumn, sortDirection]);

    // Event handlers (memoized for child components)
    const handleNavigate = useCallback(
        (slug: string) => {
            navigate(paths.fsec.tab(slug, 'overview'));
        },
        [navigate],
    );

    const handleSort = useCallback((column: SortColumn) => {
        setSortColumn((prevColumn) => {
            if (prevColumn === column) {
                setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            } else {
                setSortDirection('asc');
            }
            return column;
        });
    }, []);

    // Loading state - Skeleton table
    if (isLoading) {
        return (
            <Box role="status" aria-label="Chargement des FSEC">
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
            </Box>
        );
    }

    // Error state
    if (error) {
        return (
            <Alert severity="error" role="alert">
                Erreur lors du chargement des FSEC: {error.message}
            </Alert>
        );
    }

    // Empty state
    if (!fsecs || fsecs.length === 0) {
        return (
            <Paper variant="outlined" sx={{ p: 4, borderColor: 'divider', borderRadius: 1 }}>
                <Typography color="text.secondary" align="center">
                    Aucun FSEC associé à cette campagne
                </Typography>
            </Paper>
        );
    }

    return (
        <Box component="section" aria-label="Liste des FSEC de la campagne">
            <TableContainer component={Paper} variant="outlined" sx={{ borderColor: 'divider', borderRadius: 1 }}>
                <Table sx={{ tableLayout: 'fixed' }} aria-label="Tableau des FSEC">
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
                        {sortedFsecs.map((fsec) => (
                            <FsecTableRow key={fsec.versionUuid} fsec={fsec} onNavigate={handleNavigate} />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Count */}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'right' }} aria-live="polite">
                {sortedFsecs.length} FSEC{sortedFsecs.length > 1 ? 's' : ''}
            </Typography>
        </Box>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export with memo for performance optimization
// ─────────────────────────────────────────────────────────────────────────────

export const CampaignFsecsPage = memo(CampaignFsecsPageComponent);
