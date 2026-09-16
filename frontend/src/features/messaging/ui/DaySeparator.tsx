/**
 * DaySeparator — séparateur de jour dans le fil de discussion.
 * @module features/messaging/ui
 *
 * Libellé fourni par `groupMessagesByDay` (« Aujourd'hui », « Hier », date longue).
 */

import { memo } from 'react';
import { Divider, Typography } from '@mui/material';

export interface DaySeparatorProps {
    readonly label: string;
}

export const DaySeparator = memo(function DaySeparator({ label }: DaySeparatorProps) {
    return (
        <Divider sx={{ my: 1.5 }} aria-label={label}>
            <Typography component="span" variant="caption" color="text.secondary" sx={{ px: 1, fontWeight: 600 }}>
                {label}
            </Typography>
        </Divider>
    );
});
