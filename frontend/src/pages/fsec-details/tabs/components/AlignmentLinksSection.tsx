/**
 * Liens fichiers (alignement, FDIE) + numéro d'expérience SRxx.
 * @module pages/fsec-details/tabs/components
 *
 * En mode lecture : les liens sont rendus en <a> cliquables (target=_blank,
 * rel=noopener) — supporte URL HTTP et chemins UNC (\\\\serveur\\...).
 * En mode édition : 3 TextField simples. Pas de validation d'URL stricte côté
 * client : les chemins UNC ne passeraient pas un type="url".
 *
 * Le lien « Dossier fiche de livraison » est automatique (non éditable) : il est
 * construit depuis DELIVERY_SHEET_FOLDER_BASE (à renseigner une fois l'app livrée).
 */

import { useCallback, useState } from 'react';
import { Box, Button, Divider, Grid, IconButton, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Fsec, useUpdateFsec } from '@entities/fsec';
import { useNotification } from '@shared/ui';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AlignmentLinksSectionProps {
    fsec: Fsec;
    paperSx: Record<string, unknown>;
    editButtonSx: Record<string, unknown>;
}

interface AlignmentLinksForm {
    alignmentFileLink: string;
    fdieLink: string;
    experienceSrxx: string;
}

const MAX_LINK_LENGTH = 500;
const MAX_SRXX_LENGTH = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Lien automatique vers le dossier « fiche de livraison »
// ─────────────────────────────────────────────────────────────────────────────
//
// TODO(livraison): renseigner la base du dossier réseau une fois l'application
// totalement terminée — p. ex. '\\\\serveur\\fiches-livraison\\' ou
// 'https://intranet/fiches-livraison/'. Le lien complet est ensuite construit
// automatiquement par FSEC. Tant que la base est vide, le lien s'affiche « - ».
const DELIVERY_SHEET_FOLDER_BASE = '';

/**
 * Construit le lien automatique vers le dossier fiche de livraison de la FSEC.
 * Retourne null tant que DELIVERY_SHEET_FOLDER_BASE n'est pas renseigné.
 *
 * Par défaut on cible un sous-dossier au nom de la FSEC ; si les fiches sont
 * regroupées dans un dossier unique, retourner simplement la base.
 */
const buildDeliverySheetFolderLink = (fsec: Fsec): string | null =>
    DELIVERY_SHEET_FOLDER_BASE ? `${DELIVERY_SHEET_FOLDER_BASE}${fsec.name}` : null;

const buildInitialForm = (fsec: Fsec): AlignmentLinksForm => ({
    alignmentFileLink: fsec.alignmentFileLink ?? '',
    fdieLink: fsec.fdieLink ?? '',
    experienceSrxx: fsec.experienceSrxx ?? '',
});

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component : affichage d'un lien (avec icône ouvrir si non vide)
// ─────────────────────────────────────────────────────────────────────────────

function LinkDisplay({ label, value }: { label: string; value: string | null }) {
    return (
        <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                {label}
            </Typography>
            {value ? (
                <Link
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        wordBreak: 'break-all',
                    }}
                >
                    {value}
                    <OpenInNewIcon fontSize="inherit" />
                </Link>
            ) : (
                <Typography variant="body1" fontWeight="medium">
                    -
                </Typography>
            )}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function AlignmentLinksSection({ fsec, paperSx, editButtonSx }: AlignmentLinksSectionProps) {
    const { showNotification } = useNotification();
    const updateMutation = useUpdateFsec();

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<AlignmentLinksForm>(() => buildInitialForm(fsec));

    const handleEdit = useCallback(() => {
        setForm(buildInitialForm(fsec));
        setIsEditing(true);
    }, [fsec]);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
    }, []);

    const handleSave = useCallback(async () => {
        if (form.alignmentFileLink.length > MAX_LINK_LENGTH) {
            showNotification(`Lien d'alignement trop long (max ${MAX_LINK_LENGTH} caractères)`, 'error');
            return;
        }
        if (form.fdieLink.length > MAX_LINK_LENGTH) {
            showNotification(`Lien FDIE trop long (max ${MAX_LINK_LENGTH} caractères)`, 'error');
            return;
        }
        if (form.experienceSrxx.length > MAX_SRXX_LENGTH) {
            showNotification(`Identifiant SRxx trop long (max ${MAX_SRXX_LENGTH} caractères)`, 'error');
            return;
        }

        try {
            await updateMutation.mutateAsync({
                versionUuid: fsec.versionUuid,
                data: {
                    name: fsec.name,
                    campaignId: fsec.campaignId,
                    statusId: fsec.statusId,
                    categoryId: fsec.categoryId,
                    rackId: fsec.rackId,
                    preshootingPressure: fsec.preshootingPressure,
                    depressurizationFailed: fsec.depressurizationFailed,
                    localisation: fsec.localisation,
                    comments: fsec.comments,
                    deliveryDate: fsec.deliveryDate,
                    shootingDate: fsec.shootingDate,
                    alignmentFileLink: form.alignmentFileLink.trim() || null,
                    fdieLink: form.fdieLink.trim() || null,
                    experienceSrxx: form.experienceSrxx.trim() || null,
                },
            });
            showNotification('Liens et expérience mis à jour', 'success');
            setIsEditing(false);
        } catch {
            showNotification('Erreur lors de la mise à jour', 'error');
        }
    }, [fsec, form, updateMutation, showNotification]);

    return (
        <Paper variant="outlined" sx={paperSx}>
            {!isEditing && (
                <IconButton
                    size="small"
                    onClick={handleEdit}
                    sx={editButtonSx}
                    aria-label="Modifier les liens et l'expérience"
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            )}

            <Typography variant="h6" mb={2}>
                Documents &amp; Expérience
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {isEditing ? (
                <Box>
                    <Stack spacing={2}>
                        <TextField
                            label="Lien fichier d'alignement"
                            value={form.alignmentFileLink}
                            onChange={(e) => setForm((prev) => ({ ...prev, alignmentFileLink: e.target.value }))}
                            size="small"
                            fullWidth
                            placeholder="https://… ou \\serveur\share\…"
                        />
                        <TextField
                            label="Lien FDIE"
                            value={form.fdieLink}
                            onChange={(e) => setForm((prev) => ({ ...prev, fdieLink: e.target.value }))}
                            size="small"
                            fullWidth
                            placeholder="https://… ou \\serveur\share\…"
                        />
                        <TextField
                            label="Expérience (SRxx)"
                            value={form.experienceSrxx}
                            onChange={(e) => setForm((prev) => ({ ...prev, experienceSrxx: e.target.value }))}
                            size="small"
                            fullWidth
                            placeholder="ex. SR42"
                        />
                    </Stack>
                    <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
                        <Button size="small" onClick={handleCancel} startIcon={<CloseIcon />} color="inherit">
                            Annuler
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            onClick={handleSave}
                            startIcon={<SaveIcon />}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                    </Stack>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <LinkDisplay label="Lien fichier d'alignement" value={fsec.alignmentFileLink ?? null} />
                    </Grid>
                    <Grid item xs={12}>
                        <LinkDisplay label="Lien FDIE" value={fsec.fdieLink ?? null} />
                    </Grid>
                    <Grid item xs={12}>
                        <LinkDisplay label="Dossier fiche de livraison" value={buildDeliverySheetFolderLink(fsec)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Expérience (SRxx)
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                            {fsec.experienceSrxx || '-'}
                        </Typography>
                    </Grid>
                </Grid>
            )}
        </Paper>
    );
}
