/**
 * AvatarEditor — édition de la photo de profil dans la modale "Mon profil".
 * @module features/user/edit-profile
 *
 * - Compression Canvas côté client (zero dep) avant upload — le serveur
 *   re-normalise ensuite en carré 256px JPEG.
 * - Aperçu via <Avatar> (fallback initiales si pas de photo).
 * - Changer / Supprimer la photo. Une seule photo par utilisateur.
 *
 * Endpoints : POST/DELETE /auth/me/avatar/ (multipart, champ `image`).
 */

import { ChangeEvent, useCallback, useRef } from 'react';
import { Avatar, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useUploadAvatar, useDeleteAvatar, type User } from '@entities/user';
import { compressImage } from '@shared/lib';
import { useNotification } from '@shared/ui';

// Garde-fou navigateur AVANT compression : au-delà, refus immédiat (inutile de
// décoder un fichier énorme pour le rejeter ensuite). Le serveur plafonne à 5 Mo
// le fichier reçu — la compression client passe toujours bien en dessous.
const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10 Mo
const ACCEPTED_MIME = 'image/jpeg,image/png,image/webp';
const AVATAR_PX = 88;

interface AvatarEditorProps {
    user: User | null;
}

function getInitials(user: User | null): string {
    if (!user) return '';
    const fromName = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
    return fromName || user.username.slice(0, 2).toUpperCase();
}

export function AvatarEditor({ user }: AvatarEditorProps) {
    const { showNotification } = useNotification();
    const uploadMutation = useUploadAvatar();
    const deleteMutation = useDeleteAvatar();
    const inputRef = useRef<HTMLInputElement | null>(null);

    const isPending = uploadMutation.isPending || deleteMutation.isPending;
    const hasAvatar = Boolean(user?.avatarUrl);

    const handleFile = useCallback(
        async (file: File) => {
            if (!file.type.startsWith('image/')) {
                showNotification('Le fichier doit être une image.', 'error');
                return;
            }
            if (file.size > MAX_INPUT_BYTES) {
                showNotification(
                    `Image trop volumineuse (${Math.round(file.size / 1024 / 1024)} Mo, max 10 Mo).`,
                    'error',
                );
                return;
            }
            try {
                // 512px suffit : le serveur recadre en carré 256px. quality 0.85
                // pour garder un bon rendu avant le recadrage serveur.
                const { file: compressed } = await compressImage(file, {
                    maxDimension: 512,
                    quality: 0.85,
                    outputType: 'image/jpeg',
                });
                await uploadMutation.mutateAsync(compressed);
                showNotification('Photo de profil mise à jour.', 'success');
            } catch (error) {
                const message = error instanceof Error ? error.message : "Échec de l'envoi de la photo.";
                showNotification(message, 'error');
            }
        },
        [uploadMutation, showNotification],
    );

    const handleInputChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            // Reset pour pouvoir re-sélectionner le même fichier après suppression.
            event.target.value = '';
            if (file) void handleFile(file);
        },
        [handleFile],
    );

    const openFileDialog = useCallback(() => {
        if (!isPending) inputRef.current?.click();
    }, [isPending]);

    const handleDelete = useCallback(async () => {
        try {
            await deleteMutation.mutateAsync();
            showNotification('Photo de profil supprimée.', 'success');
        } catch {
            showNotification('Échec de la suppression de la photo.', 'error');
        }
    }, [deleteMutation, showNotification]);

    return (
        <Stack direction="row" spacing={2.5} alignItems="center">
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_MIME}
                onChange={handleInputChange}
                hidden
                aria-label="Sélectionner une photo de profil"
            />

            <Box sx={{ position: 'relative', flexShrink: 0 }}>
                <Avatar
                    src={user?.avatarUrl ?? undefined}
                    alt="Photo de profil"
                    sx={{
                        width: AVATAR_PX,
                        height: AVATAR_PX,
                        bgcolor: 'primary.main',
                        fontSize: '1.6rem',
                        fontWeight: 700,
                    }}
                >
                    {getInitials(user)}
                </Avatar>
                {isPending && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            bgcolor: 'rgba(0, 0, 0, 0.45)',
                        }}
                    >
                        <CircularProgress size={28} sx={{ color: 'common.white' }} />
                    </Box>
                )}
            </Box>

            <Stack spacing={1} sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PhotoCameraOutlinedIcon />}
                        onClick={openFileDialog}
                        disabled={isPending}
                    >
                        {hasAvatar ? 'Changer' : 'Ajouter une photo'}
                    </Button>
                    {hasAvatar && (
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
                    )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                    JPEG, PNG ou WebP · max 10 Mo · recadrée en carré
                </Typography>
            </Stack>
        </Stack>
    );
}
