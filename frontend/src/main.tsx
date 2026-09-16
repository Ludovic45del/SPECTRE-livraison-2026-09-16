// Subset latin uniquement (app FR) : évite d'émettre les sous-ensembles
// cyrillic/greek/vietnamese dans dist et de polluer les candidats au préchargement.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import 'dayjs/locale/fr';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';

dayjs.extend(isoWeek);
dayjs.locale('fr');

// MSW is only bundled into the Lighthouse build (vite build --mode lighthouse)
// where .env.lighthouse sets VITE_ENABLE_MSW=true. The dynamic import keeps
// it out of the regular dev/prod bundles.
async function enableMockingIfNeeded(): Promise<void> {
    if (import.meta.env.VITE_ENABLE_MSW !== 'true') return;
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
}

void enableMockingIfNeeded().then(() => {
    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
});
