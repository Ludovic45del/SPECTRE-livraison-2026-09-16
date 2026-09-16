/**
 * Campaign General Info Form Hook
 * @module pages/campaign-details/overview/hooks/useCampaignGeneralForm
 *
 * Extracts form state, validation and handlers for general info section.
 */

import { useState, useCallback } from 'react';
import { CampaignWithRelations, useUpdateCampaign, CampaignGeneralFormSchema } from '@entities/campaign';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneralInfoFormData {
    name: string;
    year: number;
    semester: 'S1' | 'S2';
    typeId: number | undefined;
    installationId: number | undefined;
    dtriNumber: number | null;
    description: string;
}

export interface FormErrors {
    name?: string;
    year?: string;
    typeId?: string;
    installationId?: string;
}

export interface UseCampaignGeneralFormReturn {
    // State
    form: GeneralInfoFormData;
    errors: FormErrors;
    isEditing: boolean;
    isSaving: boolean;

    // Actions
    setField: <K extends keyof GeneralInfoFormData>(field: K, value: GeneralInfoFormData[K]) => void;
    startEditing: () => void;
    cancelEditing: () => void;
    save: () => Promise<boolean>;
    validate: () => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useCampaignGeneralForm(campaign: CampaignWithRelations): UseCampaignGeneralFormReturn {
    const { showNotification } = useNotification();
    const updateMutation = useUpdateCampaign();

    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [form, setForm] = useState<GeneralInfoFormData>(() => ({
        name: campaign.name,
        year: campaign.year,
        semester: campaign.semester as 'S1' | 'S2',
        typeId: campaign.type?.id,
        installationId: campaign.installation?.id,
        dtriNumber: campaign.dtriNumber,
        description: campaign.description ?? '',
    }));

    const validate = useCallback((): boolean => {
        const result = CampaignGeneralFormSchema.safeParse({
            name: form.name,
            year: form.year,
            typeId: form.typeId,
            installationId: form.installationId,
            description: form.description,
        });

        if (!result.success) {
            const newErrors: FormErrors = {};
            for (const issue of result.error.issues) {
                const field = issue.path[0] as keyof FormErrors;
                if (!newErrors[field]) {
                    newErrors[field] = issue.message;
                }
            }
            setErrors(newErrors);
            return false;
        }

        setErrors({});
        return true;
    }, [form]);

    // Set individual field
    const setField = useCallback(
        <K extends keyof GeneralInfoFormData>(field: K, value: GeneralInfoFormData[K]) => {
            setForm((prev) => ({ ...prev, [field]: value }));
            // Clear error when field is modified
            if (errors[field as keyof FormErrors]) {
                setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[field as keyof FormErrors];
                    return newErrors;
                });
            }
        },
        [errors],
    );

    // Start editing
    const startEditing = useCallback(() => {
        setForm({
            name: campaign.name,
            year: campaign.year,
            semester: campaign.semester as 'S1' | 'S2',
            typeId: campaign.type?.id,
            installationId: campaign.installation?.id,
            dtriNumber: campaign.dtriNumber,
            description: campaign.description ?? '',
        });
        setErrors({});
        setIsEditing(true);
    }, [campaign]);

    // Cancel editing
    const cancelEditing = useCallback(() => {
        setIsEditing(false);
        setErrors({});
    }, []);

    // Save
    const save = useCallback(async (): Promise<boolean> => {
        if (!validate()) {
            showNotification('Veuillez corriger les erreurs', 'warning');
            return false;
        }

        try {
            if (form.typeId === undefined || form.installationId === undefined) {
                showNotification('Type et installation sont requis', 'error');
                return false;
            }

            await updateMutation.mutateAsync({
                uuid: campaign.uuid,
                data: {
                    name: form.name.trim(),
                    year: form.year,
                    semester: form.semester,
                    typeId: form.typeId,
                    installationId: form.installationId,
                    statusId: campaign.status?.id ?? 0,
                    dtriNumber: form.dtriNumber,
                    description: form.description.trim() || null,
                    startDate: campaign.startDate,
                    endDate: campaign.endDate,
                },
            });
            showNotification('Informations générales mises à jour', 'success');
            setIsEditing(false);
            return true;
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la mise à jour'), 'error');
            return false;
        }
    }, [campaign, form, validate, updateMutation, showNotification]);

    return {
        form,
        errors,
        isEditing,
        isSaving: updateMutation.isPending,
        setField,
        startEditing,
        cancelEditing,
        save,
        validate,
    };
}
