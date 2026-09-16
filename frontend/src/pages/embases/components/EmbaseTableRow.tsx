/**
 * Embase Table Row - Memoized sub-component
 * @module pages/embases/components
 */

import { useCallback, memo } from 'react';
import { Box, Typography, TableCell, TableRow, IconButton, Tooltip, alpha, useTheme } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { type Embase, EMBASE_TYPE_LABELS, getEtalonnageStatus, usePrefetchEmbase } from '@entities/embase';
import { DataChip } from '@widgets/data-chip';
import { useHoverPrefetch } from '@shared/lib';
import { getStatut, getEtancheiteStatus, getMccStatus, TYPE_COLORS } from '../embase-list-utils';
import { motion } from '@shared/ui/motion';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Etancheite cell content
// ─────────────────────────────────────────────────────────────────────────────

interface StatusInfo {
    label: string;
    color: string | null;
}

interface EtancheiteCellProps {
    nombreVoies: 1 | 2;
    v1: StatusInfo;
    v2: StatusInfo;
}

const EtancheiteCell = memo(function EtancheiteCell({ nombreVoies, v1, v2 }: EtancheiteCellProps) {
    if (nombreVoies === 1) {
        return v1.color ? (
            <DataChip label={v1.label} color={v1.color} />
        ) : (
            <Typography color="text.secondary">-</Typography>
        );
    }
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {v1.color ? (
                <DataChip label={`V1: ${v1.label}`} color={v1.color} />
            ) : (
                <Typography variant="caption" color="text.secondary">
                    V1: -
                </Typography>
            )}
            {v2.color ? (
                <DataChip label={`V2: ${v2.label}`} color={v2.color} />
            ) : (
                <Typography variant="caption" color="text.secondary">
                    V2: -
                </Typography>
            )}
        </Box>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Etalonnage cell content
// ─────────────────────────────────────────────────────────────────────────────

interface EtalonnageCellProps {
    embase: Embase;
}

const EtalonnageCell = memo(function EtalonnageCell({ embase }: EtalonnageCellProps) {
    if (embase.nombreVoies === 1) {
        const etal = getEtalonnageStatus(embase.lastEtalonnageDate);
        return <DataChip label={etal.label} color={etal.color} />;
    }
    const etalV1 = getEtalonnageStatus(embase.lastEtalonnageDateV1);
    const etalV2 = getEtalonnageStatus(embase.lastEtalonnageDateV2);
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <DataChip label={`V1: ${etalV1.label}`} color={etalV1.color} />
            <DataChip label={`V2: ${etalV2.label}`} color={etalV2.color} />
        </Box>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface EmbaseTableRowProps {
    embase: Embase;
    onNavigate: (uuid: string) => void;
}

export const EmbaseTableRow = memo(function EmbaseTableRow({ embase, onNavigate }: EmbaseTableRowProps) {
    const theme = useTheme();
    const statut = getStatut(embase);
    const etancheiteV1 = getEtancheiteStatus(embase.testEtancheiteHe);
    const etancheiteV2 = getEtancheiteStatus(embase.testEtancheiteHeV2);
    const mcc = getMccStatus(embase.chargementMcc);

    const handleDoubleClick = useCallback(() => onNavigate(embase.slug), [embase.slug, onNavigate]);
    const handleButtonClick = useCallback(() => onNavigate(embase.slug), [embase.slug, onNavigate]);

    const prefetchEmbase = usePrefetchEmbase();
    const hoverPrefetch = useHoverPrefetch(
        useCallback(() => prefetchEmbase(embase.uuid), [prefetchEmbase, embase.uuid]),
    );

    return (
        <TableRow
            hover
            sx={{
                cursor: 'pointer',
                transition: `background-color ${motion.fast}`,
                '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
            }}
            onDoubleClick={handleDoubleClick}
            {...hoverPrefetch}
        >
            <TableCell>
                <Typography fontWeight={500}>{embase.identifier}</Typography>
            </TableCell>
            <TableCell>
                <DataChip
                    label={EMBASE_TYPE_LABELS[embase.type] || embase.type}
                    color={TYPE_COLORS[embase.type] ?? null}
                />
            </TableCell>
            <TableCell>
                {statut.color ? (
                    <DataChip label={statut.label} color={statut.color} />
                ) : (
                    <Typography color="text.secondary">-</Typography>
                )}
            </TableCell>
            <TableCell>
                <Typography>{embase.localisationActuelle || '-'}</Typography>
            </TableCell>
            <TableCell>
                <EtancheiteCell nombreVoies={embase.nombreVoies} v1={etancheiteV1} v2={etancheiteV2} />
            </TableCell>
            <TableCell>
                <EtalonnageCell embase={embase} />
            </TableCell>
            <TableCell>
                {mcc.color ? (
                    <DataChip label={mcc.label} color={mcc.color} />
                ) : (
                    <Typography color="text.secondary">-</Typography>
                )}
            </TableCell>
            <TableCell align="center">
                <DataChip
                    label={embase.electrovanne ? 'Oui' : 'Non'}
                    color={embase.electrovanne ? '#4caf50' : '#f44336'}
                />
            </TableCell>
            <TableCell align="center">
                <Tooltip title="Voir les détails">
                    <IconButton
                        size="small"
                        onClick={handleButtonClick}
                        aria-label={`Voir les détails de ${embase.identifier}`}
                    >
                        <ArrowForwardIcon />
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>
    );
});
