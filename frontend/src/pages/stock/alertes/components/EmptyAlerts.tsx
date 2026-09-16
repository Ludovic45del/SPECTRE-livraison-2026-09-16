/**
 * EmptyAlerts — état vide de l'onglet Alertes (aucune alerte active).
 *
 * Aligné visuellement sur `EmptyCatalog` (pastille ronde + titre + texte),
 * mais en tonalité « succès » plutôt que « primary ».
 */

import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export function EmptyAlerts() {
    return (
        <Stack alignItems="center" spacing={2.5} sx={{ py: 8 }}>
            <Box
                sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: (t) => alpha(t.palette.success.main, 0.12),
                    color: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <CheckCircleOutlineIcon sx={{ fontSize: 36 }} />
            </Box>
            <Stack alignItems="center" spacing={0.5} sx={{ maxWidth: 420, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Aucune alerte active
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Tous les consommables sont au-dessus de leur seuil et les dates de péremption sont respectées.
                </Typography>
            </Stack>
        </Stack>
    );
}
