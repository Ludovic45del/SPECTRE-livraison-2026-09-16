/**
 * Vues / photos demandées (onglet Vue/Photo, retour R08)
 * @module pages/fsec-details/tabs/components
 *
 * Champ texte libre porté par la FSEC pour noter les prises de vue à réaliser,
 * SANS avoir à créer de session photo. Édition inline (pattern
 * GeneralInfoSection) : affichage → bouton éditer → TextField multiline +
 * enregistrer / annuler. Persistance via l'action PATCH dédiée
 * `useUpdateFsecRequestedViews` (le PUT global ne touche jamais ce champ).
 */

import { memo, useCallback, useId, useState } from 'react';
import { Box, Button, Divider, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraFrontOutlinedIcon from '@mui/icons-material/PhotoCameraFrontOutlined';
import { Fsec, useUpdateFsecRequestedViews } from '@entities/fsec';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';

/** Limite alignée sur le backend (TextField max_length=4000). */
export const REQUESTED_VIEWS_MAX_LENGTH = 4000;

interface RequestedViewsSectionProps {
    fsec: Fsec;
}

function RequestedViewsSectionComponent({ fsec }: RequestedViewsSectionProps) {
    const { showNotification } = useNotification();
    const updateMutation = useUpdateFsecRequestedViews();

    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState('');
    // Id du titre visible, relié à la région (`aria-labelledby`).
    const titleId = useId();

    const currentValue = fsec.requestedViews ?? '';

    const handleEdit = useCallback(() => {
        setDraft(currentValue);
        setIsEditing(true);
    }, [currentValue]);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
        setDraft(currentValue);
    }, [currentValue]);

    const handleSave = useCallback(async () => {
        const trimmed = draft.trim();
        if (trimmed.length > REQUESTED_VIEWS_MAX_LENGTH) {
            showNotification(`Texte trop long (max ${REQUESTED_VIEWS_MAX_LENGTH} caractères)`, 'error');
            return;
        }
        try {
            await updateMutation.mutateAsync({
                versionUuid: fsec.versionUuid,
                requestedViews: trimmed || null,
            });
            showNotification('Vues demandées enregistrées', 'success');
            setIsEditing(false);
        } catch (error) {
            showNotification(getErrorMessage(error, "Erreur lors de l'enregistrement des vues demandées"), 'error');
        }
    }, [draft, fsec.versionUuid, updateMutation, showNotification]);

    const isDirty = draft.trim() !== currentValue.trim();

    return (
        // Région nommée par son titre visible (un `aria-label` sur un <div>
        // générique n'est pas exposé aux lecteurs d'écran).
        <Paper
            component="section"
            variant="outlined"
            sx={{ p: 2, borderRadius: 1, bgcolor: 'background.paper', borderColor: 'divider', position: 'relative' }}
            aria-labelledby={titleId}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <PhotoCameraFrontOutlinedIcon color="primary" />
                    <Typography id={titleId} variant="h6" fontWeight={600}>
                        Vues demandées
                    </Typography>
                </Stack>
                {!isEditing && (
                    <Tooltip title="Modifier les vues demandées">
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={handleEdit}
                            aria-label="Modifier les vues demandées"
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
            <Divider sx={{ mb: 1.5 }} />

            {isEditing ? (
                <Box>
                    <TextField
                        label="Photos / vues à réaliser"
                        placeholder="Ex. : vue de face, vue de dessus, zoom sur le scellement…"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        multiline
                        minRows={3}
                        maxRows={12}
                        size="small"
                        fullWidth
                        autoFocus
                        inputProps={{ maxLength: REQUESTED_VIEWS_MAX_LENGTH, 'aria-label': 'Vues demandées' }}
                        helperText={`${draft.length} / ${REQUESTED_VIEWS_MAX_LENGTH} caractères`}
                    />
                    <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.5 }}>
                        <Button
                            size="small"
                            onClick={handleCancel}
                            startIcon={<CloseIcon />}
                            color="inherit"
                            disabled={updateMutation.isPending}
                        >
                            Annuler
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            onClick={handleSave}
                            startIcon={<SaveIcon />}
                            disabled={updateMutation.isPending || !isDirty}
                        >
                            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                    </Stack>
                </Box>
            ) : currentValue ? (
                // `pre-wrap` : les retours à la ligne saisis (une vue par ligne) sont conservés.
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {currentValue}
                </Typography>
            ) : (
                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    Aucune vue demandée pour le moment. Cliquez sur le crayon pour noter les photos à réaliser.
                </Typography>
            )}
        </Paper>
    );
}

export const RequestedViewsSection = memo(RequestedViewsSectionComponent);
