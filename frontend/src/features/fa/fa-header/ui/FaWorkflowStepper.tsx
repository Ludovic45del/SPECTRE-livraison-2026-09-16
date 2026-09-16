/**
 * FA Workflow Stepper
 * Free navigation between statuses with confirmation dialog.
 * Uses BaseWorkflowStepper for consistency with Campaign stepper.
 */

import { useCallback } from 'react';
import { type Fa, FA_STATUSES, FaSchema } from '@entities/fa';
import { faKeys } from '@entities/fa/core/api/fa.keys';
import { api } from '@shared/api';
import { getErrorMessage } from '@shared/lib/error-utils';
import { useNotification } from '@shared/ui';
import { BaseWorkflowStepper, type WorkflowStep } from '@widgets/workflow-stepper/BaseWorkflowStepper';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Constants
// ============================================================================

const STEPS: WorkflowStep[] = [
    { label: 'Ouvert', id: 0 },
    { label: 'En cours', id: 1 },
    { label: 'Clos', id: 2 },
];

// ============================================================================
// Component
// ============================================================================

interface FaWorkflowStepperProps {
    fa: Fa;
}

export function FaWorkflowStepper({ fa }: FaWorkflowStepperProps) {
    const { showNotification } = useNotification();
    const queryClient = useQueryClient();

    const patchStatusMutation = useMutation({
        mutationFn: async ({ uuid, statusId }: { uuid: string; statusId: number }) => {
            const response = await api.patch(`/fas/${uuid}/`, { status_id: statusId });
            return FaSchema.parse(response);
        },
        onSuccess: (updatedFa) => {
            queryClient.invalidateQueries({ queryKey: faKeys.lists() });
            // Invalide le préfixe `details()` pour couvrir le cache par uuid ET par slug
            // (la page détail charge la FA par slug via useFaBySlug).
            queryClient.invalidateQueries({ queryKey: faKeys.details() });
            if (updatedFa.fsecVersionId) {
                queryClient.invalidateQueries({ queryKey: faKeys.byFsec(updatedFa.fsecVersionId) });
            }
        },
    });

    const currentStatusId = fa.statusId ?? 0;
    const activeStep = STEPS.findIndex((s) => s.id === currentStatusId);
    const currentStepLabel = FA_STATUSES[currentStatusId]?.label ?? 'Inconnu';

    const handleConfirm = useCallback(
        async (targetStep: WorkflowStep) => {
            const targetLabel = FA_STATUSES[targetStep.id]?.label ?? targetStep.label;
            try {
                await patchStatusMutation.mutateAsync({
                    uuid: fa.uuid,
                    statusId: targetStep.id,
                });
                showNotification(`Statut mis à jour : ${targetLabel}`, 'success');
            } catch (err: unknown) {
                showNotification(getErrorMessage(err, 'Erreur lors du changement de statut'), 'error');
            }
        },
        [fa.uuid, patchStatusMutation, showNotification],
    );

    return (
        <BaseWorkflowStepper
            steps={STEPS}
            activeStep={activeStep}
            isPending={patchStatusMutation.isPending}
            currentStepLabel={currentStepLabel}
            confirmSubject="cette FA"
            onConfirm={handleConfirm}
        />
    );
}
