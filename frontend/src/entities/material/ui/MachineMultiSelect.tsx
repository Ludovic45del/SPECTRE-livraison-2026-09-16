/**
 * MachineMultiSelect — dropdown multi-sélection des machines d'une salle.
 * @module entities/material/ui
 *
 * Filtré par salle (B1 = assemblage, B2 = métrologie). Les machines hors
 * service restent sélectionnables mais sont grisées (cas de rattrapage).
 *
 * Branchement DB : résout la salle via useMachineRooms() puis charge les
 * machines via useMachines(roomId).
 */

import { memo, useMemo } from 'react';
import { Autocomplete, Chip, CircularProgress, TextField } from '@mui/material';
import { useMachineRooms } from '../api/rooms.queries';
import { useMachines } from '../api/machines.queries';
import { MACHINE_STATUS } from '../model';
import type { Machine } from '../model';

export interface MachineMultiSelectProps {
    /** UUIDs des machines sélectionnées. */
    value: string[];
    /** Callback déclenché lors du changement de sélection. */
    onChange: (uuids: string[]) => void;
    /** Code de la salle dont on liste les machines. */
    roomCode: 'B1' | 'B2';
    label: string;
    required?: boolean;
    disabled?: boolean;
    size?: 'small' | 'medium';
    error?: boolean;
    helperText?: string;
}

const isOutOfService = (machine: Machine): boolean => machine.status !== MACHINE_STATUS.IN_SERVICE;

const sortByName = (a: Machine, b: Machine): number => a.name.localeCompare(b.name, 'fr');

export const MachineMultiSelect = memo(function MachineMultiSelect({
    value,
    onChange,
    roomCode,
    label,
    required = false,
    disabled = false,
    size = 'small',
    error = false,
    helperText,
}: MachineMultiSelectProps) {
    const { data: rooms, isLoading: isLoadingRooms } = useMachineRooms();

    const roomId = useMemo(() => rooms?.find((room) => room.code === roomCode)?.id ?? null, [rooms, roomCode]);

    const { data: machines, isLoading: isLoadingMachines, isError } = useMachines(roomId);

    const options = useMemo(() => [...(machines ?? [])].sort(sortByName), [machines]);

    const selected = useMemo(() => options.filter((machine) => value.includes(machine.uuid)), [options, value]);

    const isLoading = isLoadingRooms || isLoadingMachines;
    const computedHelperText = helperText ?? (isError ? 'Erreur lors du chargement des machines' : undefined);

    return (
        <Autocomplete<Machine, true, false, false>
            multiple
            options={options}
            value={selected}
            onChange={(_, next) => onChange(next.map((machine) => machine.uuid))}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, candidate) => option.uuid === candidate.uuid}
            disabled={disabled || isError}
            loading={isLoading}
            noOptionsText="Aucune machine"
            size={size}
            renderOption={(props, option) => {
                const { key, ...rest } = props as typeof props & { key: string };
                return (
                    <li key={key} {...rest} style={{ opacity: isOutOfService(option) ? 0.5 : 1 }}>
                        {option.name}
                        {isOutOfService(option) ? ' (hors service)' : ''}
                    </li>
                );
            }}
            renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                        <Chip
                            key={key}
                            {...tagProps}
                            label={option.name}
                            size="small"
                            variant={isOutOfService(option) ? 'outlined' : 'filled'}
                            color={isOutOfService(option) ? 'default' : 'primary'}
                        />
                    );
                })
            }
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    required={required}
                    error={error || isError}
                    helperText={computedHelperText}
                    inputProps={{
                        ...params.inputProps,
                        'aria-label': label,
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
