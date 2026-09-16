import { memo } from 'react';
import { Box, Typography } from '@mui/material';

interface FieldProps {
    label: string;
    value: string | number | boolean | null | undefined;
    unit?: string;
}

export const Field = memo(function Field({ label, value, unit }: FieldProps) {
    let displayValue: string;

    if (value === null || value === undefined || value === '') {
        displayValue = '-';
    } else if (typeof value === 'boolean') {
        displayValue = value ? 'Oui' : 'Non';
    } else {
        displayValue = String(value) + (unit ? ` ${unit}` : '');
    }

    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {label}
            </Typography>
            <Typography variant="body1">{displayValue}</Typography>
        </Box>
    );
});
