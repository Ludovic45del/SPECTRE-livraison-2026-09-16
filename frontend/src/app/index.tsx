/**
 * App Entry Point
 * @module app
 */

import { RouterProvider } from 'react-router-dom';
import { Providers } from './providers';
import { router } from './router';
import { NotificationSnackbar } from '@shared/ui';

// Opt-in to React Router v7 behavior: wrap state updates in
// `React.startTransition`. Mirrors v7's default behavior to avoid a breaking
// change on the future upgrade.
const ROUTER_FUTURE_FLAGS = { v7_startTransition: true } as const;

export function App() {
    return (
        <Providers>
            <RouterProvider router={router} future={ROUTER_FUTURE_FLAGS} />
            <NotificationSnackbar />
        </Providers>
    );
}
