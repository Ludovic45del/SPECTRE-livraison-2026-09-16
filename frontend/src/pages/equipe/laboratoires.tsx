/**
 * Annuaire des labos — numéros utiles (sous-section de « Équipe et Carte »).
 * @module pages/equipe
 *
 * Sous-page atteinte via la sidebar (comme Équipe / Carte). Liste partagée et
 * éditable par tout utilisateur authentifié ; le contenu vit dans
 * LabContactsDirectory.
 */

import { Container, Typography } from '@mui/material';
import { LabContactsDirectory } from './components/LabContactsDirectory';
import { VISUALLY_HIDDEN } from './constants';

export default function EquipeLaboratoiresPage() {
    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <Typography variant="h4" component="h1" sx={VISUALLY_HIDDEN}>
                Annuaire des laboratoires
            </Typography>
            <LabContactsDirectory />
        </Container>
    );
}
