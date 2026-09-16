/**
 * Campaign Dates Form Hook
 * @module pages/campaign-details/overview/hooks/useCampaignDatesForm
 *
 * Extracts form state, validation and handlers for dates section.
 */

import { useState, useCallback } from 'react';
import { CampaignWithRelations, useUpdateCampaign, CampaignDayjsDateSchema } from '@entities/campaign';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import dayjs, { Dayjs } from 'dayjs';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DatesFormData {
    startDate: Dayjs | null;
    endDate: Dayjs | null;
}

export interface DatesFormErrors {
    startDate?: string;
    endDate?: string;
}

export interface UseCampaignDatesFormReturn {
    // State
    form: DatesFormData;
    errors: DatesFormErrors;
    isEditing: boolean;
    isSaving: boolean;

    // Actions
    setStartDate: (date: Dayjs | null) => void;
    setEndDate: (date: Dayjs | null) => void;
    startEditing: () => void;
    cancelEditing: () => void;
    save: () => Promise<boolean>;
    validate: () => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useCampaignDatesForm(campaign: CampaignWithRelations): UseCampaignDatesFormReturn {
    const { showNotification } = useNotification();
    const updateMutation = useUpdateCampaign();

    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [errors, setErrors] = useState<DatesFormErrors>({});
    const [form, setForm] = useState<DatesFormData>(() => ({
        startDate: campaign.startDate ? dayjs(campaign.startDate) : null,
        endDate: campaign.endDate ? dayjs(campaign.endDate) : null,
    }));

    const validate = useCallback((): boolean => {
        const newErrors: DatesFormErrors = {};

        const startResult = CampaignDayjsDateSchema.safeParse(form.startDate);
        if (!startResult.success) {
            newErrors.startDate = startResult.error.issues[0].message;
        }

        const endResult = CampaignDayjsDateSchema.safeParse(form.endDate);
        if (!endResult.success) {
            newErrors.endDate = endResult.error.issues[0].message;
        }

        // Cross-field: end must be after start
        if (form.startDate && form.endDate && form.endDate.isBefore(form.startDate)) {
            newErrors.endDate = 'La date de fin doit être après la date de début';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [form]);

    // Set start date
    const setStartDate = useCallback(
        (date: Dayjs | null) => {
            setForm((prev) => ({ ...prev, startDate: date }));
            if (errors.startDate || errors.endDate) {
                setErrors({});
            }
        },
        [errors],
    );

    // Set end date
    const setEndDate = useCallback(
        (date: Dayjs | null) => {
            setForm((prev) => ({ ...prev, endDate: date }));
            if (errors.endDate) {
                setErrors((prev) => ({ ...prev, endDate: undefined }));
            }
        },
        [errors],
    );

    // Start editing
    const startEditing = useCallback(() => {
        setForm({
            startDate: campaign.startDate ? dayjs(campaign.startDate) : null,
            endDate: campaign.endDate ? dayjs(campaign.endDate) : null,
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
            await updateMutation.mutateAsync({
                uuid: campaign.uuid,
                data: {
                    name: campaign.name,
                    year: campaign.year,
                    semester: campaign.semester as 'S1' | 'S2',
                    typeId: campaign.type?.id ?? 0,
                    installationId: campaign.installation?.id ?? 0,
                    statusId: campaign.status?.id ?? 0,
                    dtriNumber: campaign.dtriNumber,
                    description: campaign.description,
                    startDate: form.startDate?.toDate() ?? null,
                    endDate: form.endDate?.toDate() ?? null,
                },
            });
            showNotification('Dates mises à jour', 'success');
            setIsEditing(false);
            return true;
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la mise à jour des dates'), 'error');
            return false;
        }
    }, [campaign, form, validate, updateMutation, showNotification]);

    return {
        form,
        errors,
        isEditing,
        isSaving: updateMutation.isPending,
        setStartDate,
        setEndDate,
        startEditing,
        cancelEditing,
        save,
        validate,
    };
}
