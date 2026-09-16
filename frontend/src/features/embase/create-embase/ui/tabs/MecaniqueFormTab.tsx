/**
 * Mécanique tab for embase creation form
 * @module features/embase/create-embase/ui/tabs
 *
 * Fields: Opérationnelle (aimant/broche), Localisation, Cote VE, Décalage angulaire, Chargement MCC
 */

import { memo, useCallback } from 'react';
import { TextField, Stack, FormControl, InputLabel, Select, MenuItem, type SelectChangeEvent } from '@mui/material';
import { Controller, type Control, type UseFormWatch, type UseFormSetValue } from 'react-hook-form';
import { type EmbaseCreate } from '@entities/embase';
import { DataChip } from '@widgets/data-chip';
import { numericField, numericDisplay } from './embase-numeric-field';

/* ── Sub-components ─────────────────────────────────────────────── */

interface OperationnelleSelectProps {
    control: Control<EmbaseCreate>;
    watch: UseFormWatch<EmbaseCreate>;
    setValue: UseFormSetValue<EmbaseCreate>;
}

const OperationnelleSelect = memo(function OperationnelleSelect({
    control,
    watch,
    setValue,
}: OperationnelleSelectProps) {
    const operationnelleValue = watch('operationnelleAimant')
        ? 'aimant'
        : watch('operationnelleBroche')
          ? 'broche'
          : '';

    const handleChange = useCallback(
        (e: SelectChangeEvent<string>) => {
            setValue('operationnelleAimant', e.target.value === 'aimant');
            setValue('operationnelleBroche', e.target.value === 'broche');
        },
        [setValue],
    );

    const renderValue = useCallback(
        (val: string) =>
            val === 'aimant' ? (
                <DataChip label="Aimant" color="#1976d2" />
            ) : val === 'broche' ? (
                <DataChip label="Broche" color="#7b1fa2" />
            ) : (
                <em>Aucun</em>
            ),
        [],
    );

    return (
        <FormControl fullWidth>
            <InputLabel>Opérationnelle</InputLabel>
            <Controller
                name="operationnelleAimant"
                control={control}
                render={() => (
                    <Select
                        value={operationnelleValue}
                        label="Opérationnelle"
                        onChange={handleChange}
                        renderValue={renderValue}
                    >
                        <MenuItem value="">
                            <em>Aucun</em>
                        </MenuItem>
                        <MenuItem value="aimant">
                            <DataChip label="Aimant" color="#1976d2" />
                        </MenuItem>
                        <MenuItem value="broche">
                            <DataChip label="Broche" color="#7b1fa2" />
                        </MenuItem>
                    </Select>
                )}
            />
        </FormControl>
    );
});

interface NumericFieldsRowProps {
    control: Control<EmbaseCreate>;
}

const NumericFieldsRow = memo(function NumericFieldsRow({ control }: NumericFieldsRowProps) {
    return (
        <Stack direction="row" spacing={2}>
            <Controller
                name="coteVe"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                    <TextField
                        {...field}
                        value={numericDisplay(value)}
                        onChange={(e) => onChange(numericField(e.target.value))}
                        label="Cote VE entre actionneur/embase"
                        fullWidth
                        type="number"
                    />
                )}
            />
            <Controller
                name="decalageAngulaire"
                control={control}
                render={({ field }) => <TextField {...field} label="Décalage angulaire du pion" fullWidth />}
            />
            <Controller
                name="chargementMcc"
                control={control}
                render={({ field }) => (
                    <FormControl fullWidth>
                        <InputLabel>Chargement MCC</InputLabel>
                        <Select
                            {...field}
                            label="Chargement MCC"
                            renderValue={(val) => {
                                if (!val) return '-';
                                const color = val === 'OK' ? '#4caf50' : '#f44336';
                                return <DataChip label={val} color={color} />;
                            }}
                        >
                            <MenuItem value="">-</MenuItem>
                            <MenuItem value="OK">
                                <DataChip label="OK" color="#4caf50" />
                            </MenuItem>
                            <MenuItem value="KO">
                                <DataChip label="KO" color="#f44336" />
                            </MenuItem>
                        </Select>
                    </FormControl>
                )}
            />
        </Stack>
    );
});

/* ── Main component ─────────────────────────────────────────────── */

interface MecaniqueFormTabProps {
    control: Control<EmbaseCreate>;
    watch: UseFormWatch<EmbaseCreate>;
    setValue: UseFormSetValue<EmbaseCreate>;
}

export const MecaniqueFormTab = memo(function MecaniqueFormTab({ control, watch, setValue }: MecaniqueFormTabProps) {
    return (
        <Stack spacing={3}>
            <Stack direction="row" spacing={2}>
                <OperationnelleSelect control={control} watch={watch} setValue={setValue} />
                <Controller
                    name="localisationActuelle"
                    control={control}
                    render={({ field }) => <TextField {...field} label="Localisation actuelle" fullWidth />}
                />
            </Stack>
            <NumericFieldsRow control={control} />
        </Stack>
    );
});
