/**
 * useCampaignStepMutations — regroupe create/update/delete d'un step de campagne
 * et la reconstruction du payload `PlanningCampaignStepCreate`, jusqu'ici
 * dupliquée dans StepLanesRow.onMove/onResize et FsecPlanningRow.
 * @module features/planning/lib
 */
import { useCallback } from 'react';
import {
    useCreateCampaignStep,
    useUpdateCampaignStep,
    useDeleteCampaignStep,
} from '@entities/planning/core/api/planning.queries';
import type { PlanningCampaignStep } from '@entities/planning/core/model/planning.schema';

export interface CampaignStepMutations {
    /** Crée un step (FSEC posée sur l'étape) sur la plage donnée. */
    schedule: (fsecUuid: string, stepLabel: string, startDate: string, endDate: string) => void;
    /** Met à jour les dates d'un step existant (déplacement ou redimensionnement). */
    updateDates: (step: PlanningCampaignStep, startDate: string, endDate: string) => void;
    /** Supprime un step. */
    remove: (uuid: string) => void;
    isMutating: boolean;
}

export function useCampaignStepMutations(campaignUuid: string, year: number): CampaignStepMutations {
    const create = useCreateCampaignStep();
    const update = useUpdateCampaignStep();
    const del = useDeleteCampaignStep();

    const schedule = useCallback(
        (fsecUuid: string, stepLabel: string, startDate: string, endDate: string) => {
            create.mutate({ campaignUuid, fsecUuid, stepLabel, year, startDate, endDate });
        },
        [create, campaignUuid, year],
    );

    const updateDates = useCallback(
        (step: PlanningCampaignStep, startDate: string, endDate: string) => {
            update.mutate({
                uuid: step.uuid,
                data: {
                    campaignUuid: step.campaignUuid,
                    fsecUuid: step.fsecUuid,
                    stepLabel: step.stepLabel,
                    year: step.year,
                    startDate,
                    endDate,
                },
            });
        },
        [update],
    );

    const remove = useCallback(
        (uuid: string) => {
            del.mutate({ uuid, year });
        },
        [del, year],
    );

    return {
        schedule,
        updateDates,
        remove,
        isMutating: create.isPending || update.isPending || del.isPending,
    };
}
