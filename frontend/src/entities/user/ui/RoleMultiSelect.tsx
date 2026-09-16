/**
 * RoleMultiSelect — dropdown multi-sélection des rôles métier SPECTRE.
 * @module entities/user/ui
 *
 * Un membre peut cumuler plusieurs rôles (ex. métrologue + assembleur) : le
 * groupe de permission effectif est déduit côté backend du rôle le plus
 * privilégié. Calque le motif `multiple` de UserMultiSelect, mais sur une liste
 * statique (SPECTRE_ROLES) — aucun appel réseau.
 */

import { memo } from 'react';
import { Autocomplete, Chip, TextField } from '@mui/material';
import { ROLE_LABELS, SPECTRE_ROLES, type SpectreRole } from '../core/model/user.schema';

export interface RoleMultiSelectProps {
    /** Rôles sélectionnés. */
    value: SpectreRole[];
    /** Callback déclenché lors du changement de sélection. */
    onChange: (roles: SpectreRole[]) => void;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    size?: 'small' | 'medium';
    error?: boolean;
    helperText?: string;
    /** id pour aria-label (si pas fourni, fallback sur `label`). */
    ariaLabel?: string;
}

/** Réordonne selon la hiérarchie SPECTRE_ROLES, comme le fait le backend. */
function sortByHierarchy(roles: readonly SpectreRole[]): SpectreRole[] {
    return SPECTRE_ROLES.filter((role) => roles.includes(role));
}

export const RoleMultiSelect = memo(function RoleMultiSelect({
    value,
    onChange,
    label = 'Rôles',
    required = false,
    disabled = false,
    size = 'medium',
    error = false,
    helperText,
    ariaLabel,
}: RoleMultiSelectProps) {
    return (
        <Autocomplete<SpectreRole, true, false, false>
            multiple
            disableCloseOnSelect
            options={[...SPECTRE_ROLES]}
            value={sortByHierarchy(value)}
            onChange={(_, next) => onChange(sortByHierarchy(next))}
            getOptionLabel={(option) => ROLE_LABELS[option] ?? option}
            disabled={disabled}
            noOptionsText="Aucun rôle"
            size={size}
            renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                        <Chip
                            key={key}
                            {...tagProps}
                            label={ROLE_LABELS[option] ?? option}
                            size="small"
                            color="primary"
                        />
                    );
                })
            }
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    // Même logique que UserMultiSelect : l'input texte reste vide
                    // (les sélections sont des chips), donc on n'arme le `required`
                    // natif que tant qu'aucun rôle n'est choisi. La règle métier
                    // (≥ 1 rôle) reste portée par zod.
                    required={required && value.length === 0}
                    error={error}
                    helperText={helperText}
                    inputProps={{
                        ...params.inputProps,
                        'aria-label': ariaLabel ?? label,
                    }}
                />
            )}
        />
    );
});
