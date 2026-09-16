/**
 * PlanningToolbar — Barre d'outils avec filtres (popover), navigation, mode édition.
 *
 * Aligned with FilterToolbar / FsecsToolbar / CampaignsToolbar styling patterns.
 */
import { useState, useMemo, useCallback } from 'react';
import {
    Badge,
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Popover,
    Select,
    Stack,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import { ArrowBackIosNew, ArrowForwardIos, CalendarToday, FilterList, RestartAlt } from '@mui/icons-material';
import { useCampaigns } from '@entities/campaign/core/api/campaign.queries';
import { CAMPAIGN_INSTALLATIONS } from '@entities/campaign/core/lib';
import { usePlanningSteps } from '@entities/planning/core/api/planning.queries';
import { getInputStyles, getChipStyles } from '@shared/lib';
import { ColorDot } from '@shared/ui';
import { usePlanningStore } from '../lib/planning.store';

const INSTALLATION_LIST = Object.values(CAMPAIGN_INSTALLATIONS);
const POPOVER_WIDTH = 320;

export function PlanningToolbar() {
    const theme = useTheme();
    const navigateForward = usePlanningStore((s) => s.navigateForward);
    const navigateBackward = usePlanningStore((s) => s.navigateBackward);
    const goToToday = usePlanningStore((s) => s.goToToday);
    const filters = usePlanningStore((s) => s.filters);
    const setFilters = usePlanningStore((s) => s.setFilters);
    const resetFilters = usePlanningStore((s) => s.resetFilters);
    const setSelectedYear = usePlanningStore((s) => s.setSelectedYear);

    const { data: campaigns = [] } = useCampaigns();
    const { data: planningSteps = [] } = usePlanningSteps();

    const inputSx = useMemo(() => getInputStyles(theme), [theme]);

    // Popover state
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const isPopoverOpen = Boolean(anchorEl);
    const handleOpenFilters = useCallback((e: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget), []);
    const handleCloseFilters = useCallback(() => setAnchorEl(null), []);

    // Derived data
    const years = useMemo(
        () => [...new Set(campaigns.map((c) => c.year))].filter((y): y is number => y !== null).sort((a, b) => b - a),
        [campaigns],
    );

    const filteredCampaigns = useMemo(
        () =>
            campaigns
                .filter(
                    (c) =>
                        filters.installations.includes(c.installation?.label ?? '') &&
                        (filters.year == null || c.year === filters.year),
                )
                .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
        [campaigns, filters.installations, filters.year],
    );

    const selectedCampaign = useMemo(
        () => filteredCampaigns.find((c) => c.uuid === filters.campaignUuid) ?? null,
        [filteredCampaigns, filters.campaignUuid],
    );

    const selectedEtapes = useMemo(
        () => planningSteps.filter((e) => filters.etapeLabels.includes(e.label)),
        [planningSteps, filters.etapeLabels],
    );

    // Active filter count — always count year & installation (like other toolbars)
    const activeFilterCount = useMemo(() => {
        let count = 2; // year + installation are always active
        if (filters.etapeLabels.length > 0) count++;
        if (filters.campaignUuid !== null) count++;
        return count;
    }, [filters]);

    const hasActiveFilters = activeFilterCount > 0;

    // Handlers
    function handleInstallationChange(label: string | '') {
        if (label === '') {
            setFilters((f) => ({ ...f, installations: ['LMJ', 'OMEGA'] }));
        } else {
            setFilters((f) => ({ ...f, installations: [label] }));
        }
    }

    function handleYearChange(year: number | '') {
        const val = year === '' ? null : year;
        setFilters((f) => ({ ...f, year: val }));
        if (val) setSelectedYear(val);
    }

    function handleEtapeChange(labels: string[]) {
        // Aucune sélection = toutes les étapes (filtre vide).
        setFilters((f) => ({ ...f, etapeLabels: labels }));
    }

    function handleCampaignChange(uuid: string | '') {
        setFilters((f) => ({ ...f, campaignUuid: uuid === '' ? null : uuid }));
    }

    const handleReset = useCallback(() => {
        resetFilters();
    }, [resetFilters]);

    return (
        <Box sx={{ mb: 1.5 }}>
            <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {/* Installation toggles (quick access) */}
                    {INSTALLATION_LIST.map((inst) => {
                        const isActive = filters.installations.includes(inst.label);
                        const instColor = inst.color ?? theme.palette.primary.main;
                        return (
                            <Button
                                key={inst.label}
                                variant={isActive ? 'contained' : 'outlined'}
                                size="small"
                                startIcon={<ColorDot color={isActive ? '#fff' : instColor} size={8} />}
                                sx={{
                                    borderRadius: 1,
                                    px: 2,
                                    height: 40,
                                    fontWeight: 600,
                                    ...(isActive
                                        ? {
                                              bgcolor: instColor,
                                              color: '#fff',
                                              '&:hover': { bgcolor: alpha(instColor, 0.85) },
                                          }
                                        : {
                                              color: instColor,
                                              borderColor: alpha(instColor, 0.5),
                                              '&:hover': {
                                                  bgcolor: alpha(instColor, 0.08),
                                                  borderColor: instColor,
                                              },
                                          }),
                                }}
                                onClick={() =>
                                    handleInstallationChange(
                                        filters.installations.includes(inst.label) && filters.installations.length === 1
                                            ? ''
                                            : inst.label,
                                    )
                                }
                            >
                                {inst.label}
                            </Button>
                        );
                    })}

                    {/* Filtres button with popover */}
                    <Badge
                        badgeContent={activeFilterCount}
                        color="primary"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            '& .MuiBadge-badge': { right: 4, top: 4 },
                        }}
                    >
                        <Button
                            startIcon={<FilterList />}
                            onClick={handleOpenFilters}
                            size="small"
                            variant={activeFilterCount > 0 ? 'contained' : 'outlined'}
                            sx={{ borderRadius: 1, px: 2, height: 40 }}
                        >
                            Filtres
                        </Button>
                    </Badge>

                    {/* Filters Popover */}
                    <Popover
                        open={isPopoverOpen}
                        anchorEl={anchorEl}
                        onClose={handleCloseFilters}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        sx={{
                            '& .MuiPopover-paper': {
                                borderRadius: 1,
                                mt: 1,
                                minWidth: POPOVER_WIDTH,
                            },
                        }}
                    >
                        <Box sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                Filtres avancés
                            </Typography>
                            <Stack spacing={2}>
                                {/* Installation */}
                                <FormControl size="small" fullWidth sx={inputSx}>
                                    <InputLabel>Installation</InputLabel>
                                    <Select
                                        value={filters.installations.length === 1 ? filters.installations[0] : ''}
                                        onChange={(e) => handleInstallationChange(e.target.value as string)}
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

                                {/* Year */}
                                <FormControl size="small" fullWidth sx={inputSx}>
                                    <InputLabel>Année</InputLabel>
                                    <Select
                                        value={filters.year ?? ''}
                                        onChange={(e) => handleYearChange(e.target.value as number | '')}
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

                                {/* Étape */}
                                <FormControl size="small" fullWidth sx={inputSx}>
                                    <InputLabel>Étape</InputLabel>
                                    <Select
                                        multiple
                                        value={filters.etapeLabels}
                                        onChange={(e) => handleEtapeChange(e.target.value as string[])}
                                        label="Étape"
                                        renderValue={(selected) =>
                                            selected.length === 0 ? undefined : (selected as string[]).join(', ')
                                        }
                                    >
                                        {planningSteps.map((etape) => (
                                            <MenuItem key={etape.label} value={etape.label}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <ColorDot color={etape.color} />
                                                    {etape.label}
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {/* Campaign */}
                                <FormControl size="small" fullWidth sx={inputSx}>
                                    <InputLabel>Campagne</InputLabel>
                                    <Select
                                        value={filters.campaignUuid ?? ''}
                                        onChange={(e) => handleCampaignChange(e.target.value as string)}
                                        label="Campagne"
                                    >
                                        <MenuItem value="">Toutes les campagnes</MenuItem>
                                        {filteredCampaigns.map((c) => (
                                            <MenuItem key={c.uuid} value={c.uuid}>
                                                {c.name} ({c.year})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Stack>
                        </Box>
                    </Popover>

                    {/* Spacer */}
                    <Box sx={{ flexGrow: 1 }} />

                    {/* Actions */}
                    <Stack direction="row" spacing={1} alignItems="center">
                        {/* Reset */}
                        <Button
                            startIcon={<RestartAlt />}
                            onClick={handleReset}
                            size="small"
                            disabled={!hasActiveFilters}
                            sx={{
                                color: hasActiveFilters ? 'text.secondary' : 'text.disabled',
                                borderRadius: 1,
                                '&:hover': {
                                    backgroundColor: alpha(theme.palette.error.main, 0.08),
                                    color: 'error.main',
                                },
                            }}
                        >
                            Réinitialiser
                        </Button>

                        {/* Today */}
                        <Tooltip title="Aujourd'hui">
                            <IconButton
                                size="small"
                                onClick={goToToday}
                                aria-label="Aujourd'hui"
                                sx={{ color: 'text.secondary' }}
                            >
                                <CalendarToday fontSize="small" />
                            </IconButton>
                        </Tooltip>

                        {/* Navigation */}
                        <Tooltip title="Précédent">
                            <IconButton
                                size="small"
                                onClick={navigateBackward}
                                aria-label="Précédent"
                                sx={{ color: 'text.secondary' }}
                            >
                                <ArrowBackIosNew sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Suivant">
                            <IconButton
                                size="small"
                                onClick={navigateForward}
                                aria-label="Suivant"
                                sx={{ color: 'text.secondary' }}
                            >
                                <ArrowForwardIos sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Paper>

            {/* Active Filter Chips — always visible to show current state */}
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                {/* Year chip */}
                {filters.year !== null && (
                    <Chip
                        label={`Année: ${filters.year}`}
                        size="small"
                        onDelete={() => setFilters((f) => ({ ...f, year: null }))}
                        sx={getChipStyles(alpha(theme.palette.info.main, 0.1), theme.palette.info.dark)}
                    />
                )}

                {/* Installation chip */}
                {filters.installations.length < 2
                    ? (() => {
                          const inst = INSTALLATION_LIST.find((i) => i.label === filters.installations[0]);
                          const instColor = inst?.color ?? '#666';
                          return (
                              <Chip
                                  label={`Installation: ${filters.installations[0]}`}
                                  size="small"
                                  onDelete={() => setFilters((f) => ({ ...f, installations: ['LMJ', 'OMEGA'] }))}
                                  sx={getChipStyles(alpha(instColor, 0.15), instColor)}
                              />
                          );
                      })()
                    : null}

                {/* Étape chips */}
                {filters.etapeLabels.length > 0 &&
                    selectedEtapes.map((etape) => (
                        <Chip
                            key={etape.label}
                            label={`Étape: ${etape.label}`}
                            size="small"
                            onDelete={() =>
                                setFilters((f) => ({
                                    ...f,
                                    etapeLabels: f.etapeLabels.filter((l) => l !== etape.label),
                                }))
                            }
                            sx={getChipStyles(alpha(etape.color, 0.15), etape.color)}
                        />
                    ))}

                {/* Campaign chip */}
                {selectedCampaign && (
                    <Chip
                        label={`Campagne: ${selectedCampaign.name}`}
                        size="small"
                        onDelete={() => setFilters((f) => ({ ...f, campaignUuid: null }))}
                        sx={getChipStyles(alpha(theme.palette.info.main, 0.1), theme.palette.info.dark)}
                    />
                )}
            </Stack>
        </Box>
    );
}
