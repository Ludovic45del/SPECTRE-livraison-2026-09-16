/**
 * Factory for creating TanStack Query keys for child entities (Teams, Documents).
 * Eliminates duplication between campaign-team, campaign-document, fsec-team, fsec-document.
 *
 * @module shared/lib/query-factory
 */

/**
 * Creates a query keys factory for child entities that belong to a parent.
 *
 * @param entityName - The base name for the entity (e.g., 'campaign-teams', 'fsec-documents')
 * @returns Object with query key factory functions
 *
 * @example
 * ```ts
 * export const campaignTeamKeys = createChildEntityKeys('campaign-teams');
 * // campaignTeamKeys.all => ['campaign-teams']
 * // campaignTeamKeys.byParent('uuid-123') => ['campaign-teams', 'parent', 'uuid-123']
 * // campaignTeamKeys.detail('uuid-456') => ['campaign-teams', 'detail', 'uuid-456']
 * ```
 */
export function createChildEntityKeys<TEntityName extends string>(entityName: TEntityName) {
    return {
        /** Base key for all queries of this entity type */
        all: [entityName] as const,

        /** Key for queries filtered by parent UUID */
        byParent: (parentUuid: string) => [entityName, 'parent', parentUuid] as const,

        /** Key for a single entity detail query */
        detail: (uuid: string) => [entityName, 'detail', uuid] as const,
    };
}

/** Type for the return value of createChildEntityKeys */
export type ChildEntityKeys<TEntityName extends string> = ReturnType<typeof createChildEntityKeys<TEntityName>>;
