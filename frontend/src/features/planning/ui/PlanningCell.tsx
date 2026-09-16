/**
 * PlanningCell — Cellules sticky (labels) et td hover du planning.
 */
import React, { memo } from 'react';
import { styled } from '@mui/material/styles';
import { GRID_LABEL_WIDTH, GRID_SUB_LABEL_WIDTH } from '../lib/planning.constants';
import { usePlanningColors } from '../lib/planning.hooks';
import { motion } from '@shared/ui/motion';

// ====================== Hover-enabled td for timeline cells ======================

export const HoverTd = styled('td')({
    transition: motion.transition(['background-color', 'box-shadow'], 'fast'),
    '&:hover': {
        boxShadow: 'inset 0 0 0 100px rgba(25, 118, 210, 0.06)',
    },
});

const stickyZIndex = 2;

// ====================== Sticky Label Cells ======================

interface StickyLabelCellProps {
    children: React.ReactNode;
    rowSpan?: number;
    isSubLabel?: boolean;
    bold?: boolean;
    onClick?: () => void;
    onDoubleClick?: () => void;
    accentColor?: string;
    isHeader?: boolean;
    role?: React.AriaRole;
    'aria-selected'?: boolean;
}

export const StickyLabelCell = memo(function StickyLabelCell({
    children,
    rowSpan,
    isSubLabel,
    bold,
    onClick,
    onDoubleClick,
    accentColor,
    isHeader,
    role: cellRole,
    'aria-selected': ariaSelected,
}: StickyLabelCellProps) {
    const colors = usePlanningColors();
    const left = isSubLabel ? GRID_LABEL_WIDTH : 0;
    const width = isSubLabel ? GRID_SUB_LABEL_WIDTH : GRID_LABEL_WIDTH;

    return (
        <HoverTd
            role={cellRole ?? 'gridcell'}
            aria-selected={ariaSelected}
            rowSpan={rowSpan}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            style={{
                position: 'sticky',
                left,
                zIndex: stickyZIndex,
                width,
                minWidth: width,
                maxWidth: width,
                backgroundColor: isHeader ? colors.sectionBg : colors.white,
                borderRight: `2px solid ${colors.borderStrong}`,
                border: `1px solid ${colors.border}`,
                borderTop: isHeader ? `2px solid ${colors.borderStrong}` : `1px solid ${colors.border}`,
                borderLeft: accentColor ? `4px solid ${accentColor}` : `1px solid ${colors.border}`,
                padding: '4px 8px',
                fontSize: 13,
                fontWeight: bold ? 600 : 500,
                color: colors.accent,
                textAlign: 'left',
                verticalAlign: 'middle',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: onClick || onDoubleClick ? 'pointer' : 'default',
            }}
        >
            {children}
        </HoverTd>
    );
});
