/**
 * Query keys for FSEC Documents - TanStack Query
 *
 * Uses createChildEntityKeys factory to eliminate duplication.
 */

import { createChildEntityKeys } from '@shared/lib';

const baseKeys = createChildEntityKeys('fsec-documents');

export const fsecDocumentKeys = {
    ...baseKeys,
    /** Alias for byParent - FSEC documents are children of FSECs */
    byFsec: (fsecId: string) => baseKeys.byParent(fsecId),
};
