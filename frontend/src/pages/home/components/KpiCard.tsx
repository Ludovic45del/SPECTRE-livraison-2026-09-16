/**
 * KPI metric card with gradient accent and hover animation.
 * @module pages/home/components/KpiCard
 */

import { Box, Card, CardContent, Skeleton, Typography, alpha, useTheme } from '@mui/material';
import { TRANSITION, type KpiCardProps } from '../constants';

export default function KpiCard({ title, value, subtitle, color, loading }: KpiCardProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Card
            sx={{
                flex: '1 1 220px',
                minWidth: 200,
                position: 'relative',
                overflow: 'hidden',
                transition: `all ${TRANSITION}`,
                cursor: 'default',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: isDark ? `0 12px 40px ${alpha(color, 0.2)}` : `0 12px 40px ${alpha(color, 0.15)}`,
                },
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.4)})`,
                },
            }}
        >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box>
                    <Typography
                        variant="body2"
                        sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.8rem', mb: 0.5 }}
                    >
                        {title}
                    </Typography>
                    {loading ? (
                        <Skeleton width={60} height={40} />
                    ) : (
                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 700,
                                fontSize: '2rem',
                                lineHeight: 1.2,
                                background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.7)})`,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            {value}
                        </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5 }}>
                        {subtitle}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}
