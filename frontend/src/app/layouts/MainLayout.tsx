/**
 * Main Layout Component
 * @module app/layouts
 *
 * Sidebar pinned (clic sur le logo CEA pour basculer), avec une transition
 * d'entrée discrète (`pageEnter`) sur le contenu de page à chaque
 * changement de SECTION top-level — pas à chaque changement d'onglet
 * interne d'une page détail (sinon le header re-flash sous l'animation
 * et l'effet est désagréable). Les rubriques internes utilisent leur
 * propre `<RouteTransition>` plus localisé.
 */

import { Suspense, lazy, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { Sidebar, SIDEBAR_WIDTH_OPEN, SIDEBAR_WIDTH_CLOSED, useSidebarStore } from '@widgets/sidebar';
import type { SidebarUserInfo } from '@widgets/sidebar';
import { useMe, ROLE_LABELS } from '@entities/user';
import { ProfileModal } from '@features/user/edit-profile';
import { motionDuration, motionEasing } from '@shared/ui/motion';
import { prefetchPage, prefetchPageByPath, type PageKey } from '../router/page-loaders';

// Fournit le contexte date (@mui/x-date-pickers + dayjs) à toutes les pages
// authentifiées, en lazy → date-vendor reste hors du bundle de /login.
const DateLocalizationProvider = lazy(() => import('@shared/ui/DateLocalizationProvider'));

// Fallback Suspense — discret (pas de spinner intrusif quand le code-split
// arrive en quelques ms). Affiche un cercle uniquement après 200 ms via
// `animation-delay`, ce qui couvre la majorité des cas sans flash visuel.
const PageLoader = memo(function PageLoader() {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '50vh',
                opacity: 0,
                animation: `pl-fade ${motionDuration.base}ms ${motionEasing.decelerate} 200ms forwards`,
                '@keyframes pl-fade': {
                    to: { opacity: 1 },
                },
            }}
        >
            <CircularProgress size={28} thickness={4} />
        </Box>
    );
});

// Sections où le 1er segment d'URL identifie une page détail (`fsec-details/:uuid`,
// `campagne-details/:uuid`, etc.). Pour ces routes, la clé d'animation est
// figée sur les 2 premiers segments → changer d'onglet (`/overview` → `/assemblage`)
// ne déclenche PAS le pageEnter global, seul `<RouteTransition>` interne joue.
const DETAIL_SECTIONS = new Set(['fsec-details', 'campagne-details', 'fa-details', 'embase-details', 'stock']);

function getSectionKey(pathname: string): string {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return '/';
    // Messagerie : `/messagerie/:uuid` sélectionne une conversation dans la MÊME
    // page (le 2e segment n'est pas un onglet) → une seule clé pour toute la
    // section, sinon chaque changement de conversation remonterait la page.
    if (segments[0] === 'messagerie') return '/messagerie';
    if (segments.length >= 2 && DETAIL_SECTIONS.has(segments[0])) {
        return `/${segments[0]}/${segments[1]}`;
    }
    return pathname;
}

