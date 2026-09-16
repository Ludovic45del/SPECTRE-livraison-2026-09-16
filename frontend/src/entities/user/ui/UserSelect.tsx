/**
 * UserSelect — dropdown réutilisable pour choisir un opérateur (uuid).
 * @module entities/user/ui
 *
 * Filtré par rôle métier (assembleur, métrologue, IEC, etc.). chef_labo est
 * inclus par défaut (super-utilisateur). Utilisé partout où l'on saisissait
 * autrefois un nom en texte libre (steps, FA, étalonnage, équipes).
 *
 * Branchement DB : appelle GET /users/lookup/?role=… via useUserLookup().
 */

import { memo, useMemo } from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useUserLookup } from '../core/api/user.queries';
import { formatUserDisplayName } from '../core/lib/format-user-display-name';
import type { UserLookup } from '../core/model/user-lookup.schema';
import { ROLE_CHEF_LABO, type SpectreRole } from '../core/model/user.schema';

export interface UserSelectProps {
    /** UUID du UserProfile sélectionné, ou null. */
    value: string | null;
    /** Callback déclenché lors du changement de sélection. */
    onChange: (uuid: string | null) => void;
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

export const UserSelect = memo(function UserSelect({
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
}: UserSelectProps) {
    const effectiveRoles = useMemo<SpectreRole[] | undefined>(() => {
        if (!roles || roles.length === 0) return undefined;
        if (!alwaysIncludeChefLabo) return roles;
        return roles.includes(ROLE_CHEF_LABO) ? roles : [...roles, ROLE_CHEF_LABO];
    }, [roles, alwaysIncludeChefLabo]);

    const { data: users, isLoading, isError } = useUserLookup(effectiveRoles);

    const options = useMemo(() => [...(users ?? [])].sort(sortByLastName), [users]);

    // Valeur qui ne correspond à aucun utilisateur proposé (utilisateur désactivé
    // depuis la saisie : /users/lookup/ ne renvoie que les actifs) : plutôt que
    // d'afficher un champ vide — qui laisserait croire que la donnée est perdue
    // alors que la FK est conservée à l'enregistrement — on matérialise une
    // option de repli, visible comme valeur mais non sélectionnable dans la liste.
    const unresolvedFallback = useMemo<UserLookup | null>(() => {
        if (!value || isLoading || options.some((u) => u.uuid === value)) return null;
        return {
            uuid: value,
            username: 'Utilisateur désactivé',
            firstName: '',
            lastName: '',
            // Rôles de commodité, jamais affichés ni filtrés pour cette option.
            roles: [ROLE_CHEF_LABO],
            role: ROLE_CHEF_LABO,
            isActive: false,
            laboratoire: '',
            service: '',
            numero: '',
            bureau: '',
            avatarUrl: null,
        };
    }, [value, isLoading, options]);

    const optionsWithFallback = useMemo(
        () => (unresolvedFallback ? [...options, unresolvedFallback] : options),
        [options, unresolvedFallback],
    );

    const selected = useMemo(
        () => optionsWithFallback.find((u) => u.uuid === value) ?? null,
        [optionsWithFallback, value],
    );

    const computedHelperText = helperText ?? (isError ? 'Erreur lors du chargement des utilisateurs' : undefined);

    return (
        <Autocomplete<UserLookup, false, false, false>
            options={optionsWithFallback}
            value={selected}
            onChange={(_, next) => onChange(next?.uuid ?? null)}
            getOptionLabel={(option) => formatUserDisplayName(option)}
            getOptionDisabled={(option) => option.uuid === unresolvedFallback?.uuid}
            isOptionEqualToValue={(option, candidate) => option.uuid === candidate.uuid}
            disabled={disabled || isError}
            loading={isLoading}
            noOptionsText="Aucun utilisateur"
            size={size}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    required={required}
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
