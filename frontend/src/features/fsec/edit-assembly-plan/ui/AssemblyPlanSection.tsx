/**
 * Section « Plan d'assemblage » de l'onglet Assemblage d'une FSEC.
 * @module features/fsec/edit-assembly-plan/ui
 *
 * Carte repliable (gain de place) avec deux modes : lecture (consultation seule
 * du plan + annotations) et édition (upload / remplacement / suppression de
 * l'image, puis annotations via PlanAnnotator). Repliée et en lecture par défaut.
 * L'image est compressée côté client avant l'envoi, comme la vue d'ensemble.
 *
 * Endpoints : PATCH/DELETE /fsecs/{version_uuid}/assembly-plan/ (multipart `image`)
 *             PUT          /fsecs/{version_uuid}/assembly-plan-annotations/
 */

import { ChangeEvent, DragEvent, useCallback, useRef, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
    Divider,
    IconButton,
    Stack,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import ArchitectureOutlinedIcon from '@mui/icons-material/ArchitectureOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { PlanAnnotation, useUpdateFsecAssemblyPlanImage } from '@entities/fsec';
import { compressImage } from '@shared/lib';
import { useNotification } from '@shared/ui';
import { PlanAnnotator } from './PlanAnnotator';

// Garde-fou navigateur AVANT compression (le backend plafonne à 5 Mo APRÈS).
const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20 Mo
const ACCEPTED_MIME = 'image/jpeg,image/png,image/webp,image/heic';

interface AssemblyPlanSectionProps {
    versionUuid: string;
    /** URL relative MEDIA du plan, ou null si absent. */
    imageUrl: string | null;
    /** Calque d'annotations (source de vérité serveur). */
    annotations: PlanAnnotation[];
    /**
     * Verrouille la section en consultation : le bouton « Éditer » disparaît et
     * aucune modification (image ou annotation) n'est possible. Par défaut la
     * section est éditable, mais s'ouvre en mode lecture.
     */
    readOnly?: boolean;
    /** Section dépliée à l'ouverture (défaut : repliée pour gagner de la place). */
    defaultExpanded?: boolean;
}

export function AssemblyPlanSection({
    versionUuid,
    imageUrl,
    annotations,
    readOnly = false,
    defaultExpanded = false,
}: AssemblyPlanSectionProps) {
    const theme = useTheme();
    const { showNotification } = useNotification();
    const imageMutation = useUpdateFsecAssemblyPlanImage();

    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [editing, setEditing] = useState(false);
    const isPending = imageMutation.isPending;

    // `editing` n'a d'effet que si la section autorise l'édition.
    const editingAllowed = !readOnly;
    const isEditing = editingAllowed && editing;
    const contentReadOnly = !isEditing;

    const handleFile = useCallback(
        async (file: File) => {
            if (!file.type.startsWith('image/')) {
                showNotification('Le fichier doit être une image.', 'error');
                return;
            }
            if (file.size > MAX_INPUT_BYTES) {
                showNotification(
                    `Plan trop volumineux (${Math.round(file.size / 1024 / 1024)} Mo, max 20 Mo).`,
                    'error',
                );
                return;
            }
            try {
                // Plan technique : on garde une définition élevée (traits/cotes fins)
                // tout en restant sous les 5 Mo backend → WebP haute qualité.
                const { file: compressed } = await compressImage(file, {
                    maxDimension: 2400,
                    quality: 0.9,
                    outputType: 'image/webp',
                });
                await imageMutation.mutateAsync({ versionUuid, image: compressed });
                showNotification('Plan enregistré.', 'success');
            } catch (error) {
                const message = error instanceof Error ? error.message : "Échec de l'envoi du plan.";
                showNotification(message, 'error');
            }
        },
        [versionUuid, imageMutation, showNotification],
    );

    const handleInputChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void handleFile(file);
        },
        [handleFile],
    );

    const handleDrop = useCallback(
        (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragging(false);
            if (isPending || !isEditing) return;
            const file = event.dataTransfer.files?.[0];
            if (file) void handleFile(file);
        },
        [isPending, isEditing, handleFile],
    );

    const handleDelete = useCallback(async () => {
        try {
            await imageMutation.mutateAsync({ versionUuid, image: null });
            showNotification('Plan supprimé.', 'success');
        } catch {
            showNotification('Échec de la suppression du plan.', 'error');
        }
    }, [versionUuid, imageMutation, showNotification]);

    const openFileDialog = useCallback(() => {
        if (!isPending && isEditing) inputRef.current?.click();
    }, [isPending, isEditing]);

    return (
        <Box>
            {/* En-tête repliable : titre + bascule édition/lecture + chevron. */}
            <Box
                onClick={() => setExpanded((v) => !v)}
                sx={{
                    px: 2,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                    <ArchitectureOutlinedIcon fontSize="small" color="action" />
                    <Typography variant="h6" fontWeight={600}>
                        Plan d'assemblage
                    </Typography>
                    {!expanded &&
                        (imageUrl ? (
                            <Chip
                                size="small"
                                variant="outlined"
                                label={
                                    annotations.length > 0
                                        ? `Plan · ${annotations.length} annotation${annotations.length > 1 ? 's' : ''}`
                                        : 'Plan ajouté'
                                }
                            />
                        ) : (
                            <Typography variant="caption" color="text.secondary">
                                Aucun plan
                            </Typography>
                        ))}
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1} onClick={(e) => e.stopPropagation()}>
                    {expanded &&
                        editingAllowed &&
                        (isEditing ? (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<VisibilityOutlinedIcon />}
                                onClick={() => setEditing(false)}
                            >
                                Lecture
                            </Button>
                        ) : (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<EditOutlinedIcon />}
                                onClick={() => setEditing(true)}
                            >
                                Éditer
                            </Button>
                        ))}
                    <IconButton
                        size="small"
                        onClick={() => setExpanded((v) => !v)}
                        aria-label={expanded ? 'Replier le plan' : 'Déplier le plan'}
                    >
                        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                </Stack>
            </Box>

            <Collapse in={expanded}>
                <Divider />
                <Box sx={{ p: 3 }}>
                    <input
                        ref={inputRef}
                        type="file"
                        accept={ACCEPTED_MIME}
                        onChange={handleInputChange}
                        hidden
                        aria-label="Sélectionner un plan d'assemblage"
                    />

                    {imageUrl && isEditing && (
                        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 1.5 }}>
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
                                Supprimer le plan
                            </Button>
                        </Stack>
                    )}

                    {imageUrl ? (
                        <PlanAnnotator
                            versionUuid={versionUuid}
                            imageUrl={imageUrl}
                            annotations={annotations}
                            readOnly={contentReadOnly}
                        />
                    ) : isEditing ? (
                        <Box
                            role="button"
                            aria-label="Ajouter un plan d'assemblage"
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
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1.5,
                                minHeight: 180,
                                border: '2px dashed',
                                borderColor: isDragging ? 'primary.main' : 'divider',
                                borderRadius: 1,
                                backgroundColor: isDragging
                                    ? alpha(theme.palette.primary.main, 0.06)
                                    : 'background.default',
                                color: 'text.secondary',
                                cursor: isPending ? 'wait' : 'pointer',
                                transition: 'border-color 120ms, background-color 120ms',
                                p: 3,
                                textAlign: 'center',
                                '&:hover': {
                                    borderColor: isPending ? 'divider' : 'primary.main',
                                    backgroundColor: isPending
                                        ? 'background.default'
                                        : alpha(theme.palette.primary.main, 0.04),
                                },
                            }}
                        >
                            {isPending ? (
                                <>
                                    <CircularProgress size={28} />
                                    <Typography variant="body2">Compression et envoi en cours…</Typography>
                                </>
                            ) : (
                                <>
                                    <ArchitectureOutlinedIcon sx={{ fontSize: 38, color: 'primary.main' }} />
                                    <Stack spacing={0.5} alignItems="center">
                                        <Typography variant="body2" fontWeight={500}>
                                            Ajouter le plan d'assemblage
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Glisser-déposer ou cliquer · JPEG/PNG/WebP · max 20 Mo
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Un PDF&nbsp;? Exportez la page en image avant de la déposer.
                                        </Typography>
                                    </Stack>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<CloudUploadOutlinedIcon />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openFileDialog();
                                        }}
                                    >
                                        Choisir un fichier
                                    </Button>
                                </>
                            )}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Aucun plan d'assemblage. Cliquez sur « Éditer » pour en ajouter un.
                        </Typography>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
}
