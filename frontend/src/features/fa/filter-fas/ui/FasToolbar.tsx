/**
 * FA Toolbar
 * @module features/fa/filter-fas
 *
 * FA-specific filter fields and chips, using shared FilterToolbar layout.
 */

import { useCallback, useMemo } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Box, Chip, Divider, alpha, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useFilterFasStore } from '../model';
import { useCreateFaStore } from '../../create-fa';
import { useFsecs } from '@entities/fsec';
import { useFas, FA_STATUS_LIST, FA_CRITICALITY_LIST } from '@entities/fa';
import { CAMPAIGN_INSTALLATIONS } from '@entities/campaign';
import { getChipStyles } from '@shared/lib';
import { ColorDot } from '@shared/ui';
import { FilterToolbar } from '@widgets/filter-toolbar';

const CURRENT_YEAR = new Date().getFullYear();
const INSTALLATION_LIST = Object.values(CAMPAIGN_INSTALLATIONS);

export function FasToolbar() {
    const theme = useTheme();
    const { filters, setFilter, resetFilters } = useFilterFasStore();
    const openCreateFaModalAction = useCreateFaStore((state) => state.open);
    const handleOpenCreateFaModal = useCallback(() => openCreateFaModalAction(), [openCreateFaModalAction]);
    const { data: fsecs } = useFsecs();
    const { data: fas } = useFas();

    const availableYears = useMemo(() => {
        if (!fas) return [CURRENT_YEAR];
        const years = new Set<number>();
        fas.forEach((fa) => {
            if (fa.eventDate) {
                years.add(new Date(fa.eventDate).getFullYear());
            }
        });
        years.add(CURRENT_YEAR);
        return Array.from(years).sort((a, b) => b - a);
    }, [fas]);

    const activeFilterCount = useMemo(
        () =>
            [filters.installation, filters.year, filters.status, filters.criticality, filters.fsec].filter(
                (v) => v !== null,
            ).length,
        [filters.installation, filters.year, filters.status, filters.criticality, filters.fsec],
    );

    const handleFilterNameChange = useCallback((value: string) => setFilter('name', value), [setFilter]);

    const renderPopoverContent = useCallback(
        (inputSx: SxProps<Theme>) => (
            <>
                <FormControl size="small" fullWidth sx={inputSx}>
                    <InputLabel>Installation</InputLabel>
                    <Select
                        value={filters.installation ?? ''}
                        onChange={(e) =>
                            setFilter(
                                'installation',
                                e.target.value === '' ? null : (e.target.value as 'LMJ' | 'OMEGA'),
                            )
                        }
                        label="Installation"
                    >
                        <MenuItem value="">Toutes les installations</MenuItem>
                        {INSTALLATION_LIST.map((inst) => (
                            <MenuItem key={inst.id} value={inst.label}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ColorDot color={inst.color ?? '#666'} />
                                    {inst.label}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" fullWidth sx={inputSx}>
                    <InputLabel>Année</InputLabel>
                    <Select
                        value={filters.year ?? ''}
                        onChange={(e) => setFilter('year', e.target.value === '' ? null : Number(e.target.value))}
                        label="Année"
                    >
                        <MenuItem value="">Toutes les années</MenuItem>
                        {availableYears.map((year) => (
                            <MenuItem key={year} value={year}>
                                {year}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Divider />

                <FormControl size="small" fullWidth sx={inputSx}>
                    <InputLabel>FSEC</InputLabel>
                    <Select
                        value={filters.fsec ?? ''}
                        onChange={(e) => setFilter('fsec', e.target.value === '' ? null : (e.target.value as string))}
                        label="FSEC"
                    >
                        <MenuItem value="">Toutes les FSEC</MenuItem>
                        {fsecs?.map((f) => (
                            <MenuItem key={f.versionUuid} value={f.versionUuid}>
                                {f.displayName}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Divider />

                <FormControl size="small" fullWidth sx={inputSx}>
                    <InputLabel>Statut</InputLabel>
                    <Select
                        value={filters.status ?? ''}
                        onChange={(e) => setFilter('status', e.target.value === '' ? null : Number(e.target.value))}
                        label="Statut"
                    >
                        <MenuItem value="">Tous les statuts</MenuItem>
                        {FA_STATUS_LIST.map((s) => (
                            <MenuItem key={s.id} value={s.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ColorDot color={s.color} />
                                    {s.label}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" fullWidth sx={inputSx}>
                    <InputLabel>Criticité</InputLabel>
                    <Select
                        value={filters.criticality ?? ''}
                        onChange={(e) =>
                            setFilter('criticality', e.target.value === '' ? null : Number(e.target.value))
                        }
                        label="Criticité"
                    >
                        <MenuItem value="">Toutes les criticités</MenuItem>
                        {FA_CRITICALITY_LIST.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ColorDot color={c.color} />
                                    {c.label}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </>
        ),
        [filters, setFilter, availableYears, fsecs],
    );

    const renderFilterChips = useCallback(() => {
        const activeInstallation = INSTALLATION_LIST.find((i) => i.label === filters.installation);
        const activeStatus = filters.status !== null ? FA_STATUS_LIST.find((s) => s.id === filters.status) : null;
        const activeCriticality =
            filters.criticality !== null ? FA_CRITICALITY_LIST.find((c) => c.id === filters.criticality) : null;
        const activeFsec = filters.fsec !== null ? fsecs?.find((f) => f.versionUuid === filters.fsec) : null;

        return (
            <>
                {filters.year !== null && (
                    <Chip
                        label={`Année: ${filters.year}`}
                        size="small"
                        onDelete={() => setFilter('year', null)}
                        sx={getChipStyles(alpha(theme.palette.info.main, 0.1), theme.palette.info.dark)}
                    />
                )}
                {activeInstallation && (
                    <Chip
                        label={`Installation: ${activeInstallation.label}`}
                        size="small"
                        onDelete={() => setFilter('installation', null)}
                        sx={getChipStyles(
                            alpha(activeInstallation.color ?? '#666', 0.15),
                            activeInstallation.color ?? '#666',
                        )}
                    />
                )}
                {activeFsec && (
                    <Chip
                        label={`FSEC: ${activeFsec.displayName}`}
                        size="small"
                        onDelete={() => setFilter('fsec', null)}
                        sx={getChipStyles(alpha(theme.palette.info.main, 0.1), theme.palette.info.dark)}
                    />
                )}
                {activeStatus && (
                    <Chip
                        label={`Statut: ${activeStatus.label}`}
                        size="small"
                        onDelete={() => setFilter('status', null)}
                        sx={getChipStyles(alpha(activeStatus.color, 0.15), activeStatus.color)}
                    />
                )}
                {activeCriticality && (
                    <Chip
                        label={`Criticité: ${activeCriticality.label}`}
                        size="small"
                        onDelete={() => setFilter('criticality', null)}
                        sx={getChipStyles(alpha(activeCriticality.color, 0.15), activeCriticality.color)}
                    />
                )}
            </>
        );
    }, [filters, setFilter, fsecs, theme]);

    return (
        <FilterToolbar
            searchPlaceholder="Rechercher par identifiant..."
            filterName={filters.name}
            onFilterNameChange={handleFilterNameChange}
            onResetFilters={resetFilters}
            activeFilterCount={activeFilterCount}
            onAdd={handleOpenCreateFaModal}
            renderPopoverContent={renderPopoverContent}
            renderFilterChips={renderFilterChips}
        />
    );
}
