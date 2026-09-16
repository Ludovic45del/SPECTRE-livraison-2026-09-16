/**
 * Types Grid View - Level 1 (Root) folder display
 * @module pages/campaign-details/documents/components
 */

import { memo } from 'react';
import { Box, Typography, Grid, Paper, Stack, IconButton } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { TYPE_COLORS } from '../lib/documents.types';
import { CopyPathButton } from '../lib/documents.helpers';
import { copyToClipboard } from '@shared/lib';
import { useNotification } from '@shared/ui';
import { motion } from '@shared/ui/motion';

interface TypesGridViewProps {
    types: { id: number; label: string }[];
    baseCampaignPath: string;
    viewMode: 'grid' | 'list';
    onTypeClick: (typeId: number) => void;
}

export const TypesGridView = memo(function TypesGridView({
    types,
    baseCampaignPath,
    viewMode,
    onTypeClick,
}: TypesGridViewProps) {
    const { showNotification } = useNotification();

    /** Copie le chemin avec repli hors contexte sécurisé + notification du résultat. */
    const handleCopyPath = (path: string) => {
        void copyToClipboard(path).then((copied) => {
            if (copied) {
                showNotification('Chemin copié', 'success');
            } else {
                showNotification('Impossible de copier le chemin', 'error');
            }
        });
    };

    if (viewMode === 'grid') {
        return (
            <Grid container spacing={3}>
                {types.map((type) => {
                    const color = TYPE_COLORS[type.id] || '#999';
                    const path = `${baseCampaignPath}\\${type.label}`;
                    return (
                        <Grid item xs={12} sm={6} md={4} key={type.id}>
                            <Paper
                                variant="outlined"
                                onClick={() => onTypeClick(type.id)}
                                sx={{
                                    p: 3,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    borderRadius: 1,
                                    transition: `all ${motion.base}`,
                                    borderColor: 'divider',
                                    position: 'relative',
                                    '&:hover': {
                                        borderColor: color,
                                        boxShadow: 2,
                                        transform: 'translateY(-4px)',
                                        bgcolor: 'background.paper',
                                    },
                                }}
                            >
                                <IconButton
                                    color="primary"
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyPath(path);
                                    }}
                                    sx={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        borderRadius: 1,
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        '&:hover': { bgcolor: 'primary.dark' },
                                    }}
                                >
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                                <Box
                                    sx={{
                                        mb: 2,
                                        p: 2,
                                        borderRadius: '50%',
                                        bgcolor: `${color}15`,
                                        color: color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <FolderIcon sx={{ fontSize: 48 }} />
                                </Box>
                                <Typography variant="h6" align="center" gutterBottom sx={{ fontWeight: 600 }}>
                                    {type.label}
                                </Typography>
                            </Paper>
                        </Grid>
                    );
                })}
            </Grid>
        );
    }

    return (
        <Stack spacing={3}>
            {types.map((type) => {
                const color = TYPE_COLORS[type.id] || '#999';
                const path = `${baseCampaignPath}\\${type.label}`;
                return (
                    <Paper
                        key={type.id}
                        variant="outlined"
                        onClick={() => onTypeClick(type.id)}
                        sx={{
                            p: 2,
                            px: 3,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            borderRadius: 1,
                            transition: `all ${motion.base}`,
                            borderColor: 'divider',
                            '&:hover': { borderColor: color, bgcolor: `${color}05` },
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
                            <FolderIcon sx={{ fontSize: 32 }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {type.label}
                            </Typography>
                        </Box>
                        <CopyPathButton path={path} />
                    </Paper>
                );
            })}
        </Stack>
    );
});
