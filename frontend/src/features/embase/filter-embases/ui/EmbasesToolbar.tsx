/**
 * Embases Toolbar
 * @module features/filter-embases/ui
 *
 * Embase-specific filter fields and chips, using shared FilterToolbar layout.
 * Style: Aligned with FsecsToolbar pattern.
 */

import { memo, useCallback, useMemo } from 'react';
import { Button, FormControl, InputLabel, Select, MenuItem, Chip, alpha, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useFilterEmbasesStore } from '../model/filter-embases.store';
import { EMBASE_TYPE_LABELS } from '@entities/embase';
import { getChipStyles } from '@shared/lib';
import { FilterToolbar } from '@widgets/filter-toolbar';

const VOIE_OPTIONS: { label: string; value: 1 | 2; color: string }[] = [
    { label: 'Voie 1', value: 1, color: '#1976d2' },
    { label: 'Voie 2', value: 2, color: '#9c27b0' },
];

interface EmbasesToolbarProps {
    onAdd?: () => void;
}

export const EmbasesToolbar = memo(function EmbasesToolbar({ onAdd }: EmbasesToolbarProps) {
    const theme = useTheme();
    const { filters, setFilter, resetFilters } = useFilterEmbasesStore();

    const activeFilterCount = useMemo(
        () =>
            (filters.type !== null ? 1 : 0) +
            (filters.nombreVoies.length > 0 && filters.nombreVoies.length < 2 ? 1 : 0),
        [filters.type, filters.nombreVoies],
    );

    const handleVoieChange = useCallback(
        (value: 1 | 2) => {
            const current = filters.nombreVoies;
            if (current.includes(value)) {
                const next = current.filter((v) => v !== value);
                setFilter('nombreVoies', next.length > 0 ? next : ([value === 1 ? 2 : 1] as (1 | 2)[]));
            } else {
                setFilter('nombreVoies', [...current, value].sort() as (1 | 2)[]);
            }
        },
        [filters.nombreVoies, setFilter],
    );

    const renderPrefix = useCallback(
        () => (
            <>
                {VOIE_OPTIONS.map((opt) => {
                    const isActive = filters.nombreVoies.includes(opt.value);
                    return (
                        <Button
                            key={opt.value}
                            variant={isActive ? 'contained' : 'outlined'}
                            size="small"
                            sx={{
                                borderRadius: 1,
                                px: 2,
                                height: 40,
                                fontWeight: 600,
                                ...(isActive
                                    ? {
                                          bgcolor: opt.color,
                                          color: '#fff',
                                          '&:hover': { bgcolor: alpha(opt.color, 0.85) },
                                      }
                                    : {
                                          color: opt.color,
                                          borderColor: alpha(opt.color, 0.5),
                                          '&:hover': {
                                              bgcolor: alpha(opt.color, 0.08),
                                              borderColor: opt.color,
                                          },
                                      }),
                            }}
                            onClick={() => handleVoieChange(opt.value)}
                        >
                            {opt.label}
                        </Button>
                    );
                })}
            </>
        ),
        [filters.nombreVoies, handleVoieChange],
    );

    const renderPopoverContent = useCallback(
        (inputSx: SxProps<Theme>) => (
            <>
                <FormControl size="small" fullWidth sx={inputSx}>
                    <InputLabel>Type</InputLabel>
                    <Select
                        value={filters.type ?? ''}
                        onChange={(e) =>
                            setFilter(
                                'type',
                                e.target.value === '' ? null : (e.target.value as 'jet_de_gaz' | 'hp' | 'bp'),
                            )
                        }
                        label="Type"
                    >
                        <MenuItem value="">Tous les types</MenuItem>
                        {Object.entries(EMBASE_TYPE_LABELS).map(([value, label]) => (
                            <MenuItem key={value} value={value}>
                                {label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </>
        ),
        [filters, setFilter],
    );

    const renderFilterChips = useCallback(() => {
        return (
            <>
                {filters.nombreVoies.length > 0 && filters.nombreVoies.length < 2 && (
                    <Chip
                        label={VOIE_OPTIONS[filters.nombreVoies[0] - 1].label}
                        size="small"
                        onDelete={() => setFilter('nombreVoies', [1, 2] as (1 | 2)[])}
                        sx={getChipStyles(
                            alpha(VOIE_OPTIONS[filters.nombreVoies[0] - 1].color, 0.15),
                            VOIE_OPTIONS[filters.nombreVoies[0] - 1].color,
                        )}
                    />
                )}
                {filters.type !== null && (
                    <Chip
                        label={`Type: ${EMBASE_TYPE_LABELS[filters.type]}`}
                        size="small"
                        onDelete={() => setFilter('type', null)}
                        sx={getChipStyles(alpha(theme.palette.primary.main, 0.1), theme.palette.primary.main)}
                    />
                )}
            </>
        );
    }, [filters, setFilter, theme]);

    return (
        <FilterToolbar
            hideSearch
            onResetFilters={resetFilters}
            activeFilterCount={activeFilterCount}
            onAdd={onAdd}
            renderPopoverContent={renderPopoverContent}
            renderFilterChips={renderFilterChips}
            renderPrefix={renderPrefix}
        />
    );
});
