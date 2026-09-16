/**
 * Campaign Header Feature
 * @module features/campaign-header
 *
 * Displays campaign header with navigation, info, workflow stepper and delete action.
 * Optimized with React.memo, useCallback and useMemo for performance.
 */

import { useState, useCallback, useMemo, memo } from 'react';
import {
    Box,
    Typography,
    Paper,
    Stack,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import { CampaignWithRelations, useDeleteCampaign } from '@entities/campaign';
import { GenerateRecapSheetModal } from '@features/campaign/generate-recap-sheet';
import { CreateFaModal, useCreateFaStore } from '@features/fa';
import { CreateFsecModal, useCreateFsecStore } from '@features/fsec/create-fsec';
import { DataChip } from '@widgets/data-chip';
import { WorkflowStepper } from './WorkflowStepper';
import { useNotification } from '@shared/ui';
import { formatSemesterPeriod, getErrorMessage } from '@shared/lib';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { motion } from '@shared/ui/motion';

dayjs.locale('fr');

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CampaignHeaderProps {
    campaign: CampaignWithRelations;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

function CampaignHeaderComponent({ campaign }: CampaignHeaderProps) {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const deleteMutation = useDeleteCampaign();
    const openCreateFsec = useCreateFsecStore((state) => state.open);
    const openCreateFa = useCreateFaStore((state) => state.open);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isRecapSheetOpen, setIsRecapSheetOpen] = useState(false);

    // Memoized computed values
    const formattedName = useMemo(() => {
        const installationLabel = campaign.installation?.label ?? 'UNK';
        return `${campaign.year}-${installationLabel}_${campaign.name.toUpperCase()}`;
    }, [campaign.year, campaign.installation?.label, campaign.name]);

    const formattedLastUpdated = useMemo(() => {
        if (!campaign.lastUpdated) return null;
        return dayjs(campaign.lastUpdated).format('DD/MM/YYYY');
    }, [campaign.lastUpdated]);

    // Période d'activité réelle (startDate→endDate, ex. '2026-S2/2027-S1') ;
    // une borne manquante (campagne en cours) est présumée égale au semestre
    // d'attribution year+semester, fallback complet si aucune date.
    const periodLabel = useMemo(
        () => formatSemesterPeriod(campaign.startDate, campaign.endDate, campaign.year, campaign.semester),
        [campaign.startDate, campaign.endDate, campaign.year, campaign.semester],
    );

    // Memoized handlers
    const handleAddFsec = useCallback(() => {
        openCreateFsec(campaign.uuid);
    }, [openCreateFsec, campaign.uuid]);

    const handleAddFa = useCallback(() => {
        openCreateFa(undefined, campaign.uuid);
    }, [openCreateFa, campaign.uuid]);

    const handleOpenDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(true);
    }, []);

    const handleCloseDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(false);
    }, []);

    const handleDelete = useCallback(async () => {
        try {
            await deleteMutation.mutateAsync(campaign.uuid);
            showNotification('Campagne supprimée', 'success');
            navigate('/campagnes');
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la suppression'), 'error');
        }
    }, [campaign.uuid, deleteMutation, showNotification, navigate]);

    return (
        <Paper
            component="header"
            variant="outlined"
            sx={{
                p: 3,
                borderRadius: 1,
                bgcolor: 'background.paper',
                borderColor: 'divider',
            }}
            role="banner"
            aria-label={`En-tête de la campagne ${formattedName}`}
        >
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems="center"
                spacing={4}
            >
                {/* Left: Back button + C icon + Campaign info */}
                <Box sx={{ minWidth: 300 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <IconButton
                            component={Link}
                            to="/campagnes"
                            aria-label="Retour à la liste des campagnes"
                            sx={{
                                width: 40,
                                height: 40,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: '50%',
                                bgcolor: 'background.paper',
                                color: 'text.secondary',
                                transition: `all ${motion.base}`,
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                    borderColor: 'primary.main',
                                    color: 'primary.main',
                                    transform: 'translateX(-2px)',
                                },
                            }}
                        >
                            <ArrowBackIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                border: '3px solid',
                                borderColor: 'primary.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <Typography
                                sx={{
                                    color: 'primary.main',
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                }}
                            >
                                C
                            </Typography>
                        </Box>
                        <Stack spacing={0.5}>
                            {/* Tags at top */}
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                                {campaign.status && (
                                    <DataChip
                                        label={campaign.status.label}
                                        color={campaign.status.color}
                                        sx={{ height: 24, fontSize: '0.75rem' }}
                                    />
                                )}
                                {campaign.type && (
                                    <DataChip
                                        label={campaign.type.label}
                                        color={campaign.type.color}
                                        sx={{ height: 24, fontSize: '0.75rem' }}
                                    />
                                )}
                                {campaign.installation && (
                                    <DataChip
                                        label={campaign.installation.label}
                                        color={campaign.installation.color ?? '#E91E63'}
                                        sx={{ height: 24, fontSize: '0.75rem' }}
                                    />
                                )}
                                <DataChip
                                    label={campaign.semester}
                                    color="#6B7280"
                                    sx={{ height: 24, fontSize: '0.75rem' }}
                                />
                                {/* Période semestrielle d'activité (dérivée des dates). */}
                                <DataChip
                                    label={periodLabel}
                                    color="#6B7280"
                                    sx={{ height: 24, fontSize: '0.75rem' }}
                                />
                            </Stack>
                            {/* Campaign name */}
                            <Typography variant="h4" fontWeight="bold" component="h1">
                                {formattedName}
                            </Typography>
                            {/* Last modification date below */}
                            {formattedLastUpdated && (
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Dernière modification effectuée le {formattedLastUpdated}
                                </Typography>
                            )}
                        </Stack>
                    </Stack>
                </Box>

                {/* Center: Workflow Stepper */}
                <Box sx={{ flexGrow: 1, maxWidth: 600 }} role="navigation" aria-label="Workflow de la campagne">
                    <WorkflowStepper campaign={campaign} />
                </Box>

                {/* Right: Actions (ajout FSEC/FA + fiche récap livraison + suppression) */}
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Ajouter une FSEC à cette campagne">
                        <IconButton
                            onClick={handleAddFsec}
                            aria-label="Ajouter une FSEC à cette campagne"
                            sx={{
                                width: 40,
                                height: 40,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: '50%',
                                bgcolor: 'background.paper',
                                color: 'text.secondary',
                                transition: `all ${motion.base}`,
                                '&:hover': {
                                    bgcolor: 'primary.50',
                                    borderColor: 'primary.main',
                                    color: 'primary.main',
                                },
                            }}
                        >
                            <NoteAddOutlinedIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Ajouter une FA à cette campagne">
                        <IconButton
                            onClick={handleAddFa}
                            aria-label="Ajouter une FA à cette campagne"
                            sx={{
                                width: 40,
                                height: 40,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: '50%',
                                bgcolor: 'background.paper',
                                color: 'text.secondary',
                                transition: `all ${motion.base}`,
                                '&:hover': {
                                    bgcolor: 'primary.50',
                                    borderColor: 'primary.main',
                                    color: 'primary.main',
                                },
                            }}
                        >
                            <PostAddOutlinedIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Générer la fiche de livraison récapitulative">
                        <IconButton
                            onClick={() => setIsRecapSheetOpen(true)}
                            aria-label="Générer la fiche de livraison récapitulative"
                            sx={{
                                width: 40,
                                height: 40,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: '50%',
                                bgcolor: 'background.paper',
                                color: 'text.secondary',
                                transition: `all ${motion.base}`,
                                '&:hover': {
                                    bgcolor: 'primary.50',
                                    borderColor: 'primary.main',
                                    color: 'primary.main',
                                },
                            }}
                        >
                            <PictureAsPdfOutlinedIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer la campagne">
                        <IconButton
                            onClick={handleOpenDeleteDialog}
                            aria-label="Supprimer la campagne"
                            sx={{
                                width: 40,
                                height: 40,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: '50%',
                                bgcolor: 'background.paper',
                                color: 'text.secondary',
                                transition: `all ${motion.base}`,
                                '&:hover': {
                                    bgcolor: 'error.lighter',
                                    borderColor: 'error.main',
                                    color: 'error.main',
                                },
                            }}
                        >
                            <DeleteOutlineIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            <GenerateRecapSheetModal
                open={isRecapSheetOpen}
                onClose={() => setIsRecapSheetOpen(false)}
                campaign={campaign}
            />

            {/* Création FSEC / FA pré-rattachée à la campagne courante */}
            <CreateFsecModal />
            <CreateFaModal />

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={isDeleteDialogOpen}
                onClose={handleCloseDeleteDialog}
                maxWidth="xs"
                fullWidth
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
            >
                <DialogTitle id="delete-dialog-title">Supprimer la campagne</DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        Êtes-vous sûr de vouloir supprimer la campagne <strong>{campaign.name}</strong> ? Cette action
                        est irréversible.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={handleCloseDeleteDialog} color="inherit">
                        Annuler
                    </Button>
                    <Button
                        onClick={handleDelete}
                        variant="contained"
                        color="error"
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export with memo for performance optimization
// ─────────────────────────────────────────────────────────────────────────────

export const CampaignHeader = memo(CampaignHeaderComponent);
