/**
 * General tab for embase creation form
 * @module features/embase/create-embase/ui/tabs
 *
 * Fields: Identifier, Type, Nombre de voies
 */

import { memo } from 'react';
import { TextField, Stack, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { type EmbaseCreate, EMBASE_TYPE_LABELS } from '@entities/embase';

/* ── Sub-components ─────────────────────────────────────────────── */

interface IdentifierTypeRowProps {
    control: Control<EmbaseCreate>;
    errors: FieldErrors<EmbaseCreate>;
}

const IdentifierTypeRow = memo(function IdentifierTypeRow({ control, errors }: IdentifierTypeRowProps) {
    return (
        <Stack direction="row" spacing={2}>
            <Controller
                name="identifier"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Identifiant"
                        required
                        fullWidth
                        error={Boolean(errors.identifier)}
                        helperText={errors.identifier?.message}
                        placeholder="G01, G02..."
                    />
                )}
            />
            <Controller
                name="type"
                control={control}
                render={({ field }) => (
                    <FormControl fullWidth required error={Boolean(errors.type)}>
                        <InputLabel>Type</InputLabel>
                        <Select {...field} label="Type">
                            {Object.entries(EMBASE_TYPE_LABELS).map(([value, label]) => (
                                <MenuItem key={value} value={value}>
                                    {label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            />
        </Stack>
    );
});

interface NombreVoiesFieldProps {
    control: Control<EmbaseCreate>;
}

const NombreVoiesField = memo(function NombreVoiesField({ control }: NombreVoiesFieldProps) {
    return (
        <Controller
            name="nombreVoies"
            control={control}
            render={({ field }) => (
                <FormControl fullWidth>
                    <InputLabel>Nombre de voies</InputLabel>
                    <Select {...field} label="Nombre de voies">
                        <MenuItem value={1}>1 voie</MenuItem>
                        <MenuItem value={2}>2 voies</MenuItem>
                    </Select>
                </FormControl>
            )}
        />
    );
});

/* ── Main component ─────────────────────────────────────────────── */

interface GeneralTabProps {
    control: Control<EmbaseCreate>;
    errors: FieldErrors<EmbaseCreate>;
}

export const GeneralTab = memo(function GeneralTab({ control, errors }: GeneralTabProps) {
    return (
        <Stack spacing={3}>
            <IdentifierTypeRow control={control} errors={errors} />
            <NombreVoiesField control={control} />
        </Stack>
    );
});
