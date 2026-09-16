/**
 * Shared FA Table Row
 * @module features/fa/fa-table-row
 *
 * Memoized table row component used by both FasPage and CampaignFasPage.
 */

import { memo, useCallback } from 'react';
import { Box, TableRow, TableCell, Typography, IconButton, Tooltip, alpha, useTheme } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { type Fa, getStatusInfo, getCriticalityInfo, getTypeInfo, usePrefetchFa } from '@entities/fa';
import { DataChip } from '@widgets/data-chip';
import { useHoverPrefetch } from '@shared/lib';
import { motion } from '@shared/ui/motion';

// `fsecName` est désormais directement présent sur `Fa` (string | null) :
// l'extension est conservée comme alias pour ne pas casser les imports.
export type FaTableRowItem = Fa;

export interface FaTableRowProps {
    fa: FaTableRowItem;
    onNavigate: (uuid: string) => void;
    onNavigateFsec?: (e: React.MouseEvent, fsecVersionId: string | null) => void;
}

export const FaTableRow = memo(function FaTableRow({ fa, onNavigate, onNavigateFsec }: FaTableRowProps) {
    const theme = useTheme();
    const status = getStatusInfo(fa.statusId);
    const criticality = getCriticalityInfo(fa.criticalityId);
    const type5m = getTypeInfo(fa.typeId);
    const isHighCriticality = fa.criticalityId != null && fa.criticalityId >= 2;
    const borderColor = fa.criticalityId === 3 ? '#F44336' : fa.criticalityId === 2 ? '#FF9800' : undefined;

    const handleDoubleClick = useCallback(() => {
        onNavigate(fa.slug);
    }, [fa.slug, onNavigate]);

    const handleButtonClick = useCallback(() => {
        onNavigate(fa.slug);
    }, [fa.slug, onNavigate]);

    const prefetchFa = usePrefetchFa();
    const hoverPrefetch = useHoverPrefetch(useCallback(() => prefetchFa(fa.uuid), [prefetchFa, fa.uuid]));

    return (
        <TableRow
            hover
            sx={{
                cursor: 'pointer',
                transition: `background-color ${motion.fast}`,
                ...(isHighCriticality && {
                    borderLeft: `4px solid ${borderColor}`,
                }),
                '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
            }}
            onDoubleClick={handleDoubleClick}
            {...hoverPrefetch}
        >
            <TableCell>
                <Typography fontWeight={500}>{fa.identifier}</Typography>
            </TableCell>
            <TableCell>
                {fa.fsecVersionId && onNavigateFsec ? (
                    <Typography
                        component="span"
                        onClick={(e) => onNavigateFsec(e, fa.fsecSlug)}
                        sx={{
                            color: 'primary.main',
                            fontWeight: 500,
                            cursor: 'pointer',
                            px: 1,
                            py: 0.25,
                            mx: -1,
                            borderRadius: 0.5,
                            transition: `all ${motion.base}`,
                            '&:hover': {
                                color: 'primary.dark',
                                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                transform: 'translateX(2px)',
                            },
                            '&:active': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.15),
                                transform: 'translateX(2px) scale(0.98)',
                            },
                        }}
                    >
                        {fa.fsecName}
                    </Typography>
                ) : fa.fsecName ? (
                    <Typography
                        component="span"
                        sx={{
                            color: 'primary.main',
                            fontWeight: 500,
                            px: 1,
                            py: 0.25,
                            mx: -1,
                            borderRadius: 0.5,
                        }}
                    >
                        {fa.fsecName}
                    </Typography>
                ) : (
                    <Typography color="text.secondary">-</Typography>
                )}
            </TableCell>
            <TableCell>
                <DataChip label={status.label} color={status.color} />
            </TableCell>
            <TableCell>
                {fa.criticalityId !== null ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {isHighCriticality && <WarningAmberIcon sx={{ fontSize: 16, color: borderColor }} />}
                        <DataChip label={criticality.label} color={criticality.color} />
                    </Box>
                ) : (
                    <Typography color="text.secondary">-</Typography>
                )}
            </TableCell>
            <TableCell>
                {fa.typeId !== null ? (
                    <DataChip label={type5m.label} color={type5m.color} />
                ) : (
                    <Typography color="text.secondary">-</Typography>
                )}
            </TableCell>
            <TableCell>
                <Typography>{fa.eventDate ? new Date(fa.eventDate).toLocaleDateString('fr-FR') : '-'}</Typography>
            </TableCell>
            <TableCell align="center">
                <Tooltip title="Voir les détails">
                    <IconButton
                        size="small"
                        onClick={handleButtonClick}
                        aria-label={`Voir les détails de ${fa.identifier}`}
                    >
                        <ArrowForwardIcon />
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>
    );
});