function MainLayoutComponent() {
    const location = useLocation();
    const isOpen = useSidebarStore((state) => state.isOpen);
    const marginLeft = isOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED;
    const { data: meData } = useMe();
    const [profileOpen, setProfileOpen] = useState(false);

    const handleOpenProfile = useCallback(() => setProfileOpen(true), []);
    const handleCloseProfile = useCallback(() => setProfileOpen(false), []);

    // Prefetch idle des sections les plus visitées après le 1er paint : leurs
    // chunks sont alors déjà en cache navigateur quand l'utilisateur clique.
    // On cible des PAGES (légères), jamais charts-vendor/date-vendor.
    useEffect(() => {
        const prefetchFrequent = () => {
            prefetchPage('campaigns');
            prefetchPage('fsecs');
            prefetchPage('fas');
        };
        if (typeof window.requestIdleCallback === 'function') {
            const id = window.requestIdleCallback(prefetchFrequent, { timeout: 2000 });
            return () => window.cancelIdleCallback?.(id);
        }
        const timer = setTimeout(prefetchFrequent, 1200);
        return () => clearTimeout(timer);
    }, []);

    // Sur une page liste, précharge en idle le chunk de la page détail
    // correspondante : ouvrir une ligne n'attend alors plus le download du JS
    // détail (la donnée, elle, est seedée depuis le cache liste / prefetchée au survol).
    useEffect(() => {
        const listToDetail: Record<string, PageKey> = {
            '/campagnes': 'campaignDetails',
            '/fsecs': 'fsecDetails',
            '/fas': 'faDetails',
            '/embases': 'embaseDetails',
        };
        const key = listToDetail[location.pathname];
        if (!key) return;
        if (typeof window.requestIdleCallback === 'function') {
            const id = window.requestIdleCallback(() => prefetchPage(key), { timeout: 2000 });
            return () => window.cancelIdleCallback?.(id);
        }
        const timer = setTimeout(() => prefetchPage(key), 800);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    const sidebarUser = useMemo<SidebarUserInfo | undefined>(
        () =>
            meData
                ? {
                      username: meData.username,
                      firstName: meData.firstName,
                      lastName: meData.lastName,
                      roles: meData.roles,
                      avatarUrl: meData.avatarUrl,
                  }
                : undefined,
        [meData],
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/*
             * Restauration du scroll par SECTION (même clé que l'animation
             * pageEnter) : changer de section/page → scroll en haut ; changer
             * d'onglet interne d'une page détail → scroll préservé ; back →
             * position restaurée. Réutilise getSectionKey pour rester cohérent.
             */}
            <ScrollRestoration getKey={(location) => getSectionKey(location.pathname)} />
            <Box
                component="a"
                href="#main-content"
                sx={{
                    position: 'absolute',
                    left: '-9999px',
                    top: 'auto',
                    width: '1px',
                    height: '1px',
                    overflow: 'hidden',
                    '&:focus': {
                        position: 'fixed',
                        top: 8,
                        left: 8,
                        width: 'auto',
                        height: 'auto',
                        overflow: 'visible',
                        zIndex: 9999,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                    },
                }}
            >
                Aller au contenu principal
            </Box>
            <Sidebar
                user={sidebarUser}
                roleLabels={ROLE_LABELS}
                onProfileClick={handleOpenProfile}
                onPrefetch={prefetchPageByPath}
            />
            <ProfileModal user={meData ?? null} open={profileOpen} onClose={handleCloseProfile} />
            <Box
                id="main-content"
                component="main"
                sx={{
                    flexGrow: 1,
                    ml: `${marginLeft}px`,
                    minHeight: '100vh',
                    bgcolor: 'background.default',
                    transition: `margin-left ${motionDuration.medium}ms ${motionEasing.standard}`,
                    '@media (prefers-reduced-motion: reduce)': {
                        transition: 'none',
                    },
                    contain: 'layout style',
                }}
            >
                <Suspense fallback={<PageLoader />}>
                    {/*
                     * Le DateLocalizationProvider (lazy) enveloppe toutes les
                     * pages authentifiées : son chunk se charge une fois, ici,
                     * sous le même Suspense que les pages lazy.
                     *
                     * `key={getSectionKey(...)}` force un remount du wrapper
                     * uniquement à chaque changement de SECTION top-level
                     * (pas à chaque sous-route d'une page détail). Sinon le
                     * header de la page (FSEC, Campagne, FA, Embase) re-flashait
                     * en même temps que le contenu d'onglet → animation
                     * imperceptible et désagréable. Les rubriques internes
                     * sont animées par <RouteTransition>.
                     */}
                    <DateLocalizationProvider>
                        <Box
                            key={getSectionKey(location.pathname)}
                            sx={{
                                animation: `pageEnter ${motionDuration.medium}ms ${motionEasing.apple} both`,
                                willChange: 'opacity, transform',
                                '@keyframes pageEnter': {
                                    '0%': { opacity: 0, transform: 'translateY(8px)' },
                                    '100%': { opacity: 1, transform: 'translateY(0)' },
                                },
                                '@media (prefers-reduced-motion: reduce)': {
                                    animation: 'none',
                                },
                            }}
                        >
                            <Outlet />
                        </Box>
                    </DateLocalizationProvider>
                </Suspense>
            </Box>
        </Box>
    );
}

export const MainLayout = memo(MainLayoutComponent);
