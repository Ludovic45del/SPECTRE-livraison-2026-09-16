/**
 * TanStack Query shared configuration
 * @module shared/lib/query-config
 *
 * Centralized cache configuration for consistent behavior across all queries.
 */

/**
 * Default query cache configuration
 * - staleTime: How long data is considered fresh (no refetch)
 * - gcTime: How long inactive data stays in cache before garbage collection
 */
export const QUERY_CACHE_CONFIG = {
    /** Data considered fresh for 5 minutes */
    staleTime: 1000 * 60 * 5,
    /** Inactive data kept in cache for 10 minutes */
    gcTime: 1000 * 60 * 10,
} as const;

export type QueryCacheConfig = typeof QUERY_CACHE_CONFIG;

/**
 * Cache pour référentiels quasi-statiques (étapes de planning, lookup
 * utilisateurs, salles…) : éditables uniquement via l'admin et consommés
 * sur quasi toutes les pages. Inutile de les re-fetcher en arrière-plan à
 * chaque navigation — on les considère frais sur toute la session.
 * Invalidation explicite après une mutation côté front si jamais nécessaire.
 */
export const REFERENTIAL_CACHE_CONFIG = {
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
} as const;
