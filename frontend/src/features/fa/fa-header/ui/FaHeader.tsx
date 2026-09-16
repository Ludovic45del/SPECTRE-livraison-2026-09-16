/**
 * FA Header Component
 * @module features/fa/fa-header
 *
 * Displays FA header with navigation, info and workflow stepper.
 */

import { useState, useCallback, useMemo, memo } from 'react';
import { Box, Paper, Stack, Typography, IconButton, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

import { useNotification } from '@shared/ui';

import { Fa, useDeleteFa, getCriticalityInfo } from '@entities/fa';
import { useFsec } from '@entities/fsec';
import { useCampaign } from '@entities/campaign';
import { paths } from '@shared/config';

import { DataChip } from '@widgets/data-chip';

import { FaWorkflowStepper } from './FaWorkflowStepper';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { motion } from '@shared/ui/motion';

dayjs.locale('fr');

interface FaHeaderProps {
    fa: Fa;
}

function FaHeaderComponent({ fa }: FaHeaderProps) {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const deleteMutation = useDeleteFa();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Fetch FSEC and campaign data
    const { data: fsec } = useFsec(fa.fsecVersionId ?? '');
    const { data: campaign } = useCampaign(fsec?.campaignId ?? '');

    // Memoized computed values
    const criticalityInfo = useMemo(() => getCriticalityInfo(fa.criticalityId), [fa.criticalityId]);

    const formattedLastUpdated = useMemo(() => {
        if (!fa.lastUpdated) return null;
        return dayjs(fa.lastUpdated).format('DD/MM/YYYY');
    }, [fa.lastUpdated]);

    const formattedCampaignName = useMemo(() => {
        if (!campaign) return '';
        const installationLabel = campaign.installation?.label ?? 'UNK';
        return `${campaign.year}-${installationLabel}_${campaign.name}`;
    }, [campaign]);

    // Memoized handlers
    const handleOpenDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(true);
    }, []);

    const handleCloseDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(false);
    }, []);

    const handleDelete = useCallback(async () => {
        try {
            await deleteMutation.mutateAsync(fa.uuid);
            showNotification("Fiche d'Anomalie supprimée", 'success');
            navigate('/fas');
        } catch {
            showNotification('Erreur lors de la suppression', 'error');
        }
    }, [fa.uuid, deleteMutation, showNotification, navigate]);

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
            aria-label={`En-tête de la FA ${fa.identifier}`}
        >
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems="center"
                spacing={4}
            >
                {/* Left: Back button + Circle icon + FA info */}
                <Box sx={{ minWidth: 300 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Tooltip title="Retour aux FAs">
                            <IconButton
                                onClick={() => navigate('/fas')}
                                aria-label="Retour à la liste des FAs"
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
                        </Tooltip>
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                border: '3px solid',
                                borderColor: 'warning.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <Typography
                                sx={{
                                    color: 'warning.main',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                }}
                            >
                                FA
                            </Typography>
                        </Box>
                        <Stack spacing={0.5}>
                            {/* Tags at top */}
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                                {campaign?.type && (
                                    <DataChip
                                        label={campaign.type.label}
                                        color={campaign.type.color}
                                        sx={{ height: 24, fontSize: '0.75rem' }}
                                    />
                                )}
                                {campaign?.installation && (
                                    <DataChip
                                        label={campaign.installation.label}
                                        color={campaign.installation.color ?? '#E91E63'}
                                        sx={{ height: 24, fontSize: '0.75rem' }}
                                    />
                                )}
                                {fa.criticalityId != null && (
                                    <DataChip
                                        label={criticalityInfo.label}
                                        color={criticalityInfo.color}
                                        sx={{ height: 24, fontSize: '0.75rem' }}
                                    />
                                )}
                            </Stack>
                            {/* FA identifier */}
                            <Typography variant="h4" fontWeight="bold" component="h1">
                                {fa.identifier}
                            </Typography>
                            {/* Parent breadcrumb links */}
                            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                                {fsec && (
                                    <Box
                                        component={Link}
                                        to={paths.fsec.tab(fsec.slug, 'overview')}
                                        sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            px: 1.5,
                                            py: 0.25,
                                            borderRadius: '100px',
                                            bgcolor: 'action.hover',
                                            color: 'text.secondary',
                                            textDecoration: 'none',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            transition: `all ${motion.fast}`,
                                            '&:hover': {
                                                bgcolor: 'primary.50',
                                                color: 'primary.main',
                                            },
                                        }}
                                    >
                                        FSEC : {fsec.displayName}
                                    </Box>
                                )}
                                {campaign && (
                                    <Box
                                        component={Link}
                                        to={paths.campaign.tab(campaign.slug, 'overview')}
                                        sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            px: 1.5,
                                            py: 0.25,
                                            borderRadius: '100px',
                                            bgcolor: 'action.hover',
                                            color: 'text.secondary',
                                            textDecoration: 'none',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            transition: `all ${motion.fast}`,
                                            '&:hover': {
                                                bgcolor: 'primary.50',
                                                color: 'primary.main',
                                            },
                                        }}
                                    >
                                        Campagne : {formattedCampaignName}
                                    </Box>
                                )}
                            </Stack>
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
                <Box sx={{ flexGrow: 1, maxWidth: 500 }} role="navigation" aria-label="Workflow de la FA">
                    <FaWorkflowStepper fa={fa} />
                </Box>

                {/* Right: Actions */}
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Supprimer la FA">
                        <IconButton
                            onClick={handleOpenDeleteDialog}
                            aria-label="Supprimer la FA"
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

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmDialog
                open={isDeleteDialogOpen}
                identifier={fa.identifier}
                isPending={deleteMutation.isPending}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleDelete}
            />
        </Paper>
    );
}

export const FaHeader = memo(FaHeaderComponent);
