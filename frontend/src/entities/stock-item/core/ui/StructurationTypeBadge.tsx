/**
 * StructurationTypeBadge — chip coloré du type de structuration
 * (standard / spéciale / EC). Pendant de `RubricBadge` pour la colonne "Type".
 */

import { Chip, type SxProps, type Theme } from '@mui/material';
import { STRUCTURATION_TYPE_COLORS, STRUCTURATION_TYPE_LABELS, type StructurationType } from '../model/stock.constants';

interface StructurationTypeBadgeProps {
    type: StructurationType;
    size?: 'small' | 'medium';
    sx?: SxProps<Theme>;
}

export function StructurationTypeBadge({ type, size = 'small', sx }: StructurationTypeBadgeProps) {
    const { bg, text } = STRUCTURATION_TYPE_COLORS[type];
    return (
        <Chip
            label={STRUCTURATION_TYPE_LABELS[type]}
            size={size}
            sx={{
                bgcolor: bg,
                color: text,
                ...sx,
            }}
        />
    );
}
