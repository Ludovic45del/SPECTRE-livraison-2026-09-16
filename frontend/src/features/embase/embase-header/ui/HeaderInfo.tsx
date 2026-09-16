/**
 * HeaderInfo sub-component
 * Displays the left-side info section of the embase header:
 * icon badge, type/voies chips, identifier, metadata, etalonnage status.
 */

import { memo, useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { DataChip } from '@widgets/data-chip';
import { type Embase, EMBASE_TYPE_LABELS, getEtalonnageStatus } from '@entities/embase';

const TYPE_COLORS: Record<string, string> = {
    jet_de_gaz: '#1976d2',
    hp: '#9c27b0',
    bp: '#ed6c02',
};

const CHIP_SX = { height: 24, fontSize: '0.75rem' } as const;

const iconBadgeSx = {
    width: 56,
    height: 56,
    borderRadius: '50%',
    border: '3px solid',
    borderColor: 'primary.main',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
} as const;

const iconLabelSx = {
    color: 'primary.main',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    textAlign: 'center',
    lineHeight: 1.1,
} as const;

/* ── Sub-components ─────────────────────────────────────────────── */

interface HeaderChipsProps {
    embase: Embase;
    etalStatus: { label: string; color: string };
    etalStatusV1: { label: string; color: string };
    etalStatusV2: { label: string; color: string };
}

const HeaderChips = memo(function HeaderChips({ embase, etalStatus, etalStatusV1, etalStatusV2 }: HeaderChipsProps) {
    return (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <DataChip
                label={EMBASE_TYPE_LABELS[embase.type] || embase.type}
                color={TYPE_COLORS[embase.type] ?? null}
                sx={CHIP_SX}
            />
            <DataChip
                label={embase.nombreVoies === 2 ? '2 voies' : '1 voie'}
                color={embase.nombreVoies === 2 ? '#7b1fa2' : '#757575'}
                sx={CHIP_SX}
            />
            {embase.nombreVoies === 1 ? (
                <DataChip label={etalStatus.label} color={etalStatus.color} sx={CHIP_SX} />
            ) : (
                <>
                    <DataChip label={`V1: ${etalStatusV1.label}`} color={etalStatusV1.color} sx={CHIP_SX} />
                    <DataChip label={`V2: ${etalStatusV2.label}`} color={etalStatusV2.color} sx={CHIP_SX} />
                </>
            )}
        </Stack>
    );
});

interface HeaderMetadataProps {
    embase: Embase;
}

const HeaderMetadata = memo(function HeaderMetadata({ embase }: HeaderMetadataProps) {
    return (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Localisation : {embase.localisationActuelle || '-'}
            {embase.chargementMcc && ` · MCC : ${embase.chargementMcc}`}
            {' · EV: '}
            <DataChip
                label={embase.electrovanne ? 'Oui' : 'Non'}
                color={embase.electrovanne ? '#4caf50' : '#f44336'}
                sx={{ ml: 0.5 }}
            />
        </Typography>
    );
});

/* ── Main component ─────────────────────────────────────────────── */

interface HeaderInfoProps {
    embase: Embase;
}

function HeaderInfoComponent({ embase }: HeaderInfoProps) {
    const etalStatus = useMemo(() => getEtalonnageStatus(embase.lastEtalonnageDate), [embase.lastEtalonnageDate]);
    const etalStatusV1 = useMemo(() => getEtalonnageStatus(embase.lastEtalonnageDateV1), [embase.lastEtalonnageDateV1]);
    const etalStatusV2 = useMemo(() => getEtalonnageStatus(embase.lastEtalonnageDateV2), [embase.lastEtalonnageDateV2]);

    return (
        <Box sx={{ minWidth: 300 }}>
            <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={iconBadgeSx}>
                    <Typography sx={iconLabelSx}>Emb.</Typography>
                </Box>
                <Stack spacing={0.5}>
                    <HeaderChips
                        embase={embase}
                        etalStatus={etalStatus}
                        etalStatusV1={etalStatusV1}
                        etalStatusV2={etalStatusV2}
                    />
                    <Typography variant="h4" fontWeight="bold" component="h1">
                        {embase.identifier}
                    </Typography>
                    <HeaderMetadata embase={embase} />
                </Stack>
            </Stack>
        </Box>
    );
}

export const HeaderInfo = memo(HeaderInfoComponent);
