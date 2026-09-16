/**
 * FA Section Header - Phase chip badge with divider
 * @module pages/fa-details/components
 *
 * Reusable header for FA detail sections. Uses a color-coded Chip
 * (unlike Campaign's SectionHeader which uses Typography h6) because
 * FA phases have semantic colors (warning for Ouvert, info for En cours, etc.).
 */

import { memo } from 'react';
import { Box, Chip, Divider, type ChipProps } from '@mui/material';
import { softChipSx } from '@shared/lib';

interface FaSectionHeaderProps {
    /** Section label (e.g. "Phase 1 - Ouvert") */
    label: string;
    /**
     * Soit une couleur sémantique MUI (`'warning' | 'info' | 'success' | ...`)
     * — auquel cas l'override `MuiChip` du thème applique le rendu soft —
     * soit un hex (`'#66BB6A'`) pour des couleurs métier hors palette.
     */
    chipColor?: ChipProps['color'] | string;
}

const isMuiPaletteName = (c: string): c is NonNullable<ChipProps['color']> =>
    ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info'].includes(c);

export const FaSectionHeader = memo(function FaSectionHeader({ label, chipColor = 'default' }: FaSectionHeaderProps) {
    const isHex = typeof chipColor === 'string' && chipColor.startsWith('#');
    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                {isHex ? (
                    <Chip label={label} sx={softChipSx(chipColor)} aria-hidden="true" />
                ) : (
                    <Chip
                        label={label}
                        color={typeof chipColor === 'string' && isMuiPaletteName(chipColor) ? chipColor : 'default'}
                        aria-hidden="true"
                    />
                )}
            </Box>
            <Divider sx={{ mb: 2 }} aria-hidden="true" />
        </>
    );
});
