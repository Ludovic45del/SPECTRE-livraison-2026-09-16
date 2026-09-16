/**
 * Circular icon with a letter label, mirroring the sidebar style (C / Fsec / FA).
 * @module features/dashboard/ui/components/CircleLetterIcon
 */

import { memo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { BRAND_COLORS, TRANSITION } from '@entities/dashboard';

const ICON_CONFIGS: Record<string, { label: string; fontSize: string; letterSpacing?: string }> = {
    campaign: { label: 'C', fontSize: '0.85rem' },
    fsec: { label: 'Fsec', fontSize: '0.5rem', letterSpacing: '-0.3px' },
    fa: { label: 'FA', fontSize: '0.65rem' },
    embase: { label: 'E', fontSize: '0.85rem' },
    planning: { label: 'P', fontSize: '0.85rem' },
    success: { label: '\u2713', fontSize: '0.9rem' },
};

export default memo(function CircleLetterIcon({
    type,
    size = 36,
    color: colorOverride,
}: {
    readonly type: string;
    readonly size?: number;
    readonly color?: string;
}) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const config = ICON_CONFIGS[type] ?? ICON_CONFIGS.campaign;
    const color = colorOverride ?? BRAND_COLORS[type as keyof typeof BRAND_COLORS] ?? '#666';

    return (
        <Box
            sx={{
                width: size,
                height: size,
                borderRadius: '50%',
                border: '2px solid',
                borderColor: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                bgcolor: alpha(color, isDark ? 0.12 : 0.06),
                transition: `all ${TRANSITION}`,
            }}
        >
            <Typography
                sx={{
                    color,
                    fontSize: config.fontSize,
                    fontWeight: 700,
                    letterSpacing: config.letterSpacing,
                    lineHeight: 1,
                    userSelect: 'none',
                }}
            >
                {config.label}
            </Typography>
        </Box>
    );
});
