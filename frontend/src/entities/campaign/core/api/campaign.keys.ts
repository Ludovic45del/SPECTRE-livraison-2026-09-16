/**
 * Campaign Query Keys - TanStack Query Key Factory
 * @module entities/campaign/api
 *
 * Pattern from Front_Implementation.md section 2.3
 */

export const campaignKeys = {
    all: ['campaigns'] as const,
    lists: () => [...campaignKeys.all, 'list'] as const,
    details: () => [...campaignKeys.all, 'detail'] as const,
    detail: (uuid: string) => [...campaignKeys.details(), uuid] as const,
    // Clé distincte de `detail(uuid)` : la page de détail est adressée par slug,
    // mais les mutations continuent d'écrire sur `detail(uuid)`. Ne pas fusionner.
    detailBySlug: (slug: string) => [...campaignKeys.details(), 'by-slug', slug] as const,
};
