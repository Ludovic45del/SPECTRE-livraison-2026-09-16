/**
 * Galerie de photos d'une FA (phase Ouvert).
 * @module pages/fa-details/sections
 *
 * - Plusieurs photos par FA (contrairement à la photo unique de la FSEC).
 * - Upload avec compression Canvas côté client (zero dep) avant envoi.
 * - Drag-and-drop + sélection de fichier classique.
 * - Grille de vignettes, suppression par vignette, aperçu plein écran.
 * - S'auto-gère via ses propres mutations (indépendant du form RHF de la phase).
 *
 * Endpoints : GET/POST /fas/{uuid}/photos/ · DELETE /fas/{uuid}/photos/{photoUuid}/
 */

import { ChangeEvent, DragEvent, useCallback, useMemo, useRef, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    Divider,
    IconButton,
    ImageList,
    ImageListItem,
    Stack,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import { useAddFaPhoto, useDeleteFaPhoto, useFaPhotos } from '@entities/fa';
import { compressImage } from '@shared/lib';
import { useNotification } from '@shared/ui';

// Garde-fou côté navigateur AVANT compression (refus immédiat au-delà).
const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20 Mo
const ACCEPTED_MIME = 'image/jpeg,image/png,image/webp';

interface FaPhotoGalleryProps {
    faUuid: string;
}

export function FaPhotoGallery({ faUuid }: FaPhotoGalleryProps) {
    const theme = useTheme();
    const { showNotification } = useNotification();

    const { data: photos = [], isLoading } = useFaPhotos(faUuid);
    const addMutation = useAddFaPhoto();
    const deleteMutation = useDeleteFaPhoto();

    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const isPending = addMutation.isPending || deleteMutation.isPending;

    const handleFile = useCallback(
        async (file: File) => {
            if (!file.type.startsWith('image/')) {
                showNotification('Le fichier doit être une image.', 'error');
                return;
            }
            if (file.size > MAX_INPUT_BYTES) {
                showNotification(
                    `Image trop volumineuse (${Math.round(file.size / 1024 / 1024)} Mo, max 20 Mo).`,
                    'error',
                );
                return;
            }
            try {
                const { file: compressed } = await compressImage(file, {
                    maxDimension: 1920,
                    quality: 0.82,
                    outputType: 'image/jpeg',
                });
                await addMutation.mutateAsync({ faUuid, image: compressed });
                showNotification('Photo ajoutée.', 'success');
            } catch (error) {
                const message = error instanceof Error ? error.message : "Échec de l'envoi de la photo.";
                showNotification(message, 'error');
            }
        },
        [faUuid, addMutation, showNotification],
    );

    const handleInputChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = ''; // permet de re-sélectionner le même fichier
            if (file) void handleFile(file);
        },
        [handleFile],
    );

    const handleDrop = useCallback(
        (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragging(false);
            if (isPending) return;
            const file = event.dataTransfer.files?.[0];
            if (file) void handleFile(file);
        },
        [isPending, handleFile],
    );

    const handleDelete = useCallback(
        async (photoUuid: string) => {
            try {
                await deleteMutation.mutateAsync({ faUuid, photoUuid });
                showNotification('Photo supprimée.', 'success');
            } catch {
                showNotification('Échec de la suppression de la photo.', 'error');
            }
        },
        [faUuid, deleteMutation, showNotification],
    );

    const openFileDialog = useCallback(() => {
        if (!isPending) inputRef.current?.click();
    }, [isPending]);

    const dropZoneSx = useMemo(
        () => ({
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            minHeight: 140,
            border: '2px dashed',
            borderColor: isDragging ? 'primary.main' : 'divider',
            borderRadius: 1,
            backgroundColor: isDragging ? alpha(theme.palette.primary.main, 0.06) : 'background.default',
            color: 'text.secondary',
            cursor: isPending ? 'wait' : 'pointer',
            transition: 'border-color 120ms, background-color 120ms',
            p: 3,
            textAlign: 'center' as const,
            '&:hover': {
                borderColor: isPending ? 'divider' : 'primary.main',
                backgroundColor: isPending ? 'background.default' : alpha(theme.palette.primary.main, 0.04),
            },
        }),
        [isDragging, isPending, theme.palette.primary.main],
    );

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                Photos de l'anomalie
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_MIME}
                onChange={handleInputChange}
                hidden
                aria-label="Sélectionner une photo de l'anomalie"
            />

            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={28} />
                </Box>
            ) : (
                photos.length > 0 && (
                    <ImageList cols={3} gap={8} sx={{ mb: 2 }}>
                        {photos.map((photo) => (
                            <ImageListItem
                                key={photo.uuid}
                                sx={{
                                    position: 'relative',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    border: 1,
                                    borderColor: 'divider',
                                    '&:hover .fa-photo-delete': { opacity: 1 },
                                }}
                            >
                                {photo.imageUrl && (
                                    <Box
                                        component="img"
                                        src={photo.imageUrl}
                                        alt={photo.caption ?? "Photo de l'anomalie"}
                                        loading="lazy"
                                        sx={{
                                            display: 'block',
                                            width: '100%',
                                            height: 140,
                                            objectFit: 'cover',
                                            cursor: 'zoom-in',
                                        }}
                                        onClick={() => setPreviewUrl(photo.imageUrl)}
                                    />
                                )}
                                <Tooltip title="Supprimer la photo">
                                    <IconButton
                                        size="small"
                                        className="fa-photo-delete"
                                        onClick={() => handleDelete(photo.uuid)}
                                        disabled={isPending}
                                        aria-label="Supprimer la photo"
                                        sx={{
                                            position: 'absolute',
                                            top: 4,
                                            right: 4,
                                            opacity: 0,
                                            transition: 'opacity 120ms',
                                            backgroundColor: alpha(theme.palette.background.paper, 0.85),
                                            color: 'error.main',
                                            '&:hover': { backgroundColor: theme.palette.background.paper },
                                        }}
                                    >
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </ImageListItem>
                        ))}
                    </ImageList>
                )
            )}

            <Box
                role="button"
                aria-label="Ajouter une photo de l'anomalie"
                tabIndex={isPending ? -1 : 0}
                aria-disabled={isPending}
                onClick={openFileDialog}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openFileDialog();
                    }
                }}
                onDragOver={(event) => {
                    event.preventDefault();
                    if (!isPending) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                sx={dropZoneSx}
            >
                {isPending ? (
                    <>
                        <CircularProgress size={28} />
                        <Typography variant="body2">Traitement en cours…</Typography>
                    </>
                ) : (
                    <>
                        <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 36, color: 'primary.main' }} />
                        <Stack spacing={0.5} alignItems="center">
                            <Typography variant="body2" fontWeight={500}>
                                Ajouter une photo
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Glisser-déposer ou cliquer · JPEG/PNG/WebP · max 20 Mo
                            </Typography>
                        </Stack>
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<CloudUploadOutlinedIcon />}
                            onClick={(event) => {
                                event.stopPropagation();
                                openFileDialog();
                            }}
                        >
                            Choisir un fichier
                        </Button>
                    </>
                )}
            </Box>

            <Dialog open={Boolean(previewUrl)} onClose={() => setPreviewUrl(null)} maxWidth="lg" fullWidth>
                <DialogContent sx={{ position: 'relative', p: 0, backgroundColor: 'common.black' }}>
                    <IconButton
                        onClick={() => setPreviewUrl(null)}
                        aria-label="Fermer l'aperçu"
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            color: 'common.white',
                            backgroundColor: alpha(theme.palette.common.black, 0.4),
                            '&:hover': { backgroundColor: alpha(theme.palette.common.black, 0.6) },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    {previewUrl && (
                        <Box
                            component="img"
                            src={previewUrl}
                            alt="Aperçu de la photo"
                            sx={{ display: 'block', width: '100%', maxHeight: '85vh', objectFit: 'contain' }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}
