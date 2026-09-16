/**
 * AddAssemblyItemModal — modal riche pour ajouter un élément/consommable au
 * tableau récap d'une FSEC.
 *
 *  - Recherche texte (nom + référence)
 *  - Tabs kind (Tous / Éléments / Consommables)
 *  - Pills par rubrique avec compteur
 *  - Liste détaillée (badge kind, nom, ref, rubrique, statut/quantité, fournisseur)
 *  - Éléments sérialisés déjà attribués à cette FSEC : grisés, non sélectionnables
 *  - Consommables déjà attribués (R20) : signalés mais RE-sélectionnables — un même
 *    consommable peut figurer plusieurs fois (longueurs/usages différents), la
 *    remarque différenciant les occurrences
 *  - Panneau de sélection au pied + remarque optionnelle
 *
 * Source data :
 *   - `useAvailableForFsec(fsecUuid)` : items proposables (CDC §5.4)
 *   - `useFsecAssemblyItems(fsecUuid)` : items déjà liés → marquage UI
 */

import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import { useAddAssemblyItem, useAvailableForFsec, useFsecAssemblyItems } from '@entities/fsec-assembly-item';
import {
    CATEGORIES_BY_KIND,
    CATEGORY_LABELS,
    ITEM_KIND,
    ITEM_KIND_LABELS,
    KindIcon,
    QuantityBadge,
    RubricBadge,
    StatusBadge,
    formatLocation,
    type CategoryCode,
    type ItemKind,
    type StockCatalogItem,
} from '@entities/stock-item';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib/error-utils';
import { motion } from '@shared/ui/motion';

interface AddAssemblyItemModalProps {
    open: boolean;
    fsecUuid: string;
    onClose: () => void;
}

type KindTab = 'all' | ItemKind;

