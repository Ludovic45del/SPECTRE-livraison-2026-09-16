/**
 * FSEC Details Page
 * @module pages/fsec-details
 *
 * Style: Aligned with CampaignDetailsPage
 */

import { useMemo, useEffect } from 'react';
import { Box, Container, Skeleton, Stack, Alert } from '@mui/material';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useFsecBySlug } from '@entities/fsec';
import { paths } from '@shared/config';
import { ErrorBoundary, RouteTransition } from '@shared/ui';
import { useCampaignTeam } from '@entities/campaign/team';
import { useFsecDocumentsByFsec } from '@entities/fsec/document';
import { RoutedTabs, TabItem } from '@widgets/routed-tabs';
import { FsecHeader } from '@features/fsec/fsec-header';
import { OverviewTab } from './tabs/OverviewTab';
import { AssemblyTab } from './tabs/AssemblyTab';
import { ControleTab } from './tabs/ControleTab';
import { PicturesTab } from './tabs/PicturesTab';
import { GasStepsTab } from './tabs/GasStepsTab';
import { ResultsTab } from './tabs/ResultsTab';
import 'dayjs/locale/fr';

const BASE_TABS: TabItem[] = [
    { path: 'overview', label: "Vue d'ensemble" },
    { path: 'assemblage', label: 'Assemblage' },
    { path: 'controle', label: 'Contrôle métrologique' },
    { path: 'photos', label: 'Vue/Photo' },
];

const GAS_TAB: TabItem = { path: 'gaz', label: 'Gaz' };
const RESULTS_TAB: TabItem = { path: 'resultats', label: 'Alignement/Livraison/Résultats' };

function getTabs(categoryId: number | null | undefined): TabItem[] {
    const hasGas = categoryId != null && categoryId !== 0;
    return hasGas ? [...BASE_TABS, GAS_TAB, RESULTS_TAB] : [...BASE_TABS, RESULTS_TAB];
}

export default function FsecDetailsPage() {
    const { fsecSlug = '' } = useParams<{ fsecSlug: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    const { data: fsec, isLoading, error } = useFsecBySlug(fsecSlug);
    // version_uuid canonique : les onglets enfants requêtent par version_uuid,
    // pas par slug. Disponible une fois le FSEC chargé.
    const versionUuid = fsec?.versionUuid ?? '';
    const { data: campaignTeam } = useCampaignTeam(fsec?.campaignId ?? '');
    const { data: documents } = useFsecDocumentsByFsec(versionUuid);

    const tabs = useMemo(() => getTabs(fsec?.categoryId ?? null), [fsec?.categoryId]);
    const hasGas = fsec?.categoryId != null && fsec?.categoryId !== 0;

    // Réécrit l'URL vers le slug canonique (arrivée par UUID ancien lien ou slug
    // obsolète), en préservant l'onglet courant.
    useEffect(() => {
        if (fsec?.slug && fsec.slug !== fsecSlug) {
            navigate(location.pathname.replace(`/fsec-details/${fsecSlug}`, `/fsec-details/${fsec.slug}`), {
                replace: true,
            });
        }
    }, [fsec?.slug, fsecSlug, location.pathname, navigate]);

    // Guard clause AFTER all hooks (React Rules of Hooks)
    if (!fsecSlug) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error">Identifiant FSEC manquant dans l'URL</Alert>
            </Container>
        );
    }

    // Skeleton calé sur le layout (header + barre d'onglets + contenu) → pas de
    // saut visuel. Souvent court-circuité par le seeding depuis le cache liste.
    if (isLoading) {
        return (
            <Container maxWidth={false} sx={{ py: 3 }}>
                <Skeleton variant="rounded" height={120} sx={{ mb: 3 }} />
                <Skeleton variant="rounded" height={48} width={420} sx={{ mb: 3 }} />
                <Stack spacing={3}>
                    <Skeleton variant="rounded" height={220} />
                    <Skeleton variant="rounded" height={160} />
                </Stack>
            </Container>
        );
    }

    if (error || !fsec) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error">
                    Erreur lors du chargement du FSEC: {error instanceof Error ? error.message : 'FSEC introuvable'}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ py: 3 }}>
            {/* Header */}
            <FsecHeader fsec={fsec} />

            {/* Tabs */}
            <Box sx={{ mt: 3 }}>
                <RoutedTabs tabs={tabs} baseUrl={paths.fsec.root(fsecSlug)} />
            </Box>

            {/* Content - EB-1 fix: each tab wrapped in ErrorBoundary */}
            <QueryErrorResetBoundary>
                {({ reset }) => (
                    <RouteTransition>
                        <Box sx={{ mt: 3 }}>
                            {(location.pathname.includes('/overview') || location.pathname.endsWith(fsecSlug)) && (
                                <ErrorBoundary compact onReset={reset}>
                                    <OverviewTab fsec={fsec} campaignTeam={campaignTeam} documents={documents} />
                                </ErrorBoundary>
                            )}
                            {location.pathname.includes('/assemblage') && (
                                <ErrorBoundary compact onReset={reset}>
                                    <AssemblyTab fsec={fsec} />
                                </ErrorBoundary>
                            )}
                            {location.pathname.includes('/controle') && (
                                <ErrorBoundary compact onReset={reset}>
                                    <ControleTab fsecVersionId={versionUuid} />
                                </ErrorBoundary>
                            )}
                            {location.pathname.includes('/photos') && (
                                <ErrorBoundary compact onReset={reset}>
                                    <PicturesTab fsecVersionId={versionUuid} />
                                </ErrorBoundary>
                            )}
                            {hasGas && location.pathname.includes('/gaz') && (
                                <ErrorBoundary compact onReset={reset}>
                                    <GasStepsTab fsecVersionId={versionUuid} categoryId={fsec.categoryId} />
                                </ErrorBoundary>
                            )}
                            {location.pathname.includes('/resultats') && (
                                <ErrorBoundary compact onReset={reset}>
                                    <ResultsTab fsec={fsec} />
                                </ErrorBoundary>
                            )}
                        </Box>
                    </RouteTransition>
                )}
            </QueryErrorResetBoundary>
        </Container>
    );
}
