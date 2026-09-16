/**
 * FSEC Controle Tab
 * @module pages/fsec-details/tabs
 *
 * Displays unified Metrology+Sealing control cards
 * Each "Contrôle Métrologique" = 1 Métrologie + 1 Scellement (1:1)
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
    Link,
    Paper,
    Skeleton,
    Stack,
    Typography,
} from '@mui/material';
import {
    MetrologyStep,
    SealingStep,
    getFsecRack,
    useMetrologyStepsByFsec,
    useSealingStepByMetrology,
    useCreateSealingStep,
} from '@entities/fsec/steps';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import dayjs from 'dayjs';
import { MetrologyStepModal } from '@features/fsec/edit-metrology';
import { SealingStepModal } from '@features/fsec/edit-sealing';
import { UserChip, UserChipList } from '@entities/user';
import { MachineChipList } from '@entities/material';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { WorkflowMiniStepper } from './components/MiniStepper';

interface ControleTabProps {
    fsecVersionId: string;
}

const WORKFLOW_STEPS = ['Métrologie', 'Scellement', 'Vérif. scellement'];

// ============ File link (cliquable, supporte URL HTTP et chemin UNC) ============

function FileLinkCell({ label, value }: { label: string; value: string | null }) {
    return (
        <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {label}
            </Typography>
            {value ? (
                <Link
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    variant="body2"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, wordBreak: 'break-all' }}
                >
                    {value}
                    <OpenInNewIcon fontSize="inherit" />
                </Link>
            ) : (
                <Typography variant="body2" fontWeight="medium">
                    -
                </Typography>
            )}
        </>
    );
}

// ============ Unified Control Card ============

function ControleMetrologiqueCard({
    metrologyStep,
    index,
    onEditMetrology,
    onEditSealing,
}: {
    metrologyStep: MetrologyStep;
    index: number;
    onEditMetrology: () => void;
    onEditSealing: (sealing: SealingStep | null) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const { data: sealingStep } = useSealingStepByMetrology(metrologyStep.uuid);
    const createSealingMutation = useCreateSealingStep();
    const { showNotification } = useNotification();

    const isMetrologyComplete = Boolean(metrologyStep.date);
    const isSealingComplete = Boolean(sealingStep?.date);
    const isVerificationDone = Boolean(sealingStep?.verificationStatus);
    // Vérification renseignée (OK ou NOK) = les 3 étapes sont passées ; sinon logique date.
    const activeStep = isVerificationDone ? 3 : isMetrologyComplete ? (isSealingComplete ? 2 : 1) : 0;

    const handleCreateSealing = async () => {
        try {
            await createSealingMutation.mutateAsync({
                metrologyStepId: metrologyStep.uuid,
            });
            showNotification('Scellement créé', 'success');
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la création du scellement'), 'error');
        }
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                borderRadius: 1,
                bgcolor: 'background.paper',
                borderColor: isSealingComplete ? 'success.main' : 'divider',
                borderWidth: isSealingComplete ? 2 : 1,
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
                        Contrôle Métrologique n°{index + 1}
                    </Typography>
                    {isSealingComplete && <Chip label="Complet" color="success" />}
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <WorkflowMiniStepper activeStep={activeStep} steps={WORKFLOW_STEPS} />
                    <IconButton size="small">{expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                </Stack>
            </Box>

            <Collapse in={expanded}>
                <Divider />
                <Box sx={{ p: 3 }}>
                    <Stack spacing={3}>
                        {/* Métrologie Section */}
                        <Box>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        Métrologie
                                    </Typography>
                                    {isMetrologyComplete && <Chip label="Fait" color="success" />}
                                </Stack>
                                <IconButton size="small" onClick={onEditMetrology} color="primary">
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                            <Grid container spacing={2}>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Date
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {metrologyStep.date ? dayjs(metrologyStep.date).format('DD/MM/YYYY') : '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        {metrologyStep.metrologistUserUuids.length > 1 ? 'Métrologues' : 'Métrologue'}
                                    </Typography>
                                    <Box>
                                        <UserChipList
                                            uuids={metrologyStep.metrologistUserUuids}
                                            fallbackText={metrologyStep.metrologistName}
                                        />
                                    </Box>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography variant="caption" color="text.secondary">
                                        Rack
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        {getFsecRack(metrologyStep.rackId)?.label ?? '-'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: 'block', mb: 0.5 }}
                                    >
                                        Machines B2
                                    </Typography>
                                    <MachineChipList uuids={metrologyStep.machineUuids} roomCode="B2" emptyText="-" />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FileLinkCell label="Fichier métro .txt" value={metrologyStep.metroFileLink} />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FileLinkCell label="Visrad réalisé" value={metrologyStep.visradLink} />
                                </Grid>
                            </Grid>
                            {metrologyStep.comments && (
                                <Box sx={{ mt: 1.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Commentaires
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                        {metrologyStep.comments}
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        <Divider />

                        {/* Scellement Section */}
                        <Box>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        Scellement
                                    </Typography>
                                    {isSealingComplete && <Chip label="Fait" color="success" />}
                                    {sealingStep?.verificationStatus && (
                                        <Chip
                                            label={
                                                sealingStep.verificationStatus === 'OK'
                                                    ? 'Vérification OK'
                                                    : 'Vérification NOK'
                                            }
                                            color={sealingStep.verificationStatus === 'OK' ? 'success' : 'error'}
                                        />
                                    )}
                                </Stack>
                                {sealingStep ? (
                                    <IconButton size="small" onClick={() => onEditSealing(sealingStep)} color="primary">
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                ) : (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={handleCreateSealing}
                                        disabled={createSealingMutation.isPending}
                                    >
                                        {createSealingMutation.isPending ? '...' : 'Ajouter'}
                                    </Button>
                                )}
                            </Stack>
                            {sealingStep ? (
                                <>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6} md={3}>
                                            <Typography variant="caption" color="text.secondary">
                                                Date
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {sealingStep.date ? dayjs(sealingStep.date).format('DD/MM/YYYY') : '-'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <Typography variant="caption" color="text.secondary">
                                                Métrologue
                                            </Typography>
                                            <Box>
                                                <UserChip
                                                    userUuid={sealingStep.metrologistUserUuid}
                                                    fallbackText={sealingStep.metrologistName}
                                                />
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <Typography variant="caption" color="text.secondary">
                                                Rack
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {getFsecRack(sealingStep.rackId)?.label ?? '-'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6} md={3}>
                                            <Typography variant="caption" color="text.secondary">
                                                Interface I0
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {sealingStep.interfaceIo || '-'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                    {sealingStep.comments && (
                                        <Box sx={{ mt: 1.5 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Commentaires
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                                {sealingStep.comments}
                                            </Typography>
                                        </Box>
                                    )}
                                    {sealingStep.verificationRemark && (
                                        <Box sx={{ mt: 1.5 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Remarque de vérification
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                                {sealingStep.verificationRemark}
                                            </Typography>
                                        </Box>
                                    )}
                                </>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    Pas encore de scellement
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}

function EmptyControleCard({ onAdd }: { onAdd: () => void }) {
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
                Ajouter un contrôle
            </Button>
        </Paper>
    );
}

// ============ Main Component ============

export function ControleTab({ fsecVersionId }: ControleTabProps) {
    const { data: metrologySteps, isLoading } = useMetrologyStepsByFsec(fsecVersionId);
    // Metrology modal state
    const [metrologyModalOpen, setMetrologyModalOpen] = useState(false);
    const [selectedMetrologyStep, setSelectedMetrologyStep] = useState<MetrologyStep | null>(null);

    // Sealing modal state
    const [sealingModalOpen, setSealingModalOpen] = useState(false);
    const [selectedSealingStep, setSelectedSealingStep] = useState<SealingStep | null>(null);
    const [selectedMetrologyIdForSealing, setSelectedMetrologyIdForSealing] = useState<string>('');

    // Metrology handlers
    const handleAddMetrology = () => {
        setSelectedMetrologyStep(null);
        setMetrologyModalOpen(true);
    };

    const handleEditMetrology = (step: MetrologyStep) => {
        setSelectedMetrologyStep(step);
        setMetrologyModalOpen(true);
    };

    const handleCloseMetrologyModal = () => {
        setMetrologyModalOpen(false);
        setSelectedMetrologyStep(null);
    };

    // Sealing handlers
    const handleEditSealing = (metrologyId: string, sealing: SealingStep | null) => {
        setSelectedMetrologyIdForSealing(metrologyId);
        setSelectedSealingStep(sealing);
        setSealingModalOpen(true);
    };

    const handleCloseSealingModal = () => {
        setSealingModalOpen(false);
        setSelectedSealingStep(null);
        setSelectedMetrologyIdForSealing('');
    };

    return (
        <Box>
            <Stack spacing={3}>
                {isLoading ? (
                    <Skeleton variant="rounded" height={120} sx={{ borderRadius: 1 }} />
                ) : metrologySteps?.length ? (
                    <>
                        {metrologySteps.map((step, index) => (
                            <ControleMetrologiqueCard
                                key={step.uuid}
                                metrologyStep={step}
                                index={index}
                                onEditMetrology={() => handleEditMetrology(step)}
                                onEditSealing={(sealing) => handleEditSealing(step.uuid, sealing)}
                            />
                        ))}
                        <Box>
                            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddMetrology}>
                                Ajouter un contrôle métrologique
                            </Button>
                        </Box>
                    </>
                ) : (
                    <EmptyControleCard onAdd={handleAddMetrology} />
                )}
            </Stack>

            {/* Modals */}
            <MetrologyStepModal
                open={metrologyModalOpen}
                onClose={handleCloseMetrologyModal}
                fsecVersionId={fsecVersionId}
                step={selectedMetrologyStep}
            />

            <SealingStepModal
                open={sealingModalOpen}
                onClose={handleCloseSealingModal}
                metrologyStepId={selectedMetrologyIdForSealing}
                step={selectedSealingStep}
            />
        </Box>
    );
}
