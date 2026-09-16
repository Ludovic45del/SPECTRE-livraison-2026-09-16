import { Select, MenuItem, FormControl, InputLabel, type SelectProps } from '@mui/material';
import React from 'react';
import { DataChip } from '../data-chip';

export interface ChipSelectOption {
    value: string | number;
    label: string;
    color: string;
}

interface ChipSelectProps extends Omit<SelectProps, 'renderValue'> {
    options: ChipSelectOption[];
    placeholder?: string;
}

export const ChipSelect = React.forwardRef<HTMLDivElement, ChipSelectProps>(function ChipSelect(
    { options, label, placeholder, ...props },
    ref,
) {
    return (
        <FormControl fullWidth size={props.size} variant={props.variant || 'outlined'}>
            {label && <InputLabel>{label}</InputLabel>}
            <Select
                {...props}
                ref={ref}
                label={label}
                displayEmpty={!!placeholder}
                renderValue={(selected) => {
                    if ((selected === '' || selected === null || selected === undefined) && placeholder) {
                        return <span style={{ opacity: 0.6 }}>{placeholder}</span>;
                    }
                    const option = options.find((o) => o.value === selected);
                    return (
                        option ? <DataChip label={option.label} color={option.color} /> : selected
                    ) as React.ReactNode;
                }}
            >
                {placeholder && (
                    <MenuItem value="">
                        <em>{placeholder}</em>
                    </MenuItem>
                )}
                {options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        <DataChip label={option.label} color={option.color} />
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
});
