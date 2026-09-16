/**
 * FSEC Workflow Stepper Component
 * Displays and allows switching FSEC status with confirmation dialog
 * Style: Alternating labels (top/bottom zigzag pattern) with equal spacing
 * Supports dynamic workflows based on FSEC category + HS chip
 */

import { useState, useEffect, useRef } from 'react';
import {
    Box,
    styled,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Stack,
    Chip,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BlockIcon from '@mui/icons-material/Block';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import CheckIcon from '@mui/icons-material/Check';
import { Fsec, FSEC_STATUSES, FSEC_WORKFLOW_SEQUENCES, isPausedFsecStatus, useUpdateFsec } from '@entities/fsec';
import { useNotification } from '@shared/ui';
import { stepPop } from '@shared/lib';
import { motion, motionDuration, motionEasing } from '@shared/ui/motion';

interface FsecWorkflowStepperProps {
    fsec: Fsec;
}

// Tous les statuts possibles avec leurs labels
const ALL_STEPS: Record<number, string> = {
    0: 'Design',
    1: 'Assemblage',
    2: 'Métrologie',
    3: 'Scellement',
    4: 'Photos',
    5: 'Disponible',
    6: 'Installation',
    7: 'Tirée',
    8: 'HS',
    9: 'Remp. HP',
    10: 'Étanchéité',
    11: 'Remp. BP',
    12: 'Perméation',
    13: 'Dépress.',
    14: 'Repress.',
    15: 'Décision MOE',
    16: 'Vérif. scellement',
};

// Statuts de mise en pause : hors progression linéaire, ils figent l'avancement.
const HS_STEP = { label: 'HS', id: 8 };
const DECISION_MOE_STEP = { label: 'Décision MOE', id: 15 };
// Couleur du chip Décision MOE alignée sur le référentiel (source de vérité unique).
const DECISION_MOE_COLOR = FSEC_STATUSES[DECISION_MOE_STEP.id]?.color ?? '#64748b';

function getWorkflowSteps(
    categoryId: number | null,
    depressurizationFailed: boolean | null,
): { label: string; id: number }[] {
    // Séquences par catégorie : source de vérité unique dans le référentiel FSEC
    // (partagée avec les helpers de rang utilisés par le tri et le planning).
    let sequence: readonly number[] = FSEC_WORKFLOW_SEQUENCES[categoryId ?? 0] ?? FSEC_WORKFLOW_SEQUENCES[0];

    // Pour catégorie 4 : ajouter Re-pressurisation (14) après Dépressurisation (13) si échec
    if (categoryId === 4 && depressurizationFailed === true) {
        const depressIndex = sequence.indexOf(13);
        if (depressIndex !== -1) {
            sequence = [...sequence.slice(0, depressIndex + 1), 14, ...sequence.slice(depressIndex + 1)];
        }
    }

    return sequence.map((id) => ({
        id,
        label: ALL_STEPS[id] ?? `Étape ${id}`,
    }));
}

// Styled components for alternating stepper
const StepperContainer = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    height: 70,
});

const StepWrapper = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    flex: '1 1 0',
    minWidth: 0,
});

const StepIconWrapper = styled(Box, {
    shouldForwardProp: (prop) =>
        !['isActive', 'isCompleted', 'isAnimating', 'isWorkflowComplete'].includes(prop as string),
})<{ isActive?: boolean; isCompleted?: boolean; isAnimating?: boolean; isWorkflowComplete?: boolean }>(({
    theme,
    isActive,
    isCompleted,
    isAnimating,
    isWorkflowComplete,
}) => {
    const activeColor = isWorkflowComplete ? theme.palette.success.main : theme.palette.primary.main;
    return {
        width: 22,
        height: 22,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: `background-color ${motionDuration.slow}ms ${motionEasing.standard}, transform ${motionDuration.base}ms ${motionEasing.standard}, filter ${motionDuration.base}ms ${motionEasing.standard}`,
        zIndex: 2,
        backgroundColor: isCompleted || isActive ? activeColor : theme.palette.grey[400],
        color: 'common.white',
        fontSize: '0.7rem',
        fontWeight: 600,
        animation: isAnimating ? `${stepPop} ${motionDuration.dramatic + 100}ms ${motionEasing.spring}` : 'none',
        '& svg': {
            fontSize: 16,
            color: 'common.white',
        },
        '&:hover': {
            transform: 'scale(1.15)',
            backgroundColor: activeColor,
            filter: 'drop-shadow(0 0 4px rgba(25, 118, 210, 0.3))',
        },
    };
});

