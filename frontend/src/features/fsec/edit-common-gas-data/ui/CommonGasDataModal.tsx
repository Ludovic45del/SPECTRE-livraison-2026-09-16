/**
 * Common Gas Data Modal
 * @module features/edit-common-gas-data
 *
 * Modal for editing common data shared between airtightness test and gas filling BP steps.
 * Updates both steps when saved.
 */

import { useEffect, useCallback } from 'react';
import { TextField, Stack, Grid2, Alert } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    AirtightnessStep,
    GasFillingBpStep,
    GasFillingHpStep,
    useCreateAirtightnessStep,
    useUpdateAirtightnessStep,
    useCreateGasFillingBpStep,
    useUpdateGasFillingBpStep,
    useUpdateGasFillingHpStep,
    type CommonGasData,
} from '@entities/fsec/steps';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { StepModalLayout } from '@features/fsec/shared';

interface CommonGasDataModalProps {
    open: boolean;
    onClose: () => void;
    fsecVersionId: string;
    commonData: CommonGasData;
    airtightnessSteps?: AirtightnessStep[];
    gasFillingBpSteps?: GasFillingBpStep[];
    gasFillingHpSteps?: GasFillingHpStep[];
    /** Phase displayed in the title and totals. Default 'BP'. */
    phase?: 'BP' | 'HP';
}

const CommonGasDataFormSchema = z.object({
    gasType: z.string().nullable().optional(),
    leakRateDtri: z.string().nullable().optional(),
    testDuration: z.number().nullable().optional(),
    experimentPressure: z.number().nullable().optional(),
});

type CommonGasDataForm = z.infer<typeof CommonGasDataFormSchema>;

