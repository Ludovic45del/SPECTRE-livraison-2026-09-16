import { memo } from 'react';
import { Grid, TextField } from '@mui/material';
import { type Embase } from '@entities/embase';
import { Field } from './Field';

interface MesureFieldConfig {
    label: string;
    displayLabel?: string;
    embaseField: keyof Embase;
    formField: string;
    type?: 'text' | 'number';
    unit?: string;
}

interface MesuresSectionProps {
    embase: Embase;
    isEditing: boolean;
    form: Record<string, unknown>;
    onFormChange: (field: string, value: string) => void;
    fields: MesureFieldConfig[];
}

export const MesuresSection = memo(function MesuresSection({
    embase,
    isEditing,
    form,
    onFormChange,
    fields,
}: MesuresSectionProps) {
    return (
        <Grid container spacing={3}>
            {fields.map((field) => (
                <Grid item xs={12} sm={6} md={4} key={field.formField}>
                    {isEditing ? (
                        <TextField
                            fullWidth
                            size="small"
                            label={field.label}
                            type={field.type ?? 'text'}
                            value={String(form[field.formField] ?? '')}
                            onChange={(e) => onFormChange(field.formField, e.target.value)}
                        />
                    ) : (
                        <Field
                            label={field.displayLabel ?? field.label}
                            value={embase[field.embaseField] as string | number | null}
                            unit={field.unit}
                        />
                    )}
                </Grid>
            ))}
        </Grid>
    );
});
