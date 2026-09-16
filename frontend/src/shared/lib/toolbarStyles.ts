/**
 * Shared toolbar styles
 * @module shared/lib/toolbarStyles
 *
 * Common styles for toolbar components (FsecsToolbar, FasToolbar, CampaignsToolbar)
 */

import { alpha, type SxProps, type Theme } from '@mui/material';
import { motion } from '@shared/ui/motion';

/**
 * Get input styles with hover/focus effects
 */
export const getInputStyles = (theme: Theme): SxProps<Theme> => ({
    '& .MuiOutlinedInput-root': {
        borderRadius: 1,
        transition: motion.transition(['box-shadow', 'border-color'], 'base'),
        '&:hover': {
            boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.15)}`,
        },
        '&.Mui-focused': {
            boxShadow: `0 2px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
        },
    },
});

/**
 * Get chip styles with custom colors.
 *
 * `borderRadius`, `fontWeight`, `height`, `fontSize` sont gérés par l'override
 * `MuiChip` du thème (shared/ui/theme.ts) — ne pas les redéclarer ici.
 */
export const getChipStyles = (bgColor: string, textColor: string): SxProps<Theme> => ({
    backgroundColor: bgColor,
    color: textColor,
    '& .MuiChip-deleteIcon': {
        color: 'inherit',
        opacity: 0.6,
        '&:hover': { opacity: 1, color: 'inherit' },
    },
});
