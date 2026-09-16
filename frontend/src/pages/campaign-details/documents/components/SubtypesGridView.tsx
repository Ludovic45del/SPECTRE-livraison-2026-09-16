/**
 * Subtypes Grid View - Level 2 folder display
 * @module pages/campaign-details/documents/components
 */

import { memo } from 'react';
import { Box, Typography, Grid, Paper, Stack } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import { TYPE_COLORS } from '../lib/documents.types';
import { CopyPathButton } from '../lib/documents.helpers';
import { motion } from '@shared/ui/motion';

interface SubtypesGridViewProps {
    subtypes: { id: number; label: string; typeId: number }[];
    activeTypeId: number | null;
    activeTypeLabel: string;
    baseCampaignPath: string;
    viewMode: 'grid' | 'list';
    onSubtypeClick: (subtypeId: number) => void;
}

export const SubtypesGridView = memo(function SubtypesGridView({
    subtypes,
    activeTypeId,
    activeTypeLabel,
    baseCampaignPath,
    viewMode,
    onSubtypeClick,
}: SubtypesGridViewProps) {
    if (subtypes.length === 0) {
        return (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                Aucun sous-dossier disponible.
            </Typography>
        );
    }

    const color = activeTypeId !== null ? TYPE_COLORS[activeTypeId] : '#999';

    if (viewMode === 'grid') {
        return (
            <Grid container spacing={3}>
                {subtypes.map((subtype) => {
                    const path = `${baseCampaignPath}\\${activeTypeLabel}\\${subtype.label}`;
                    return (
                        <Grid item xs={12} sm={6} md={4} key={subtype.id}>
                            <Paper
                                variant="outlined"
                                onClick={() => onSubtypeClick(subtype.id)}
                                sx={{
                                    p: 2,
                                    borderRadius: 1,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    transition: `all ${motion.base}`,
                                    borderColor: 'divider',
                                    position: 'relative',
                                    '&:hover': {
                                        borderColor: color,
                                        boxShadow: 1,
                                        bgcolor: 'background.paper',
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 1,
                                        bgcolor: `${color}15`,
                                        color: color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <FolderIcon sx={{ fontSize: 28 }} />
                                </Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 500, flex: 1 }}>
                                    {subtype.label}
                                </Typography>
                                <CopyPathButton path={path} />
                            </Paper>
                        </Grid>
                    );
                })}
            </Grid>
        );
    }

    return (
        <Stack spacing={3}>
            {subtypes.map((subtype) => {
                const path = `${baseCampaignPath}\\${activeTypeLabel}\\${subtype.label}`;
                return (
                    <Paper
                        key={subtype.id}
                        variant="outlined"
                        onClick={() => onSubtypeClick(subtype.id)}
                        sx={{
                            p: 1.5,
                            px: 2,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            borderRadius: 1,
                            transition: `all ${motion.base}`,
                            borderColor: 'divider',
                            '&:hover': { borderColor: color, bgcolor: `${color}05` },
                        }}
                    >
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: 1,
                                bgcolor: `${color}15`,
                                color: color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <FolderIcon sx={{ fontSize: 24 }} />
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 500, flex: 1 }}>
                            {subtype.label}
                        </Typography>
                        <CopyPathButton path={path} />
                    </Paper>
                );
            })}
        </Stack>
    );
});
