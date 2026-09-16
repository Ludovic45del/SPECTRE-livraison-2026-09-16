/**
 * FA Details Page - Fiche d'Anomalie
 * @module pages/fa-details
 *
 * Tabbed layout aligned with FSEC Details: Phase 1 and Phases 2 & 3
 */

import { useEffect } from 'react';
import { Box, Container, Skeleton, Stack, Alert } from '@mui/material';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useFaBySlug } from '@entities/fa';
import { FaHeader } from '@features/fa';
import { paths } from '@shared/config';
import { RouteTransition } from '@shared/ui/RouteTransition';
import { RoutedTabs, TabItem } from '@widgets/routed-tabs';
import { Phase1Tab } from './tabs/Phase1Tab';
import { Phase23Tab } from './tabs/Phase23Tab';
import 'dayjs/locale/fr';

// ============================================================================
// Constants
// ============================================================================

const FA_TABS: TabItem[] = [
    { path: 'phase1', label: 'Phase 1 - Ouvert' },
    { path: 'phase23', label: 'Phases 2 & 3' },
];

// ============================================================================
// Main Component
// ============================================================================

export default function FaDetailsPage() {
    const { faSlug = '' } = useParams<{ faSlug: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    const { data: fa, isLoading, error } = useFaBySlug(faSlug);

    // Réécrit l'URL vers le slug canonique (arrivée par UUID ancien lien ou slug
    // obsolète), en préservant l'onglet courant.
    useEffect(() => {
        if (fa?.slug && fa.slug !== faSlug) {
            navigate(location.pathname.replace(`/fa-details/${faSlug}`, `/fa-details/${fa.slug}`), {
                replace: true,
            });
        }
    }, [fa?.slug, faSlug, location.pathname, navigate]);

    // Loading state — skeleton calé sur le layout (header + tabs + contenu)
    // pour éviter le saut visuel. Le plus souvent court-circuité par le seeding
    // depuis le cache liste ; couvre surtout l'accès direct par URL.
    if (isLoading) {
        return (
            <Container maxWidth={false} sx={{ py: 3 }}>
                <Skeleton variant="rounded" height={120} sx={{ mb: 3 }} />
                <Skeleton variant="rounded" height={48} width={300} sx={{ mb: 3 }} />
                <Stack spacing={3}>
                    <Skeleton variant="rounded" height={200} />
                    <Skeleton variant="rounded" height={150} />
                </Stack>
            </Container>
        );
    }

    // Error state
    if (error || !fa) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error">
                    Erreur lors du chargement de la FA: {error instanceof Error ? error.message : 'FA introuvable'}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ py: 3 }}>
            {/* Header */}
            <FaHeader fa={fa} />

            {/* Tab bar */}
            <Box sx={{ mt: 3 }}>
                <RoutedTabs tabs={FA_TABS} baseUrl={paths.fa.root(faSlug)} />
            </Box>

            {/* Tab content */}
            <QueryErrorResetBoundary>
                {({ reset }) => (
                    <RouteTransition>
                        <Box sx={{ mt: 3 }}>
                            {(location.pathname.includes('/phase1') || location.pathname.endsWith(faSlug)) && (
                                <Phase1Tab fa={fa} onReset={reset} />
                            )}
                            {location.pathname.includes('/phase23') && <Phase23Tab fa={fa} onReset={reset} />}
                        </Box>
                    </RouteTransition>
                )}
            </QueryErrorResetBoundary>
        </Container>
    );
}
