/**
 * FsecAssemblyItem — TanStack Query Key Factory.
 */

export const fsecAssemblyKeys = {
    all: ['fsec-assembly-items'] as const,
    listByFsec: (fsecUuid: string) => [...fsecAssemblyKeys.all, 'fsec', fsecUuid] as const,
    /**
     * Items assignables à une FSEC (GET /stock/catalog/available-for-fsec/:uuid/).
     *
     * VOLONTAIREMENT placée sous la racine 'stock-catalog' (et non sous
     * `fsecAssemblyKeys.all`) : la réponse est une liste d'items du catalogue,
     * et toutes les mutations du catalogue (`useCreateCatalogItem`,
     * `useCreateStructurationBatch`, `usePatchCatalogItem`, `useDeleteCatalogItem`,
     * `useCreateStockMovement`) invalident le préfixe ['stock-catalog'] — cette
     * clé est donc rafraîchie automatiquement dès qu'un item est créé/modifié
     * (cf. R11 : élément créé invisible dans le sélecteur FSEC). Ne pas
     * déplacer cette clé sans revoir ces invalidations.
     */
    availableForFsec: (fsecUuid: string) => ['stock-catalog', 'available-for-fsec', fsecUuid] as const,
};
