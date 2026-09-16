/**
 * FsecAutocomplete — sélecteur FSEC commun (R02).
 * @module entities/fsec/ui
 *
 * Autocomplete générique sur des objets `Fsec` :
 *  - libellé contextualisé campagne (`formatFsecOptionLabel`) ;
 *  - options sans troncature (retour à la ligne, popper au moins aussi large
 *    que le contenu) ;
 *  - Tooltip du libellé complet sur le champ (la valeur sélectionnée peut
 *    dépasser la largeur de l'input) ;
 *  - égalité par `versionUuid`.
 *
 * Le composant est contrôlé : le parent décide ce qu'il persiste
 * (`fsec.name` côté stock, `versionUuid` côté FA).
 */

import { memo, useCallback } from 'react';
import { Autocomplete, TextField, Tooltip, Typography } from '@mui/material';

import type { Fsec } from '../model/fsec.schema';
import { formatFsecOptionLabel } from '../lib/fsec-label';

export interface FsecAutocompleteProps {
    /** Options proposées (déjà filtrées/triées par le parent). */
    options: readonly Fsec[];
    /** FSEC sélectionnée (objet issu de `options`) ou `null`. */
    value: Fsec | null;
    onChange: (fsec: Fsec | null) => void;
    onBlur?: () => void;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    loading?: boolean;
    error?: boolean;
    helperText?: React.ReactNode;
    noOptionsText?: React.ReactNode;
    size?: 'small' | 'medium';
    fullWidth?: boolean;
}

const OPTION_TEXT_SX = { whiteSpace: 'normal', wordBreak: 'break-word' } as const;

export const FsecAutocomplete = memo(function FsecAutocomplete({
    options,
    value,
    onChange,
    onBlur,
    label = 'FSEC',
    required = false,
    disabled = false,
    loading = false,
    error = false,
    helperText,
    noOptionsText = 'Aucune FSEC disponible',
    size = 'medium',
    fullWidth = true,
}: FsecAutocompleteProps) {
    // Le libellé est le nom complet calculé par le backend (`fsec.displayName`).
    const getOptionLabel = useCallback((fsec: Fsec) => formatFsecOptionLabel(fsec), []);

    const selectedLabel = value ? getOptionLabel(value) : '';

    return (
        <Autocomplete<Fsec, false, false, false>
            options={options}
            value={value}
            onChange={(_, selected) => onChange(selected)}
            onBlur={onBlur}
            getOptionLabel={getOptionLabel}
            isOptionEqualToValue={(option, selected) => option.versionUuid === selected.versionUuid}
            disabled={disabled}
            loading={loading}
            fullWidth={fullWidth}
            size={size}
            noOptionsText={noOptionsText}
            // Le popper prend au moins la largeur du champ (comportement MUI) et
            // peut s'élargir pour ne jamais tronquer un libellé long.
            slotProps={{ popper: { style: { minWidth: 'fit-content' } } }}
            renderOption={(props, option) => {
                const { key, ...liProps } = props;
                return (
                    <li key={key ?? option.versionUuid} {...liProps}>
                        <Typography variant="body2" sx={OPTION_TEXT_SX}>
                            {getOptionLabel(option)}
                        </Typography>
                    </li>
                );
            }}
            renderInput={(params) => (
                // `describeChild` : le tooltip DÉCRIT le champ (aria-describedby) sans
                // remplacer son nom accessible (le label « FSEC » reste la référence).
                <Tooltip
                    title={selectedLabel}
                    placement="top-start"
                    disableHoverListener={!selectedLabel}
                    describeChild
                >
                    <TextField {...params} label={label} required={required} error={error} helperText={helperText} />
                </Tooltip>
            )}
        />
    );
});
