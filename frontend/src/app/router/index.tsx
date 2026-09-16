/**
 * App Router - Lazy-loaded routes with authentication
 * @module app/router
 */

import { Suspense } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { MainLayout } from '../layouts';
import { useAuthStore } from '@features/auth';
import { ErrorBoundary } from '@shared/ui/ErrorBoundary';
import { lazyWithRetry, pageImports } from './page-loaders';

// Lazy-loaded pages — chunks déclarés dans page-loaders.ts (partagés avec le
// prefetch d'intention). `lazyWithRetry` recharge proprement après un
// redéploiement (chunk au hash périmé).
const LoginPage = lazyWithRetry(pageImports.login);
const SetInitialPasswordPage = lazyWithRetry(pageImports.setInitialPassword);
const HomePage = lazyWithRetry(pageImports.home);
const ChangePasswordPage = lazyWithRetry(pageImports.changePassword);
const CampaignsPage = lazyWithRetry(pageImports.campaigns);
const CampaignDetailsPage = lazyWithRetry(pageImports.campaignDetails);
const FsecsPage = lazyWithRetry(pageImports.fsecs);
const FsecDetailsPage = lazyWithRetry(pageImports.fsecDetails);
const FasPage = lazyWithRetry(pageImports.fas);
const FaDetailsPage = lazyWithRetry(pageImports.faDetails);
const EmbasesPage = lazyWithRetry(pageImports.embases);
const EmbaseDetailsPage = lazyWithRetry(pageImports.embaseDetails);
const PlanningPage = lazyWithRetry(pageImports.planning);
const IndicateursFaPage = lazyWithRetry(pageImports.indicateursFa);
const IndicateursFsecPage = lazyWithRetry(pageImports.indicateursFsec);
const IndicateursCampagnePage = lazyWithRetry(pageImports.indicateursCampagne);
const StockPage = lazyWithRetry(pageImports.stock);
const MaterielPage = lazyWithRetry(pageImports.materiel);
const MaterielMachinesView = lazyWithRetry(pageImports.materielMachines);
const EquipeAnnuairePage = lazyWithRetry(pageImports.equipeAnnuaire);
const EquipeCartePage = lazyWithRetry(pageImports.equipeCarte);
const EquipeLaboratoiresPage = lazyWithRetry(pageImports.equipeLaboratoires);
const MessageriePage = lazyWithRetry(pageImports.messagerie);

// Minimal loader for login page Suspense
function LoginLoader() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
        </Box>
    );
}

// QueryErrorResetBoundary + ErrorBoundary wrapper
function QuerySafeErrorBoundary({ sectionName, children }: { sectionName: string; children: React.ReactNode }) {
    // `key={pathname}` remonte l'ErrorBoundary à chaque navigation → une page
    // qui a throw ne reste pas collée à l'écran quand on clique ailleurs.
    const location = useLocation();
    return (
        <QueryErrorResetBoundary>
            {({ reset }) => (
                <ErrorBoundary key={location.pathname} onReset={reset} sectionName={sectionName}>
                    {children}
                </ErrorBoundary>
            )}
        </QueryErrorResetBoundary>
    );
}

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const tokens = useAuthStore((state) => state.tokens);
    const forcePasswordChange = useAuthStore((state) => state.forcePasswordChange);
    const location = useLocation();

    // If store says authenticated but tokens are missing/invalid, force logout
    if (!isAuthenticated || !tokens?.access || !tokens?.refresh) {
        return <Navigate to="/login" replace />;
    }

    // Force password change redirect
    if (forcePasswordChange && location.pathname !== '/changer-mot-de-passe') {
        return <Navigate to="/changer-mot-de-passe" replace />;
    }

    return <>{children}</>;
}

// Public Route wrapper (redirect to home if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