const StepLabel = styled(Typography, {
    shouldForwardProp: (prop) => !['isActive', 'labelPosition', 'isWorkflowComplete'].includes(prop as string),
})<{ isActive?: boolean; labelPosition: 'top' | 'bottom'; isWorkflowComplete?: boolean }>(
    ({ theme, isActive, labelPosition, isWorkflowComplete }) => ({
        fontSize: '0.65rem',
        fontWeight: isActive ? 600 : 400,
        color: isActive
            ? isWorkflowComplete
                ? theme.palette.success.main
                : theme.palette.primary.main
            : theme.palette.text.secondary,
        whiteSpace: 'nowrap',
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        transition: `color ${motionDuration.medium}ms ${motionEasing.standard}, font-weight ${motionDuration.medium}ms ${motionEasing.standard}`,
        ...(labelPosition === 'top' ? { bottom: '100%', marginBottom: 6 } : { top: '100%', marginTop: 6 }),
    }),
);

const Connector = styled(Box, {
    shouldForwardProp: (prop) => !['isCompleted', 'isWorkflowComplete'].includes(prop as string),
})<{ isCompleted?: boolean; isWorkflowComplete?: boolean }>(({ theme, isCompleted, isWorkflowComplete }) => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    right: '-50%',
    height: 3,
    backgroundColor: isCompleted
        ? isWorkflowComplete
            ? theme.palette.success.main
            : theme.palette.primary.main
        : theme.palette.grey[300],
    transition: `background-color ${motionDuration.slow}ms ${motionEasing.standard}`,
    zIndex: 1,
}));

