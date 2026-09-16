/**
 * CenterMap — plan du centre (onglet « Carte »).
 * @module pages/equipe
 *
 * Affiche le plan du centre dans une surface encadrée cohérente avec le reste de
 * l'app, avec un mode plein écran zoomable. L'image est servie depuis `public/`
 * (pas un import statique) pour pouvoir être déposée/remplacée sans rebuild ; si
 * elle est absente, un état vide propre explique où la placer.
 */

import { useCallback, useState } from 'react';
import { Box, Dialog, DialogContent, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { motion, prefersReducedMotion } from '@shared/ui';

/** Plan du centre : déposer l'image dans `frontend/public/` sous ce nom. */
const CENTER_MAP_SRC = '/plan-centre.png';

export function CenterMap() {
    const [errored, setErrored] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [zoomed, setZoomed] = useState(false);

    const openFullscreen = useCallback(() => {
        setZoomed(false);
        setFullscreen(true);
    }, []);
    const closeFullscreen = useCallback(() => setFullscreen(false), []);
    const handleError = useCallback(() => setErrored(true), []);

    return (
        <Paper variant="outlined" sx={{ borderRadius: 1, borderColor: 'divider', overflow: 'hidden' }}>
            {/* En-tête de la surface */}
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
            >
                <Stack direction="row" spacing={1} alignItems="center">
                    <MapRoundedIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight={700}>
                        Plan du centre
                    </Typography>
                </Stack>
                {!errored && (
                    <Tooltip title="Plein écran" arrow>
                        <IconButton onClick={openFullscreen} size="small" aria-label="Afficher le plan en plein écran">
                            <FullscreenRoundedIcon />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>

            {/* Corps : plan ou état vide */}
            {errored ? (
                <Stack
                    alignItems="center"
                    spacing={1.5}
                    sx={{ py: 8, px: 3, color: 'text.secondary', textAlign: 'center' }}
                >
                    <MapRoundedIcon sx={{ fontSize: 48, opacity: 0.35 }} />
                    <Typography fontWeight={600}>Plan du centre à venir</Typography>
                    <Typography variant="body2">
                        Dépose l'image du plan dans <Box component="code">frontend/public/</Box> sous le nom{' '}
                        <Box component="code">plan-centre.png</Box> pour l'afficher ici.
                    </Typography>
                </Stack>
            ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, bgcolor: 'background.default' }}>
                    <Box
                        component="img"
                        src={CENTER_MAP_SRC}
                        alt="Plan du centre"
                        onError={handleError}
                        onClick={openFullscreen}
                        sx={{
                            maxWidth: '100%',
                            maxHeight: '70vh',
                            objectFit: 'contain',
                            borderRadius: 1,
                            cursor: 'zoom-in',
                            transition: motion.transition('transform', 'medium'),
                            '&:hover': { transform: 'scale(1.01)' },
                            ...prefersReducedMotion,
                        }}
                    />
                </Box>
            )}

            {/* Plein écran zoomable (clic sur l'image = bascule ajusté ↔ taille réelle) */}
            <Dialog open={fullscreen} onClose={closeFullscreen} maxWidth="xl" fullWidth>
                <IconButton
                    onClick={closeFullscreen}
                    aria-label="Fermer le plein écran"
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 1,
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'action.hover' },
                    }}
                >
                    <CloseRoundedIcon />
                </IconButton>
                <DialogContent
                    sx={{
                        p: 0,
                        overflow: 'auto',
                        bgcolor: '#000',
                        display: 'flex',
                        justifyContent: zoomed ? 'flex-start' : 'center',
                        alignItems: zoomed ? 'flex-start' : 'center',
                        minHeight: '70vh',
                    }}
                >
                    <Box
                        component="img"
                        src={CENTER_MAP_SRC}
                        alt="Plan du centre"
                        onClick={() => setZoomed((z) => !z)}
                        sx={{
                            cursor: zoomed ? 'zoom-out' : 'zoom-in',
                            maxWidth: zoomed ? 'none' : '100%',
                            maxHeight: zoomed ? 'none' : '85vh',
                            objectFit: 'contain',
                            m: 'auto',
                        }}
                    />
                </DialogContent>
            </Dialog>
        </Paper>
    );
}