export const router = createBrowserRouter([
    {
        path: '/login',
        element: (
            <PublicRoute>
                <Suspense fallback={<LoginLoader />}>
                    <LoginPage />
                </Suspense>
            </PublicRoute>
        ),
    },
    {
        path: '/auth/set-initial-password',
        element: (
            <Suspense fallback={<LoginLoader />}>
                <SetInitialPasswordPage />
            </Suspense>
        ),
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <MainLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: (
                    <QuerySafeErrorBoundary sectionName="Accueil">
                        <HomePage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'campagnes',
                element: (
                    <QuerySafeErrorBoundary sectionName="Campagnes">
                        <CampaignsPage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'campagne-details/:campaignSlug/*',
                element: (
                    <QuerySafeErrorBoundary sectionName="Détails campagne">
                        <CampaignDetailsPage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'fsecs',
                element: (
                    <QuerySafeErrorBoundary sectionName="FSECs">
                        <FsecsPage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'fsec-details/:fsecSlug/*',
                element: (
                    <QuerySafeErrorBoundary sectionName="Détails FSEC">
                        <FsecDetailsPage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'fas',
                element: (
                    <QuerySafeErrorBoundary sectionName="Fiches d'Anomalie">
                        <FasPage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'fa-details/:faSlug/*',
                element: (
                    <QuerySafeErrorBoundary sectionName="Détails FA">
                        <FaDetailsPage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'embases',
                element: (
                    <QuerySafeErrorBoundary sectionName="Embases">
                        <EmbasesPage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'embase-details/:embaseSlug/*',
                element: (
                    <QuerySafeErrorBoundary sectionName="Détails Embase">
                        <EmbaseDetailsPage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'planning',
                element: (
                    <QuerySafeErrorBoundary sectionName="Planning">
                        <PlanningPage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'indicateurs',
                element: <Navigate to="/indicateurs/fa" replace />,
            },
            {
                path: 'indicateurs/fa',
                element: (
                    <QuerySafeErrorBoundary sectionName="Indicateurs FA">
                        <IndicateursFaPage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'indicateurs/fsec',
                element: (
                    <QuerySafeErrorBoundary sectionName="Indicateurs FSEC">
                        <IndicateursFsecPage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'indicateurs/campagne',
                element: (
                    <QuerySafeErrorBoundary sectionName="Indicateurs Campagnes">
                        <IndicateursCampagnePage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'stock',
                element: <Navigate to="/stock/catalogue" replace />,
            },
            {
                path: 'stock/*',
                element: (
                    <QuerySafeErrorBoundary sectionName="Stock">
                        <StockPage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'materiel',
                element: (
                    <QuerySafeErrorBoundary sectionName="Matériel">
                        <MaterielPage />
                    </QuerySafeErrorBoundary>
                ),
                children: [{ index: true, element: <MaterielMachinesView /> }],
            },
            {
                path: 'equipe',
                element: <Navigate to="/equipe/annuaire" replace />,
            },
            {
                path: 'equipe/annuaire',
                element: (
                    <QuerySafeErrorBoundary sectionName="Équipe">
                        <EquipeAnnuairePage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'equipe/carte',
                element: (
                    <QuerySafeErrorBoundary sectionName="Carte du centre">
                        <EquipeCartePage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'equipe/laboratoires',
                element: (
                    <QuerySafeErrorBoundary sectionName="Annuaire des laboratoires">
                        <EquipeLaboratoiresPage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                // Segment optionnel : `/messagerie` (liste seule) ou `/messagerie/:uuid` (fil ouvert).
                path: 'messagerie/:conversationUuid?',
                element: (
                    <QuerySafeErrorBoundary sectionName="Messagerie">
                        <MessageriePage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: 'changer-mot-de-passe',
                element: (
                    <QuerySafeErrorBoundary sectionName="Changement de mot de passe">
                        <ChangePasswordPage />
                    </QuerySafeErrorBoundary>
                ),
            },
            {
                path: '*',
                element: <Navigate to="/" replace />,
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to="/login" replace />,
    },
]);
