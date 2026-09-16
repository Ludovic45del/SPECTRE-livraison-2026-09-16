/**
 * Shared Filter Toolbar
 * @module widgets/filter-toolbar
 *
 * Generic toolbar with debounced search, filter popover, reset/add actions, and active filter chips.
 * Used by CampaignsToolbar, FasToolbar, FsecsToolbar to eliminate layout duplication.
 */

import { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import {
    Stack,
    TextField,
    Button,
    Box,
    Paper,
    Chip,
    InputAdornment,
    alpha,
    useTheme,
    Popover,
    Badge,
    Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useDebounce, getInputStyles, getChipStyles } from '@shared/lib';

const POPOVER_WIDTH = 320;

interface FilterToolbarProps {
    searchPlaceholder?: string;
    filterName?: string;
    onFilterNameChange?: (value: string) => void;
    onResetFilters: () => void;
    activeFilterCount: number;
    onAdd?: () => void;
    renderPopoverContent: (inputSx: SxProps<Theme>) => ReactNode;
    renderFilterChips?: () => ReactNode;
    renderPrefix?: () => ReactNode;
    hideSearch?: boolean;
    hideFilterButton?: boolean;
}

export function FilterToolbar({
    searchPlaceholder,
    filterName,
    onFilterNameChange,
    onResetFilters,
    activeFilterCount,
    onAdd,
    renderPopoverContent,
    renderFilterChips,
    renderPrefix,
    hideSearch,
    hideFilterButton,
}: FilterToolbarProps) {
    const theme = useTheme();

    // Popover state
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const isPopoverOpen = Boolean(anchorEl);

    // Debounced search - local state for immediate input, debounced sync to store
    const [searchInput, setSearchInput] = useState(filterName ?? '');
    const debouncedSearch = useDebounce(searchInput, 300);

    useEffect(() => {
        if (!hideSearch && debouncedSearch !== filterName) {
            onFilterNameChange?.(debouncedSearch);
        }
    }, [debouncedSearch, filterName, onFilterNameChange, hideSearch]);

    const inputSx = useMemo(() => getInputStyles(theme), [theme]);
    const hasActiveFilters = (!hideSearch && Boolean(searchInput)) || activeFilterCount > 0;

    const handleOpenFilters = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(e.currentTarget);
    }, []);

    const handleCloseFilters = useCallback(() => setAnchorEl(null), []);

    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value),
        [],
    );

    const handleSearchClear = useCallback(() => {
        setSearchInput('');
        onFilterNameChange?.('');
    }, [onFilterNameChange]);

    const handleReset = useCallback(() => {
        setSearchInput('');
        onResetFilters();
    }, [onResetFilters]);

    return (
        <Box sx={{ mb: 1.5 }}>
            <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {/* Prefix (toggle buttons) */}
                    {renderPrefix?.()}

                    {/* Search Field (debounced) */}
                    {!hideSearch && (
                        <TextField
                            placeholder={searchPlaceholder}
                            value={searchInput}
                            onChange={handleSearchChange}
                            size="small"
                            sx={{ ...(inputSx as object), minWidth: 220 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchInput ? (
                                    <InputAdornment position="end">
                                        <CloseIcon
                                            sx={{
                                                fontSize: 18,
                                                cursor: 'pointer',
                                                color: 'text.secondary',
                                                '&:hover': { color: 'text.primary' },
                                            }}
                                            onClick={handleSearchClear}
                                        />
                                    </InputAdornment>
                                ) : null,
                            }}
                        />
                    )}

                    {/* Filter Button */}
                    {!hideFilterButton && (
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
                                startIcon={<FilterListIcon />}
                                onClick={handleOpenFilters}
                                size="small"
                                variant={activeFilterCount > 0 ? 'contained' : 'outlined'}
                                sx={{ borderRadius: 1, px: 2, height: 40 }}
                            >
                                Filtres
                            </Button>
                        </Badge>
                    )}

                    {/* Filters Popover */}
                    {!hideFilterButton && (
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
                                <Stack spacing={2}>{renderPopoverContent(inputSx)}</Stack>
                            </Box>
                        </Popover>
                    )}

                    {/* Spacer */}
                    <Box sx={{ flexGrow: 1 }} />

                    {/* Actions */}
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Button
                            startIcon={<RestartAltIcon />}
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

                        {onAdd && (
                            <Button
                                startIcon={<AddIcon />}
                                variant="contained"
                                size="small"
                                onClick={onAdd}
                                sx={{
                                    borderRadius: 1,
                                    px: 2,
                                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                                    '&:hover': {
                                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                                    },
                                }}
                            >
                                Ajouter
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Paper>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    {!hideSearch && searchInput && (
                        <Chip
                            label={`Recherche: "${searchInput}"`}
                            size="small"
                            onDelete={handleSearchClear}
                            sx={getChipStyles(alpha(theme.palette.primary.main, 0.1), theme.palette.primary.main)}
                        />
                    )}
                    {renderFilterChips?.()}
                </Stack>
            )}
        </Box>
    );
}
