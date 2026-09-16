/**
 * CatalogToolbar — barre d'outils de l'onglet Catalogue.
 *
 * Réutilise `FilterToolbar` (debounced search, popover filtres avancés, reset, add)
 * et alimente le store `useFilterCatalogStore`.
 */

import { useCallback, useMemo } from 'react';
import { Chip, FormControl, InputLabel, MenuItem, Select, Stack, type SelectChangeEvent } from '@mui/material';
import { FilterToolbar } from '@widgets/filter-toolbar';
import {
    ELEMENT_STATUS_LABELS,
    ELEMENT_STATUS_VALUES,
    INSTALLATION_LABELS,
    INSTALLATION_VALUES,
    ITEM_KIND,
    ITEM_KIND_LABELS,
    ITEM_KIND_VALUES,
    type ElementStatus,
    type Installation,
    type ItemKind,
} from '@entities/stock-item';
import { countActiveAdvancedFilters, useFilterCatalogStore } from '../model';

interface CatalogToolbarProps {
    onAdd?: () => void;
}

/**
 * Libellé de l'option « aucun filtre » dans les listes déroulantes. Elle n'est
 * affichée QUE dans le menu ouvert : les Select n'utilisent pas `displayEmpty`,
 * sinon ce texte se superposait au label outliné non rétracté (R16).
 */
const SELECT_PLACEHOLDER = '— Tous —';

export function CatalogToolbar({ onAdd }: CatalogToolbarProps) {
    const filters = useFilterCatalogStore((s) => s.filters);
    const setSearch = useFilterCatalogStore((s) => s.setSearch);
    const setKind = useFilterCatalogStore((s) => s.setKind);
    const setStatus = useFilterCatalogStore((s) => s.setStatus);
    const setInstallation = useFilterCatalogStore((s) => s.setInstallation);
    const reset = useFilterCatalogStore((s) => s.reset);

    const activeFilterCount = useMemo(() => countActiveAdvancedFilters(filters), [filters]);

    const renderPopoverContent = useCallback(() => {
        const handleKind = (e: SelectChangeEvent<string>) => {
            const val = e.target.value;
            setKind(val === '' ? null : (val as ItemKind));
        };
        const handleStatus = (e: SelectChangeEvent<string>) => {
            const val = e.target.value;
            setStatus(val === '' ? null : (val as ElementStatus));
        };
        const handleInstallation = (e: SelectChangeEvent<string>) => {
            const val = e.target.value;
            setInstallation(val === '' ? null : (val as Installation));
        };

        const elementOnlyDisabled = filters.kind === ITEM_KIND.CONSUMABLE;

        return (
            <Stack spacing={2}>
                <FormControl size="small" fullWidth>
                    <InputLabel id="catalog-filter-kind-label">Type</InputLabel>
                    <Select
                        labelId="catalog-filter-kind-label"
                        label="Type"
                        value={filters.kind ?? ''}
                        onChange={handleKind}
                    >
                        <MenuItem value="">{SELECT_PLACEHOLDER}</MenuItem>
                        {ITEM_KIND_VALUES.map((k) => (
                            <MenuItem key={k} value={k}>
                                {ITEM_KIND_LABELS[k]}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" fullWidth disabled={elementOnlyDisabled}>
                    <InputLabel id="catalog-filter-status-label">Statut élément</InputLabel>
                    <Select
                        labelId="catalog-filter-status-label"
                        label="Statut élément"
                        value={filters.status ?? ''}
                        onChange={handleStatus}
                    >
                        <MenuItem value="">{SELECT_PLACEHOLDER}</MenuItem>
                        {ELEMENT_STATUS_VALUES.map((s) => (
                            <MenuItem key={s} value={s}>
                                {ELEMENT_STATUS_LABELS[s]}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" fullWidth disabled={elementOnlyDisabled}>
                    <InputLabel id="catalog-filter-installation-label">Installation</InputLabel>
                    <Select
                        labelId="catalog-filter-installation-label"
                        label="Installation"
                        value={filters.installation ?? ''}
                        onChange={handleInstallation}
                    >
                        <MenuItem value="">{SELECT_PLACEHOLDER}</MenuItem>
                        {INSTALLATION_VALUES.map((i) => (
                            <MenuItem key={i} value={i}>
                                {INSTALLATION_LABELS[i]}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Stack>
        );
    }, [filters.installation, filters.kind, filters.status, setInstallation, setKind, setStatus]);

    const renderFilterChips = useCallback(() => {
        const chips: React.ReactElement[] = [];
        if (filters.kind) {
            chips.push(
                <Chip
                    key="kind"
                    label={`Type : ${ITEM_KIND_LABELS[filters.kind]}`}
                    size="small"
                    onDelete={() => setKind(null)}
                />,
            );
        }
        if (filters.status) {
            chips.push(
                <Chip
                    key="status"
                    label={`Statut : ${ELEMENT_STATUS_LABELS[filters.status]}`}
                    size="small"
                    onDelete={() => setStatus(null)}
                />,
            );
        }
        if (filters.installation) {
            chips.push(
                <Chip
                    key="installation"
                    label={`Installation : ${INSTALLATION_LABELS[filters.installation]}`}
                    size="small"
                    onDelete={() => setInstallation(null)}
                />,
            );
        }
        return chips;
    }, [filters.installation, filters.kind, filters.status, setInstallation, setKind, setStatus]);

    return (
        <FilterToolbar
            searchPlaceholder="Rechercher par nom ou référence…"
            filterName={filters.search}
            onFilterNameChange={setSearch}
            onResetFilters={reset}
            activeFilterCount={activeFilterCount}
            onAdd={onAdd}
            renderPopoverContent={renderPopoverContent}
            renderFilterChips={renderFilterChips}
        />
    );
}
