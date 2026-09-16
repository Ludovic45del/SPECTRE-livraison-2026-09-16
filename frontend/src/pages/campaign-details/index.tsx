/**
 * Campaign Details Layout
 * @module pages/campaign-details
 *
 * Main layout for campaign details with tabbed navigation.
 * Uses React Router for tab routing and memoization for performance.
 */

import { memo, useMemo, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Box, Container, Alert, Skeleton, Stack } from '@mui/material';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { useCampaignBySlug } from '@entities/campaign';
import { CampaignHeader } from '@features/campaign/campaign-header';
import { paths } from '@shared/config';
import { ErrorBoundary } from '@shared/ui/ErrorBoundary';
import { RouteTransition } from '@shared/ui/RouteTransition';
import { RoutedTabs, TabItem } from '@widgets/routed-tabs';
import { CampaignOverviewPage } from './overview';
import { CampaignDocumentsPage } from './documents';
import { CampaignFsecsPage } from './fsecs';
import { CampaignFasPage } from './fas';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TABS: TabItem[] = [
    { path: 'overview', label: "Vue d'ensemble" },
    { path: 'documents', label: 'Documents' },
    { path: 'fsec', label: 'FSEC' },
    { path: 'fa', label: 'FA' },
] as const;

type TabPath = 'overview' | 'documents' | 'fsec' | 'fa';

// ─────────────────────────────────────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────────────────────────────────────

const CampaignDetailsSkeleton = memo(function CampaignDetailsSkeleton() {
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
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Extract active tab from pathname
// ─────────────────────────────────────────────────────────────────────────────

function getActiveTab(pathname: string): TabPath {
    if (pathname.includes('/documents')) return 'documents';
    if (pathname.includes('/fsec')) return 'fsec';
    if (pathname.includes('/fa')) return 'fa';
    return 'overview';
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

function CampaignDetailsPage() {
    const { campaignSlug = '' } = useParams<{ campaignSlug: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    // Fetch campaign details by slug (rétro-compat UUID gérée dans le hook).
    const { data: campaign, isLoading, error, isError } = useCampaignBySlug(campaignSlug);

    // Memoize active tab to prevent unnecessary re-renders
    const activeTab = useMemo(() => getActiveTab(location.pathname), [location.pathname]);

    // Réécrit l'URL vers le slug canonique si on est arrivé par UUID (ancien lien)
    // ou par un slug obsolète (entité renommée) — sans casser l'onglet courant.
    useEffect(() => {
        if (campaign?.slug && campaign.slug !== campaignSlug) {
            navigate(paths.campaign.tab(campaign.slug, activeTab), { replace: true });
        }
    }, [campaign?.slug, campaignSlug, activeTab, navigate]);

    // Memoize tab content to avoid re-creation
    const tabContent = useMemo(() => {
        if (!campaign) return null;

        switch (activeTab) {
            case 'overview':
                return (
                    <ErrorBoundary compact sectionName="Vue d'ensemble">
                        <CampaignOverviewPage campaign={campaign} />
                    </ErrorBoundary>
                );
            case 'documents':
                return (
                    <ErrorBoundary compact sectionName="Documents">
                        <CampaignDocumentsPage campaign={campaign} />
                    </ErrorBoundary>
                );
            case 'fsec':
                return (
                    <ErrorBoundary compact sectionName="FSEC">
                        <CampaignFsecsPage campaign={campaign} />
                    </ErrorBoundary>
                );
            case 'fa':
                return (
                    <ErrorBoundary compact sectionName="FA">
                        <CampaignFasPage campaign={campaign} />
                    </ErrorBoundary>
                );
            default:
                return null;
        }
    }, [campaign, activeTab]);

    // Loading state with skeleton
    if (isLoading) {
        return <CampaignDetailsSkeleton />;
    }

    // Error state
    if (isError || !campaign) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error" role="alert">
                    Erreur lors du chargement de la campagne:{' '}
                    {error instanceof Error ? error.message : 'Campagne introuvable'}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ py: 3 }}>
            {/* Header */}
            <CampaignHeader campaign={campaign} />

            {/* Tabs Navigation */}
            <Box component="nav" aria-label="Navigation campagne" sx={{ mt: 3 }}>
                <RoutedTabs tabs={TABS} baseUrl={paths.campaign.root(campaignSlug)} />
            </Box>

            {/* Tab Content */}
            <QueryErrorResetBoundary>
                {({ reset }) => (
                    <ErrorBoundary compact onReset={reset}>
                        <RouteTransition motionKey={activeTab}>
                            <Box component="main" role="tabpanel" aria-label={`Onglet ${activeTab}`} sx={{ mt: 3 }}>
                                {tabContent}
                            </Box>
                        </RouteTransition>
                    </ErrorBoundary>
                )}
            </QueryErrorResetBoundary>
        </Container>
    );
}

export default memo(CampaignDetailsPage);