export function FsecWorkflowStepper({ fsec }: FsecWorkflowStepperProps) {
    const { mutate: updateFsec, isPending } = useUpdateFsec();
    const { showNotification } = useNotification();
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [transitionTarget, setTransitionTarget] = useState<number | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; targetStepId: number | null }>({
        open: false,
        targetStepId: null,
    });

    const workflowSteps = getWorkflowSteps(fsec.categoryId, fsec.depressurizationFailed);
    const currentStatusId = fsec.statusId ?? 0;
    const activeStepIndex = workflowSteps.findIndex((step) => step.id === currentStatusId);
    const isHS = currentStatusId === HS_STEP.id;
    const isDecisionMoe = currentStatusId === DECISION_MOE_STEP.id;
    // Un statut de pause (HS ou Décision MOE) fige la progression : aucun step
    // n'est marqué actif/terminé tant que la FSEC est en pause.
    const isPaused = isPausedFsecStatus(currentStatusId);
    const isWorkflowComplete = !isPaused && activeStepIndex === workflowSteps.length - 1;
    const prevStatusId = useRef(currentStatusId);

    // Detect when step actually changes (after mutation success)
    useEffect(() => {
        if (currentStatusId !== prevStatusId.current) {
            setIsTransitioning(true);
            const newIndex = workflowSteps.findIndex((step) => step.id === currentStatusId);
            setTransitionTarget(newIndex);

            const timer = setTimeout(() => {
                setIsTransitioning(false);
                setTransitionTarget(null);
                prevStatusId.current = currentStatusId;
            }, 800);

            return () => clearTimeout(timer);
        }
    }, [currentStatusId, workflowSteps]);

    const handleStepClick = (stepId: number) => {
        if (stepId === currentStatusId || isPending) return;
        setConfirmDialog({ open: true, targetStepId: stepId });
    };

    const handleConfirm = () => {
        const targetStepId = confirmDialog.targetStepId;
        setConfirmDialog({ open: false, targetStepId: null });

        if (targetStepId === null) return;

        const targetLabel = ALL_STEPS[targetStepId] ?? `Étape ${targetStepId}`;

        updateFsec(
            {
                versionUuid: fsec.versionUuid,
                data: {
                    name: fsec.name,
                    campaignId: fsec.campaignId,
                    statusId: targetStepId,
                    categoryId: fsec.categoryId,
                    rackId: fsec.rackId,
                    comments: fsec.comments,
                },
            },
            {
                onSuccess: () => {
                    showNotification(`Statut mis à jour : ${targetLabel}`, 'success');
                },
                onError: (err: unknown) => {
                    const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
                    showNotification(`Erreur: ${errorMessage}`, 'error');
                },
            },
        );
    };

    const handleCancel = () => {
        setConfirmDialog({ open: false, targetStepId: null });
    };

    const currentStepLabel = ALL_STEPS[currentStatusId] ?? 'Inconnu';
    const targetStepLabel =
        confirmDialog.targetStepId !== null ? (ALL_STEPS[confirmDialog.targetStepId] ?? 'Inconnu') : '';

    return (
        <>
            <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{
                    width: '100%',
                    opacity: isPending ? 0.7 : 1,
                    transition: `opacity ${motion.medium}`,
                }}
            >
                <StepperContainer>
                    {workflowSteps.map((step, index) => {
                        const isCompleted = !isPaused && index < activeStepIndex;
                        const isActive = !isPaused && index === activeStepIndex;
                        const isAnimating = isTransitioning && index === transitionTarget;
                        // Alternate: even indices = top, odd indices = bottom
                        const labelPosition = index % 2 === 0 ? 'top' : 'bottom';

                        return (
                            <StepWrapper key={step.id}>
                                {/* Connector line (not for last step) */}
                                {index < workflowSteps.length - 1 && (
                                    <Connector isCompleted={isCompleted} isWorkflowComplete={isWorkflowComplete} />
                                )}

                                {/* Step icon */}
                                <StepIconWrapper
                                    isActive={isActive}
                                    isCompleted={isCompleted}
                                    isAnimating={isAnimating}
                                    isWorkflowComplete={isWorkflowComplete}
                                    onClick={() => handleStepClick(step.id)}
                                >
                                    {isCompleted ? <CheckIcon /> : index + 1}
                                </StepIconWrapper>

                                {/* Label - alternating position */}
                                <StepLabel
                                    isActive={isActive}
                                    labelPosition={labelPosition}
                                    isWorkflowComplete={isWorkflowComplete}
                                >
                                    {step.label}
                                </StepLabel>
                            </StepWrapper>
                        );
                    })}
                </StepperContainer>

                {/* Chips de mise en pause : Décision MOE + HS */}
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <Chip
                        icon={<PauseCircleOutlineIcon sx={{ fontSize: '1rem' }} />}
                        label={DECISION_MOE_STEP.label}
                        onClick={() => handleStepClick(DECISION_MOE_STEP.id)}
                        disabled={isPending}
                        variant={isDecisionMoe ? 'filled' : 'outlined'}
                        aria-label={
                            isDecisionMoe
                                ? `Annuler le statut ${DECISION_MOE_STEP.label}`
                                : `Marquer la FSEC ${DECISION_MOE_STEP.label}`
                        }
                        sx={{
                            cursor: isDecisionMoe ? 'default' : 'pointer',
                            // Pause : couleur du référentiel (slate), comme dans le donut/statistiques.
                            ...(isDecisionMoe && {
                                bgcolor: DECISION_MOE_COLOR,
                                color: 'common.white',
                                '& .MuiChip-icon': { color: 'common.white' },
                                '&:hover': { bgcolor: DECISION_MOE_COLOR },
                            }),
                        }}
                    />
                    <Chip
                        icon={<BlockIcon sx={{ fontSize: '1rem' }} />}
                        label={HS_STEP.label}
                        onClick={() => handleStepClick(HS_STEP.id)}
                        disabled={isPending}
                        color={isHS ? 'error' : 'default'}
                        variant={isHS ? 'filled' : 'outlined'}
                        aria-label={isHS ? `Annuler le statut ${HS_STEP.label}` : `Marquer la FSEC ${HS_STEP.label}`}
                        sx={{ cursor: isHS ? 'default' : 'pointer' }}
                    />
                </Stack>
            </Stack>

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmDialog.open}
                onClose={handleCancel}
                PaperProps={{ sx: { borderRadius: 2, minWidth: 360 } }}
            >
                <DialogTitle sx={{ pb: 1 }}>Confirmer le changement de statut</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Êtes-vous sûr de vouloir modifier le statut de ce FSEC ?
                    </Typography>
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="center"
                        spacing={2}
                        sx={{
                            p: 2,
                            bgcolor: 'grey.50',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography variant="body1" fontWeight={500} sx={{ color: 'text.secondary' }}>
                            {currentStepLabel}
                        </Typography>
                        <ArrowForwardIcon sx={{ color: 'primary.main' }} />
                        <Typography variant="body1" fontWeight={600} sx={{ color: 'primary.main' }}>
                            {targetStepLabel}
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCancel} color="inherit">
                        Annuler
                    </Button>
                    <Button onClick={handleConfirm} variant="contained" disabled={isPending}>
                        Confirmer
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
