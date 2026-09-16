/**
 * Lab Contact Query Keys — factory pattern (cf. task-list.keys.ts).
 * @module entities/lab-contact/api
 */

export const labContactKeys = {
    all: ['lab-contacts'] as const,
    lists: () => [...labContactKeys.all, 'list'] as const,
    details: () => [...labContactKeys.all, 'detail'] as const,
    detail: (uuid: string) => [...labContactKeys.details(), uuid] as const,
};
