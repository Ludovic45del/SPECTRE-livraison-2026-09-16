/**
 * ChartTooltipCard - carte de tooltip "premium" partagée par les graphiques.
 *
 * Fournit un rendu cohérent (verre dépoli, ombre douce, animation d'apparition)
 * pour les charts recharts via leur prop `content`. Utilisée aussi bien par les
 * graphiques indicateurs (KPI) que par les courbes d'étalonnage embase.
 * @module shared/ui
 */

import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

export interface TooltipMetric {
    /** Libellé affiché à gauche. */
    label: string;
    /** Valeur formatée affichée à droite. */
    value: string;
    /** Pastille de couleur optionnelle devant le libellé. */
    color?: string;
    /** Met la valeur en gras (métrique principale). */
    bold?: boolean;
}

interface ChartTooltipCardProps {
    /** Titre / catégorie en en-tête. */
    title?: string;
    /** Couleur de la pastille d'en-tête. */
    accent?: string;
    metrics: TooltipMetric[];
    /** Contenu additionnel sous les métriques (chip, note…). */
    footer?: ReactNode;
}

/**
 * Carte stylée réutilisable. À passer dans `<Tooltip content={...} />`.
 */
export function ChartTooltipCard({ title, accent, metrics, footer }: ChartTooltipCardProps) {
    return (
        <Paper
            elevation={0}
            sx={{
                px: 1.5,
                py: 1.25,
                minWidth: 172,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: (t) =>
                    t.palette.mode === 'dark' ? 'rgba(32, 32, 38, 0.88)' : 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                boxShadow: '0 12px 28px -8px rgba(0, 0, 0, 0.28), 0 3px 8px -3px rgba(0, 0, 0, 0.16)',
                animation: 'spectreTooltipIn 150ms cubic-bezier(0.16, 1, 0.3, 1)',
                '@keyframes spectreTooltipIn': {
                    from: { opacity: 0, transform: 'translateY(6px) scale(0.96)' },
                    to: { opacity: 1, transform: 'translateY(0) scale(1)' },
                },
            }}
        >
            {title ? (
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
                    {accent ? (
                        <Box
                            sx={{
                                width: 9,
                                height: 9,
                                borderRadius: '50%',
                                backgroundColor: accent,
                                boxShadow: `0 0 0 3px ${accent}26`,
                                flexShrink: 0,
                            }}
                        />
                    ) : null}
                    <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
                        {title}
                    </Typography>
                </Stack>
            ) : null}

            <Stack spacing={0.4}>
                {metrics.map((m) => (
                    <Stack
                        key={m.label}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={2.5}
                    >
                        <Stack direction="row" alignItems="center" spacing={0.6}>
                            {m.color ? (
                                <Box
                                    sx={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        backgroundColor: m.color,
                                        flexShrink: 0,
                                    }}
                                />
                            ) : null}
                            <Typography variant="caption" color="text.secondary">
                                {m.label}
                            </Typography>
                        </Stack>
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: m.bold ? 700 : 600,
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {m.value}
                        </Typography>
                    </Stack>
                ))}
            </Stack>

            {footer ? <Box sx={{ mt: 0.75 }}>{footer}</Box> : null}
        </Paper>
    );
}
