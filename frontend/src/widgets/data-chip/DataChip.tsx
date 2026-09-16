/**
 * DataChip — chip coloré générique à partir d'une couleur métier (hex).
 *
 * Le rendu suit le formalisme "soft" (bg pâle + texte foncé de la même teinte)
 * via `softChipSx` — cohérent avec l'override `MuiChip` du thème.
 */

import { Chip, useTheme, type ChipProps } from '@mui/material';
import { softChipSx } from '@shared/lib';

interface DataChipProps extends Omit<ChipProps, 'color'> {
    label: string;
    /** Couleur métier (hex). `null`/`undefined` → fallback grey du thème. */
    color?: string | null;
}

export function DataChip({ label, color, sx, ...props }: DataChipProps) {
    const theme = useTheme();
    const hex = color ?? theme.palette.grey[300];
    return <Chip label={label} sx={[softChipSx(hex), ...(Array.isArray(sx) ? sx : [sx])]} {...props} />;
}
