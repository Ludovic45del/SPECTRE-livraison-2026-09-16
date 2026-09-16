/**
 * Seeding cache liste → détail.
 * @module shared/lib/seedDetailFromList
 *
 * Au clic sur une ligne de liste, l'objet est déjà 100% en cache (la query
 * liste l'a chargé, et les schémas liste/détail sont identiques). Plutôt que de
 * repartir d'un écran vide, on alimente `initialData` de la query détail depuis
 * ce cache : le header s'affiche instantanément. `initialDataUpdatedAt` fait
 * hériter la fraîcheur de la liste — si la liste est fraîche, la query détail ne
 * refetch même pas ; sinon elle rafraîchit en arrière-plan sans masquer l'UI.
 *
 * Usage dans un hook détail (ex. useCampaign) :
 *   const qc = useQueryClient();
 *   useQuery({
 *     queryKey: campaignKeys.detail(uuid),
 *     queryFn: ...,
 *     ...seedDetailFromList(qc, [campaignKeys.lists()], (c) => c.uuid === uuid),
 *   });
 */

import type { QueryClient, QueryKey } from '@tanstack/react-query';

export interface SeededDetail<T> {
    initialData: () => T | undefined;
    initialDataUpdatedAt: () => number | undefined;
}

/**
 * Construit `initialData` / `initialDataUpdatedAt` pour une query détail à
 * partir d'une ou plusieurs queries liste déjà en cache (la 1re qui contient
 * l'élément gagne, et la query détail hérite de SA fraîcheur).
 *
 * @param queryClient Le QueryClient courant (via useQueryClient()).
 * @param listKeys    Les queryKeys des listes sources, par ordre de priorité.
 * @param predicate   Sélecteur de l'élément correspondant dans une liste.
 */
export function seedDetailFromList<T>(
    queryClient: QueryClient,
    listKeys: QueryKey[],
    predicate: (item: T) => boolean,
): SeededDetail<T> {
    const findHit = (): { item: T; key: QueryKey } | undefined => {
        for (const key of listKeys) {
            const item = queryClient.getQueryData<T[]>(key)?.find(predicate);
            if (item) return { item, key };
        }
        return undefined;
    };

    return {
        initialData: () => findHit()?.item,
        // On n'hérite de la fraîcheur que si un élément a été trouvé (sinon
        // updatedAt resterait à 0 → refetch immédiat, comportement voulu).
        initialDataUpdatedAt: () => {
            const hit = findHit();
            return hit ? queryClient.getQueryState(hit.key)?.dataUpdatedAt : undefined;
        },
    };
}
