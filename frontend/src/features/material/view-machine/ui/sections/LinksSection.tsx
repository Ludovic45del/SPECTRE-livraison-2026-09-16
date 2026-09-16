/**
 * LinksSection — liens documentaires d'une machine, éditables inline.
 * @module features/material/view-machine
 *
 * View mode : liste de liens cliquables.
 * Edit mode : champs label/url ajoutables/supprimables (useFieldArray).
 */

import { memo, useCallback, useState } from 'react';
import { Box, Button, Grid2, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type Machine, useUpdateMachine } from '@entities/material';
import { useNotification } from '@shared/ui';
import { copyToClipboard, getErrorMessage } from '@shared/lib';
import { FormActions } from '@pages/campaign-details/overview/components/FormActions';
import { EDIT_BUTTON_SX, PAPER_BASE_SX } from '../styles';
import { machineToInput } from '../helpers';

const linkSchema = z.object({
    label: z.string().min(1, 'Libellé requis'),
    // Texte libre — généralement un chemin réseau / Explorateur Windows.
    // Pas de validation de format : on stocke tel quel pour le copier-coller.
    url: z.string().min(1, 'Chemin requis'),
});

const formSchema = z.object({
    links: z.array(linkSchema),
});

type LinksForm = z.infer<typeof formSchema>;

interface LinksSectionProps {
    machine: Machine;
}

export const LinksSection = memo(function LinksSection({ machine }: LinksSectionProps) {
    const { showNotification } = useNotification();
    const updateMutation = useUpdateMachine();
    const [isEditing, setIsEditing] = useState(false);

    const { control, handleSubmit, reset } = useForm<LinksForm>({
        mode: 'onBlur',
        resolver: zodResolver(formSchema),
        defaultValues: {
            links: machine.links.map((l) => ({ label: l.label, url: l.url })),
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'links' });

    const startEditing = useCallback(() => {
        reset({
            links: machine.links.map((l) => ({ label: l.label, url: l.url })),
        });
        setIsEditing(true);
    }, [machine.links, reset]);

    const cancelEditing = useCallback(() => setIsEditing(false), []);

    const handleCopy = useCallback(
        async (url: string) => {
            // copyToClipboard gère le repli hors contexte sécurisé (http intranet).
            const copied = await copyToClipboard(url);
            if (copied) {
                showNotification('Lien copié !', 'success');
            } else {
                showNotification('Impossible de copier le lien', 'error');
            }
        },
        [showNotification],
    );

    const onSubmit = useCallback(
        async (data: LinksForm) => {
            try {
                const base = machineToInput(machine);
                await updateMutation.mutateAsync({
                    uuid: machine.uuid,
                    input: {
                        ...base,
                        links: data.links.map((link, idx) => ({
                            label: link.label.trim(),
                            url: link.url.trim(),
                            position: idx,
                        })),
                    },
                });
                showNotification('Liens mis à jour', 'success');
                setIsEditing(false);
            } catch (error) {
                showNotification(getErrorMessage(error, 'Erreur lors de la sauvegarde'), 'error');
            }
        },
        [machine, updateMutation, showNotification],
    );

    return (
        <Paper variant="outlined" sx={PAPER_BASE_SX}>
            {!isEditing && (
                <IconButton onClick={startEditing} aria-label="Modifier les liens documentaires" sx={EDIT_BUTTON_SX}>
                    <EditIcon fontSize="small" />
                </IconButton>
            )}

            <Typography variant="overline" color="text.secondary">
                Liens documentaires
            </Typography>

            {isEditing ? (
                <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
                    <Stack spacing={1.5}>
                        {fields.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                Aucun lien. Ajoute des procédures, manuels, intranet…
                            </Typography>
                        )}
                        {fields.map((field, idx) => (
                            <Grid2 container spacing={1} alignItems="flex-start" key={field.id}>
                                <Grid2 size={{ xs: 12, sm: 4 }}>
                                    <Controller
                                        name={`links.${idx}.label` as const}
                                        control={control}
                                        render={({ field: f, fieldState }) => (
                                            <TextField
                                                {...f}
                                                label="Libellé"
                                                fullWidth
                                                size="small"
                                                error={Boolean(fieldState.error)}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                </Grid2>
                                <Grid2 size={{ xs: 12, sm: 7 }}>
                                    <Controller
                                        name={`links.${idx}.url` as const}
                                        control={control}
                                        render={({ field: f, fieldState }) => (
                                            <TextField
                                                {...f}
                                                label="URL"
                                                placeholder="https://…"
                                                fullWidth
                                                size="small"
                                                error={Boolean(fieldState.error)}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                </Grid2>
                                <Grid2 size={{ xs: 12, sm: 1 }}>
                                    <Tooltip title="Supprimer ce lien">
                                        <IconButton
                                            aria-label="Supprimer le lien"
                                            onClick={() => remove(idx)}
                                            size="small"
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Grid2>
                            </Grid2>
                        ))}
                    </Stack>
                    <Box sx={{ mt: 1.5 }}>
                        <Button size="small" startIcon={<AddIcon />} onClick={() => append({ label: '', url: '' })}>
                            Ajouter un lien
                        </Button>
                    </Box>
                    <FormActions onCancel={cancelEditing} isSaving={updateMutation.isPending} />
                </Box>
            ) : machine.links.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Aucun lien.
                </Typography>
            ) : (
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {machine.links.map((link) => (
                        <Stack key={link.uuid} direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="body2" fontWeight={500} noWrap>
                                    {link.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap component="div">
                                    {link.url}
                                </Typography>
                            </Box>
                            <Tooltip title="Copier le lien" arrow>
                                <IconButton
                                    size="small"
                                    onClick={() => handleCopy(link.url)}
                                    aria-label={`Copier le lien ${link.label}`}
                                >
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    ))}
                </Stack>
            )}
        </Paper>
    );
});
