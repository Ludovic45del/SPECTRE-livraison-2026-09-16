/**
 * RubricBadge — chip coloré identifiant la rubrique métier (cf. CDC §4.6).
 *
 * Hauteur, fontSize, fontWeight, borderRadius : gérés par l'override MuiChip
 * du thème.
 */

import { Chip, type SxProps, type Theme } from '@mui/material';
import { CATEGORY_COLORS, CATEGORY_LABELS, type CategoryCode } from '../model/stock.constants';

interface RubricBadgeProps {
    category: CategoryCode;
    size?: 'small' | 'medium';
    sx?: SxProps<Theme>;
}

export function RubricBadge({ category, size = 'small', sx }: RubricBadgeProps) {
    const { bg, text } = CATEGORY_COLORS[category];
    return (
        <Chip
            label={CATEGORY_LABELS[category]}
            size={size}
            sx={{
                bgcolor: bg,
                color: text,
                ...sx,
            }}
        />
    );
}
