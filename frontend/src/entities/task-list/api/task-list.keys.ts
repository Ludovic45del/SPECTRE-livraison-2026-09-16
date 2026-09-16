/**
 * Task List Query Keys — factory pattern (cf. campaign.keys.ts).
 * @module entities/task-list/api
 */

export const taskListKeys = {
    all: ['task-lists'] as const,
    lists: () => [...taskListKeys.all, 'list'] as const,
    details: () => [...taskListKeys.all, 'detail'] as const,
    detail: (uuid: string) => [...taskListKeys.details(), uuid] as const,
    /** Commentaires d'une tâche — sous-clé du détail de sa liste. */
    comments: (listUuid: string, taskUuid: string) => [...taskListKeys.detail(listUuid), 'comments', taskUuid] as const,
};
