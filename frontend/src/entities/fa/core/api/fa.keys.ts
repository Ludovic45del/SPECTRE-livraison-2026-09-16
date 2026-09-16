/**
 * FA Query Keys - TanStack Query Key Factory
 * @module entities/fa/api
 */

export const faKeys = {
    all: ['fas'] as const,
    lists: () => [...faKeys.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...faKeys.lists(), filters] as const,
    details: () => [...faKeys.all, 'detail'] as const,
    detail: (uuid: string) => [...faKeys.details(), uuid] as const,
    // Page de détail adressée par slug (sous le préfixe `details()`).
    detailBySlug: (slug: string) => [...faKeys.details(), 'by-slug', slug] as const,
    byFsec: (fsecVersionId: string) => [...faKeys.all, 'fsec', fsecVersionId] as const,
    photos: (faUuid: string) => [...faKeys.all, 'photos', faUuid] as const,
};
