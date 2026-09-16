/**
 * FsecLockedBanner — bandeau d'avertissement quand la FSEC est tirée
 * (status_id = 7) et que toute modif du tableau récap est bloquée (CDC §4.3).
 */

import { Alert, AlertTitle } from '@mui/material';

export function FsecLockedBanner() {
    return (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
            <AlertTitle>FSEC verrouillée</AlertTitle>
            Cette FSEC est au statut « Tirée » : le tableau récap des éléments associés est en lecture seule. L'ajout,
            la modification ou la suppression de lignes sont désactivés.
        </Alert>
    );
}
