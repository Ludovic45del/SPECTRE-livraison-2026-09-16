/**
 * Styles partagés des sections de la modale détail machine.
 * @module features/material/view-machine/ui
 *
 * Aligné sur `pages/fa-details/components/styles.ts` (même pattern de sections
 * éditables inline avec icône crayon en haut à droite).
 */

import { alpha, type SxProps, type Theme } from '@mui/material';

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

export const PAPER_BASE_SX: SxProps<Theme> = {
    p: 3,
    borderRadius: 1,
    bgcolor: 'background.paper',
    borderColor: 'divider',
    position: 'relative',
};
