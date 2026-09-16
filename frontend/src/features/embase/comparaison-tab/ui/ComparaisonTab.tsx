import { memo, useState, useEffect, useMemo } from 'react';
import { Box, Grid, Paper, Stack, Typography } from '@mui/material';
import { type Embase } from '@entities/embase';
import { ComparisonBar, type ComparisonMetric } from './ComparisonBar';
import { RadarSection } from './RadarSection';
import { EquipmentTable } from './EquipmentTable';
import { TestsComparisonTable } from './TestsComparisonTable';
import { V1_COLOR, V2_COLOR } from './voie-colors';

export const ComparaisonTab = memo(function ComparaisonTab({ embase }: { embase: Embase }) {
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        const raf = requestAnimationFrame(() => {
            requestAnimationFrame(() => setAnimated(true));
        });
        return () => cancelAnimationFrame(raf);
    }, []);

    const metrics: ComparisonMetric[] = useMemo(
        () => [
            { label: 'Offset (b) à 0 barA', v1: embase.offsetV1Mv, v2: embase.offsetV2Mv, unit: 'mV' },
            {
                label: 'Mesurande à 0 barA au LIE',
                v1: embase.mesurandeLieV1Mv,
                v2: embase.mesurandeLieV2Mv,
                unit: 'mV',
            },
            { label: 'Sensibilité (a)', v1: embase.sensibiliteV1Mv, v2: embase.sensibiliteV2Mv, unit: 'mV' },
            { label: 'Signal météociel', v1: embase.signalMeteocielV1Mv, v2: embase.signalMeteocielV2Mv, unit: 'mV' },
            {
                label: 'Capteur cible PFEIFFER',
                v1: embase.capteurCiblePfeifferMbar,
                v2: embase.capteurCiblePfeifferV2Mbar,
                unit: 'mbar',
            },
            { label: 'Étendue', v1: embase.etendueV1Mbar, v2: embase.etendueV2Mbar, unit: 'mbar' },
        ],
        [embase],
    );

    const radarData = useMemo(() => {
        return metrics
            .filter((m) => m.v1 != null || m.v2 != null)
            .map((m) => {
                const maxVal = Math.max(Math.abs(m.v1 ?? 0), Math.abs(m.v2 ?? 0), 0.001);
                return {
                    metric: m.label,
                    V1: m.v1 != null ? Math.round((Math.abs(m.v1) / maxVal) * 100) : 0,
                    V2: m.v2 != null ? Math.round((Math.abs(m.v2) / maxVal) * 100) : 0,
                };
            });
    }, [metrics]);

    const hasData = metrics.some((m) => m.v1 != null || m.v2 != null);

    const textRows = useMemo(
        () => [
            { label: 'Soufflet', v1: embase.souffletV1, v2: embase.souffletV2 },
            { label: 'N° Capteur', v1: embase.capteurV1, v2: embase.capteurV2 },
        ],
        [embase.souffletV1, embase.souffletV2, embase.capteurV1, embase.capteurV2],
    );

    const testRows = useMemo(
        () => [
            { label: 'Étanchéité He', v1: embase.testEtancheiteHe, v2: embase.testEtancheiteHeV2 },
            { label: 'Capteur MRG au LIE', v1: embase.testCapteurMrg, v2: embase.testCapteurMrgV2 },
        ],
        [embase.testEtancheiteHe, embase.testEtancheiteHeV2, embase.testCapteurMrg, embase.testCapteurMrgV2],
    );

    if (!hasData) {
        return (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 1 }}>
                <Typography color="text.secondary">
                    Aucune donnée disponible pour la comparaison. Renseignez les mesures V1 et/ou V2.
                </Typography>
            </Paper>
        );
    }

    return (
        <Stack spacing={3}>
            {/* Radar Chart */}
            {radarData.length >= 3 && <RadarSection radarData={radarData} animated={animated} />}

            {/* Animated Bars */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 1 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                    Mesures détaillées
                </Typography>
                {metrics.map((m, i) => (
                    <ComparisonBar key={m.label} metric={m} animated={animated} index={i} />
                ))}
            </Paper>

            {/* Equipment & Tests side by side */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <EquipmentTable textRows={textRows} animated={animated} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TestsComparisonTable testRows={testRows} animated={animated} />
                </Grid>
            </Grid>

            {/* Observations comparison */}
            <ObservationsComparison embase={embase} animated={animated} />
        </Stack>
    );
});

const ObservationsComparison = memo(function ObservationsComparison({
    embase,
    animated,
}: {
    embase: Embase;
    animated: boolean;
}) {
    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                <Paper
                    variant="outlined"
                    sx={{
                        p: 3,
                        borderRadius: 1,
                        height: '100%',
                        opacity: animated ? 1 : 0,
                        transition: 'opacity 0.5s ease 1s',
                    }}
                >
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: V1_COLOR }} />
                        <Typography variant="subtitle2" fontWeight={600}>
                            Observations V1
                        </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {embase.observationsV1 || '-'}
                    </Typography>
                </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
                <Paper
                    variant="outlined"
                    sx={{
                        p: 3,
                        borderRadius: 1,
                        height: '100%',
                        opacity: animated ? 1 : 0,
                        transition: 'opacity 0.5s ease 1s',
                    }}
                >
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: V2_COLOR }} />
                        <Typography variant="subtitle2" fontWeight={600}>
                            Observations V2
                        </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {embase.observationsV2 || '-'}
                    </Typography>
                </Paper>
            </Grid>
        </Grid>
    );
});
