/**
 * Placeholder Tab Component
 * @module pages/fsec-details/tabs
 */

import { Box, Paper, Typography } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

interface PlaceholderTabProps {
    label: string;
}

export function PlaceholderTab({ label }: PlaceholderTabProps) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 4,
                borderRadius: 1,
                bgcolor: 'background.paper',
                borderColor: 'divider',
                textAlign: 'center',
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <ConstructionIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                <Typography variant="h6" color="text.secondary">
                    Onglet {label}
                </Typography>
                <Typography color="text.secondary">En construction</Typography>
            </Box>
        </Paper>
    );
}
