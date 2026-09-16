/**
 * FSEC Pictures Tab
 * @module pages/fsec-details/tabs
 *
 * Affiche la session photo (opérateur, date, commentaires) — une seule par FSEC.
 * Dès qu'une session existe, le chemin du dossier photo réseau est affiché et
 * copiable. Le chemin est construit à partir de la campagne et de la racine UNC
 * configurable (ENV.PHOTO_FOLDER_ROOT) ; il n'y a plus de liens saisis manuellement.
 */

import { useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Divider,
    Grid,
    IconButton,
    Paper,
    Skeleton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import dayjs from 'dayjs';
import { PicturesStep, usePicturesStepsByFsec, useCreatePicturesStep } from '@entities/fsec/steps';
import { useFsec } from '@entities/fsec';
import { useCampaign } from '@entities/campaign';
import { PicturesSessionModal } from '@features/fsec/edit-pictures';
import { UserChip } from '@entities/user';
import { useNotification } from '@shared/ui';
import { copyToClipboard, getErrorMessage } from '@shared/lib';
import { ENV } from '@shared/config/env';
import { RequestedViewsSection } from './components/RequestedViewsSection';

const slugify = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();

/**
 * Construit le chemin UNC du dossier photo réseau de la FSEC.
 * Racine configurable via ENV.PHOTO_FOLDER_ROOT (VITE_PHOTO_FOLDER_ROOT).
 * Ex : \\serveur\photos\ma_campagne\2026\installation_a\photos
 */
function buildPhotoFolderPath(
    campaignName: string | null | undefined,
    year: number | null | undefined,
    installationLabel: string | null | undefined,
): string {
    const segments = [
        campaignName ? slugify(campaignName) : 'campagne',
        year ?? 'annee',
        installationLabel ? slugify(installationLabel) : 'installation',
        'photos',
    ];
    const root = ENV.PHOTO_FOLDER_ROOT.replace(/[\\/]+$/, '');
    return [root, ...segments].join('\\');
}

interface PicturesTabProps {
    fsecVersionId: string;
}

// ============ Session Card ============

function SessionCard({
    picturesStep,
    onEdit,
    onCreate,
    isCreating,
    folderPath,
}: {
    picturesStep: PicturesStep | null;
    onEdit: () => void;
    onCreate: () => void;
    isCreating: boolean;
    folderPath: string | null;
}) {
    const { showNotification } = useNotification();
    const hasSession = Boolean(picturesStep);
    const isComplete = Boolean(picturesStep?.operator && picturesStep?.date);

    if (!hasSession) {
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
                <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate} disabled={isCreating}>
                    {isCreating ? 'Création...' : 'Créer une session photo'}
                </Button>
            </Paper>
        );
    }

    const handleCopyFolder = () => {
        if (!folderPath) return;
        // copyToClipboard gère le repli hors contexte sécurisé ; on attend le
        // résultat au lieu d'afficher un succès aveugle.
        void copyToClipboard(folderPath).then((copied) => {
            if (copied) {
                showNotification('Chemin du dossier copié !', 'success');
            } else {
                showNotification('Impossible de copier le chemin', 'error');
            }
        });
    };

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
            <Box sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <CameraAltIcon color="primary" />
                        <Typography variant="h6" fontWeight={600}>
                            Session Photo
                        </Typography>
                        {isComplete && <Chip label="Complet" color="success" />}
                    </Stack>
                    <IconButton size="small" onClick={onEdit} color="primary">
                        <EditIcon fontSize="small" />
                    </IconButton>
                </Stack>

                <Grid container spacing={2}>
                    <Grid item xs={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                            Opérateur
                        </Typography>
                        <Box>
                            <UserChip userUuid={picturesStep?.operatorUserUuid} fallbackText={picturesStep?.operator} />
                        </Box>
                    </Grid>
                    <Grid item xs={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                            Date de réalisation
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                            {picturesStep?.date ? dayjs(picturesStep.date).format('DD/MM/YYYY') : '-'}
                        </Typography>
                    </Grid>
                </Grid>

                {picturesStep?.comments && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            Commentaires
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            {picturesStep.comments}
                        </Typography>
                    </Box>
                )}

                {/* Chemin du dossier photo réseau — affiché et copiable dès que la
                    session existe (chemin UNC construit automatiquement). */}
                {folderPath && (
                    <Box sx={{ mt: 2 }}>
                        <Divider sx={{ mb: 1.5 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Dossier photo
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography
                                variant="body2"
                                sx={{ wordBreak: 'break-all', fontFamily: 'monospace', flexGrow: 1 }}
                            >
                                {folderPath}
                            </Typography>
                            <Tooltip title="Copier le chemin" arrow>
                                <IconButton size="small" onClick={handleCopyFolder}>
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </Box>
                )}
            </Box>
        </Paper>
    );
}

// ============ Main Component ============

export function PicturesTab({ fsecVersionId }: PicturesTabProps) {
    const { data: picturesSteps, isLoading: isLoadingSession } = usePicturesStepsByFsec(fsecVersionId);
    const { data: fsec } = useFsec(fsecVersionId);
    const { data: campaign } = useCampaign(fsec?.campaignId ?? '');

    // Session modal state
    const [sessionModalOpen, setSessionModalOpen] = useState(false);

    // Get the first (and only) pictures step for this FSEC
    const picturesStep = picturesSteps?.[0] ?? null;

    // Create session mutation (for empty state)
    const createSessionMutation = useCreatePicturesStep();
    const { showNotification } = useNotification();

    // Chemin du dossier photo réseau (disponible dès que la campagne est chargée).
    const folderPath = campaign
        ? buildPhotoFolderPath(campaign.name, campaign.year, campaign.installation?.label)
        : null;

    const handleCreateSession = async () => {
        try {
            await createSessionMutation.mutateAsync({
                fsecVersionId,
            });
            showNotification('Session photo créée', 'success');
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la création de la session'), 'error');
        }
    };

    const handleEditSession = () => {
        setSessionModalOpen(true);
    };

    const handleCloseSessionModal = () => {
        setSessionModalOpen(false);
    };

    return (
        <Box>
            <Stack spacing={3}>
                {/* Vues demandées (R08) : éditable même sans session photo,
                    dès que le FSEC est chargé. */}
                {fsec ? (
                    <RequestedViewsSection fsec={fsec} />
                ) : (
                    <Skeleton variant="rounded" height={120} sx={{ borderRadius: 1 }} />
                )}

                {/* Session Photo Card */}
                {isLoadingSession ? (
                    <Skeleton variant="rounded" height={140} sx={{ borderRadius: 1 }} />
                ) : (
                    <SessionCard
                        picturesStep={picturesStep}
                        onEdit={handleEditSession}
                        onCreate={handleCreateSession}
                        isCreating={createSessionMutation.isPending}
                        folderPath={folderPath}
                    />
                )}
            </Stack>

            {/* Modal session */}
            <PicturesSessionModal
                open={sessionModalOpen}
                onClose={handleCloseSessionModal}
                fsecVersionId={fsecVersionId}
                step={picturesStep}
            />
        </Box>
    );
}
