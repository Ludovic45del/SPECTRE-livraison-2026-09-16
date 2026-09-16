/**
 * Campaigns Toolbar
 * @module features/filter-campaigns/ui
 *
 * Campaign-specific filter fields and chips, using shared FilterToolbar layout.
 */

import { memo, useCallback, useMemo } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Box, Chip, Divider, alpha, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useFilterCampaignsStore } from '../model';
import { useCampaigns, CampaignWithRelations } from '@entities/campaign';
import { getChipStyles } from '@shared/lib';
import { ColorDot } from '@shared/ui';
import { CAMPAIGN_INSTALLATIONS, CAMPAIGN_TYPES, CAMPAIGN_STATUSES } from '@entities/campaign/core/lib';
import { FilterToolbar } from '@widgets/filter-toolbar';

const SEMESTER_OPTIONS = ['S1', 'S2'] as const;
const CAMPAIGN_TYPE_LIST = Object.values(CAMPAIGN_TYPES);
const CAMPAIGN_STATUS_LIST = Object.values(CAMPAIGN_STATUSES);
const INSTALLATION_LIST = Object.values(CAMPAIGN_INSTALLATIONS);

const extractYears = (campaigns: CampaignWithRelations[] | undefined, installation: string | null): number[] => {
    if (!campaigns) return [];
    const filtered = installation ? campaigns.filter((c) => c.installation?.label === installation) : campaigns;
    return [...new Set(filtered.map((c) => c.year))].filter((y): y is number => y !== null).sort((a, b) => b - a);
};

interface CampaignsToolbarProps {
    onAdd?: () => void;
}

export const CampaignsToolbar = memo(function CampaignsToolbar({ onAdd }: CampaignsToolbarProps) {
    const theme = useTheme();
    const { filters, setFilter, resetFilters } = useFilterCampaignsStore();
    const { data: campaigns } = useCampaigns();

    const years = useMemo(() => extractYears(campaigns, filters.installation), [campaigns, filters.installation]);

    const activeFilterCount = useMemo(
        () =>
            [filters.installation, filters.year, filters.semester, filters.type, filters.status].filter(
                (v) => v !== null,
            ).length,
        [filters.installation, filters.year, filters.semester, filters.type, filters.status],
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
                        {years.map((year) => (
                            <MenuItem key={year} value={year}>
                                {year}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Divider />

                <FormControl size="small" fullWidth sx={inputSx}>
                    <InputLabel>Semestre</InputLabel>
                    <Select
                        value={filters.semester ?? ''}
                        onChange={(e) => setFilter('semester', e.target.value === '' ? null : e.target.value)}
                        label="Semestre"
                    >
                        <MenuItem value="">Tous les semestres</MenuItem>
                        {SEMESTER_OPTIONS.map((sem) => (
                            <MenuItem key={sem} value={sem}>
                                {sem}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Divider />

                <FormControl size="small" fullWidth sx={inputSx}>
                    <InputLabel>Type</InputLabel>
                    <Select
                        value={filters.type?.id ?? ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setFilter(
                                'type',
                                val === '' ? null : (CAMPAIGN_TYPE_LIST.find((t) => t.id === Number(val)) ?? null),
                            );
                        }}
                        label="Type"
                    >
                        <MenuItem value="">Tous les types</MenuItem>
                        {CAMPAIGN_TYPE_LIST.map((t) => (
                            <MenuItem key={t.id} value={t.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ColorDot color={t.color ?? '#666'} />
                                    {t.label}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" fullWidth sx={inputSx}>
                    <InputLabel>Statut</InputLabel>
                    <Select
                        value={filters.status ?? ''}
                        onChange={(e) => setFilter('status', e.target.value === '' ? null : (e.target.value as string))}
                        label="Statut"
                    >
                        <MenuItem value="">Tous les statuts</MenuItem>
                        {CAMPAIGN_STATUS_LIST.map((s) => (
                            <MenuItem key={s.id} value={s.label}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ColorDot color={s.color ?? '#666'} />
                                    {s.label}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </>
        ),
        [filters, setFilter, years],
    );

    const renderFilterChips = useCallback(() => {
        const activeInstallation = INSTALLATION_LIST.find((i) => i.label === filters.installation);
        const activeStatus =
            filters.status !== null ? CAMPAIGN_STATUS_LIST.find((s) => s.label === filters.status) : null;

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
                {filters.semester !== null && (
                    <Chip
                        label={`Semestre: ${filters.semester}`}
                        size="small"
                        onDelete={() => setFilter('semester', null)}
                        sx={getChipStyles(alpha(theme.palette.text.secondary, 0.15), theme.palette.text.secondary)}
                    />
                )}
                {filters.type && (
                    <Chip
                        label={`Type: ${filters.type.label}`}
                        size="small"
                        onDelete={() => setFilter('type', null)}
                        sx={getChipStyles(alpha(filters.type.color ?? '#666', 0.15), filters.type.color ?? '#666')}
                    />
                )}
                {activeStatus && (
                    <Chip
                        label={`Statut: ${activeStatus.label}`}
                        size="small"
                        onDelete={() => setFilter('status', null)}
                        sx={getChipStyles(alpha(activeStatus.color ?? '#666', 0.15), activeStatus.color ?? '#666')}
                    />
                )}
            </>
        );
    }, [filters, setFilter, theme]);

    return (
        <FilterToolbar
            searchPlaceholder="Rechercher par nom..."
            filterName={filters.name}
            onFilterNameChange={handleFilterNameChange}
            onResetFilters={resetFilters}
            activeFilterCount={activeFilterCount}
            onAdd={onAdd}
            renderPopoverContent={renderPopoverContent}
            renderFilterChips={renderFilterChips}
        />
    );
});
