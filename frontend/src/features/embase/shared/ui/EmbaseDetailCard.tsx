/**
 * EmbaseDetailCard - encart d'information détaillé sur une embase.
 * @module features/embase/shared
 *
 * Utilisé dans les modales gas (HP, BP test étanchéité, BP remplissage) pour
 * afficher en un coup d'œil les caractéristiques voie + mécanique de
 * l'embase sélectionnée.
 */

import { useState } from 'react';
import { Box, Chip, Grid2, Paper, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { getEtalonnageStatus, type Embase } from '@entities/embase';
import { softChipSx } from '@shared/lib';
import { TestStatusChip } from './StatusChip';

function StatusChipDetail({ value }: { value: string }) {
    if (!value) return null;
    const upper = value.toUpperCase().trim();
    if (upper === 'OK' || upper === 'KO') return <TestStatusChip value={upper} />;
    return (
        <Typography variant="caption" fontWeight={500}>
            {value}
        </Typography>
    );
}

function EmbaseInfoRow({ label, value, isStatus }: { label: string; value: React.ReactNode; isStatus?: boolean }) {
    if (value === null || value === undefined || value === '') return null;
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.25 }}>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            {isStatus && typeof value === 'string' ? (
                <StatusChipDetail value={value} />
            ) : (
                <Typography variant="caption" fontWeight={500}>
                    {value}
                </Typography>
            )}
        </Box>
    );
}

export function EmbaseDetailCard({ embase }: { embase: Embase }) {
    const [voie, setVoie] = useState<'v1' | 'v2'>('v1');
    const etalStatusV1 = getEtalonnageStatus(embase.lastEtalonnageDateV1);
    const etalStatusV2 = getEtalonnageStatus(embase.lastEtalonnageDateV2);
    const etalStatus = voie === 'v1' ? etalStatusV1 : etalStatusV2;
    const observations = voie === 'v1' ? embase.observationsV1 : embase.observationsV2;

    return (
        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2">{embase.identifier}</Typography>
                <Chip label={etalStatus.label} sx={softChipSx(etalStatus.color)} />
                {embase.nombreVoies === 2 && (
                    <ToggleButtonGroup
                        value={voie}
                        exclusive
                        onChange={(_, v) => {
                            if (v) setVoie(v);
                        }}
                        size="small"
                        sx={{ ml: 'auto' }}
                    >
                        <ToggleButton value="v1" sx={{ py: 0, px: 1.5, fontSize: '0.75rem' }}>
                            V1
                        </ToggleButton>
                        <ToggleButton value="v2" sx={{ py: 0, px: 1.5, fontSize: '0.75rem' }}>
                            V2
                        </ToggleButton>
                    </ToggleButtonGroup>
                )}
            </Box>
            <Grid2 container spacing={2}>
                <Grid2 size={6}>
                    <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                        Voie {voie === 'v1' ? 'V1' : 'V2'}
                    </Typography>
                    <EmbaseInfoRow label="Soufflet" value={voie === 'v1' ? embase.souffletV1 : embase.souffletV2} />
                    <EmbaseInfoRow label="Capteur" value={voie === 'v1' ? embase.capteurV1 : embase.capteurV2} />
                    <EmbaseInfoRow label="Offset (mV)" value={voie === 'v1' ? embase.offsetV1Mv : embase.offsetV2Mv} />
                    <EmbaseInfoRow
                        label="Sensibilité (mV)"
                        value={voie === 'v1' ? embase.sensibiliteV1Mv : embase.sensibiliteV2Mv}
                    />
                    <EmbaseInfoRow
                        label="Etendue (mbar)"
                        value={voie === 'v1' ? embase.etendueV1Mbar : embase.etendueV2Mbar}
                    />
                    <EmbaseInfoRow
                        label="Pfeiffer (mbar)"
                        value={voie === 'v1' ? embase.capteurCiblePfeifferMbar : embase.capteurCiblePfeifferV2Mbar}
                    />
                    <EmbaseInfoRow
                        label="Etanchéité He"
                        value={voie === 'v1' ? embase.testEtancheiteHe : embase.testEtancheiteHeV2}
                        isStatus
                    />
                    <EmbaseInfoRow
                        label="Capteur MRG"
                        value={voie === 'v1' ? embase.testCapteurMrg : embase.testCapteurMrgV2}
                        isStatus
                    />
                </Grid2>
                <Grid2 size={6}>
                    <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                        Mécanique
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.25 }}>
                        <Typography variant="caption" color="text.secondary">
                            Opérationnelle
                        </Typography>
                        {embase.operationnelleAimant ? (
                            <Chip label="Aimant" sx={softChipSx('#1976d2')} />
                        ) : embase.operationnelleBroche ? (
                            <Chip label="Broche" sx={softChipSx('#7b1fa2')} />
                        ) : (
                            <Typography variant="caption" color="text.secondary">
                                -
                            </Typography>
                        )}
                    </Box>
                    <EmbaseInfoRow label="Localisation" value={embase.localisationActuelle} />
                    <EmbaseInfoRow label="Cote VE" value={embase.coteVe} />
                    <EmbaseInfoRow label="MCC" value={embase.chargementMcc} isStatus />
                    {embase.nombreVoies === 2 && (
                        <EmbaseInfoRow label="Electrovanne" value={embase.electrovanne ? 'Oui' : 'Non'} isStatus />
                    )}
                </Grid2>
            </Grid2>
            {observations && (
                <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Observations:{' '}
                    </Typography>
                    <Typography variant="caption">{observations}</Typography>
                </Box>
            )}
        </Paper>
    );
}
