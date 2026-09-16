import { memo } from 'react';
import { Grid, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import { type Embase } from '@entities/embase';
import { StatusChip, STATUS_OPTIONS, renderStatusValue } from './StatusChip';

interface TestFieldConfig {
    label: string;
    embaseField: keyof Embase;
    formField: string;
}

interface TestsSectionProps {
    embase: Embase;
    isEditing: boolean;
    form: Record<string, unknown>;
    onFormChange: (field: string, value: string) => void;
    fields: TestFieldConfig[];
}

export const TestsSection = memo(function TestsSection({
    embase,
    isEditing,
    form,
    onFormChange,
    fields,
}: TestsSectionProps) {
    return (
        <Grid container spacing={3}>
            {fields.map((field) => (
                <Grid item xs={12} sm={6} key={field.formField}>
                    {isEditing ? (
                        <FormControl fullWidth size="small">
                            <InputLabel>{field.label}</InputLabel>
                            <Select
                                value={String(form[field.formField] ?? '')}
                                label={field.label}
                                onChange={(e) => onFormChange(field.formField, e.target.value)}
                                renderValue={renderStatusValue}
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.color === 'default' ? '-' : <Chip label={opt.label} color={opt.color} />}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : (
                        <StatusChip label={field.label} value={embase[field.embaseField] as string} />
                    )}
                </Grid>
            ))}
        </Grid>
    );
});
