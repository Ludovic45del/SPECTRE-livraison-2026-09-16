/**
 * Hook encapsulating all mutation logic (create/delete) for the Gas Steps Tab.
 * @module pages/fsec-details/tabs/hooks
 */

import { useCallback, useMemo } from 'react';
import {
    useCreateAirtightnessStep,
    useCreateGasFillingBpStep,
    useCreateGasFillingHpStep,
    useCreatePermeationStep,
    useCreateDepressurizationStep,
    useDeleteAirtightnessStep,
    useDeleteGasFillingBpStep,
    useDeleteGasFillingHpStep,
    useDeletePermeationStep,
    useDeleteDepressurizationStep,
    type AirtightnessStep,
    type DepressurizationStep,
    type GasFillingBpStep,
    type GasFillingHpStep,
    type PermeationStep,
    type CommonGasData,
} from '@entities/fsec/steps';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';

export function useGasStepsMutations(
    fsecVersionId: string,
    computedCommonDataBp: CommonGasData,
    computedCommonDataHp: CommonGasData = computedCommonDataBp,
) {
    const createAirtightnessMutation = useCreateAirtightnessStep();
    const createGasFillingBpMutation = useCreateGasFillingBpStep();
    const createGasFillingHpMutation = useCreateGasFillingHpStep();
    const createPermeationMutation = useCreatePermeationStep();
    const createDepressurizationMutation = useCreateDepressurizationStep();
    const deleteAirtightnessMutation = useDeleteAirtightnessStep();
    const deleteGasFillingBpMutation = useDeleteGasFillingBpStep();
    const deleteGasFillingHpMutation = useDeleteGasFillingHpStep();
    const deletePermeationMutation = useDeletePermeationStep();
    const deleteDepressurizationMutation = useDeleteDepressurizationStep();
    const { showNotification } = useNotification();

    const isCreatingRubrique = createAirtightnessMutation.isPending || createGasFillingBpMutation.isPending;
    const isDeletingRubrique = deleteAirtightnessMutation.isPending || deleteGasFillingBpMutation.isPending;
    const isCreatingHpRubrique = createAirtightnessMutation.isPending || createGasFillingHpMutation.isPending;
    const isDeletingHpRubrique = deleteAirtightnessMutation.isPending || deleteGasFillingHpMutation.isPending;
    const isCreatingPermeationHpRubrique =
        createAirtightnessMutation.isPending ||
        createPermeationMutation.isPending ||
        createDepressurizationMutation.isPending ||
        createGasFillingHpMutation.isPending;
    const isDeletingPermeationHpRubrique =
        deleteAirtightnessMutation.isPending ||
        deletePermeationMutation.isPending ||
        deleteDepressurizationMutation.isPending ||
        deleteGasFillingHpMutation.isPending;

    const handleDeleteRubrique = useCallback(
        async (airtightnessStep?: AirtightnessStep, fillingStep?: GasFillingBpStep) => {
            try {
                if (airtightnessStep) {
                    await deleteAirtightnessMutation.mutateAsync({
                        uuid: airtightnessStep.uuid,
                        fsecVersionId,
                    });
                }
                if (fillingStep) {
                    await deleteGasFillingBpMutation.mutateAsync({
                        uuid: fillingStep.uuid,
                        fsecVersionId,
                    });
                }
                showNotification('Rubrique Gaz BP supprimée', 'success');
            } catch (error) {
                showNotification(getErrorMessage(error, 'Erreur lors de la suppression'), 'error');
            }
        },
        [deleteAirtightnessMutation, deleteGasFillingBpMutation, fsecVersionId, showNotification],
    );

    const handleAddHpRubriqueDirectly = useCallback(async () => {
        if (isCreatingHpRubrique) return;
        try {
            await Promise.all([
                createAirtightnessMutation.mutateAsync({
                    fsecVersionId,
                    gasType: computedCommonDataHp.gasType,
                    leakRateDtri: computedCommonDataHp.leakRateDtri,
                    airtightnessTestDuration: computedCommonDataHp.testDuration,
                    experimentPressure: computedCommonDataHp.experimentPressure,
                    phase: 'HP',
                }),
                createGasFillingHpMutation.mutateAsync({
                    fsecVersionId,
                    gasType: computedCommonDataHp.gasType,
                    leakRateDtri: computedCommonDataHp.leakRateDtri,
                    experimentPressure: computedCommonDataHp.experimentPressure,
                }),
            ]);
            showNotification('Rubrique Gaz HP ajoutée', 'success');
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la création'), 'error');
        }
    }, [
        isCreatingHpRubrique,
        createAirtightnessMutation,
        createGasFillingHpMutation,
        fsecVersionId,
        showNotification,
        computedCommonDataHp,
    ]);

    const handleDeleteHpRubrique = useCallback(
        async (airtightnessStep?: AirtightnessStep, fillingHpStep?: GasFillingHpStep) => {
            try {
                if (airtightnessStep) {
                    await deleteAirtightnessMutation.mutateAsync({
                        uuid: airtightnessStep.uuid,
                        fsecVersionId,
                    });
                }
                if (fillingHpStep) {
                    await deleteGasFillingHpMutation.mutateAsync({
                        uuid: fillingHpStep.uuid,
                        fsecVersionId,
                    });
                }
                showNotification('Rubrique Gaz HP supprimée', 'success');
            } catch (error) {
                showNotification(getErrorMessage(error, 'Erreur lors de la suppression'), 'error');
            }
        },
        [deleteAirtightnessMutation, deleteGasFillingHpMutation, fsecVersionId, showNotification],
    );

    const handleAddPermeationHpRubriqueDirectly = useCallback(async () => {
        if (isCreatingPermeationHpRubrique) return;
        try {
            await Promise.all([
                createAirtightnessMutation.mutateAsync({
                    fsecVersionId,
                    gasType: computedCommonDataHp.gasType,
                    leakRateDtri: computedCommonDataHp.leakRateDtri,
                    airtightnessTestDuration: computedCommonDataHp.testDuration,
                    experimentPressure: computedCommonDataHp.experimentPressure,
                    phase: 'HP',
                }),
                createPermeationMutation.mutateAsync({
                    fsecVersionId,
                    gasType: computedCommonDataHp.gasType,
                    targetPressure: computedCommonDataHp.experimentPressure,
                }),
                createDepressurizationMutation.mutateAsync({ fsecVersionId }),
                createGasFillingHpMutation.mutateAsync({
                    fsecVersionId,
                    gasType: computedCommonDataHp.gasType,
                    leakRateDtri: computedCommonDataHp.leakRateDtri,
                    experimentPressure: computedCommonDataHp.experimentPressure,
                }),
            ]);
            showNotification('Rubrique Perméation + HP ajoutée', 'success');
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la création'), 'error');
        }
    }, [
        isCreatingPermeationHpRubrique,
        createAirtightnessMutation,
        createPermeationMutation,
        createDepressurizationMutation,
        createGasFillingHpMutation,
        fsecVersionId,
        showNotification,
        computedCommonDataHp,
    ]);

    const handleDeletePermeationHpRubrique = useCallback(
        async (
            airtightnessStep?: AirtightnessStep,
            permeationStep?: PermeationStep,
            depressurizationStep?: DepressurizationStep,
            fillingHpStep?: GasFillingHpStep,
        ) => {
            try {
                const promises: Promise<unknown>[] = [];
                if (airtightnessStep) {
                    promises.push(
                        deleteAirtightnessMutation.mutateAsync({
                            uuid: airtightnessStep.uuid,
                            fsecVersionId,
                        }),
                    );
                }
                if (permeationStep) {
                    promises.push(deletePermeationMutation.mutateAsync({ uuid: permeationStep.uuid, fsecVersionId }));
                }
                if (depressurizationStep) {
                    promises.push(
                        deleteDepressurizationMutation.mutateAsync({
                            uuid: depressurizationStep.uuid,
                            fsecVersionId,
                        }),
                    );
                }
                if (fillingHpStep) {
                    promises.push(
                        deleteGasFillingHpMutation.mutateAsync({
                            uuid: fillingHpStep.uuid,
                            fsecVersionId,
                        }),
                    );
                }
                await Promise.all(promises);
                showNotification('Rubrique Perméation + HP supprimée', 'success');
            } catch (error) {
                showNotification(getErrorMessage(error, 'Erreur lors de la suppression'), 'error');
            }
        },
        [
            deleteAirtightnessMutation,
            deletePermeationMutation,
            deleteDepressurizationMutation,
            deleteGasFillingHpMutation,
            fsecVersionId,
            showNotification,
        ],
    );

    const handleAddRubriqueDirectly = useCallback(async () => {
        if (isCreatingRubrique) return;

        try {
            await Promise.all([
                createAirtightnessMutation.mutateAsync({
                    fsecVersionId,
                    gasType: computedCommonDataBp.gasType,
                    leakRateDtri: computedCommonDataBp.leakRateDtri,
                    airtightnessTestDuration: computedCommonDataBp.testDuration,
                    experimentPressure: computedCommonDataBp.experimentPressure,
                    phase: 'BP',
                }),
                createGasFillingBpMutation.mutateAsync({
                    fsecVersionId,
                    gasType: computedCommonDataBp.gasType,
                    leakRateDtri: computedCommonDataBp.leakRateDtri,
                    leakTestDuration: computedCommonDataBp.testDuration,
                    experimentPressure: computedCommonDataBp.experimentPressure,
                }),
            ]);
            showNotification('Rubrique Gaz BP ajoutée', 'success');
        } catch (error) {
            showNotification(getErrorMessage(error, 'Erreur lors de la création'), 'error');
        }
    }, [
        isCreatingRubrique,
        createAirtightnessMutation,
        createGasFillingBpMutation,
        fsecVersionId,
        showNotification,
        computedCommonDataBp,
    ]);

    return useMemo(
        () => ({
            isCreatingRubrique,
            isDeletingRubrique,
            isCreatingHpRubrique,
            isDeletingHpRubrique,
            isCreatingPermeationHpRubrique,
            isDeletingPermeationHpRubrique,
            handleDeleteRubrique,
            handleAddHpRubriqueDirectly,
            handleDeleteHpRubrique,
            handleAddRubriqueDirectly,
            handleAddPermeationHpRubriqueDirectly,
            handleDeletePermeationHpRubrique,
        }),
        [
            isCreatingRubrique,
            isDeletingRubrique,
            isCreatingHpRubrique,
            isDeletingHpRubrique,
            isCreatingPermeationHpRubrique,
            isDeletingPermeationHpRubrique,
            handleDeleteRubrique,
            handleAddHpRubriqueDirectly,
            handleDeleteHpRubrique,
            handleAddRubriqueDirectly,
            handleAddPermeationHpRubriqueDirectly,
            handleDeletePermeationHpRubrique,
        ],
    );
}
