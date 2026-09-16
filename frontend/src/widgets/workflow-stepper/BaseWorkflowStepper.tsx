/**
 * Base Workflow Stepper - shared stepper with animated transitions and confirmation dialog.
 * Used by Campaign and FA workflow steppers.
 */

import { useState, useEffect, useRef } from 'react';
import {
    Stepper,
    Step,
    StepLabel,
    Box,
    StepButton,
    styled,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Stack,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { stepPop } from '@shared/lib';
import { motion, motionEasing, motionDuration } from '@shared/ui/motion';

export interface WorkflowStep {
    label: string;
    id: number;
}

interface BaseWorkflowStepperProps {
    steps: WorkflowStep[];
    activeStep: number;
    isPending: boolean;
    currentStepLabel: string;
    confirmSubject: string;
    onConfirm: (targetStep: WorkflowStep) => void;
}

const AnimatedStepper = styled(Stepper, {
    shouldForwardProp: (prop) => prop !== 'isComplete',
})<{ isComplete?: boolean }>(({ theme, isComplete }) => {
    const color = isComplete ? theme.palette.success.main : theme.palette.primary.main;
    return {
        '& .MuiStepConnector-line': {
            borderTopWidth: 3,
            borderColor: theme.palette.grey[300],
            transition: `border-color ${motionDuration.slow}ms ${motionEasing.standard}`,
        },
        '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
            borderColor: color,
        },
        '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': {
            borderColor: color,
        },
        '& .MuiStepIcon-root': {
            fontSize: '1.4rem',
            transition: `color ${motionDuration.medium}ms ${motionEasing.standard}, transform ${motionDuration.fast}ms ${motionEasing.standard}, filter ${motionDuration.fast}ms ${motionEasing.standard}`,
        },
        '& .MuiStepIcon-root.Mui-completed': { color },
        '& .MuiStepIcon-root.Mui-active': { color },
        '& .MuiStepLabel-label': {
            fontSize: '0.75rem',
            marginTop: theme.spacing(0.5),
            transition: `color ${motionDuration.medium}ms ${motionEasing.standard}, font-weight ${motionDuration.medium}ms ${motionEasing.standard}`,
        },
        '& .MuiStepLabel-label.Mui-active': {
            fontWeight: 600,
            color,
        },
        '& .MuiStepButton-root': {
            '&:hover:not(:disabled)': {
                '& .MuiStepIcon-root': {
                    transform: 'scale(1.1)',
                    filter: 'drop-shadow(0 0 4px rgba(25, 118, 210, 0.3))',
                },
            },
        },
    };
});

export function BaseWorkflowStepper({
    steps,
    activeStep,
    isPending,
    currentStepLabel,
    confirmSubject,
    onConfirm,
}: BaseWorkflowStepperProps) {
    const isWorkflowComplete = activeStep === steps.length - 1;
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [transitionTarget, setTransitionTarget] = useState<number | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; targetIndex: number | null }>({
        open: false,
        targetIndex: null,
    });
    const prevStep = useRef(activeStep);

    useEffect(() => {
        if (activeStep !== prevStep.current && activeStep >= 0) {
            setIsTransitioning(true);
            setTransitionTarget(activeStep);
            const timer = setTimeout(() => {
                setIsTransitioning(false);
                setTransitionTarget(null);
                prevStep.current = activeStep;
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [activeStep]);

    const handleStepClick = (stepIndex: number) => {
        if (stepIndex === activeStep || isPending) return;
        setConfirmDialog({ open: true, targetIndex: stepIndex });
    };

    const handleConfirm = () => {
        const stepIndex = confirmDialog.targetIndex;
        setConfirmDialog({ open: false, targetIndex: null });
        if (stepIndex === null) return;
        const targetStep = steps[stepIndex];
        if (!targetStep) return;
        onConfirm(targetStep);
    };

    const handleCancel = () => {
        setConfirmDialog({ open: false, targetIndex: null });
    };

    const targetStepLabel =
        confirmDialog.targetIndex !== null ? (steps[confirmDialog.targetIndex]?.label ?? 'Inconnu') : '';

    return (
        <>
            <Box sx={{ width: '100%', mt: 1, opacity: isPending ? 0.7 : 1, transition: `opacity ${motion.medium}` }}>
                <AnimatedStepper activeStep={activeStep} alternativeLabel isComplete={isWorkflowComplete}>
                    {steps.map((step, index) => (
                        <Step
                            key={step.id}
                            sx={{
                                '& .MuiStepIcon-root': {
                                    animation:
                                        isTransitioning && index === transitionTarget
                                            ? `${stepPop} 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)`
                                            : 'none',
                                },
                            }}
                        >
                            <StepButton
                                onClick={() => handleStepClick(index)}
                                disabled={index === activeStep || isPending}
                                sx={{ cursor: index === activeStep ? 'default' : 'pointer' }}
                            >
                                <StepLabel>{step.label}</StepLabel>
                            </StepButton>
                        </Step>
                    ))}
                </AnimatedStepper>
            </Box>

            <Dialog
                open={confirmDialog.open}
                onClose={handleCancel}
                PaperProps={{ sx: { borderRadius: 2, minWidth: 360 } }}
            >
                <DialogTitle sx={{ pb: 1 }}>Confirmer le changement de statut</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {`Êtes-vous sûr de vouloir modifier le statut de ${confirmSubject} ?`}
                    </Typography>
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="center"
                        spacing={2}
                        sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
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
