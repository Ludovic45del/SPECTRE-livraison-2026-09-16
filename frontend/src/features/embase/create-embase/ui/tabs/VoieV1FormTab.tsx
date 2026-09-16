/**
 * Voie V1 tab for embase creation form
 * @module features/embase/create-embase/ui/tabs
 *
 * Fields: Soufflet V1, Capteur V1, numeric measurements, tests, observations
 */

import { memo } from 'react';
import { TextField, Stack } from '@mui/material';
import { Controller, type Control } from 'react-hook-form';
import { type EmbaseCreate } from '@entities/embase';
import { NumericControllerField } from './NumericControllerField';

interface RowProps {
    control: Control<EmbaseCreate>;
}

/** Numeric measurement fields: offset, mesurande, sensibilité, signal, capteur cible, date étalonnage */
const MeasurementsRow = memo(function MeasurementsRow({ control }: RowProps) {
    return (
        <>
            <Stack direction="row" spacing={2}>
                <NumericControllerField name="offsetV1Mv" control={control} label="Offset (b) à 0 barA (mV)" />
                <NumericControllerField
                    name="mesurandeLieV1Mv"
                    control={control}
                    label="Mesurande à 0 barA au LIE (mV)"
                />
                <NumericControllerField name="sensibiliteV1Mv" control={control} label="Sensibilité (a) (mV)" />
            </Stack>
            <Stack direction="row" spacing={2}>
                <NumericControllerField name="signalMeteocielV1Mv" control={control} label="Signal météociel (mV)" />
                <NumericControllerField
                    name="capteurCiblePfeifferMbar"
                    control={control}
                    label="Capteur cible PFEIFFER (mbar)"
                />
                <Controller
                    name="etalonnageDate"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            label="Date d'étalonnage"
                            fullWidth
                            type="date"
                            InputLabelProps={{ shrink: true }}
                        />
                    )}
                />
            </Stack>
        </>
    );
});

/** Test fields: étanchéité He, capteur MRG */
const TestsRow = memo(function TestsRow({ control }: RowProps) {
    return (
        <Stack direction="row" spacing={2}>
            <Controller
                name="testEtancheiteHe"
                control={control}
                render={({ field }) => (
                    <TextField {...field} label="Test étanchéité He" fullWidth placeholder="OK 14/01/2026 ou KO..." />
                )}
            />
            <Controller
                name="testCapteurMrg"
                control={control}
                render={({ field }) => (
                    <TextField {...field} label="Test capteur MRG au LIE" fullWidth placeholder="OK date / N/A" />
                )}
            />
        </Stack>
    );
});

interface VoieV1FormTabProps {
    control: Control<EmbaseCreate>;
}

export const VoieV1FormTab = memo(function VoieV1FormTab({ control }: VoieV1FormTabProps) {
    return (
        <Stack spacing={3}>
            <Stack direction="row" spacing={2}>
                <Controller
                    name="souffletV1"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Soufflet V1" fullWidth />}
                />
                <Controller
                    name="capteurV1"
                    control={control}
                    render={({ field }) => <TextField {...field} label="N° Capteur V1" fullWidth />}
                />
                <NumericControllerField name="etendueV1Mbar" control={control} label="Étendue (mbar)" />
            </Stack>
            <MeasurementsRow control={control} />
            <TestsRow control={control} />
            <Controller
                name="observationsV1"
                control={control}
                render={({ field }) => <TextField {...field} label="Observations V1" multiline rows={3} fullWidth />}
            />
        </Stack>
    );
});
