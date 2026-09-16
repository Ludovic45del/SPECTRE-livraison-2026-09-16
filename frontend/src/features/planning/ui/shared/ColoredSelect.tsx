/**
 * ColoredSelect — sélecteur de typologie unifié (TextField select avec pastille
 * couleur par option). Remplace l'incohérence Autocomplete (membre) vs
 * TextField select (labo) entre les deux modales de période.
 * @module features/planning/ui/shared
 */
import { Box, MenuItem, TextField } from '@mui/material';

export interface ColoredOption {
    label: string;
    value: string;
    color: string;
}

export interface ColoredSelectProps {
    label: string;
    /** Valeur courante (`option.value`). Chaîne vide = aucune sélection. */
    value: string;
    onChange: (value: string) => void;
    options: ColoredOption[];
}

export function ColoredSelect({ label, value, onChange, options }: ColoredSelectProps) {
    return (
        <TextField
            select
            fullWidth
            size="small"
            label={label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            slotProps={{ select: { displayEmpty: true } }}
            sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
        >
            {options.map((opt) => (
                <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 12 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: opt.color, flexShrink: 0 }} />
                        <span>{opt.label}</span>
                    </Box>
                </MenuItem>
            ))}
        </TextField>
    );
}
