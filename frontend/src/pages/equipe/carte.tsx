/**
 * Carte — plan du centre (sous-section « Carte » de « Équipe et Carte »).
 * @module pages/equipe
 *
 * Sous-page atteinte via la sidebar (comme Indicateurs FA / FSEC). Le contenu
 * (surface encadrée + plein écran zoomable) vit dans CenterMap.
 */

import { Container, Typography } from '@mui/material';
import { CenterMap } from './components/CenterMap';
import { VISUALLY_HIDDEN } from './constants';

export default function EquipeCartePage() {
    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <Typography variant="h4" component="h1" sx={VISUALLY_HIDDEN}>
                Carte du centre
            </Typography>
            <CenterMap />
        </Container>
    );
}
