/**
 * Workflow Mini Stepper Component
 * @module pages/fsec-details/tabs/components
 *
 * Reusable styled stepper for workflow progress visualization.
 * Used in unified workflow cards (ControleTab, GasBpWorkflowCard, PermeationWorkflowCard)
 *
 * @example
 * <WorkflowMiniStepper
 *   activeStep={1}
 *   steps={['Test étanchéité', 'Remplissage']}
 * />
 */

import { Box, Step, StepLabel, Stepper, styled } from '@mui/material';

const MiniStepperStyled = styled(Stepper)(({ theme }) => ({
    '& .MuiStepConnector-line': {
        borderTopWidth: 2,
        borderColor: theme.palette.grey[300],
    },
    '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
        borderColor: theme.palette.success.main,
    },
    '& .MuiStepConnector-root.Mui-active .MuiStepConnector-line': {
        borderColor: theme.palette.primary.main,
    },
    '& .MuiStepIcon-root': {
        fontSize: '1.2rem',
    },
    '& .MuiStepIcon-root.Mui-completed': {
        color: theme.palette.success.main,
    },
    '& .MuiStepLabel-label': {
        fontSize: '0.75rem',
    },
}));

interface WorkflowMiniStepperProps {
    /** Current active step (0-indexed) */
    activeStep: number;
    /** Array of step labels */
    steps: string[];
}

/**
 * Workflow Mini Stepper
 * Displays workflow progress with colored indicators
 * Hidden on mobile devices
 */
export function WorkflowMiniStepper({ activeStep, steps }: WorkflowMiniStepperProps) {
    // Scale width based on number of steps: ~100px per step, min 200
    const width = Math.max(200, steps.length * 100);

    return (
        <Box sx={{ width, display: { xs: 'none', md: 'block' } }}>
            <MiniStepperStyled activeStep={activeStep} alternativeLabel>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </MiniStepperStyled>
        </Box>
    );
}
