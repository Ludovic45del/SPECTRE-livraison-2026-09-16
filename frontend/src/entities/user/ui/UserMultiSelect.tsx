/**
 * UserMultiSelect — dropdown multi-sélection d'opérateurs (uuids).
 * @module entities/user/ui
 *
 * Variante multiple de UserSelect : une étape (assemblage, métrologie) peut
 * être réalisée à plusieurs. Filtré par rôle métier ; chef_labo est inclus par
 * défaut (super-utilisateur). Calque le motif `multiple` de MachineMultiSelect.
 *
 * Branchement DB : appelle GET /users/lookup/?role=… via useUserLookup().
 */

import { memo, useMemo } from 'react';
import { Autocomplete, Chip, CircularProgress, TextField } from '@mui/material';
import { useUserLookup } from '../core/api/user.queries';
import { formatUserDisplayName } from '../core/lib/format-user-display-name';
import type { UserLookup } from '../core/model/user-lookup.schema';
import { ROLE_CHEF_LABO, type SpectreRole } from '../core/model/user.schema';

export interface UserMultiSelectProps {
    /** UUIDs des UserProfile sélectionnés. */
    value: string[];
    /** Callback déclenché lors du changement de sélection. */
    onChange: (uuids: string[]) => void;
    /**
     * Rôles métier autorisés. Si non fourni, aucun filtre côté serveur :
     * tous les utilisateurs actifs sont proposés.
     */
    roles?: SpectreRole[];
    /**
     * Inclut systématiquement chef_labo en plus du filtre `roles`.
     * Défaut: true (chef de labo = super-utilisateur métier).
     */
    alwaysIncludeChefLabo?: boolean;
    label: string;
    required?: boolean;
    disabled?: boolean;
    size?: 'small' | 'medium';
    error?: boolean;
    helperText?: string;
    /** id pour aria-label (si pas fourni, fallback sur `label`). */
    ariaLabel?: string;
}

const sortByLastName = (a: UserLookup, b: UserLookup): number => {
    const left = `${a.lastName} ${a.firstName}`.trim().toLowerCase();
    const right = `${b.lastName} ${b.firstName}`.trim().toLowerCase();
    return left.localeCompare(right, 'fr');
};

export const UserMultiSelect = memo(function UserMultiSelect({
    value,
    onChange,
    roles,
    alwaysIncludeChefLabo = true,
    label,
    required = false,
    disabled = false,
    size = 'small',
    error = false,
    helperText,
    ariaLabel,
}: UserMultiSelectProps) {
    const effectiveRoles = useMemo<SpectreRole[] | undefined>(() => {
        if (!roles || roles.length === 0) return undefined;
        if (!alwaysIncludeChefLabo) return roles;
        return roles.includes(ROLE_CHEF_LABO) ? roles : [...roles, ROLE_CHEF_LABO];
    }, [roles, alwaysIncludeChefLabo]);

    const { data: users, isLoading, isError } = useUserLookup(effectiveRoles);

    const options = useMemo(() => [...(users ?? [])].sort(sortByLastName), [users]);

    const selected = useMemo(() => options.filter((u) => value.includes(u.uuid)), [options, value]);

    const computedHelperText = helperText ?? (isError ? 'Erreur lors du chargement des utilisateurs' : undefined);

    return (
        <Autocomplete<UserLookup, true, false, false>
            multiple
            options={options}
            value={selected}
            onChange={(_, next) => onChange(next.map((u) => u.uuid))}
            getOptionLabel={(option) => formatUserDisplayName(option)}
            isOptionEqualToValue={(option, candidate) => option.uuid === candidate.uuid}
            disabled={disabled || isError}
            loading={isLoading}
            noOptionsText="Aucun utilisateur"
            size={size}
            renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                        <Chip
                            key={key}
                            {...tagProps}
                            label={formatUserDisplayName(option)}
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
                    // L'input texte d'un Autocomplete multiple reste vide (les sélections
                    // sont des chips). On n'active donc le `required` natif HTML que
                    // lorsqu'aucun opérateur n'est sélectionné : sinon la validation
                    // navigateur bloque la soumission malgré des chips présents
                    // (« Please fill out this field »). La règle métier (≥1) reste
                    // portée par zod. L'astérisque suit la même logique (visible tant
                    // que le champ n'est pas satisfait).
                    required={required && value.length === 0}
                    error={error || isError}
                    helperText={computedHelperText}
                    inputProps={{
                        ...params.inputProps,
                        'aria-label': ariaLabel ?? label,
                    }}
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {isLoading ? <CircularProgress color="inherit" size={16} /> : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                />
            )}
        />
    );
});
