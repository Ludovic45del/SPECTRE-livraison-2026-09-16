/**
 * SignatureEditor — édition de la signature dans la modale "Mon profil".
 * @module features/user/edit-profile
 *
 * - Pas de compression Canvas (elle aplatit l'alpha en JPEG) : on envoie le
 *   fichier brut, le serveur le normalise en PNG transparent rectangulaire.
 * - Aperçu de la signature dans un cadre (fond damier-neutre).
 * - Ajouter / Changer / Supprimer. Une seule signature par utilisateur.
 * - Réutilisée pour signer la fiche de livraison : sans signature ici,
 *   impossible de signer en phase 1 (accepteur) ou phase 2 (validateur).
 *
 * Endpoints : POST/DELETE /auth/me/signature/ (multipart, champ `image`).
 */

import { ChangeEvent, useCallback, useRef } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useUploadSignature, useDeleteSignature, type User } from '@entities/user';
import { useNotification } from '@shared/ui';

// Même plafond d'entrée que l'avatar (le serveur plafonne aussi à 5 Mo et
// re-traite l'image). Pas de compression client → on borne juste l'entrée.
const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10 Mo
const ACCEPTED_MIME = 'image/jpeg,image/png,image/webp';

interface SignatureEditorProps {
    user: User | null;
}

export function SignatureEditor({ user }: SignatureEditorProps) {
    const { showNotification } = useNotification();
    const uploadMutation = useUploadSignature();
    const deleteMutation = useDeleteSignature();
    const inputRef = useRef<HTMLInputElement | null>(null);

    const isPending = uploadMutation.isPending || deleteMutation.isPending;
    const hasSignature = Boolean(user?.signatureUrl);

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
                // Envoi brut : le serveur normalise (PNG transparent, 600x300 max).
                await uploadMutation.mutateAsync(file);
                showNotification('Signature mise à jour.', 'success');
            } catch (error) {
                const message = error instanceof Error ? error.message : "Échec de l'envoi de la signature.";
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
            showNotification('Signature supprimée.', 'success');
        } catch {
            showNotification('Échec de la suppression de la signature.', 'error');
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
                aria-label="Sélectionner une image de signature"
            />

            <Box
                sx={{
                    position: 'relative',
                    flexShrink: 0,
                    width: 160,
                    height: 72,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.default',
                    overflow: 'hidden',
                }}
            >
                {hasSignature ? (
                    <Box
                        component="img"
                        src={user?.signatureUrl ?? undefined}
                        alt="Signature"
                        sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                ) : (
                    <Typography variant="caption" color="text.secondary">
                        Aucune signature
                    </Typography>
                )}
                {isPending && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(0, 0, 0, 0.45)',
                        }}
                    >
                        <CircularProgress size={24} sx={{ color: 'common.white' }} />
                    </Box>
                )}
            </Box>

            <Stack spacing={1} sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<DrawOutlinedIcon />}
                        onClick={openFileDialog}
                        disabled={isPending}
                    >
                        {hasSignature ? 'Changer' : 'Ajouter une signature'}
                    </Button>
                    {hasSignature && (
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
                    JPEG, PNG ou WebP · max 10 Mo · sert à signer la fiche de livraison
                </Typography>
            </Stack>
        </Stack>
    );
}
