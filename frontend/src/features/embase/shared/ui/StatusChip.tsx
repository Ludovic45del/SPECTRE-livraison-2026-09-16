import { memo } from 'react';
import { Box, Chip, Typography } from '@mui/material';

export const STATUS_OPTIONS = [
    { value: '', label: '-', color: 'default' as const },
    { value: 'OK', label: 'OK', color: 'success' as const },
    { value: 'KO', label: 'KO', color: 'error' as const },
];

/** Rendu d'une chip OK/KO seule (utilisé dans renderValue d'un Select). */
export function renderStatusValue(selected: string) {
    const opt = STATUS_OPTIONS.find((o) => o.value === selected);
    if (!opt || opt.color === 'default') return '-';
    return <Chip label={opt.label} color={opt.color} />;
}

/**
 * Chip standalone pour un statut OK/KO.
 * Pour des libellés alternatifs (Oui/Non) → utiliser `YesNoChip`.
 */
export function TestStatusChip({ value }: { value: string }) {
    const opt = STATUS_OPTIONS.find((o) => o.value === value);
    if (!opt || opt.color === 'default') {
        return (
            <Typography component="span" variant="body2">
                -
            </Typography>
        );
    }
    return <Chip label={opt.label} color={opt.color} />;
}

/**
 * Chip pour un boolean rendu en "Oui"/"Non".
 * `null` ou `undefined` → tiret.
 */
export function YesNoChip({ value }: { value: boolean | null | undefined }) {
    if (value === null || value === undefined) {
        return (
            <Typography component="span" variant="body2">
                -
            </Typography>
        );
    }
    return <Chip label={value ? 'Oui' : 'Non'} color={value ? 'success' : 'error'} />;
}

/** Champ avec libellé + chip OK/KO en dessous (formulaires embase). */
export const StatusChip = memo(function StatusChip({ label, value }: { label: string; value: string }) {
    const rendered = renderStatusValue(value);
    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {label}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
                {typeof rendered === 'string' ? <Typography variant="body1">{rendered}</Typography> : rendered}
            </Box>
        </Box>
    );
});
