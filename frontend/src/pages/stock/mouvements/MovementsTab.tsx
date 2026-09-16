/**
 * Movements Tab — placeholder.
 *
 * Le tableau Mouvements est délibérément différé (cf. CDC + plan F7).
 * On laisse un message d'information pour ne pas casser RoutedTabs.
 */

import { Alert, AlertTitle, Box } from '@mui/material';

export function MovementsTab() {
    return (
        <Box>
            <Alert severity="info" variant="outlined">
                <AlertTitle>Onglet Mouvements — bientôt disponible</AlertTitle>
                Le suivi des mouvements de stock (entrées, sorties, ajustements) sera ajouté dans une prochaine
                itération. Le backend correspondant est déjà en place.
            </Alert>
        </Box>
    );
}
