import { useState } from 'react';
import { Box, Chip, Collapse, Divider, IconButton, Paper, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { AirtightnessStep, GasFillingBpStep } from '@entities/fsec/steps';
import { WorkflowMiniStepper } from './MiniStepper';
import { BpRubriqueItem } from './gas-workflow-components';

interface CategoryBpWorkflowCardProps {
    index: number;
    numRubriques: number;
    airtightnessStep?: AirtightnessStep;
    fillingStep?: GasFillingBpStep;
    onEditAirtightness: (step?: AirtightnessStep) => void;
    onEditFilling: (step?: GasFillingBpStep) => void;
    onDelete?: () => void;
    isDeleting?: boolean;
}

const WORKFLOW_STEPS = ['Test étanchéité BP', 'Remplissage BP'];

export function CategoryBpWorkflowCard({
    index,
    numRubriques,
    airtightnessStep,
    fillingStep,
    onEditAirtightness,
    onEditFilling,
    onDelete,
    isDeleting = false,
}: CategoryBpWorkflowCardProps) {
    const [expanded, setExpanded] = useState<boolean>(() => {
        const testComplete = Boolean(airtightnessStep?.dateOfFulfilment);
        const fillingComplete = Boolean(fillingStep?.dateOfFulfilment);
        return !(testComplete && fillingComplete);
    });

    const isTestComplete = Boolean(airtightnessStep?.dateOfFulfilment);
    const isFillingComplete = Boolean(fillingStep?.dateOfFulfilment);
    const activeStep = isTestComplete ? (isFillingComplete ? 2 : 1) : 0;
    const isComplete = isTestComplete && isFillingComplete;

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
                        Gaz BP{numRubriques > 1 ? ` n°${index + 1}` : ''}
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
                    <BpRubriqueItem
                        index={index}
                        showNumber={false}
                        airtightnessStep={airtightnessStep}
                        fillingStep={fillingStep}
                        onEditAirtightness={onEditAirtightness}
                        onEditFilling={onEditFilling}
                    />
                </Box>
            </Collapse>
        </Paper>
    );
}
