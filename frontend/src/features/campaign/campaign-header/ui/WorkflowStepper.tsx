/**
 * Campaign Workflow Stepper
 * Displays and allows switching campaign status with confirmation dialog
 */

import { useCallback } from 'react';
import { CampaignWithRelations } from '@entities/campaign';
import { usePatchCampaign } from '@entities/campaign/core/api';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { BaseWorkflowStepper, type WorkflowStep } from '@widgets/workflow-stepper/BaseWorkflowStepper';

interface WorkflowStepperProps {
    campaign: CampaignWithRelations;
}

const STEPS: WorkflowStep[] = [
    { label: 'Brouillon', id: 0 },
    { label: 'Définition terminée', id: 1 },
    { label: 'En réalisation', id: 2 },
    { label: 'Terminée', id: 3 },
];

export function WorkflowStepper({ campaign }: WorkflowStepperProps) {
    const { mutate: patchCampaign, isPending } = usePatchCampaign();
    const { showNotification } = useNotification();

    const activeStep = STEPS.findIndex((s) => s.label === campaign.status?.label);
    const currentStepLabel = activeStep >= 0 ? (STEPS[activeStep]?.label ?? 'Inconnu') : 'Inconnu';

    const handleConfirm = useCallback(
        (targetStep: WorkflowStep) => {
            patchCampaign(
                { uuid: campaign.uuid, data: { status_id: targetStep.id } },
                {
                    onSuccess: () => showNotification(`Statut mis à jour : ${targetStep.label}`, 'success'),
                    onError: (err: unknown) => {
                        showNotification(getErrorMessage(err, 'Erreur lors du changement de statut'), 'error');
                    },
                },
            );
        },
        [campaign.uuid, patchCampaign, showNotification],
    );

    return (
        <BaseWorkflowStepper
            steps={STEPS}
            activeStep={activeStep}
            isPending={isPending}
            currentStepLabel={currentStepLabel}
            confirmSubject="cette campagne"
            onConfirm={handleConfirm}
        />
    );
}
