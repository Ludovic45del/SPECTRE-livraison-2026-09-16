/**
 * StatusBadge — affiche le statut d'un élément sérialisé (dispo / réservée / affectée / tirée).
 *
 * Toutes les couleurs respectent le formalisme "soft" (bg pâle + texte foncé
 * de la même couleur), aligné sur l'override `MuiChip` du thème.
 */

import { Chip, type SxProps, type Theme } from '@mui/material';
import { ELEMENT_STATUS, ELEMENT_STATUS_LABELS, type ElementStatus } from '../model/stock.constants';

const STATUS_STYLES: Record<ElementStatus, { bg: string; color: string }> = {
    [ELEMENT_STATUS.DISPO]: { bg: '#dcfce7', color: '#15803d' },
    [ELEMENT_STATUS.RESERVEE]: { bg: '#dbeafe', color: '#1d4ed8' },
    [ELEMENT_STATUS.AFFECTEE]: { bg: '#bfdbfe', color: '#1e3a8a' },
    [ELEMENT_STATUS.TIREE]: { bg: '#e2e8f0', color: '#0f172a' },
};

interface StatusBadgeProps {
    status: ElementStatus;
    /** Numéro/identifiant FSEC à accoler au libellé (ex. `FSEC 2026-06-02`). */
    fsecLabel?: string | null;
    sx?: SxProps<Theme>;
}

export function StatusBadge({ status, fsecLabel, sx }: StatusBadgeProps) {
    const palette = STATUS_STYLES[status];
    const baseLabel = ELEMENT_STATUS_LABELS[status];
    const label = fsecLabel ? `${baseLabel} · ${fsecLabel}` : baseLabel;
    return (
        <Chip
            label={label}
            sx={{
                bgcolor: palette.bg,
                color: palette.color,
                ...sx,
            }}
        />
    );
}
