/**
 * Widget wrapper — card with move/close controls in edit mode.
 * @module features/dashboard/ui
 */

import { forwardRef, memo, useCallback, useMemo, type ReactNode } from 'react';
import { Box, Card, CardContent, IconButton, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import { useDashboardStore } from '../model/dashboard.store';
import { WIDGET_REGISTRY } from '../lib/widgetRegistry';

/* ------------------------------------------------------------------ */
/*  Sub-components (R-STYLE-02 extraction)                            */
/* ------------------------------------------------------------------ */

interface EditModeToolbarProps {
    readonly widgetId: string;
    readonly meta: (typeof WIDGET_REGISTRY)[string] | undefined;
    readonly isDark: boolean;
    readonly onMoveUp?: () => void;
    readonly onMoveDown?: () => void;
    readonly onRemove?: () => void;
}

const EditModeToolbar = memo(function EditModeToolbar({
    widgetId,
    meta,
    isDark,
    onMoveUp,
    onMoveDown,
    onRemove,
}: EditModeToolbarProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1.5,
                py: 0.5,
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {meta?.label ?? widgetId}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                {onMoveUp && (
                    <Tooltip title="Monter" arrow>
                        <IconButton size="small" onClick={onMoveUp} sx={{ p: 0.25 }}>
                            <KeyboardArrowUpIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        </IconButton>
                    </Tooltip>
                )}
                {onMoveDown && (
                    <Tooltip title="Descendre" arrow>
                        <IconButton size="small" onClick={onMoveDown} sx={{ p: 0.25 }}>
                            <KeyboardArrowDownIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        </IconButton>
                    </Tooltip>
                )}
                {onRemove && (
                    <Tooltip title="Masquer" arrow>
                        <IconButton size="small" onClick={onRemove} sx={{ p: 0.25, ml: 0.5 }}>
                            <CloseIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
        </Box>
    );
});

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface Props {
    readonly widgetId: string;
    readonly children: ReactNode;
    readonly onRemove?: (widgetId: string) => void;
    readonly onMoveUp?: (widgetId: string, direction: 'up' | 'down') => void;
    readonly onMoveDown?: (widgetId: string, direction: 'up' | 'down') => void;
    readonly style?: React.CSSProperties;
    readonly className?: string;
}

export const DashboardWidget = memo(
    forwardRef<HTMLDivElement, Props>(function DashboardWidget(
        { widgetId, children, onRemove, onMoveUp, onMoveDown, style, className, ...rest },
        ref,
    ) {
        const isEditMode = useDashboardStore((s) => s.isEditMode);
        const meta = WIDGET_REGISTRY[widgetId];
        const theme = useTheme();
        const isDark = theme.palette.mode === 'dark';

        const handleRemove = useCallback(() => onRemove?.(widgetId), [onRemove, widgetId]);
        const handleMoveUp = useCallback(() => onMoveUp?.(widgetId, 'up'), [onMoveUp, widgetId]);
        const handleMoveDown = useCallback(() => onMoveDown?.(widgetId, 'down'), [onMoveDown, widgetId]);

        const cardSx = useMemo(
            () => ({
                height: '100%',
                position: 'relative' as const,
                overflow: 'hidden',
                borderRadius: 2,
                border: isEditMode ? '2px dashed' : 'none',
                borderColor: isEditMode ? alpha(theme.palette.primary.main, 0.3) : undefined,
            }),
            [isEditMode, theme.palette.primary.main],
        );

        return (
            <Box ref={ref} style={style} className={className} {...rest} sx={{ height: '100%' }}>
                <Card sx={cardSx}>
                    {isEditMode && (
                        <EditModeToolbar
                            widgetId={widgetId}
                            meta={meta}
                            isDark={isDark}
                            onMoveUp={onMoveUp ? handleMoveUp : undefined}
                            onMoveDown={onMoveDown ? handleMoveDown : undefined}
                            onRemove={onRemove ? handleRemove : undefined}
                        />
                    )}
                    <CardContent
                        sx={{
                            p: isEditMode ? 1.5 : 2,
                            '&:last-child': { pb: isEditMode ? 1.5 : 2 },
                            height: isEditMode ? 'calc(100% - 33px)' : '100%',
                            overflow: 'auto',
                        }}
                    >
                        {children}
                    </CardContent>
                </Card>
            </Box>
        );
    }),
);
