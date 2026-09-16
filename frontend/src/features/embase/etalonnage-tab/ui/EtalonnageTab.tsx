/**
 * Etalonnage Tab Component
 * @module features/embase/etalonnage-tab
 *
 * Affiche les graphiques d'évolution et l'historique des étalonnages.
 * Supporte l'affichage per-voie pour les embases à 2 voies.
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { Box, Button, Typography, Stack, CircularProgress, Alert, alpha } from '@mui/material';
import { ColorDot } from '@shared/ui';
import { useEtalonnages, useDeleteEtalonnage, ETALONNAGE_FIELD_LABELS, type Etalonnage } from '@entities/etalonnage';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { EtalonnageCharts } from './EtalonnageCharts';
import { EtalonnageHistoryTable } from './EtalonnageHistoryTable';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EtalonnageTabProps {
    embaseUuid: string;
    nombreVoies: 1 | 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Voie Section (charts + table)
// ─────────────────────────────────────────────────────────────────────────────

interface EtalonnageVoieSectionProps {
    etalonnages: Etalonnage[];
    title?: string;
    onDelete: (uuid: string) => void;
    isDeleting: boolean;
}

const EtalonnageVoieSection = memo(function EtalonnageVoieSection({
    etalonnages,
    title,
    onDelete,
    isDeleting,
}: EtalonnageVoieSectionProps) {
    const sortedData = useMemo(
        () => [...etalonnages].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
        [etalonnages],
    );

    const chartData = useMemo(
        () =>
            sortedData.map((e) => ({
                date: e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '',
                offset0BarMv: e.offset0BarMv,
                mesurande0BarLie: e.mesurande0BarLie,
                signalEtendueMv: e.signalEtendueMv,
                signalPaMeteociel: e.signalPaMeteociel,
            })),
        [sortedData],
    );

    const metricKeys = Object.keys(ETALONNAGE_FIELD_LABELS) as Array<keyof typeof ETALONNAGE_FIELD_LABELS>;

    return (
        <Stack spacing={3}>
            {title && (
                <Typography variant="h6" fontWeight={600}>
                    {title}
                </Typography>
            )}

            {sortedData.length > 1 && <EtalonnageCharts chartData={chartData} metricKeys={metricKeys} />}

            <EtalonnageHistoryTable sortedData={sortedData} onDelete={onDelete} isDeletingId={isDeleting} />
        </Stack>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Voie Selector buttons
// ─────────────────────────────────────────────────────────────────────────────

const VOIE_OPTIONS = [
    { label: 'Voie 1', voie: 1 as const, color: '#1976d2' },
    { label: 'Voie 2', voie: 2 as const, color: '#7b1fa2' },
] as const;

interface VoieSelectorProps {
    selectedVoie: 1 | 2;
    onSelectVoie: (voie: 1 | 2) => void;
}

const VoieSelector = memo(function VoieSelector({ selectedVoie, onSelectVoie }: VoieSelectorProps) {
    return (
        <Stack direction="row" spacing={1}>
            {VOIE_OPTIONS.map((item) => {
                const isActive = selectedVoie === item.voie;
                return (
                    <Button
                        key={item.voie}
                        variant={isActive ? 'contained' : 'outlined'}
                        size="small"
                        startIcon={<ColorDot color={isActive ? '#fff' : item.color} size={8} />}
                        sx={{
                            borderRadius: 1,
                            px: 2,
                            height: 40,
                            fontWeight: 600,
                            ...(isActive
                                ? {
                                      bgcolor: item.color,
                                      color: '#fff',
                                      '&:hover': { bgcolor: alpha(item.color, 0.85) },
                                  }
                                : {
                                      color: item.color,
                                      borderColor: alpha(item.color, 0.5),
                                      '&:hover': {
                                          bgcolor: alpha(item.color, 0.08),
                                          borderColor: item.color,
                                      },
                                  }),
                        }}
                        onClick={() => onSelectVoie(item.voie)}
                    >
                        {item.label}
                    </Button>
                );
            })}
        </Stack>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

function EtalonnageTabComponent({ embaseUuid, nombreVoies }: EtalonnageTabProps) {
    const [selectedVoie, setSelectedVoie] = useState<1 | 2>(1);
    const { data: etalonnages, isLoading, error } = useEtalonnages(embaseUuid);
    const deleteMutation = useDeleteEtalonnage();
    const { showSuccess, showError } = useNotification();

    const handleDelete = useCallback(
        async (uuid: string) => {
            try {
                await deleteMutation.mutateAsync({ uuid, embaseUuid });
                showSuccess('Étalonnage supprimé');
            } catch (err) {
                showError(getErrorMessage(err, 'Erreur lors de la suppression'));
            }
        },
        [deleteMutation, embaseUuid, showSuccess, showError],
    );

    const etalonnagesV1 = useMemo(() => (etalonnages ?? []).filter((e) => e.voie === 1), [etalonnages]);
    const etalonnagesV2 = useMemo(() => (etalonnages ?? []).filter((e) => e.voie === 2), [etalonnages]);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">Erreur lors du chargement des étalonnages</Alert>;
    }

    if (nombreVoies === 1) {
        return (
            <EtalonnageVoieSection
                etalonnages={etalonnages ?? []}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
            />
        );
    }

    return (
        <Stack spacing={3}>
            <VoieSelector selectedVoie={selectedVoie} onSelectVoie={setSelectedVoie} />
            <EtalonnageVoieSection
                etalonnages={selectedVoie === 1 ? etalonnagesV1 : etalonnagesV2}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
            />
        </Stack>
    );
}

export const EtalonnageTab = memo(EtalonnageTabComponent);
