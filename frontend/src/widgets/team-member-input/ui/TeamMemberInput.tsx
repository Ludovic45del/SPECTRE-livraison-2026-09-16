/**
 * TeamMemberInput — composant de saisie d'un membre d'équipe (campagne ou FSEC)
 * @module widgets/team-member-input
 *
 * Switche automatiquement entre :
 * - `<TextField>` pour les rôles "extérieurs" (MOE, TCI) — saisie libre.
 * - `<UserSelect>` filtré par rôle métier pour tous les autres.
 *
 * Garantit qu'à tout instant exactement un des deux champs (`name` ou
 * `userUuid`) est renseigné — l'autre est forcé à null. Cohérent avec le
 * CheckConstraint backend sur CampaignTeams / FsecTeams.
 */

import { memo, useCallback } from 'react';
import { TextField } from '@mui/material';
import { UserSelect } from '@entities/user';
import { type TeamRoleLabel, getRolesForTeamLabel, isFreeTextTeamRole } from '../lib/role-mapping';

export interface TeamMemberValue {
    /** Nom saisi en texte libre (uniquement pour MOE / TCI). Null sinon. */
    name: string | null;
    /** UUID UserProfile sélectionné via UserSelect. Null pour MOE / TCI. */
    userUuid: string | null;
}

export interface TeamMemberInputProps {
    roleLabel: TeamRoleLabel;
    value: TeamMemberValue;
    onChange: (next: TeamMemberValue) => void;
    label: string;
    required?: boolean;
    disabled?: boolean;
    size?: 'small' | 'medium';
    error?: boolean;
    helperText?: string;
}

export const TeamMemberInput = memo(function TeamMemberInput({
    roleLabel,
    value,
    onChange,
    label,
    required = false,
    disabled = false,
    size = 'small',
    error = false,
    helperText,
}: TeamMemberInputProps) {
    const handleTextChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => onChange({ name: e.target.value, userUuid: null }),
        [onChange],
    );

    const handleUserChange = useCallback((uuid: string | null) => onChange({ name: null, userUuid: uuid }), [onChange]);

    if (isFreeTextTeamRole(roleLabel)) {
        return (
            <TextField
                value={value.name ?? ''}
                onChange={handleTextChange}
                label={label}
                required={required}
                disabled={disabled}
                size={size}
                error={error}
                helperText={helperText}
                fullWidth
                inputProps={{ 'aria-label': label, maxLength: 50 }}
            />
        );
    }

    return (
        <UserSelect
            value={value.userUuid}
            onChange={handleUserChange}
            roles={getRolesForTeamLabel(roleLabel)}
            label={label}
            required={required}
            disabled={disabled}
            size={size}
            error={error}
            helperText={helperText}
        />
    );
});
