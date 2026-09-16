/**
 * RubricFilterPills — barre de filtre par rubrique alignée sur le formalisme
 * du header de tableau (Paper variant="outlined" + Box flex + py: 1.25).
 *
 * Cliquer sur une rubrique applique le filtre `category` du store. Cliquer à
 * nouveau dessus (ou sur "Toutes") réinitialise le filtre rubrique.
 */

import { memo, useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
    CATEGORIES_BY_KIND,
    CATEGORY_LABELS,
    ITEM_KIND,
    type CategoryCode,
    type StockCatalogItem,
} from '@entities/stock-item';
import { useFilterCatalogStore } from '../model';
import { motion } from '@shared/ui/motion';

interface RubricFilterPillsProps {
    /** Items déjà filtrés par les autres filtres (kind, search, etc.) — sert au calcul des compteurs. */
    items: StockCatalogItem[] | undefined;
}

interface CountsByCategory {
    total: number;
    byCategory: Map<CategoryCode, number>;
}

function computeCounts(items: StockCatalogItem[] | undefined): CountsByCategory {
    const byCategory = new Map<CategoryCode, number>();
    let total = 0;
    if (items) {
        for (const item of items) {
            total += 1;
            byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + 1);
        }
    }
    return { total, byCategory };
}

interface RubricButtonProps {
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
}

const RubricButton = memo(function RubricButton({ label, count, isActive, onClick }: RubricButtonProps) {
    return (
        <Box
            component="button"
            type="button"
            onClick={onClick}
            sx={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                px: 0,
                py: 0.5,
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'primary.main' : 'text.secondary',
                transition: `color ${motion.fast}`,
                whiteSpace: 'nowrap',
                '&:hover': {
                    color: isActive ? 'primary.dark' : 'text.primary',
                },
                // Indicateur trait sous l'item actif (style TableSortLabel)
                '&::after': isActive
                    ? {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: -2,
                          height: 2,
                          bgcolor: 'primary.main',
                          borderRadius: 1,
                      }
                    : undefined,
            }}
        >
            {label}
            <Box
                component="span"
                sx={{
                    bgcolor: isActive ? 'primary.50' : 'grey.100',
                    color: isActive ? 'primary.main' : 'text.secondary',
                    px: 0.85,
                    py: 0.05,
                    borderRadius: 5,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    minWidth: 22,
                    textAlign: 'center',
                    transition: motion.transition(['background-color', 'color'], 'fast'),
                }}
            >
                {count}
            </Box>
        </Box>
    );
});

const GroupLabel = memo(function GroupLabel({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            variant="caption"
            sx={{
                color: 'text.disabled',
                fontWeight: 700,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
                userSelect: 'none',
            }}
        >
            {children}
        </Typography>
    );
});

const Separator = memo(function Separator() {
    return <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'divider', mx: 0.25 }} />;
});

export const RubricFilterPills = memo(function RubricFilterPills({ items }: RubricFilterPillsProps) {
    const activeCategory = useFilterCatalogStore((s) => s.filters.category);
    const setCategory = useFilterCatalogStore((s) => s.setCategory);

    const counts = useMemo(() => computeCounts(items), [items]);

    const handleClick = (category: CategoryCode | null) => {
        setCategory(activeCategory === category ? null : category);
    };

    return (
        <Paper
            variant="outlined"
            sx={{
                mb: 3,
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    py: 1.25,
                    px: 2,
                    gap: 2.5,
                    flexWrap: 'wrap',
                    rowGap: 1,
                }}
            >
                <RubricButton
                    label="Toutes les rubriques"
                    count={counts.total}
                    isActive={activeCategory === null}
                    onClick={() => setCategory(null)}
                />
                <Separator />
                <GroupLabel>Éléments</GroupLabel>
                {CATEGORIES_BY_KIND[ITEM_KIND.ELEMENT].map((cat) => (
                    <RubricButton
                        key={cat}
                        label={CATEGORY_LABELS[cat]}
                        count={counts.byCategory.get(cat) ?? 0}
                        isActive={activeCategory === cat}
                        onClick={() => handleClick(cat)}
                    />
                ))}
                <Separator />
                <GroupLabel>Consommables</GroupLabel>
                {CATEGORIES_BY_KIND[ITEM_KIND.CONSUMABLE].map((cat) => (
                    <RubricButton
                        key={cat}
                        label={CATEGORY_LABELS[cat]}
                        count={counts.byCategory.get(cat) ?? 0}
                        isActive={activeCategory === cat}
                        onClick={() => handleClick(cat)}
                    />
                ))}
            </Box>
        </Paper>
    );
});
