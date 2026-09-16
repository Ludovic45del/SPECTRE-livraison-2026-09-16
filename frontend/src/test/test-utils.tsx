/**
 * Test Utilities
 *
 * Custom render function and utilities for testing React components
 * with all necessary providers (QueryClient, Router, Theme, etc.)
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/fr';

// ============================================================================
// QUERY CLIENT FOR TESTS
// ============================================================================

/**
 * Create a fresh QueryClient for each test to ensure isolation.
 */
export const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                retry: false, // Don't retry failed queries in tests
                gcTime: 0, // Disable garbage collection time
                staleTime: 0, // Always consider data stale
            },
            mutations: {
                retry: false, // Don't retry failed mutations
            },
        },
    });

// ============================================================================
// PROVIDER WRAPPER
// ============================================================================

interface WrapperProps {
    children: ReactNode;
    queryClient?: QueryClient;
    routerProps?: MemoryRouterProps;
}

/**
 * Wrapper component that provides all necessary context providers.
 */
const AllProviders = ({ children, queryClient, routerProps }: WrapperProps) => {
    const client = queryClient ?? createTestQueryClient();

    return (
        <QueryClientProvider client={client}>
            <MemoryRouter {...routerProps}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                    <CssBaseline />
                    {children}
                </LocalizationProvider>
            </MemoryRouter>
        </QueryClientProvider>
    );
};

// ============================================================================
// CUSTOM RENDER
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    queryClient?: QueryClient;
    routerProps?: MemoryRouterProps;
    initialEntries?: string[];
}

/**
 * Custom render function that wraps components with all providers.
 *
 * @example
 * ```tsx
 * const { getByText } = renderWithProviders(<MyComponent />);
 * ```
 *
 * @example With initial route
 * ```tsx
 * const { getByText } = renderWithProviders(<MyComponent />, {
 *   initialEntries: ['/campaigns/123'],
 * });
 * ```
 */
export const renderWithProviders = (
    ui: ReactElement,
    { queryClient, routerProps, initialEntries, ...options }: CustomRenderOptions = {},
): RenderResult & { queryClient: QueryClient } => {
    const client = queryClient ?? createTestQueryClient();

    const mergedRouterProps: MemoryRouterProps = {
        initialEntries: initialEntries ?? ['/'],
        ...routerProps,
    };

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <AllProviders queryClient={client} routerProps={mergedRouterProps}>
            {children}
        </AllProviders>
    );

    return {
        ...render(ui, { wrapper: Wrapper, ...options }),
        queryClient: client,
    };
};

// ============================================================================
// QUERY WRAPPER FOR HOOK TESTING
// ============================================================================

/**
 * Create a wrapper for testing hooks with React Query.
 *
 * @example
 * ```tsx
 * const { result } = renderHook(() => useCampaigns(), {
 *   wrapper: createQueryWrapper(),
 * });
 * ```
 */
export const createQueryWrapper = (queryClient?: QueryClient) => {
    const client = queryClient ?? createTestQueryClient();

    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
                    {children}
                </LocalizationProvider>
            </MemoryRouter>
        </QueryClientProvider>
    );
};

// ============================================================================
// USER EVENT SETUP
// ============================================================================

/**
 * Setup user event for testing user interactions.
 * Returns both the render result and the user event instance.
 *
 * @example
 * ```tsx
 * const { user, getByRole } = setup(<MyButton />);
 * await user.click(getByRole('button'));
 * ```
 */
export const setup = (ui: ReactElement, options?: CustomRenderOptions) => {
    return {
        user: userEvent.setup(),
        ...renderWithProviders(ui, options),
    };
};

// ============================================================================
// WAIT HELPERS
// ============================================================================

/**
 * Wait for a specified amount of time (useful for debounce/throttle testing).
 */
export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Flush all pending promises (useful after state updates).
 */
export const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

// ============================================================================
// RE-EXPORTS
// ============================================================================

// Re-export everything from Testing Library for convenience
export * from '@testing-library/react';
export { userEvent };

// Export the server for handler overrides in tests
export { server } from './mocks/server';
export { errorHandlers, emptyHandlers } from './mocks/handlers';

// ============================================================================
// ACCESSIBILITY TESTING (axe-core)
// ============================================================================

export { axe } from 'vitest-axe';
