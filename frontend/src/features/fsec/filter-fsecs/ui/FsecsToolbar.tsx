/**
 * FSECs Toolbar
 * @module features/filter-fsecs/ui
 *
 * FSEC-specific filter fields and chips, using shared FilterToolbar layout.
 */

import { useCallback, useMemo } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Box, Chip, Divider, alpha, useTheme } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useFilterFsecsStore } from '../model/filter-fsecs.store';
import { useCreateFsecStore } from '@features/fsec/create-fsec';
import { useCampaigns, CampaignWithRelations } from '@entities/campaign';
import { CAMPAIGN_INSTALLATIONS } from '@entities/campaign/core/lib';
import { FSEC_STATUS_LIST, FSEC_CATEGORY_LIST } from '@entities/fsec';
import { getChipStyles } from '@shared/lib';
import { ColorDot } from '@shared/ui';
import { FilterToolbar } from '@widgets/filter-toolbar';

const INSTALLATION_LIST = Object.values(CAMPAIGN_INSTALLATIONS);

const extractYears = (campaigns: CampaignWithRelations[] | undefined, installation: string | null): number[] => {
    if (!campaigns) return [];
    const filtered = installation ? campaigns.filter((c) => c.installation?.label === installation) : campaigns;
    return [...new Set(filtered.map((c) => c.year))].filter((y): y is number => y !== null).sort((a, b) => b - a);
};

export function FsecsToolbar() {
    const theme = useTheme();
    const { filters, setFilter, resetFilters } = useFilterFsecsStore();
    const openCreateFsecModalAction = useCreateFsecStore((state) => state.open);
    // Wrap the store action so the "Ajouter" button's click MouseEvent isn't
    // forwarded as `campaignId`. Passing it would set `preselectedCampaignId`
    // to a truthy object and disable the campaign selector in the create modal.
    const openCreateFsecModal = useCallback(() => openCreateFsecModalAction(), [openCreateFsecModalAction]);
    const { data: campaigns } = useCampaigns();

    const years = useMemo(() => extractYears(campaigns, filters.installation), [campaigns, filters.installation]);

    const activeFilterCount = useMemo(
        () =>
            [filters.installation, filters.status, filters.category, filters.campaign, filters.year].filter(
                (v) => v !== null,
            ).length,
        [filters.installation, filters.status, filters.category, filters.campaign, filters.year],
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
                    <InputLabel>Campagne</InputLabel>
                    <Select
                        value={filters.campaign ?? ''}
                        onChange={(e) =>
                            setFilter('campaign', e.target.value === '' ? null : (e.target.value as string))
                        }
                        label="Campagne"
                    >
                        <MenuItem value="">Toutes les campagnes</MenuItem>
                        {campaigns?.map((c) => (
                            <MenuItem key={c.uuid} value={c.uuid}>
                                {c.name} ({c.year})
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
                    <InputLabel>Statut</InputLabel>
                    <Select
                        value={filters.status ?? ''}
                        onChange={(e) => setFilter('status', e.target.value === '' ? null : Number(e.target.value))}
                        label="Statut"
                    >
                        <MenuItem value="">Tous les statuts</MenuItem>
                        {FSEC_STATUS_LIST.map((s) => (
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
                    <InputLabel>Catégorie</InputLabel>
                    <Select
                        value={filters.category ?? ''}
                        onChange={(e) => setFilter('category', e.target.value === '' ? null : Number(e.target.value))}
                        label="Catégorie"
                    >
                        <MenuItem value="">Toutes les catégories</MenuItem>
                        {FSEC_CATEGORY_LIST.map((c) => (
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
        [filters, setFilter, years, campaigns],
    );

    const renderFilterChips = useCallback(() => {
        const activeInstallation = INSTALLATION_LIST.find((i) => i.label === filters.installation);
        const activeStatus = filters.status !== null ? FSEC_STATUS_LIST.find((s) => s.id === filters.status) : null;
        const activeCategory =
            filters.category !== null ? FSEC_CATEGORY_LIST.find((c) => c.id === filters.category) : null;
        const activeCampaign = filters.campaign !== null ? campaigns?.find((c) => c.uuid === filters.campaign) : null;

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
                {activeCampaign && (
                    <Chip
                        label={`Campagne: ${activeCampaign.name}`}
                        size="small"
                        onDelete={() => setFilter('campaign', null)}
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
                {activeCategory && (
                    <Chip
                        label={`Catégorie: ${activeCategory.label}`}
                        size="small"
                        onDelete={() => setFilter('category', null)}
                        sx={getChipStyles(alpha(activeCategory.color, 0.15), activeCategory.color)}
                    />
                )}
            </>
        );
    }, [filters, setFilter, campaigns, theme]);

    return (
        <FilterToolbar
            searchPlaceholder="Rechercher par nom..."
            filterName={filters.name}
            onFilterNameChange={handleFilterNameChange}
            onResetFilters={resetFilters}
            activeFilterCount={activeFilterCount}
            onAdd={openCreateFsecModal}
            renderPopoverContent={renderPopoverContent}
            renderFilterChips={renderFilterChips}
        />
    );
}
