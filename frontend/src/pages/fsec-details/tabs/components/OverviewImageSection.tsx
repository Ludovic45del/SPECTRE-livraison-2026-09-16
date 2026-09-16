/**
 * Photo de la vue d'ensemble FSEC.
 * @module pages/fsec-details/tabs/components
 *
 * - Upload avec compression Canvas côté client (zero dep) avant envoi.
 * - Une seule photo par FSEC, remplaçable et supprimable.
 * - Drag-and-drop + sélection de fichier classique.
 * - Aperçu plein écran via Dialog.
 *
 * Endpoint : PATCH /fsecs/{version_uuid}/overview-image/ (multipart, champ `image`).
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
    Stack,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import CloseIcon from '@mui/icons-material/Close';
import { useUpdateFsecOverviewImage } from '@entities/fsec';
import { compressImage } from '@shared/lib';
import { useNotification } from '@shared/ui';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

// Garde-fou côté navigateur AVANT compression. Au-delà : refus immédiat (pas la
// peine de décoder un fichier de 50 Mo pour le rejeter ensuite).
const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20 Mo
// Formats acceptés par <input accept=...> et par la compression.
const ACCEPTED_MIME = 'image/jpeg,image/png,image/webp,image/heic';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface OverviewImageSectionProps {
    versionUuid: string;
    fsecName: string;
    /** URL relative (ex: "/media/fsec/overview/xxx.jpg") ou null. */
    imageUrl: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

export function OverviewImageSection({ versionUuid, fsecName, imageUrl }: OverviewImageSectionProps) {
    const theme = useTheme();
    const { showNotification } = useNotification();
    const updateMutation = useUpdateFsecOverviewImage();

    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    const isPending = updateMutation.isPending;

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
                await updateMutation.mutateAsync({ versionUuid, image: compressed });
                showNotification('Photo enregistrée.', 'success');
            } catch (error) {
                const message = error instanceof Error ? error.message : "Échec de l'envoi de la photo.";
                showNotification(message, 'error');
            }
        },
        [versionUuid, updateMutation, showNotification],
    );

    const handleInputChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            // Reset value pour pouvoir re-sélectionner le même fichier après suppression.
            event.target.value = '';
            if (file) {
                void handleFile(file);
            }
        },
        [handleFile],
    );

    const handleDrop = useCallback(
        (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragging(false);
            if (isPending) return;
            const file = event.dataTransfer.files?.[0];
            if (file) {
                void handleFile(file);
            }
        },
        [isPending, handleFile],
    );

    const handleDelete = useCallback(async () => {
        try {
            await updateMutation.mutateAsync({ versionUuid, image: null });
            showNotification('Photo supprimée.', 'success');
        } catch {
            showNotification('Échec de la suppression de la photo.', 'error');
        }
    }, [versionUuid, updateMutation, showNotification]);

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
            minHeight: 160,
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

    const altText = `Photo de la FSEC ${fsecName}`;

    return (
        <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                Photo de la vue d'ensemble
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_MIME}
                onChange={handleInputChange}
                hidden
                aria-label="Sélectionner une photo de la FSEC"
            />

            {imageUrl ? (
                <Stack spacing={1.5}>
                    <Box
                        sx={{
                            position: 'relative',
                            borderRadius: 1,
                            overflow: 'hidden',
                            border: 1,
                            borderColor: 'divider',
                            backgroundColor: 'background.default',
                        }}
                    >
                        <Box
                            component="img"
                            src={imageUrl}
                            alt={altText}
                            loading="lazy"
                            sx={{
                                display: 'block',
                                width: '100%',
                                maxHeight: 320,
                                objectFit: 'contain',
                                cursor: 'zoom-in',
                            }}
                            onClick={() => setPreviewOpen(true)}
                        />
                        <Tooltip title="Agrandir">
                            <IconButton
                                size="small"
                                onClick={() => setPreviewOpen(true)}
                                sx={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    backgroundColor: alpha(theme.palette.background.paper, 0.85),
                                    '&:hover': { backgroundColor: theme.palette.background.paper },
                                }}
                            >
                                <ZoomOutMapIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        {isPending && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: alpha(theme.palette.background.paper, 0.6),
                                }}
                            >
                                <CircularProgress size={32} />
                            </Box>
                        )}
                    </Box>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={openFileDialog}
                            disabled={isPending}
                        >
                            Remplacer
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteOutlineIcon />}
                            onClick={handleDelete}
                            disabled={isPending}
                        >
                            Supprimer
                        </Button>
                    </Stack>
                </Stack>
            ) : (
                <Box
                    role="button"
                    aria-label="Ajouter une photo de la FSEC"
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
                            <Typography variant="body2">Compression et envoi en cours…</Typography>
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
            )}

            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
                <DialogContent sx={{ position: 'relative', p: 0, backgroundColor: 'common.black' }}>
                    <IconButton
                        onClick={() => setPreviewOpen(false)}
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
                    {imageUrl && (
                        <Box
                            component="img"
                            src={imageUrl}
                            alt={altText}
                            sx={{
                                display: 'block',
                                width: '100%',
                                maxHeight: '85vh',
                                objectFit: 'contain',
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}
