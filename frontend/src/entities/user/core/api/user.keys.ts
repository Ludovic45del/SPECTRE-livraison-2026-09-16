/**
 * User Query Keys - TanStack Query Key Factory
 * @module entities/user/api
 */

import type { SpectreRole } from '../model/user.schema';

export const userKeys = {
    all: ['users'] as const,
    lists: () => [...userKeys.all, 'list'] as const,
    lookup: (roles?: readonly SpectreRole[]) => [...userKeys.all, 'lookup', [...(roles ?? [])].sort()] as const,
    details: () => [...userKeys.all, 'detail'] as const,
    detail: (uuid: string) => [...userKeys.details(), uuid] as const,
    me: () => ['auth', 'me'] as const,
};
