/**
 * Shared styles for campaign overview components
 * @module pages/campaign-details/overview/components/styles
 */

import { alpha, type SxProps, type Theme } from '@mui/material';

/**
 * Style for edit button positioned in top-right corner of sections
 */
export const EDIT_BUTTON_SX: SxProps<Theme> = {
    position: 'absolute',
    top: 12,
    right: 12,
    color: 'text.secondary',
    '&:hover': {
        color: 'primary.main',
        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
    },
};

/**
 * Base style for Paper sections
 */
export const PAPER_BASE_SX: SxProps<Theme> = {
    p: 3,
    borderRadius: 1,
    bgcolor: 'background.paper',
    borderColor: 'divider',
    position: 'relative',
};
