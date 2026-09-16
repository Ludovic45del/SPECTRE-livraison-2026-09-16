/**
 * Form Actions Component
 * @module pages/campaign-details/overview/components/FormActions
 *
 * Reusable cancel/save button pair for inline editing forms.
 */

import { memo } from 'react';
import { Stack, Button } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';

interface FormActionsProps {
    /** Handler for cancel action */
    onCancel: () => void;
    /** Handler for save action (optional - uses form submit if not provided) */
    onSave?: () => void;
    /** Whether save operation is in progress */
    isSaving?: boolean;
    /** Custom cancel button text */
    cancelText?: string;
    /** Custom save button text */
    saveText?: string;
    /** Custom saving button text */
    savingText?: string;
}

export const FormActions = memo(function FormActions({
    onCancel,
    onSave,
    isSaving = false,
    cancelText = 'Annuler',
    saveText = 'Enregistrer',
    savingText = 'Enregistrement...',
}: FormActionsProps) {
    return (
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button size="small" onClick={onCancel} startIcon={<CloseIcon />} color="inherit" disabled={isSaving}>
                {cancelText}
            </Button>
            <Button
                size="small"
                variant="contained"
                type={onSave ? 'button' : 'submit'}
                onClick={onSave}
                startIcon={<SaveIcon />}
                disabled={isSaving}
            >
                {isSaving ? savingText : saveText}
            </Button>
        </Stack>
    );
});
