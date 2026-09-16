/**
 * Level 3 Content View - Folders + Files table
 * @module pages/campaign-details/documents/components
 */

import { memo, useMemo } from 'react';
import { Box, Typography, Grid, Paper, Stack } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import { Column, DataTable } from '@widgets/data-table';
import { Level3Item, TYPE_COLORS } from '../lib/documents.types';
import { getFileIcon, getFolderIcon, CopyPathButton } from '../lib/documents.helpers';
import { motion } from '@shared/ui/motion';

interface Level3ContentViewProps {
    folders: Level3Item[];
    files: Level3Item[];
    activeTypeId: number | null;
    viewMode: 'grid' | 'list';
    isLoading: boolean;
}

export const Level3ContentView = memo(function Level3ContentView({
    folders,
    files,
    activeTypeId,
    viewMode,
    isLoading,
}: Level3ContentViewProps) {
    const color = activeTypeId !== null ? TYPE_COLORS[activeTypeId] : '#999';

    const fileColumns: Column<Level3Item>[] = useMemo(
        () => [
            {
                id: 'name',
                label: 'Documents',
                render: (row) => {
                    const isFileLike = row.name.includes('.');
                    return (
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ width: '100%', py: 1 }}
                        >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                {row.type === 'folder' && !isFileLike ? (
                                    <FolderIcon sx={{ color: color, fontSize: 28 }} />
                                ) : (
                                    getFileIcon(row.name)
                                )}
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {row.name}
                                </Typography>
                            </Stack>
                            {row.path && row.path !== '-' && <CopyPathButton path={row.path} />}
                        </Stack>
                    );
                },
            },
        ],
        [color],
    );

    if (folders.length === 0 && files.length === 0) {
        return (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                Aucun élément disponible dans ce dossier.
            </Typography>
        );
    }

    return (
        <Box>
            {/* Folders as Cards */}
            {folders.length > 0 && (
                <Box sx={{ mb: files.length > 0 ? 4 : 0 }}>
                    {viewMode === 'grid' ? (
                        <Grid container spacing={3}>
                            {folders.map((item) => (
                                <Grid item xs={12} sm={6} md={4} key={item.id}>
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            borderRadius: 1,
                                            transition: `all ${motion.base}`,
                                            borderColor: 'divider',
                                            '&:hover': { borderColor: color, bgcolor: 'background.paper' },
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                                                {getFolderIcon(item.name, 28, color)}
                                            </Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 500, flex: 1 }}>
                                                {item.name}
                                            </Typography>
                                            {item.path && <CopyPathButton path={item.path} />}
                                        </Box>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Stack spacing={3}>
                            {folders.map((item) => (
                                <Paper
                                    key={item.id}
                                    variant="outlined"
                                    sx={{
                                        p: 1.5,
                                        px: 2,
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
                                        {getFolderIcon(item.name, 24, color)}
                                    </Box>
                                    <Typography variant="body1" sx={{ fontWeight: 500, flex: 1 }}>
                                        {item.name}
                                    </Typography>
                                    {item.path && <CopyPathButton path={item.path} />}
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </Box>
            )}

            {/* Direct Files Table */}
            {files.length > 0 && (
                <Box>
                    {folders.length > 0 && (
                        <Typography
                            variant="overline"
                            display="block"
                            sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}
                        >
                            Fichiers à la racine
                        </Typography>
                    )}
                    <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden', borderColor: 'divider' }}>
                        <DataTable
                            columns={fileColumns}
                            data={files}
                            isLoading={isLoading}
                            emptyMessage="Aucun fichier disponible."
                        />
                    </Paper>
                </Box>
            )}
        </Box>
    );
});
