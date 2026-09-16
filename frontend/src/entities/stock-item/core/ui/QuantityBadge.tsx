/**
 * QuantityBadge — affiche la quantité d'un consommable + alertes éventuelles
 * (stock bas, péremption proche/passée).
 *
 * Les chips d'alerte s'appuient sur la palette MUI sémantique (`warning`,
 * `error`) — leur rendu "soft" est appliqué automatiquement par l'override
 * `MuiChip` du thème.
 */

import { Box, Chip, Stack, Typography } from '@mui/material';
import { isExpired, isExpiringSoon, isLowStock } from '../lib/stock-item.helpers';
import type { StockCatalogItem } from '../model/stock-item.schema';

interface QuantityBadgeProps {
    item: StockCatalogItem;
}

const formatDate = (d: Date) =>
    new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);

export function QuantityBadge({ item }: QuantityBadgeProps) {
    const lowStock = isLowStock(item);
    const expired = isExpired(item);
    const expiringSoon = !expired && isExpiringSoon(item);

    const qtyColor = lowStock ? 'error.main' : 'text.primary';

    return (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography component="span" sx={{ fontWeight: 600, color: qtyColor, fontSize: '0.875rem' }}>
                    {item.quantite ?? 0}
                </Typography>
                {item.unite && (
                    <Typography component="span" variant="caption" color="text.secondary">
                        {item.unite}
                    </Typography>
                )}
            </Box>
            {lowStock && <Chip label="Stock bas" color="warning" />}
            {expired && item.datePeremption && (
                <Chip label={`Périmé ${formatDate(item.datePeremption)}`} color="error" />
            )}
            {expiringSoon && item.datePeremption && (
                <Chip label={`Péremption ${formatDate(item.datePeremption)}`} color="warning" />
            )}
        </Stack>
    );
}
