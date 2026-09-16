/**
 * Documents Section for FSEC Overview Tab
 * @module pages/fsec-details/tabs/components
 *
 * Displays the checklist of required documents with create/delete toggles.
 */

import { memo, useCallback } from 'react';
import { Box, Divider, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { FsecDocument, useCreateFsecDocument, useDeleteFsecDocument } from '@entities/fsec/document';
import { REQUIRED_SUBTYPES_DOCS, SUBTYPE_DOC_IDS } from '@shared/constants/fsec-workflow';
import { copyToClipboard } from '@shared/lib';
import { useNotification } from '@shared/ui';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DocumentsSectionProps {
    fsecVersionUuid: string;
    documents?: FsecDocument[];
    paperSx: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const DocumentsSection = memo(function DocumentsSection({
    fsecVersionUuid,
    documents,
    paperSx,
}: DocumentsSectionProps) {
    const { showNotification } = useNotification();
    const createDocMutation = useCreateFsecDocument();
    const deleteDocMutation = useDeleteFsecDocument();

    const handleDeleteDocument = useCallback(
        async (doc: FsecDocument, subtype: string) => {
            try {
                await deleteDocMutation.mutateAsync({
                    uuid: doc.uuid,
                    fsec_id: fsecVersionUuid,
                });
                showNotification(`${subtype} retiré`, 'success');
            } catch {
                showNotification('Erreur lors de la suppression', 'error');
            }
        },
        [deleteDocMutation, fsecVersionUuid, showNotification],
    );

    const handleCreateDocument = useCallback(
        async (subtype: string) => {
            try {
                await createDocMutation.mutateAsync({
                    fsec_id: fsecVersionUuid,
                    subtype_id: SUBTYPE_DOC_IDS[subtype as keyof typeof SUBTYPE_DOC_IDS],
                    name: subtype,
                    path: '-',
                });
                showNotification(`${subtype} ajouté`, 'success');
            } catch {
                showNotification("Erreur lors de l'ajout", 'error');
            }
        },
        [createDocMutation, fsecVersionUuid, showNotification],
    );

    const handleCopyLink = useCallback(
        async (path: string) => {
            // copyToClipboard gère le repli hors contexte sécurisé (http intranet).
            const copied = await copyToClipboard(path);
            if (copied) {
                showNotification('Lien copié', 'success');
            } else {
                showNotification('Impossible de copier le lien', 'error');
            }
        },
        [showNotification],
    );

    return (
        <Paper variant="outlined" sx={paperSx}>
            <Typography variant="h6" mb={2}>
                Pièces Jointes
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={0}>
                {REQUIRED_SUBTYPES_DOCS.map((subtype, idx) => {
                    const doc = documents?.find((d) => d.name === subtype);
                    const isLast = idx === REQUIRED_SUBTYPES_DOCS.length - 1;

                    return (
                        <Box
                            key={subtype}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                py: 1.25,
                                ...(!isLast && {
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                }),
                            }}
                        >
                            {doc ? (
                                <IconButton
                                    size="small"
                                    sx={{ p: 0, flexShrink: 0 }}
                                    disabled={deleteDocMutation.isPending}
                                    onClick={() => handleDeleteDocument(doc, subtype)}
                                >
                                    <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                                </IconButton>
                            ) : (
                                <IconButton
                                    size="small"
                                    sx={{ p: 0, flexShrink: 0 }}
                                    disabled={createDocMutation.isPending}
                                    onClick={() => handleCreateDocument(subtype)}
                                >
                                    <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                                </IconButton>
                            )}
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography
                                    variant="body2"
                                    fontWeight={doc ? 600 : 400}
                                    color={doc ? 'text.primary' : 'text.secondary'}
                                >
                                    {subtype}
                                </Typography>
                                {doc && doc.path && doc.path !== '-' && (
                                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                                        {doc.path}
                                    </Typography>
                                )}
                            </Box>
                            {doc && (
                                <Tooltip title="Copier le lien" arrow>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleCopyLink(doc.path)}
                                        sx={{ flexShrink: 0 }}
                                    >
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    );
                })}
            </Stack>
        </Paper>
    );
});
