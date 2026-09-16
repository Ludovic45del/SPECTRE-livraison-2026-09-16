/**
 * KindIcon — petit carré coloré avec icône, distinguant élément sérialisé /
 * consommable.
 *
 * Anciennement appelé `KindBadge`, renommé pour clarifier qu'il s'agit d'une
 * icône stylée et non d'un chip MUI (pas de label texte, pas de structure pill).
 */

import { Box, Tooltip, type SxProps, type Theme } from '@mui/material';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { ITEM_KIND, ITEM_KIND_COLORS, ITEM_KIND_LABELS, type ItemKind } from '../model/stock.constants';

interface KindIconProps {
    kind: ItemKind;
    size?: 'small' | 'medium';
    sx?: SxProps<Theme>;
}

export function KindIcon({ kind, size = 'medium', sx }: KindIconProps) {
    const palette = ITEM_KIND_COLORS[kind];
    const dimension = size === 'small' ? 20 : 24;
    const Icon = kind === ITEM_KIND.ELEMENT ? GpsFixedIcon : Inventory2Icon;
    return (
        <Tooltip title={ITEM_KIND_LABELS[kind]} placement="right" arrow>
            <Box
                sx={{
                    width: dimension,
                    height: dimension,
                    borderRadius: '6px',
                    bgcolor: palette.bg,
                    color: palette.color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    ...sx,
                }}
            >
                <Icon sx={{ fontSize: size === 'small' ? 14 : 16 }} aria-label={ITEM_KIND_LABELS[kind]} />
            </Box>
        </Tooltip>
    );
}
