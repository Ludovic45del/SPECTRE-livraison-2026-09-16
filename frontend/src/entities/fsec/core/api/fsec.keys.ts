/**
 * FSEC Query Keys - TanStack Query Key Factory
 * @module entities/fsec/api
 *
 * Pattern from Front_Implementation.md section 2.3
 */

export const fsecKeys = {
    all: ['fsecs'] as const,
    lists: () => [...fsecKeys.all, 'list'] as const,
    /** Versions actives uniquement (GET /fsecs/active/) — sélecteurs, références. */
    active: () => [...fsecKeys.lists(), 'active'] as const,
    list: (filters?: Record<string, unknown>) => [...fsecKeys.lists(), filters] as const,
    details: () => [...fsecKeys.all, 'detail'] as const,
    detail: (versionUuid: string) => [...fsecKeys.details(), versionUuid] as const,
    // Clé de la page de détail adressée par slug (sous le préfixe `details()` :
    // invalider `details()` rafraîchit donc aussi les pages slug).
    detailBySlug: (slug: string) => [...fsecKeys.details(), 'by-slug', slug] as const,
    byCampaign: (campaignUuid: string) => [...fsecKeys.all, 'campaign', campaignUuid] as const,
};
