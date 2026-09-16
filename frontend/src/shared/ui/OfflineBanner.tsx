/**
 * Offline Banner - Visual indicator when the browser loses network connectivity
 * @module shared/ui/OfflineBanner
 *
 * TanStack Query automatically pauses network requests when offline via its
 * built-in `onlineManager`; this banner surfaces that state to the user so
 * failing mutations are not perceived as silent app bugs.
 */

import { Snackbar, Alert } from '@mui/material';
import { useEffect, useState } from 'react';

function getInitialOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function OfflineBanner() {
    const [online, setOnline] = useState<boolean>(getInitialOnline);

    useEffect(() => {
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (online) return null;

    return (
        <Snackbar open anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
            <Alert severity="warning" variant="filled" sx={{ width: '100%' }}>
                Connexion réseau perdue. Les modifications seront réessayées dès la reconnexion.
            </Alert>
        </Snackbar>
    );
}
