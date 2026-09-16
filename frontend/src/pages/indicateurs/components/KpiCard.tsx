/**
 * KpiCard - carte métrique avec accent dégradé et valeur principale.
 * @module pages/indicateurs/components
 *
 * Variante locale à la page Indicateurs : volontairement décorrélée de
 * `features/dashboard` pour éviter un couplage cross-feature.
 */

import { memo } from 'react';
import { Card, CardContent, Skeleton, Typography, alpha, useTheme } from '@mui/material';

interface KpiCardProps {
    readonly title: string;
    readonly value: number | string;
    readonly subtitle?: string;
    readonly color: string;
    readonly loading?: boolean;
}

const KpiCard = memo(function KpiCard({ title, value, subtitle, color, loading = false }: KpiCardProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Card
            sx={{
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 300ms cubic-bezier(0.2, 0, 0, 1)',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: isDark ? `0 12px 32px ${alpha(color, 0.2)}` : `0 12px 32px ${alpha(color, 0.15)}`,
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
                <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.8rem', mb: 0.5 }}
                >
                    {title}
                </Typography>
                {loading ? (
                    <Skeleton width={70} height={40} />
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
                {subtitle ? (
                    <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5, display: 'block' }}>
                        {subtitle}
                    </Typography>
                ) : null}
            </CardContent>
        </Card>
    );
});

export default KpiCard;
