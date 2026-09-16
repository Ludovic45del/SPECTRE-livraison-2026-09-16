/**
 * Error Boundary Component
 * @module shared/ui/ErrorBoundary
 *
 * Catches JavaScript errors in child component tree and displays fallback UI.
 * Prevents entire app from crashing when a section fails.
 */

import { Component, ReactNode } from 'react';
import { Paper, Typography, Button, Stack, Alert } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
    children: ReactNode;
    /** Custom fallback component */
    fallback?: ReactNode;
    /** Section name for error message */
    sectionName?: string;
    /** Callback when error occurs */
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    /** Callback when user clicks retry (e.g. to reset TanStack Query errors) */
    onReset?: () => void;
    /** Show compact version */
    compact?: boolean;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = (): void => {
        this.props.onReset?.();
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        const { hasError, error } = this.state;
        const { children, fallback, sectionName, compact } = this.props;

        if (hasError) {
            // Custom fallback
            if (fallback) {
                return fallback;
            }

            // Compact version for sections
            if (compact) {
                return (
                    <Alert
                        severity="error"
                        action={
                            <Button color="inherit" size="small" onClick={this.handleRetry} startIcon={<RefreshIcon />}>
                                Réessayer
                            </Button>
                        }
                    >
                        {sectionName ? `Erreur dans la section "${sectionName}"` : 'Une erreur est survenue'}
                    </Alert>
                );
            }

            // Full version
            return (
                <Paper
                    variant="outlined"
                    sx={{
                        p: 4,
                        borderColor: 'error.light',
                        bgcolor: 'error.lighter',
                        borderRadius: 1,
                    }}
                    role="alert"
                >
                    <Stack spacing={2} alignItems="center" textAlign="center">
                        <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main' }} aria-hidden="true" />
                        <Typography variant="h6" color="error.main">
                            {sectionName ? `Erreur dans "${sectionName}"` : 'Une erreur est survenue'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {error?.message || "Une erreur inattendue s'est produite."}
                        </Typography>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={this.handleRetry}
                            startIcon={<RefreshIcon />}
                        >
                            Réessayer
                        </Button>
                    </Stack>
                </Paper>
            );
        }

        return children;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HOC for functional components
// ─────────────────────────────────────────────────────────────────────────────

export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    sectionName?: string,
): React.FC<P> {
    const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

    const ComponentWithErrorBoundary: React.FC<P> = (props) => (
        <ErrorBoundary sectionName={sectionName} compact>
            <WrappedComponent {...props} />
        </ErrorBoundary>
    );

    ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

    return ComponentWithErrorBoundary;
}
