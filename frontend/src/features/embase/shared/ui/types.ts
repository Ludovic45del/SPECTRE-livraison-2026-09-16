import { type Embase, type EmbaseCreate } from '@entities/embase';

export interface EditableTabProps {
    embase: Embase;
    onSave: (overrides: Partial<EmbaseCreate>) => Promise<void>;
    isPending: boolean;
}
