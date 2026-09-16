/**
 * FA Phase Ouvert Form Hook
 * @module pages/fa-details/hooks/useFaPhaseOuvertForm
 *
 * Extracts form state, validation and handlers for Phase 1 (Ouvert) section.
 */

import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { Fa, useUpdateFa, FSEC_STEP_ID, PhaseOuvertEditSchema } from '@entities/fa';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import type { PhaseOuvertForm } from '../sections/PhaseOuvertEditMode';

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useFaPhaseOuvertForm(fa: Fa) {
    const { showNotification } = useNotification();
    const updateMutation = useUpdateFa();

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<PhaseOuvertForm>({
        fsecStepId: null,
        fsecStepOther: '',
        eventDate: null,
        discovererUserUuid: null,
        legacyDiscoverer: '',
        observation: '',
        locationEquipment: '',
        quickAnalysis: '',
        immediateMeasures: '',
    });

    const startEditing = useCallback(() => {
        setForm({
            fsecStepId: fa.fsecStepId ?? null,
            fsecStepOther: fa.fsecStepOther ?? '',
            eventDate: fa.eventDate ? dayjs(fa.eventDate) : null,
            // Découvreur : la FK est la source de vérité ; le texte legacy
            // `fa.discoverer` n'est conservé qu'en lecture (fallback affiché).
            discovererUserUuid: fa.discovererUserUuid ?? null,
            legacyDiscoverer: fa.discoverer ?? '',
            observation: fa.observation ?? '',
            locationEquipment: fa.locationEquipment ?? '',
            quickAnalysis: fa.quickAnalysis ?? '',
            immediateMeasures: fa.immediateMeasures ?? '',
        });
        setIsEditing(true);
    }, [fa]);

    const cancelEditing = useCallback(() => {
        setIsEditing(false);
    }, []);

    const save = useCallback(async (): Promise<boolean> => {
        const validation = PhaseOuvertEditSchema.safeParse({
            fsecStepOther: form.fsecStepOther,
            discovererUserUuid: form.discovererUserUuid,
            observation: form.observation,
            locationEquipment: form.locationEquipment,
            quickAnalysis: form.quickAnalysis,
            immediateMeasures: form.immediateMeasures,
        });
        if (!validation.success) {
            showNotification(validation.error.issues[0].message, 'error');
            return false;
        }

        // Découvreur requis : soit une sélection FK, soit un texte legacy déjà
        // en base (ancienne FA) que la sauvegarde préserve.
        if (!form.discovererUserUuid && !fa.discoverer) {
            showNotification('Découvreur requis', 'error');
            return false;
        }

        try {
            await updateMutation.mutateAsync({
                uuid: fa.uuid,
                fsecStepId: form.fsecStepId,
                fsecStepOther: form.fsecStepId === FSEC_STEP_ID.AUTRE ? form.fsecStepOther || null : null,
                eventDate: form.eventDate?.toDate() ?? undefined,
                // NE JAMAIS envoyer la clé `discoverer` : le merge backend
                // préserve ainsi le texte legacy des anciennes FA. La FK n'est
                // envoyée que si sélectionnée (null = clé omise, valeur conservée).
                discovererUserUuid: form.discovererUserUuid ?? undefined,
                observation: form.observation,
                locationEquipment: form.locationEquipment || null,
                quickAnalysis: form.quickAnalysis,
                immediateMeasures: form.immediateMeasures || null,
            });
            showNotification('Phase Ouvert mise à jour', 'success');
            setIsEditing(false);
            return true;
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la mise à jour'), 'error');
            return false;
        }
    }, [fa.uuid, fa.discoverer, form, updateMutation, showNotification]);

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
