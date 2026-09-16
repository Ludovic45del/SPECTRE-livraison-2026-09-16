/**
 * Matériel — layout du module (nested routes).
 * @module pages/materiel
 *
 * Le sous-routage est défini dans app/router (routes nested), ce composant
 * ne fait que rendre l'Outlet avec un Suspense local pour le lazy-loading.
 */

import { memo, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Outlet } from 'react-router-dom';

function LocalLoader() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '30vh' }}>
            <CircularProgress size={24} />
        </Box>
    );
}

const MaterielPage = memo(function MaterielPage() {
    return (
        <Suspense fallback={<LocalLoader />}>
            <Outlet />
        </Suspense>
    );
});

export default MaterielPage;
