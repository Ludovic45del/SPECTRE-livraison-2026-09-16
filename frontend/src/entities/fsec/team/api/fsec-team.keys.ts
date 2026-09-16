/**
 * Query keys for FSEC Teams - TanStack Query
 *
 * Uses createChildEntityKeys factory to eliminate duplication.
 */

import { createChildEntityKeys } from '@shared/lib';

const baseKeys = createChildEntityKeys('fsec-teams');

export const fsecTeamKeys = {
    ...baseKeys,
    /** Alias for byParent - FSEC teams are children of FSECs */
    byFsec: (fsecId: string) => baseKeys.byParent(fsecId),
};
