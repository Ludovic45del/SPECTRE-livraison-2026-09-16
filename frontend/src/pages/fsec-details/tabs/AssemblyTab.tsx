/**
 * FSEC Assembly Tab
 * @module pages/fsec-details/tabs
 *
 * Style: Aligned with Campaign style
 */

import { useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Collapse,
    Divider,
    Grid,
    IconButton,
    Paper,
    Skeleton,
    Stack,
    Typography,
} from '@mui/material';
import { AssemblyStep, useAssemblyStepsByFsec } from '@entities/fsec/steps';
import { Fsec } from '@entities/fsec';
import { AssemblyPlanSection } from '@features/fsec/edit-assembly-plan';
import { UserChipList } from '@entities/user';
import { MachineChipList } from '@entities/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import dayjs from 'dayjs';
import { AssemblyStepModal } from '@features/fsec/edit-assembly';
import { AssemblyItemsSection } from '@features/fsec/link-stock-elements';
import { WorkflowMiniStepper } from './components/MiniStepper';

/**
 * ID du statut FSEC "Tirée" (cf. backend `FSEC_STATUS_ID_TIREE`, CDC §4.3).
 * Quand la FSEC atteint ce statut, le tableau récap des éléments est verrouillé.
 */
const FSEC_STATUS_ID_TIREE = 7;

interface AssemblyTabProps {
    /** FSEC courant : porte version_uuid, fsec_uuid, statut, plan d'assemblage… */
    fsec: Fsec;
}

const ASSEMBLY_WORKFLOW_STEPS = ["Début d'assemblage", "Fin d'assemblage"];

function AssemblyStepCard({ step, index, onEdit }: { step: AssemblyStep; index: number; onEdit: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const isStartComplete = Boolean(step.startDate);
    const isEndComplete = Boolean(step.endDate);
    const activeStep = isStartComplete ? (isEndComplete ? 2 : 1) : 0;

    return (
        <Paper
            variant="outlined"
            sx={{
                borderRadius: 1,
                bgcolor: 'background.paper',
                borderColor: isEndComplete ? 'success.main' : 'divider',
                borderWidth: isEndComplete ? 2 : 1,
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h6" fontWeight={600}>
                        Assemblage n°{index + 1}
                    </Typography>
                    {isEndComplete && <Chip label="Complet" color="success" />}
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <WorkflowMiniStepper activeStep={activeStep} steps={ASSEMBLY_WORKFLOW_STEPS} />
                    <IconButton size="small">{expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                </Stack>
            </Box>

            <Collapse in={expanded}>
                <Divider />
                <Box sx={{ p: 3, position: 'relative' }}>
                    <IconButton
                        size="small"
                        onClick={onEdit}
                        color="primary"
                        sx={{ position: 'absolute', top: 12, right: 12 }}
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Date de début
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                                {step.startDate ? dayjs(step.startDate).format('DD/MM/YYYY') : '-'}
                            </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Date de fin
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                                {step.endDate ? dayjs(step.endDate).format('DD/MM/YYYY') : '-'}
                            </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary">
                                {step.operatorUserUuids.length > 1 ? 'Assembleurs' : 'Assembleur'}
                            </Typography>
                            <UserChipList uuids={step.operatorUserUuids} fallbackText={step.operator} />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Machines B1
                            </Typography>
                            <MachineChipList uuids={step.machineUuids} roomCode="B1" emptyText="-" />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Commentaires
                            </Typography>
                            <Typography variant="body1">{step.comments || 'Aucun commentaire'}</Typography>
                        </Grid>
                    </Grid>
                </Box>
            </Collapse>
        </Paper>
    );
}

function EmptyAssemblyCard({ onAdd }: { onAdd: () => void }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 4,
                borderRadius: 1,
                bgcolor: 'background.paper',
                borderColor: 'divider',
                textAlign: 'center',
            }}
        >
            <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
                Ajouter un assemblage
            </Button>
        </Paper>
    );
}

export function AssemblyTab({ fsec }: AssemblyTabProps) {
    const fsecVersionId = fsec.versionUuid;
    const fsecUuid = fsec.fsecUuid;
    const fsecStatusId = fsec.statusId ?? 0;
    const { data: assemblySteps, isLoading } = useAssemblyStepsByFsec(fsecVersionId);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedStep, setSelectedStep] = useState<AssemblyStep | null>(null);

    const handleAdd = () => {
        setSelectedStep(null);
        setModalOpen(true);
    };

    const handleEdit = (step: AssemblyStep) => {
        setSelectedStep(step);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedStep(null);
    };

    const isFsecLocked = fsecStatusId === FSEC_STATUS_ID_TIREE;

    return (
        <Box>
            <Stack spacing={3}>
                <AssemblyItemsSection fsecUuid={fsecUuid} isLocked={isFsecLocked} />

                <Paper variant="outlined" sx={{ borderRadius: 1, bgcolor: 'background.paper', overflow: 'hidden' }}>
                    <AssemblyPlanSection
                        versionUuid={fsecVersionId}
                        imageUrl={fsec.assemblyPlanImage}
                        annotations={fsec.assemblyPlanAnnotations}
                    />
                </Paper>

                {isLoading ? (
                    <Skeleton variant="rounded" height={120} sx={{ borderRadius: 1 }} />
                ) : assemblySteps?.length ? (
                    <>
                        {assemblySteps.map((step, index) => (
                            <AssemblyStepCard
                                key={step.uuid}
                                step={step}
                                index={index}
                                onEdit={() => handleEdit(step)}
                            />
                        ))}
                        <Box>
                            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAdd}>
                                Ajouter un assemblage
                            </Button>
                        </Box>
                    </>
                ) : (
                    <EmptyAssemblyCard onAdd={handleAdd} />
                )}
            </Stack>

            <AssemblyStepModal
                open={modalOpen}
                onClose={handleCloseModal}
                fsecVersionId={fsecVersionId}
                step={selectedStep}
            />
        </Box>
    );
}
