/**
 * ColorDot - Indicateur visuel coloré
 * @module shared/ui
 *
 * Petit cercle coloré utilisé comme indicateur visuel
 * dans les selects, chips, et autres composants.
 */

import { memo } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

export interface ColorDotProps {
    /** Couleur du point (hex, rgb, ou nom CSS) */
    color: string;
    /** Taille en pixels (défaut: 10) */
    size?: number;
    /** Styles additionnels */
    sx?: SxProps<Theme>;
}

/**
 * Indicateur circulaire coloré
 *
 * @example
 * <ColorDot color="#FF5733" />
 * <ColorDot color="green" size={12} />
 */
export const ColorDot = memo(function ColorDot({ color, size = 10, sx }: ColorDotProps) {
    return (
        <Box
            sx={{
                width: size,
                height: size,
                borderRadius: '50%',
                backgroundColor: color,
                flexShrink: 0,
                ...sx,
            }}
        />
    );
});
