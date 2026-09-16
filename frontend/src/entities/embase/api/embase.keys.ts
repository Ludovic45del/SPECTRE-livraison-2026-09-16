/**
 * Embase Query Keys - TanStack Query Key Factory
 * @module entities/embase/api
 */

export const embaseKeys = {
    all: ['embases'] as const,
    lists: () => [...embaseKeys.all, 'list'] as const,
    details: () => [...embaseKeys.all, 'detail'] as const,
    detail: (uuid: string) => [...embaseKeys.details(), uuid] as const,
    // Page de détail adressée par slug (sous le préfixe `details()`).
    detailBySlug: (slug: string) => [...embaseKeys.details(), 'by-slug', slug] as const,
    fsecHistory: (uuid: string) => [...embaseKeys.all, 'fsec-history', uuid] as const,
};
