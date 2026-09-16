/**
 * AlertSectionTable — une section d'alertes rendue sous forme de table MUI,
 * dans le même esprit visuel que le Catalogue.
 *
 * En-tête sobre (Typography + petit Chip compteur), pas de dégradé ni de
 * bandeau coloré. Chaque ligne réutilise les badges de l'entité stock-item.
 *
 * - Clic sur une ligne → ouvre l'EditItemModal (`onRowClick`).
 * - Action « Ajuster » (consommables uniquement) → `onAdjust`, avec
 *   stopPropagation pour ne pas déclencher le clic ligne.
 */

import { memo } from 'react';
import {
    Box,
    Button,
    Chip,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TuneIcon from '@mui/icons-material/Tune';
import { formatLocation, isConsumable, RubricBadge, type StockCatalogItem } from '@entities/stock-item';
import { motion } from '@shared/ui/motion';

interface AlertSectionTableProps {
    title: string;
    items: StockCatalogItem[];
    /** Libellé de la colonne contextuelle (ex. « Périmé le », « Stock »). */
    contextLabel: string;
    /** Rendu de la cellule contextuelle pour un item donné. */
    renderContext: (item: StockCatalogItem) => React.ReactNode;
    onRowClick: (item: StockCatalogItem) => void;
    onAdjust: (item: StockCatalogItem) => void;
}

export const AlertSectionTable = memo(function AlertSectionTable({
    title,
    items,
    contextLabel,
    renderContext,
    onRowClick,
    onAdjust,
}: AlertSectionTableProps) {
    const theme = useTheme();
    if (items.length === 0) return null;

    return (
        <Box sx={{ mb: 4 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {title}
                </Typography>
                <Chip label={items.length} size="small" variant="outlined" />
            </Stack>

            <TableContainer component={Paper} variant="outlined" sx={{ borderColor: 'divider', borderRadius: 1 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 500 }}>Nom</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>Rubrique</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>Emplacement</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{contextLabel}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 500 }}>
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow
                                key={item.uuid}
                                hover
                                onClick={() => onRowClick(item)}
                                sx={{
                                    cursor: 'pointer',
                                    transition: `background-color ${motion.fast}`,
                                    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
                                    '&:last-child td': { borderBottom: 'none' },
                                }}
                            >
                                <TableCell>
                                    <Stack direction="row" spacing={1} alignItems="baseline">
                                        <Typography fontWeight={500} variant="body2">
                                            {item.name}
                                        </Typography>
                                        {item.reference && (
                                            <Typography
                                                component="span"
                                                sx={{
                                                    fontFamily:
                                                        'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                                                    fontSize: '0.72rem',
                                                    color: 'text.secondary',
                                                }}
                                            >
                                                {item.reference}
                                            </Typography>
                                        )}
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <RubricBadge category={item.category} />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {formatLocation(item)}
                                    </Typography>
                                </TableCell>
                                <TableCell>{renderContext(item)}</TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                        {isConsumable(item) && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<TuneIcon />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAdjust(item);
                                                }}
                                                aria-label={`Ajuster le stock de ${item.name}`}
                                            >
                                                Ajuster
                                            </Button>
                                        )}
                                        <Tooltip title="Voir le détail">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRowClick(item);
                                                }}
                                                aria-label={`Voir le détail de ${item.name}`}
                                            >
                                                <ArrowForwardIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
});
