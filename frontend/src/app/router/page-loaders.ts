/**
 * Registre central des imports de pages (code-splitting).
 * @module app/router/page-loaders
 *
 * Un seul endroit déclare les `import()` dynamiques, consommés par :
 *  - le routeur (`lazyWithRetry`) pour le rendu des routes ;
 *  - le prefetch d'intention (survol/focus sidebar, survol de ligne, idle au
 *    boot) pour télécharger le chunk AVANT le clic → navigation quasi instantanée.
 *
 * `import()` est idempotent (Vite/Rollup mémoïse la promesse de module) : appeler
 * un loader plusieurs fois ne coûte rien après le premier appel.
 */

import { type ComponentType, type LazyExoticComponent, lazy } from 'react';

const CHUNK_RELOAD_FLAG = 'spectre:chunk-reload';

/**
 * Détecte l'échec d'un import dynamique dont le chunk a disparu (hash changé
 * après un redéploiement, l'onglet ouvert pointe encore sur l'ancien index.html).
 */
function isChunkLoadError(error: unknown): boolean {
    const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
    return /ChunkLoadError|dynamically imported module|module script failed|Failed to fetch/i.test(message);
}

/**
 * Variante de `React.lazy` robuste aux redéploiements : sur un échec d'import dû
 * à un chunk périmé, recharge la page UNE seule fois (flag sessionStorage
 * anti-boucle). Un vrai échec persistant finit par remonter à l'ErrorBoundary.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
    return lazy(() =>
        factory()
            .then((mod) => {
                sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
                return mod;
            })
            .catch((error: unknown) => {
                if (isChunkLoadError(error) && !sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
                    sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
                    window.location.reload();
                    // Suspend indéfiniment : le reload remplace l'app.
                    return new Promise<{ default: T }>(() => {});
                }
                throw error;
            }),
    );
}

/** Thunks d'import bruts, partagés entre le routeur et le prefetch. */
export const pageImports = {
    login: () => import('@pages/login'),
    setInitialPassword: () => import('@pages/set-initial-password'),
    changePassword: () => import('@pages/change-password'),
    home: () => import('@pages/home'),
    campaigns: () => import('@pages/campaigns'),
    campaignDetails: () => import('@pages/campaign-details'),
    fsecs: () => import('@pages/fsecs'),
    fsecDetails: () => import('@pages/fsec-details'),
    fas: () => import('@pages/fas'),
    faDetails: () => import('@pages/fa-details'),
    embases: () => import('@pages/embases'),
    embaseDetails: () => import('@pages/embase-details'),
    planning: () => import('@pages/planning'),
    indicateursFa: () => import('@pages/indicateurs/fa'),
    indicateursFsec: () => import('@pages/indicateurs/fsec'),
    indicateursCampagne: () => import('@pages/indicateurs/campagne'),
    stock: () => import('@pages/stock'),
    materiel: () => import('@pages/materiel'),
    materielMachines: () => import('@pages/materiel/MachinesView'),
    equipeAnnuaire: () => import('@pages/equipe/annuaire'),
    equipeCarte: () => import('@pages/equipe/carte'),
    equipeLaboratoires: () => import('@pages/equipe/laboratoires'),
    messagerie: () => import('@pages/messagerie'),
} as const;

export type PageKey = keyof typeof pageImports;

// ─────────────────────────────────────────────────────────────────────────────
// Prefetch d'intention
// ─────────────────────────────────────────────────────────────────────────────

/** Chemins de navigation (sidebar) → clé de page, pour le prefetch au survol. */
const PATH_TO_PAGE: Record<string, PageKey> = {
    '/': 'home',
    '/campagnes': 'campaigns',
    '/fsecs': 'fsecs',
    '/fas': 'fas',
    '/embases': 'embases',
    '/planning': 'planning',
    '/indicateurs': 'indicateursFa', // le parent redirige vers /indicateurs/fa
    '/indicateurs/fa': 'indicateursFa',
    '/indicateurs/fsec': 'indicateursFsec',
    '/indicateurs/campagne': 'indicateursCampagne',
    '/stock': 'stock',
    '/materiel': 'materiel',
    '/equipe': 'equipeAnnuaire',
    '/equipe/annuaire': 'equipeAnnuaire',
    '/equipe/carte': 'equipeCarte',
    '/equipe/laboratoires': 'equipeLaboratoires',
    '/messagerie': 'messagerie',
};

// Évite de relancer un loader déjà déclenché (réduit le bruit, l'import reste
// idempotent côté Vite de toute façon).
const prefetched = new Set<PageKey>();

/** Précharge le chunk d'une page par sa clé (best-effort, idempotent). */
export function prefetchPage(key: PageKey): void {
    if (prefetched.has(key)) return;
    prefetched.add(key);
    // best-effort : un échec de prefetch ne doit jamais casser l'UI ni recharger.
    pageImports[key]().catch(() => prefetched.delete(key));
}

/** Précharge le chunk d'une page par son chemin de navigation. */
export function prefetchPageByPath(path: string): void {
    // Match exact d'abord (cas nominal sidebar).
    const exact = PATH_TO_PAGE[path];
    if (exact) {
        prefetchPage(exact);
        return;
    }
    // Sinon, plus long préfixe (sous-routes type /stock/catalogue → /stock).
    let bestKey: PageKey | undefined;
    let bestLen = 0;
    for (const [p, key] of Object.entries(PATH_TO_PAGE)) {
        if (p !== '/' && path.startsWith(`${p}/`) && p.length > bestLen) {
            bestKey = key;
            bestLen = p.length;
        }
    }
    if (bestKey) prefetchPage(bestKey);
}