export function AddAssemblyItemModal({ open, fsecUuid, onClose }: AddAssemblyItemModalProps) {
    const theme = useTheme();
    const fsecParam = open ? fsecUuid : null;

    const { data: items, isLoading: itemsLoading } = useAvailableForFsec(fsecParam);
    const { data: alreadyAttached } = useFsecAssemblyItems(fsecParam);
    const addMutation = useAddAssemblyItem(fsecUuid);
    const { showNotification } = useNotification();

    const [search, setSearch] = useState('');
    const [kindTab, setKindTab] = useState<KindTab>('all');
    const [activeCategory, setActiveCategory] = useState<CategoryCode | null>(null);
    const [selected, setSelected] = useState<StockCatalogItem | null>(null);
    const [remarque, setRemarque] = useState('');

    // UUIDs déjà liés à cette FSEC (marquage UI « Déjà ajouté »).
    const attachedUuids = useMemo(
        () => new Set((alreadyAttached ?? []).map((row) => row.catalogItemUuid)),
        [alreadyAttached],
    );

    // Seuls les ÉLÉMENTS sérialisés déjà liés sont bloqués (unicité physique) ;
    // un consommable déjà lié reste sélectionnable (multi-ajout, R20).
    const isBlocked = (item: StockCatalogItem): boolean =>
        attachedUuids.has(item.uuid) && item.kind === ITEM_KIND.ELEMENT;

    const reset = () => {
        setSearch('');
        setKindTab('all');
        setActiveCategory(null);
        setSelected(null);
        setRemarque('');
    };

    // Reset à la fermeture (évite que des sélections précédentes persistent)
    useEffect(() => {
        if (!open) reset();
    }, [open]);

    const handleClose = () => {
        if (addMutation.isPending) return;
        onClose();
    };

    const handleSubmit = async () => {
        if (!selected) return;
        try {
            await addMutation.mutateAsync({
                fsec_uuid: fsecUuid,
                catalog_item_uuid: selected.uuid,
                remarque: remarque.trim() || null,
            });
            showNotification(`« ${selected.name} » ajouté au tableau récap`, 'success');
            onClose();
        } catch (err) {
            showNotification(getErrorMessage(err, "Erreur lors de l'ajout"), 'error');
        }
    };

    // Filtrage : kind tab → category pill → search
    const filteredItems = useMemo(() => {
        if (!items) return [];
        const needle = search.trim().toLowerCase();
        return items
            .filter((it) => (kindTab === 'all' ? true : it.kind === kindTab))
            .filter((it) => (activeCategory ? it.category === activeCategory : true))
            .filter((it) => {
                if (!needle) return true;
                const hay = `${it.name} ${it.reference ?? ''} ${it.fournisseur ?? ''}`.toLowerCase();
                return hay.includes(needle);
            })
            .sort((a, b) => {
                // Seuls les items bloqués (éléments déjà attribués) descendent en bas ;
                // les consommables déjà liés restent à leur place (ré-ajout possible).
                const aBlocked = attachedUuids.has(a.uuid) && a.kind === ITEM_KIND.ELEMENT;
                const bBlocked = attachedUuids.has(b.uuid) && b.kind === ITEM_KIND.ELEMENT;
                if (aBlocked !== bBlocked) return aBlocked ? 1 : -1;
                if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
                return a.name.localeCompare(b.name);
            });
    }, [items, kindTab, activeCategory, search, attachedUuids]);

    // Compteurs pour les pills (basés sur le filtre kind, hors filtre rubrique/search)
    const countsByCategory = useMemo(() => {
        const map = new Map<CategoryCode, number>();
        let total = 0;
        if (items) {
            for (const it of items) {
                if (kindTab !== 'all' && it.kind !== kindTab) continue;
                total += 1;
                map.set(it.category, (map.get(it.category) ?? 0) + 1);
            }
        }
        return { total, map };
    }, [items, kindTab]);

    const visibleCategories: CategoryCode[] = useMemo(() => {
        if (kindTab === ITEM_KIND.ELEMENT) return [...CATEGORIES_BY_KIND[ITEM_KIND.ELEMENT]];
        if (kindTab === ITEM_KIND.CONSUMABLE) return [...CATEGORIES_BY_KIND[ITEM_KIND.CONSUMABLE]];
        return [...CATEGORIES_BY_KIND[ITEM_KIND.ELEMENT], ...CATEGORIES_BY_KIND[ITEM_KIND.CONSUMABLE]];
    }, [kindTab]);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { height: '85vh' } }}>
            <DialogTitle sx={{ pb: 1 }}>
                Ajouter un élément ou consommable
                <Typography variant="caption" color="text.secondary" component="div">
                    Sélectionnez un item parmi les éléments disponibles ou les consommables actifs. Un consommable peut
                    être ajouté plusieurs fois (usages différents, remarque distincte).
                </Typography>
            </DialogTitle>

            <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
                {/* Search */}
                <TextField
                    autoFocus
                    fullWidth
                    size="small"
                    placeholder="Rechercher par nom, référence ou fournisseur…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: search ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setSearch('')}>
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : null,
                    }}
                />

                {/* Tabs Kind */}
                <Tabs
                    value={kindTab}
                    onChange={(_, v: KindTab) => {
                        setKindTab(v);
                        setActiveCategory(null);
                        setSelected(null);
                    }}
                    sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
                >
                    <Tab value="all" label={`Tous (${items?.length ?? 0})`} />
                    <Tab
                        value={ITEM_KIND.ELEMENT}
                        label={`Éléments (${items?.filter((i) => i.kind === ITEM_KIND.ELEMENT).length ?? 0})`}
                    />
                    <Tab
                        value={ITEM_KIND.CONSUMABLE}
                        label={`Consommables (${items?.filter((i) => i.kind === ITEM_KIND.CONSUMABLE).length ?? 0})`}
                    />
                </Tabs>

                {/* Pills rubriques */}
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75, alignItems: 'center' }}>
                    <Chip
                        label={`Toutes · ${countsByCategory.total}`}
                        size="small"
                        clickable
                        color={activeCategory === null ? 'primary' : 'default'}
                        variant={activeCategory === null ? 'filled' : 'outlined'}
                        onClick={() => setActiveCategory(null)}
                    />
                    {visibleCategories.map((cat) => {
                        const count = countsByCategory.map.get(cat) ?? 0;
                        const isActive = activeCategory === cat;
                        return (
                            <Chip
                                key={cat}
                                label={`${CATEGORY_LABELS[cat]} · ${count}`}
                                size="small"
                                clickable
                                color={isActive ? 'primary' : 'default'}
                                variant={isActive ? 'filled' : 'outlined'}
                                disabled={count === 0}
                                onClick={() => setActiveCategory(isActive ? null : cat)}
                            />
                        );
                    })}
                </Stack>

                <Divider />

                {/* Liste */}
                <Box sx={{ flex: 1, overflow: 'auto', mx: -1 }}>
                    {itemsLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={28} />
                        </Box>
                    )}
                    {!itemsLoading && filteredItems.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                                Aucun item ne correspond aux filtres actifs.
                            </Typography>
                        </Box>
                    )}
                    {!itemsLoading && filteredItems.length > 0 && (
                        <Stack spacing={0.5} sx={{ px: 1 }}>
                            {filteredItems.map((item) => {
                                const isAttached = attachedUuids.has(item.uuid);
                                const blocked = isBlocked(item);
                                const isSelected = selected?.uuid === item.uuid;
                                return (
                                    <ItemRow
                                        key={item.uuid}
                                        item={item}
                                        isSelected={isSelected}
                                        isAttached={isAttached}
                                        isBlocked={blocked}
                                        onClick={() => {
                                            if (blocked) return;
                                            setSelected(isSelected ? null : item);
                                        }}
                                    />
                                );
                            })}
                        </Stack>
                    )}
                </Box>

                {/* Panneau sélection + remarque */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: 1.5,
                        bgcolor: selected ? alpha(theme.palette.primary.main, 0.04) : 'background.default',
                        borderColor: selected ? 'primary.main' : 'divider',
                    }}
                >
                    {selected ? (
                        <Stack spacing={1.5}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <KindIcon kind={selected.kind} size="small" />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {selected.name}
                                        {selected.reference ? ` — ${selected.reference}` : ''}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {ITEM_KIND_LABELS[selected.kind]} · {CATEGORY_LABELS[selected.category]}
                                    </Typography>
                                </Box>
                                <Tooltip title="Désélectionner">
                                    <IconButton size="small" onClick={() => setSelected(null)}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                            <TextField
                                label="Remarque (optionnel)"
                                value={remarque}
                                onChange={(e) => setRemarque(e.target.value)}
                                multiline
                                minRows={1}
                                maxRows={3}
                                size="small"
                                inputProps={{ maxLength: 1000 }}
                            />
                        </Stack>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
                            Cliquez sur un item ci-dessus pour le sélectionner.
                        </Typography>
                    )}
                </Paper>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} color="inherit" disabled={addMutation.isPending}>
                    Annuler
                </Button>
                <Button onClick={handleSubmit} variant="contained" disabled={!selected || addMutation.isPending}>
                    {addMutation.isPending ? 'Ajout…' : 'Ajouter au tableau'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

interface ItemRowProps {
    item: StockCatalogItem;
    isSelected: boolean;
    /** Déjà présent dans le tableau récap (information). */
    isAttached: boolean;
    /** Non sélectionnable : élément sérialisé déjà attribué (R20 : jamais un consommable). */
    isBlocked: boolean;
    onClick: () => void;
}

function ItemRow({ item, isSelected, isAttached, isBlocked, onClick }: ItemRowProps) {
    const theme = useTheme();

    const bg = isSelected
        ? alpha(theme.palette.primary.main, 0.08)
        : isBlocked
          ? alpha(theme.palette.action.disabledBackground, 0.4)
          : 'transparent';
    const borderColor = isSelected ? 'primary.main' : 'divider';

    return (
        <Box
            onClick={onClick}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 1,
                borderRadius: 1,
                border: 1,
                borderColor,
                bgcolor: bg,
                cursor: isBlocked ? 'not-allowed' : 'pointer',
                opacity: isBlocked ? 0.55 : 1,
                transition: motion.transition(['background-color', 'border-color'], 'instant'),
                '&:hover': isBlocked ? undefined : { bgcolor: alpha(theme.palette.action.hover, 0.5) },
            }}
            role="button"
            aria-pressed={isSelected}
            aria-disabled={isBlocked}
        >
            <Box sx={{ color: isSelected ? 'primary.main' : 'text.disabled', display: 'flex' }}>
                {isSelected ? <CheckCircleIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
            </Box>
            <KindIcon kind={item.kind} size="small" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {item.name}
                    </Typography>
                    {item.reference && (
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                            {item.reference}
                        </Typography>
                    )}
                    {isAttached && (
                        <Chip
                            label={isBlocked ? 'Déjà ajouté' : 'Déjà ajouté — ré-ajout possible'}
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                    )}
                </Stack>
                <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    sx={{ mt: 0.25, flexWrap: 'wrap', rowGap: 0.5 }}
                >
                    <RubricBadge category={item.category} />
                    {item.kind === ITEM_KIND.ELEMENT && item.status && <StatusBadge status={item.status} />}
                    {item.kind === ITEM_KIND.CONSUMABLE && <QuantityBadge item={item} />}
                    {item.fournisseur && (
                        <Typography variant="caption" color="text.secondary">
                            · {item.fournisseur}
                        </Typography>
                    )}
                    {formatLocation(item) !== '—' && (
                        <Typography variant="caption" color="text.secondary">
                            · {formatLocation(item)}
                        </Typography>
                    )}
                </Stack>
            </Box>
        </Box>
    );
}
