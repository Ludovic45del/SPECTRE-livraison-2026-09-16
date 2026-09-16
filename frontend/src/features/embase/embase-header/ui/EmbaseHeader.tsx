/**
 * Embase Header Component
 * @module features/embase-header
 *
 * Style: Aligned with FsecHeader / CampaignHeader
 * Displays embase header with navigation, info, edit and delete actions.
 */

import { useState, useCallback, memo } from 'react';
import { Box, Paper, Stack, IconButton, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { type Embase, useDeleteEmbase } from '@entities/embase';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { HeaderInfo } from './HeaderInfo';
import { HeaderActions } from './HeaderActions';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { motion } from '@shared/ui/motion';

interface EmbaseHeaderProps {
    embase: Embase;
    onCompare?: () => void;
    onAddEtalonnage?: (voie: 1 | 2) => void;
}

function EmbaseHeaderComponent({ embase, onCompare, onAddEtalonnage }: EmbaseHeaderProps) {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const deleteMutation = useDeleteEmbase();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleOpenDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(true);
    }, []);

    const handleCloseDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(false);
    }, []);

    const handleDelete = useCallback(async () => {
        try {
            await deleteMutation.mutateAsync(embase.uuid);
            showNotification('Embase supprimee', 'success');
            navigate('/embases');
        } catch (err) {
            showNotification(getErrorMessage(err, 'Erreur lors de la suppression'), 'error');
        }
    }, [embase.uuid, deleteMutation, showNotification, navigate]);

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
            aria-label={`En-tete de l'embase ${embase.identifier}`}
        >
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems="center"
                spacing={4}
            >
                {/* Left: Back button + Icon badge + Info */}
                <Stack direction="row" spacing={2} alignItems="center">
                    <Tooltip title="Retour aux embases">
                        <IconButton
                            onClick={() => navigate('/embases')}
                            aria-label="Retour a la liste des embases"
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
                    <HeaderInfo embase={embase} />
                </Stack>

                {/* Spacer */}
                <Box sx={{ flexGrow: 1 }} />

                {/* Right: Actions */}
                <HeaderActions
                    nombreVoies={embase.nombreVoies}
                    onAddEtalonnage={onAddEtalonnage}
                    onCompare={onCompare}
                    onDelete={handleOpenDeleteDialog}
                />
            </Stack>

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmDialog
                open={isDeleteDialogOpen}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleDelete}
                identifier={embase.identifier}
                isPending={deleteMutation.isPending}
            />
        </Paper>
    );
}

export const EmbaseHeader = memo(EmbaseHeaderComponent);
