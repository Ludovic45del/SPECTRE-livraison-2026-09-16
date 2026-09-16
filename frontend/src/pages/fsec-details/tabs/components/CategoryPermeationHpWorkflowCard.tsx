/**
 * Perméation + HP Workflow Card Component
 * @module pages/fsec-details/tabs/components
 *
 * Catégorie 4 (Perméation + HP) — workflow 100% HP, organisé en rubriques.
 * Même esthétique que CategoryBpWorkflowCard (cat 1) : une carte collapsible par
 * rubrique, mini-stepper en header avec 4 étapes :
 *   1. Test étanchéité HP
 *   2. Perméation
 *   3. Dépressurisation
 *   4. Remplissage HP
 *
 * Une "rubrique Perméation + HP" = 1 AirtightnessTestLp (phase=HP) + 1 PermeationStep
 * + 1 DepressurizationStep + 1 GasFillingHpStep, tous liés par index.
 *
 * L'étape Repressurisation a été retirée.
 */

import { useState } from 'react';
import { Box, Chip, Collapse, Divider, Grid, IconButton, Paper, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { AirtightnessStep, DepressurizationStep, GasFillingHpStep, PermeationStep } from '@entities/fsec/steps';
import { UserChip } from '@entities/user';
import { WorkflowMiniStepper } from './MiniStepper';
import { formatDate, formatDateTime } from './gas-workflow-components';

interface CategoryPermeationHpWorkflowCardProps {
    index: number;
    numRubriques: number;
    airtightnessStep?: AirtightnessStep;
    permeationStep?: PermeationStep;
    depressurizationStep?: DepressurizationStep;
    fillingStep?: GasFillingHpStep;
    onEditAirtightness: (step?: AirtightnessStep) => void;
    onEditPermeation: (step?: PermeationStep) => void;
    onEditDepressurization: (step?: DepressurizationStep) => void;
    onEditFilling: (step?: GasFillingHpStep) => void;
    onDelete?: () => void;
    isDeleting?: boolean;
}

const WORKFLOW_STEPS = ['Test étanchéité HP', 'Perméation', 'Dépressurisation', 'Remplissage HP'];

// ─── Inline section header (label + chip "Fait" + edit button) ───────────

interface SectionHeaderProps {
    title: string;
    isDone: boolean;
    onEdit: () => void;
}

function SectionHeader({ title, isDone, onEdit }: SectionHeaderProps) {
    return (
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle1" fontWeight={600}>
                    {title}
                </Typography>
                {isDone && <Chip label="Fait" color="success" />}
            </Stack>
            <IconButton
                size="small"
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                }}
                color="primary"
            >
                <EditIcon fontSize="small" />
            </IconButton>
        </Stack>
    );
}

// ─── Main Card ──────────────────────────────────────────────────────────

