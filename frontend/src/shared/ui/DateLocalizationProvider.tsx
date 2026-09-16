/**
 * DateLocalizationProvider
 * @module shared/ui/DateLocalizationProvider
 *
 * Isole @mui/x-date-pickers + dayjs (chunk `date-vendor`, ~63K gzip) dans un
 * composant chargé en lazy, monté uniquement dans MainLayout (pages
 * authentifiées). Les routes publiques (/login, /auth/*) n'embarquent donc plus
 * date-vendor au boot.
 *
 * NB : ne PAS réexporter ce composant depuis le barrel `shared/ui` — l'importer
 * uniquement en `lazy(() => import('@shared/ui/DateLocalizationProvider'))` pour
 * que le tree-shaking garde date-vendor hors du graphe d'entrée.
 */

import type { ReactNode } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/fr';

export default function DateLocalizationProvider({ children }: { children: ReactNode }) {
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
            {children}
        </LocalizationProvider>
    );
}
