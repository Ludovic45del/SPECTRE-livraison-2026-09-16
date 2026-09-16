/**
 * RouteTransition — wrapper qui rejoue une animation d'entrée à chaque
 * changement d'URL.
 *
 * Pourquoi : les pages détails (FSEC, FA, Campaign, Embase, Stock) utilisent
 * `RoutedTabs` pour passer d'une rubrique à l'autre. Sans ce wrapper, le
 * contenu de l'onglet apparaît sans aucune transition — visuellement plat.
 *
 * Comment : on utilise `useLocation` pour récupérer le pathname courant et on
 * pose ce pathname comme `key` sur le wrapper. Tout changement → React
 * remount → l'animation `tabContentEnter` rejoue. GPU only (opacity +
 * translateY), respecte `prefers-reduced-motion`.
 *
 * Usage :
 *
 *   <RouteTransition>
 *     {pathname.includes('/assemblage') && <AssemblyTab ... />}
 *     {pathname.includes('/controle') && <ControleTab ... />}
 *     ...
 *   </RouteTransition>
 *
 * Si on veut piloter manuellement la clé (ex: animation sur changement d'un
 * paramètre interne), on peut passer `motionKey` :
 *
 *   <RouteTransition motionKey={fsec.versionUuid}>
 *     ...
 *   </RouteTransition>
 */

import { memo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { motionDuration, motionEasing } from './motion';

interface RouteTransitionProps {
    children: ReactNode;
    /** Override la clé d'animation (par défaut : `location.pathname`). */
    motionKey?: string;
}

export const RouteTransition = memo(function RouteTransition({ children, motionKey }: RouteTransitionProps) {
    const location = useLocation();
    const key = motionKey ?? location.pathname;

    return (
        <Box
            key={key}
            sx={{
                animation: `tabContentEnter ${motionDuration.medium}ms ${motionEasing.apple} both`,
                willChange: 'opacity, transform',
                '@keyframes tabContentEnter': {
                    '0%': { opacity: 0, transform: 'translateY(8px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
                '@media (prefers-reduced-motion: reduce)': {
                    animation: 'none',
                },
            }}
        >
            {children}
        </Box>
    );
});
