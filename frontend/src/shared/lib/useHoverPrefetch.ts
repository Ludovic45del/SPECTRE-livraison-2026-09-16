/**
 * Prefetch d'intention au survol / focus d'une ligne.
 * @module shared/lib/useHoverPrefetch
 *
 * Au survol souris, déclenche `prefetch` après un court délai (annulé si le
 * curseur quitte avant) → on évite de tout précharger en balayant une liste.
 * Au focus clavier, déclenche immédiatement (pas de balayage possible).
 *
 * Usage :
 *   const prefetch = usePrefetchCampaign();
 *   const hover = useHoverPrefetch(useCallback(() => prefetch(uuid), [prefetch, uuid]));
 *   <TableRow {...hover} />
 */

import { useCallback, useEffect, useRef } from 'react';

const HOVER_DELAY_MS = 120;

export interface HoverPrefetchHandlers {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
}

export function useHoverPrefetch(prefetch: () => void): HoverPrefetchHandlers {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clear = useCallback(() => {
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }
    }, []);

    // Nettoie un timer en vol si la ligne est démontée (pagination, filtre).
    useEffect(() => clear, [clear]);

    const onMouseEnter = useCallback(() => {
        clear();
        timer.current = setTimeout(prefetch, HOVER_DELAY_MS);
    }, [prefetch, clear]);

    return { onMouseEnter, onMouseLeave: clear, onFocus: prefetch };
}
