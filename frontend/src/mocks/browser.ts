/**
 * MSW browser worker — only used by the Lighthouse build (mode=lighthouse).
 * Activated in main.tsx when import.meta.env.VITE_ENABLE_MSW === 'true'.
 */
import { setupWorker } from 'msw/browser';

import { lighthouseHandlers } from './lighthouse-handlers';

export const worker = setupWorker(...lighthouseHandlers);
