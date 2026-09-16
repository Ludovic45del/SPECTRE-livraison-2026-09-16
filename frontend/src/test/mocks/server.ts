/**
 * MSW Server Configuration
 *
 * Sets up the Mock Service Worker server for Node.js environment (tests).
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create the MSW server with default handlers
export const server = setupServer(...handlers);