export function CategoryPermeationHpWorkflowCard({
    index,
    numRubriques,
    airtightnessStep,
    permeationStep,
    depressurizationStep,
    fillingStep,
    onEditAirtightness,
    onEditPermeation,
    onEditDepressurization,
    onEditFilling,
    onDelete,
    isDeleting = false,
}: CategoryPermeationHpWorkflowCardProps) {
    const isTestComplete = Boolean(airtightnessStep?.dateOfFulfilment);
    const isPermeationComplete = Boolean(permeationStep?.startDate);
    const isDepressurizationComplete = Boolean(depressurizationStep?.dateOfFulfilment);
    const isFillingComplete = Boolean(fillingStep?.dateOfFulfilment);

    const [expanded, setExpanded] = useState<boolean>(
        () => !(isTestComplete && isPermeationComplete && isDepressurizationComplete && isFillingComplete),
    );

    let activeStep = 0;
    if (isTestComplete) {
        activeStep = 1;
        if (isPermeationComplete) {
            activeStep = 2;
            if (isDepressurizationComplete) {
                activeStep = 3;
                if (isFillingComplete) {
                    activeStep = 4;
                }
            }
        }
    }

    const isComplete = isTestComplete && isPermeationComplete && isDepressurizationComplete && isFillingComplete;

    return (
        <Paper
            variant="outlined"
            sx={{
                borderRadius: 1,
                bgcolor: 'background.paper',
                borderColor: isComplete ? 'success.main' : 'divider',
                borderWidth: isComplete ? 2 : 1,
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <Box
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => setExpanded(!expanded)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpanded(!expanded);
                    }
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography variant="h6" fontWeight={600}>
                        Perméation + HP{numRubriques > 1 ? ` n°${index + 1}` : ''}
                    </Typography>
                    {isComplete && <Chip label="Complet" color="success" />}
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <WorkflowMiniStepper activeStep={activeStep} steps={WORKFLOW_STEPS} />
                    {onDelete && (
                        <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            disabled={isDeleting}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    )}
                    <IconButton size="small">{expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                </Stack>
            </Box>

            {/* Content */}
            <Collapse in={expanded}>
                <Divider />
                <Box sx={{ p: 3 }}>
                    {/* 1. Test d'étanchéité HP */}
                    <Box mb={2}>
                        <SectionHeader
                            title="Test d'étanchéité HP"
                            isDone={isTestComplete}
                            onEdit={() => onEditAirtightness(airtightnessStep)}
                        />
                        {airtightnessStep ? (
                            <Grid container spacing={2}>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Date
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {formatDate(airtightnessStep.dateOfFulfilment)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Opérateur
                                    </Typography>
                                    <UserChip
                                        userUuid={airtightnessStep.operatorUserUuid}
                                        fallbackText={airtightnessStep.operator}
                                    />
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Embase
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {airtightnessStep.embaseIdentifier ?? '-'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Pas encore de donnée enregistrée
                            </Typography>
                        )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* 2. Perméation */}
                    <Box mb={2}>
                        <SectionHeader
                            title="Perméation"
                            isDone={isPermeationComplete}
                            onEdit={() => onEditPermeation(permeationStep)}
                        />
                        {permeationStep ? (
                            <Grid container spacing={2}>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Date début
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {formatDateTime(permeationStep.startDate)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Date fin estimée
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {formatDateTime(permeationStep.estimatedEndDate)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Opérateur
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {permeationStep.operator ?? '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Pression capteur (bar)
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {permeationStep.sensorPressure ?? '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Pression tir calculée (bar)
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {permeationStep.computedShotPressure ?? '-'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Pas encore de donnée enregistrée
                            </Typography>
                        )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* 3. Dépressurisation */}
                    <Box mb={2}>
                        <SectionHeader
                            title="Dépressurisation"
                            isDone={isDepressurizationComplete}
                            onEdit={() => onEditDepressurization(depressurizationStep)}
                        />
                        {depressurizationStep ? (
                            <Grid container spacing={2}>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Date
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {formatDate(depressurizationStep.dateOfFulfilment)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Opérateur
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {depressurizationStep.operator ?? '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Manomètre (bar)
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {depressurizationStep.pressureGauge ?? '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Pression enceinte (bar)
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {depressurizationStep.enclosurePressureMeasured ?? '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Heure début
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {formatDateTime(depressurizationStep.startTime)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Heure fin
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {formatDateTime(depressurizationStep.endTime)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Temps avant tir (min)
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {depressurizationStep.depressurizationTimeBeforeFiring ?? '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Pression avant tir (bar)
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {depressurizationStep.computedPressureBeforeFiring ?? '-'}
                                    </Typography>
                                </Grid>
                                {depressurizationStep.observations && (
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">
                                            Observations
                                        </Typography>
                                        <Typography variant="body2" fontWeight="medium">
                                            {depressurizationStep.observations}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Pas encore de donnée enregistrée
                            </Typography>
                        )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* 4. Remplissage HP */}
                    <Box>
                        <SectionHeader
                            title="Remplissage HP"
                            isDone={isFillingComplete}
                            onEdit={() => onEditFilling(fillingStep)}
                        />
                        {fillingStep ? (
                            <Grid container spacing={2}>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Date
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {formatDate(fillingStep.dateOfFulfilment)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Opérateur
                                    </Typography>
                                    <UserChip
                                        userUuid={fillingStep.operatorUserUuid}
                                        fallbackText={fillingStep.operator}
                                    />
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Base gaz
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {fillingStep.gasBase ?? '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Bouteille
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {fillingStep.gasContainer ?? '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Embase
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {fillingStep.embaseIdentifier ?? '-'}
                                    </Typography>
                                </Grid>
                                {fillingStep.observations && (
                                    <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">
                                            Observations
                                        </Typography>
                                        <Typography variant="body2" fontWeight="medium">
                                            {fillingStep.observations}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Pas encore de donnée enregistrée
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Collapse>
        </Paper>
    );
}
