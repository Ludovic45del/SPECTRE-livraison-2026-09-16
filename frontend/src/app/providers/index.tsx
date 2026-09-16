/**
 * App Providers - Query Client, Theme, Router
 * @module app/providers
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createAppTheme, OfflineBanner } from '@shared/ui';
import { useThemeStore } from '@shared/lib/theme.store';
import { queryClient } from '@shared/lib/query-client';
import { initApiClient } from '@shared/api';
import { useAuthStore } from '@features/auth';
import { lazy, ReactNode, Suspense, useMemo } from 'react';
// NB : le LocalizationProvider (@mui/x-date-pickers + dayjs) n'est PLUS monté
// ici — il enveloppait aussi /login et tirait date-vendor (~63K gzip) au boot.
// Il est désormais chargé en lazy dans MainLayout (pages authentifiées).

// Initialize API client with auth token provider (FSD-1 fix)
initApiClient({
    getAccessToken: () => useAuthStore.getState().getAccessToken(),
    refreshToken: () => useAuthStore.getState().refreshToken(),
    logout: () => useAuthStore.getState().logout(),
});

// Devtools React Query : chargées uniquement en dev. En prod,
// `import.meta.env.DEV` est statiquement remplacé par `false` → la branche
// `lazy(import(...))` est entièrement tree-shakée du bundle.
const ReactQueryDevtools = import.meta.env.DEV
    ? lazy(() => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })))
    : () => null;

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    const { mode } = useThemeStore();
    const theme = useMemo(() => createAppTheme(mode), [mode]);

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <OfflineBanner />
                {children}
            </ThemeProvider>
            {import.meta.env.DEV && (
                <Suspense fallback={null}>
                    <ReactQueryDevtools initialIsOpen={false} />
                </Suspense>
            )}
        </QueryClientProvider>
    );
}
