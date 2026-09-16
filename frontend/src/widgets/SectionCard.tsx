/**
 * Generic section card wrapper with title and optional action.
 * @module widgets/SectionCard
 */

import { memo, type ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

export default memo(function SectionCard({
    title,
    children,
    action,
}: {
    readonly title: string;
    readonly children: ReactNode;
    readonly action?: ReactNode;
}) {
    return (
        <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent
                sx={{
                    p: 2.5,
                    '&:last-child': { pb: 2.5 },
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {title}
                    </Typography>
                    {action}
                </Box>
                <Box sx={{ flex: 1 }}>{children}</Box>
            </CardContent>
        </Card>
    );
});
