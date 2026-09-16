/**
 * FA Phase En Cours Form Hook
 * @module pages/fa-details/hooks/useFaPhaseEnCoursForm
 *
 * Extracts form state, validation and handlers for Phase 2 (En cours) section.
 */

import { useState, useCallback } from 'react';
import { Fa, useUpdateFa, PhaseEnCoursEditSchema } from '@entities/fa';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import type { PhaseEnCoursForm } from '../sections/PhaseEnCoursEditMode';

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useFaPhaseEnCoursForm(fa: Fa) {
    const { showNotification } = useNotification();
    const updateMutation = useUpdateFa();

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<PhaseEnCoursForm>({
        cause: '',
        typeId: null,
        experienceImpact: '',
        criticalityId: null,
    });

    const startEditing = useCallback(() => {
        setForm({
            cause: fa.cause ?? '',
            typeId: fa.typeId ?? null,
            experienceImpact: fa.experienceImpact ?? '',
            criticalityId: fa.criticalityId ?? null,
        });
        setIsEditing(true);
    }, [fa]);

    const cancelEditing = useCallback(() => {
        setIsEditing(false);
    }, []);

    const save = useCallback(async (): Promise<boolean> => {
        const validation = PhaseEnCoursEditSchema.safeParse({
            cause: form.cause,
            experienceImpact: form.experienceImpact,
        });
        if (!validation.success) {
            showNotification(validation.error.issues[0].message, 'error');
            return false;
        }

        try {
            await updateMutation.mutateAsync({
                uuid: fa.uuid,
                cause: form.cause || null,
                typeId: form.typeId,
                experienceImpact: form.experienceImpact || null,
                criticalityId: form.criticalityId,
            });
            showNotification('Phase En cours mise à jour', 'success');
            setIsEditing(false);
            return true;
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la mise à jour'), 'error');
            return false;
        }
    }, [fa.uuid, form, updateMutation, showNotification]);

    return {
        form,
        setForm,
        isEditing,
        isSaving: updateMutation.isPending,
        startEditing,
        cancelEditing,
        save,
    };
}
