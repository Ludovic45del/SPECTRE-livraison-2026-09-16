/**
 * Documents Loading Skeleton
 * @module pages/campaign-details/documents/components
 */

import { memo } from 'react';
import { Box, Grid, Paper, Stack, Skeleton } from '@mui/material';

export const DocumentsSkeleton = memo(function DocumentsSkeleton() {
    return (
        <Box role="status" aria-label="Chargement des documents">
            <Paper
                variant="outlined"
                sx={{
                    mb: 3,
                    p: 1.5,
                    px: 2,
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    borderColor: 'divider',
                    minHeight: 64,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Skeleton variant="rounded" width={180} height={36} />
                    <Skeleton variant="circular" width={32} height={32} />
                </Stack>
            </Paper>

            <Grid container spacing={2}>
                {[...Array(6)].map((_, i) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 1, borderColor: 'divider' }}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Skeleton variant="circular" width={40} height={40} />
                                <Box sx={{ flex: 1 }}>
                                    <Skeleton variant="text" width="70%" height={24} />
                                    <Skeleton variant="text" width="40%" height={16} />
                                </Box>
                            </Stack>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
});
