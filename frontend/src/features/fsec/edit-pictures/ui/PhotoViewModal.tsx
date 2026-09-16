/**
 * Photo View Modal
 * @module features/edit-pictures
 *
 * Edits a PhotoView (individual view/photo) with:
 * - name (required)
 * - link
 */

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Box,
    Typography,
    Divider,
    IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PhotoView, useCreatePhotoView, useUpdatePhotoView, useDeletePhotoView } from '@entities/fsec/steps';
import { useNotification } from '@shared/ui';

interface PhotoViewModalProps {
    open: boolean;
    onClose: () => void;
    picturesStepId: string;
    view?: PhotoView | null;
}

const PhotoViewFormSchema = z.object({
    name: z.string().min(1, 'Le nom est requis'),
    link: z.string().nullable().optional(),
});

type PhotoViewForm = z.infer<typeof PhotoViewFormSchema>;

export function PhotoViewModal({ open, onClose, picturesStepId, view }: PhotoViewModalProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isEditMode = Boolean(view);

    const createMutation = useCreatePhotoView();
    const updateMutation = useUpdatePhotoView();
    const deleteMutation = useDeletePhotoView();
    const { showNotification } = useNotification();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<PhotoViewForm>({
        mode: 'onBlur',
        resolver: zodResolver(PhotoViewFormSchema),
        defaultValues: {
            name: '',
            link: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (view) {
                reset({
                    name: view.name,
                    link: view.link ?? '',
                });
            } else {
                reset({
                    name: '',
                    link: '',
                });
            }
            setShowDeleteConfirm(false);
        }
    }, [open, view, reset]);

    const isPending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = async (data: PhotoViewForm) => {
        if (isPending) return;

        try {
            if (isEditMode && view) {
                await updateMutation.mutateAsync({
                    uuid: view.uuid,
                    picturesStepId,
                    name: data.name,
                    link: data.link,
                });
                showNotification('Vue mise à jour', 'success');
            } else {
                await createMutation.mutateAsync({
                    picturesStepId,
                    name: data.name,
                    link: data.link,
                });
                showNotification('Vue créée', 'success');
            }
            onClose();
        } catch {
            showNotification('Erreur lors de la sauvegarde', 'error');
        }
    };

    const handleDelete = async () => {
        if (!view) return;
        try {
            await deleteMutation.mutateAsync({ uuid: view.uuid, picturesStepId });
            showNotification('Vue supprimée', 'success');
            onClose();
        } catch {
            showNotification('Erreur lors de la suppression', 'error');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, pb: 0 }}>
                <Typography variant="h6" fontWeight={700}>
                    {isEditMode ? 'Modifier la vue' : 'Nouvelle vue'}
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </Box>

            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ pt: 2 }}>
                    <Stack spacing={3}>
                        {/* Nom de la vue */}
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Nom de la vue"
                                    size="small"
                                    fullWidth
                                    required
                                    error={Boolean(errors.name)}
                                    helperText={errors.name?.message}
                                    placeholder="Ex: Vue face, Vue côté..."
                                />
                            )}
                        />
                    </Stack>
                </DialogContent>

                <Divider />

                <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                    <Box>
                        {isEditMode && !showDeleteConfirm && (
                            <Button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<DeleteIcon />}
                            >
                                Supprimer
                            </Button>
                        )}
                        {isEditMode && showDeleteConfirm && (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" color="error" fontWeight={600}>
                                    Confirmer ?
                                </Typography>
                                <Button
                                    type="button"
                                    onClick={handleDelete}
                                    variant="contained"
                                    color="error"
                                    size="small"
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? '...' : 'Oui'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    variant="text"
                                    size="small"
                                >
                                    Non
                                </Button>
                            </Stack>
                        )}
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button type="button" onClick={onClose} variant="text" color="inherit">
                            Annuler
                        </Button>
                        <Button type="submit" variant="contained" disabled={isPending}>
                            {isPending ? 'Enregistrement...' : 'Sauvegarder'}
                        </Button>
                    </Stack>
                </DialogActions>
            </form>
        </Dialog>
    );
}
