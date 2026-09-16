/**
 * Section Header Component
 * @module pages/campaign-details/overview/components/SectionHeader
 *
 * Reusable header with icon, title and divider for sections.
 */

import { memo } from 'react';
import { Typography, Divider } from '@mui/material';

interface SectionHeaderProps {
    /** Section title */
    title: string;
    /** Whether to show divider below header */
    showDivider?: boolean;
}

export const SectionHeader = memo(function SectionHeader({ title, showDivider = true }: SectionHeaderProps) {
    return (
        <>
            <Typography variant="h6" component="h3" mb={2}>
                {title}
            </Typography>
            {showDivider && <Divider sx={{ mb: 2 }} />}
        </>
    );
});
