/**
 * PlanningSection — Section collapsible (tbody) avec header cliquable.
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { type SectionId } from '../lib/planning.constants';
import { usePlanningColors } from '../lib/planning.hooks';
import { usePlanningStore } from '../lib/planning.store';
import { motion } from '@shared/ui/motion';

interface PlanningSectionProps {
    sectionId: SectionId;
    label: string;
    totalColumns: number;
    children: React.ReactNode;
}

export function PlanningSection({ sectionId, label, totalColumns, children }: PlanningSectionProps) {
    const colors = usePlanningColors();
    const isCollapsed = usePlanningStore((s) => !!s.collapsedSections[sectionId]);
    const toggleSection = usePlanningStore((s) => s.toggleSection);

    return (
        <>
            {/* Section header tbody */}
            <tbody>
                <tr role="row">
                    <td
                        role="gridcell"
                        colSpan={totalColumns}
                        style={{
                            backgroundColor: colors.sectionBg,
                            border: `1px solid ${colors.border}`,
                            padding: '6px 12px',
                            userSelect: 'none',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box
                                role="button"
                                tabIndex={0}
                                aria-expanded={!isCollapsed}
                                onClick={() => toggleSection(sectionId)}
                                onKeyDown={(e: React.KeyboardEvent) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggleSection(sectionId);
                                    }
                                }}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', flex: 1 }}
                            >
                                <ExpandMore
                                    sx={{
                                        fontSize: 20,
                                        color: colors.accent,
                                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                        transition: `transform ${motion.base}`,
                                    }}
                                />
                                <Typography variant="subtitle2" fontWeight={700} color={colors.accent}>
                                    {label}
                                </Typography>
                            </Box>
                        </Box>
                    </td>
                </tr>
            </tbody>
            {/* Data rows tbody — hidden when collapsed */}
            <tbody
                style={{
                    visibility: isCollapsed ? 'collapse' : 'visible',
                }}
            >
                {children}
            </tbody>
        </>
    );
}
