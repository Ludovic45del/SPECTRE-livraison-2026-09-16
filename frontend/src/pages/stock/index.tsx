/**
 * Stock Module Layout
 * @module pages/stock
 *
 * Page principale du module Stock. La navigation entre Catalogue / Mouvements
 * / Alertes est portée par la sidebar (sous-items dépliés sous "Stock"), donc
 * cette page se contente de router le sous-chemin courant vers le bon onglet.
 */

import { memo, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from '@shared/ui/ErrorBoundary';
import { CatalogTab } from './catalogue';
import { MovementsTab } from './mouvements';
import { AlertsTab } from './alertes';

type TabPath = 'catalogue' | 'mouvements' | 'alertes';

function getActiveTab(pathname: string): TabPath {
    if (pathname.includes('/mouvements')) return 'mouvements';
    if (pathname.includes('/alertes')) return 'alertes';
    return 'catalogue';
}

function StockPage() {
    const location = useLocation();
    const activeTab = useMemo(() => getActiveTab(location.pathname), [location.pathname]);

    // Défense en profondeur : le routeur redirige déjà '/stock' vers
    // '/stock/catalogue' (pattern equipe/indicateurs), mais on couvre ici les
    // liens profonds hérités pour que l'URL reflète toujours l'onglet actif
    // (et que le sous-item « Catalogue » soit surligné dans la sidebar).
    const isBarePath = location.pathname.replace(/\/+$/, '') === '/stock';

    const tabContent = useMemo(() => {
        switch (activeTab) {
            case 'catalogue':
                return (
                    <ErrorBoundary compact sectionName="Catalogue">
                        <CatalogTab />
                    </ErrorBoundary>
                );
            case 'mouvements':
                return (
                    <ErrorBoundary compact sectionName="Mouvements">
                        <MovementsTab />
                    </ErrorBoundary>
                );
            case 'alertes':
                return (
                    <ErrorBoundary compact sectionName="Alertes">
                        <AlertsTab />
                    </ErrorBoundary>
                );
            default:
                return null;
        }
    }, [activeTab]);

    if (isBarePath) {
        return <Navigate to="/stock/catalogue" replace />;
    }

    return (
        <Container maxWidth={false} sx={{ py: 3 }}>
            <QueryErrorResetBoundary>
                {({ reset }) => (
                    <ErrorBoundary compact onReset={reset}>
                        <Box component="main" role="main" aria-label={`Onglet ${activeTab}`}>
                            {tabContent}
                        </Box>
                    </ErrorBoundary>
                )}
            </QueryErrorResetBoundary>
        </Container>
    );
}

export default memo(StockPage);
