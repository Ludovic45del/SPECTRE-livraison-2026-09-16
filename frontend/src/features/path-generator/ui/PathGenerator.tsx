/**
 * Path Generator Component
 * @module features/path-generator/ui
 */

import { Box, Paper, Typography, IconButton, Tooltip, Stack, Chip, Divider } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import LaptopWindowsIcon from '@mui/icons-material/LaptopWindows';
import { CampaignWithRelations } from '@entities/campaign';
import { useNotification } from '@shared/ui';
import { copyToClipboard } from '@shared/lib';
import { useState } from 'react';
import { motion } from '@shared/ui/motion';

interface PathGeneratorProps {
    campaign: CampaignWithRelations;
    segments: string[];
}

export function PathGenerator({ campaign, segments }: PathGeneratorProps) {
    const { showNotification } = useNotification();
    const [isHovered, setIsHovered] = useState(false);

    // Build the path dynamically
    // Pattern: P:\<Installation>\<Year>\<CampaignName>\<Segments...>
    const drive = 'P:';
    const installation = campaign.installation?.label ?? 'INCONNU';
    const year = campaign.year.toString();
    const name = campaign.name;

    // Construct full path for clipboard
    const fullPath = [drive, installation, year, name, ...segments].join('\\');

    const handleCopy = async () => {
        // copyToClipboard gère le repli execCommand hors contexte sécurisé (http
        // réseau fermé, où navigator.clipboard est indisponible) et ne throw jamais.
        const ok = await copyToClipboard(fullPath);
        if (ok) {
            showNotification('Chemin copié dans le presse-papier !', 'success');
        } else {
            showNotification('Impossible de copier — sélectionnez le chemin manuellement', 'error');
        }
    };

    const PathSegment = ({ label, isLast = false }: { label: string; isLast?: boolean }) => (
        <Stack direction="row" alignItems="center" spacing={0.5}>
            <Chip
                label={label}
                icon={isLast ? <FolderOpenIcon fontSize="small" /> : <FolderIcon fontSize="small" />}
                size="small"
                sx={{
                    bgcolor: isLast ? 'primary.main' : 'rgba(255, 255, 255, 0.1)',
                    color: isLast ? 'white' : 'text.primary',
                    fontWeight: isLast ? 'bold' : 'normal',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid',
                    borderColor: 'divider',
                    '& .MuiChip-icon': {
                        color: isLast ? 'white' : 'inherit',
                    },
                }}
            />
            {!isLast && <NavigateNextIcon fontSize="small" color="disabled" />}
        </Stack>
    );

    return (
        <Paper
            elevation={0}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            sx={{
                p: 2,
                mb: 3,
                background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                transition: `all ${motion.medium}`,
                '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                },
            }}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ overflow: 'hidden' }}>
                    <Box
                        sx={{
                            p: 1,
                            borderRadius: '12px',
                            bgcolor: 'primary.main',
                            color: 'white',
                            display: 'flex',
                            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                        }}
                    >
                        <LaptopWindowsIcon fontSize="small" />
                    </Box>

                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.5}
                        sx={{
                            overflowX: 'auto',
                            scrollbarWidth: 'none',
                            '&::-webkit-scrollbar': { display: 'none' },
                        }}
                    >
                        <PathSegment label={drive} />
                        <PathSegment label={installation} />
                        <PathSegment label={year} />
                        <PathSegment label={name} />

                        {/* Dynamic Segments */}
                        {segments.map((seg, index) => (
                            <PathSegment key={index} label={seg} isLast={index === segments.length - 1} />
                        ))}
                    </Stack>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1}>
                    <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center' }} />
                    <Tooltip title="Copier le chemin Windows" arrow>
                        <IconButton
                            onClick={handleCopy}
                            color={isHovered ? 'primary' : 'default'}
                            sx={{
                                transition: `all ${motion.base}`,
                                bgcolor: isHovered ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                            }}
                        >
                            <ContentCopyIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            {/* Visual Text Representation for clarity */}
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                    mt: 1,
                    display: 'block',
                    fontFamily: 'monospace',
                    pl: 6.5,
                    opacity: 0.7,
                }}
            >
                {fullPath}
            </Typography>
        </Paper>
    );
}