export function CommonGasDataModal({
    open,
    onClose,
    fsecVersionId,
    commonData,
    airtightnessSteps,
    gasFillingBpSteps,
    gasFillingHpSteps,
    phase = 'BP',
}: CommonGasDataModalProps) {
    const title = `Modifier les données communes ${phase}`;
    const createAirtightnessMutation = useCreateAirtightnessStep();
    const updateAirtightnessMutation = useUpdateAirtightnessStep();
    const createFillingMutation = useCreateGasFillingBpStep();
    const updateFillingMutation = useUpdateGasFillingBpStep();
    const updateFillingHpMutation = useUpdateGasFillingHpStep();
    const { showNotification } = useNotification();

    const { control, handleSubmit, reset } = useForm<CommonGasDataForm>({
        mode: 'onBlur',
        resolver: zodResolver(CommonGasDataFormSchema),
        defaultValues: {
            gasType: null,
            leakRateDtri: null,
            testDuration: null,
            experimentPressure: null,
        },
    });

    useEffect(() => {
        if (open) {
            reset({
                gasType: commonData.gasType,
                leakRateDtri: commonData.leakRateDtri,
                testDuration: commonData.testDuration,
                experimentPressure: commonData.experimentPressure,
            });
        }
    }, [open, commonData, reset]);

    const isPending =
        createAirtightnessMutation.isPending ||
        updateAirtightnessMutation.isPending ||
        createFillingMutation.isPending ||
        updateFillingMutation.isPending ||
        updateFillingHpMutation.isPending;

    const onSubmit = useCallback(
        async (data: CommonGasDataForm) => {
            if (isPending) return;

            try {
                const updatePromises: Promise<unknown>[] = [];

                // Update ALL airtightness steps
                airtightnessSteps?.forEach((step) => {
                    updatePromises.push(
                        updateAirtightnessMutation.mutateAsync({
                            uuid: step.uuid,
                            fsecVersionId,
                            gasType: data.gasType,
                            leakRateDtri: data.leakRateDtri,
                            airtightnessTestDuration: data.testDuration,
                            experimentPressure: data.experimentPressure,
                            // Preserve individual fields
                            operator: step.operator,
                            dateOfFulfilment: step.dateOfFulfilment,
                            phase: step.phase,
                        }),
                    );
                });

                // Update ALL gasFillingBp steps
                gasFillingBpSteps?.forEach((step) => {
                    updatePromises.push(
                        updateFillingMutation.mutateAsync({
                            uuid: step.uuid,
                            fsecVersionId,
                            gasType: data.gasType,
                            leakRateDtri: data.leakRateDtri,
                            leakTestDuration: data.testDuration,
                            experimentPressure: data.experimentPressure,
                            // Preserve individual fields
                            operator: step.operator,
                            dateOfFulfilment: step.dateOfFulfilment,
                            gasBase: step.gasBase,
                            gasContainer: step.gasContainer,
                            observations: step.observations,
                        }),
                    );
                });

                // Update ALL gasFillingHp steps (HP n'a pas de durée test)
                gasFillingHpSteps?.forEach((step) => {
                    updatePromises.push(
                        updateFillingHpMutation.mutateAsync({
                            uuid: step.uuid,
                            fsecVersionId,
                            gasType: data.gasType,
                            leakRateDtri: data.leakRateDtri,
                            experimentPressure: data.experimentPressure,
                            // Preserve individual fields
                            embaseId: step.embaseId,
                            operator: step.operator,
                            operatorUserUuid: step.operatorUserUuid,
                            dateOfFulfilment: step.dateOfFulfilment,
                            gasBase: step.gasBase,
                            gasContainer: step.gasContainer,
                            observations: step.observations,
                        }),
                    );
                });

                await Promise.all(updatePromises);

                const updatedCount =
                    (airtightnessSteps?.length || 0) +
                    (gasFillingBpSteps?.length || 0) +
                    (gasFillingHpSteps?.length || 0);
                showNotification(`Données communes mises à jour pour ${updatedCount} step(s)`, 'success');
                onClose();
            } catch (error) {
                showNotification(getErrorMessage(error, 'Erreur lors de la sauvegarde'), 'error');
            }
        },
        [
            isPending,
            airtightnessSteps,
            gasFillingBpSteps,
            gasFillingHpSteps,
            fsecVersionId,
            updateAirtightnessMutation,
            updateFillingMutation,
            updateFillingHpMutation,
            showNotification,
            onClose,
        ],
    );

    return (
        <StepModalLayout
            open={open}
            onClose={onClose}
            title={title}
            editTitle={title}
            isEditMode={true}
            isPending={isPending}
            isDeleting={false}
            showDeleteConfirm={false}
            onShowDeleteConfirm={() => {}}
            onHideDeleteConfirm={() => {}}
            onDelete={() => Promise.resolve()}
            onSubmit={handleSubmit(onSubmit)}
            maxWidth="sm"
            hideDelete
        >
            <Stack spacing={3}>
                <Alert severity="info" sx={{ mb: 1 }}>
                    Ces données seront appliquées à TOUTES les rubriques de la phase {phase} (
                    {airtightnessSteps?.length || 0} Test(s) d&apos;étanchéité +{' '}
                    {(gasFillingBpSteps?.length || 0) + (gasFillingHpSteps?.length || 0)} Remplissage(s)).
                </Alert>

                <Grid2 container spacing={2}>
                    <Grid2 size={6}>
                        <Controller
                            name="gasType"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    label="Type de gaz"
                                    size="small"
                                    fullWidth
                                    inputProps={{ 'aria-label': 'Type de gaz' }}
                                />
                            )}
                        />
                    </Grid2>
                    <Grid2 size={6}>
                        <Controller
                            name="leakRateDtri"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    label="Taux de fuite DTRI"
                                    size="small"
                                    fullWidth
                                    inputProps={{ 'aria-label': 'Taux de fuite DTRI' }}
                                />
                            )}
                        />
                    </Grid2>
                </Grid2>

                <Grid2 container spacing={2}>
                    <Grid2 size={6}>
                        <Controller
                            name="testDuration"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                    }
                                    label="Durée du test d'étanchéité (min)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    inputProps={{ 'aria-label': "Durée du test d'étanchéité en minutes" }}
                                />
                            )}
                        />
                    </Grid2>
                    <Grid2 size={6}>
                        <Controller
                            name="experimentPressure"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))
                                    }
                                    label="Pression d'expérimentation (bar)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    inputProps={{ step: 0.01, 'aria-label': "Pression d'expérimentation en bar" }}
                                />
                            )}
                        />
                    </Grid2>
                </Grid2>
            </Stack>
        </StepModalLayout>
    );
}
