/**
 * Reusable numeric field with Controller for embase form tabs
 * @module features/embase/create-embase/ui/tabs
 */

import { memo } from 'react';
import { TextField } from '@mui/material';
import { Controller, type Control, type FieldPath } from 'react-hook-form';
import { type EmbaseCreate } from '@entities/embase';
import { numericField, numericDisplay } from './embase-numeric-field';

interface NumericControllerFieldProps {
    name: FieldPath<EmbaseCreate>;
    control: Control<EmbaseCreate>;
    label: string;
}

export const NumericControllerField = memo(function NumericControllerField({
    name,
    control,
    label,
}: NumericControllerFieldProps) {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { value, onChange, ...field } }) => (
                <TextField
                    {...field}
                    value={numericDisplay(value as number | null | undefined)}
                    onChange={(e) => onChange(numericField(e.target.value))}
                    label={label}
                    fullWidth
                    type="number"
                />
            )}
        />
    );
});
