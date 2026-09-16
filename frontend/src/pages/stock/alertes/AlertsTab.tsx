/**
 * AlertsTab — onglet Alertes Stock (cf. CDC §5.4).
 *
 * Trois sections présentées comme des tables MUI sobres, dans le même esprit
 * visuel que le Catalogue : Périmés, Péremption proche (≤30 j), Stock bas.
 *
 * - Clic sur une ligne → ouvre l'EditItemModal.
 * - Action « Ajuster » (consommables) → ouvre l'AdjustStockDialog (mouvement
 *   d'entrée / sortie), sans déclencher le clic ligne.
 */

import { Alert, Box, Skeleton, Stack, Typography } from '@mui/material';
import { type StockCatalogItem, useStockAlerts } from '@entities/stock-item';
import { EditItemModal, useEditItemStore } from '@features/stock/edit-item';
import { AdjustStockDialog, useAdjustStockStore } from '@features/stock/adjust-stock';
import { formatDateShort } from '@shared/lib';
import { AlertSectionTable } from './components/AlertSectionTable';
import { EmptyAlerts } from './components/EmptyAlerts';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysUntil(target: Date | null): number | null {
    if (!target) return null;
    const a = new Date();
    a.setHours(0, 0, 0, 0);
    const b = new Date(target);
    b.setHours(0, 0, 0, 0);
    return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function ExpiredContext({ item }: { item: StockCatalogItem }) {
    return (
        <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
            {formatDateShort(item.datePeremption)}
        </Typography>
    );
}

function ExpiringSoonContext({ item }: { item: StockCatalogItem }) {
    const days = daysUntil(item.datePeremption);
    return (
        <Stack direction="row" spacing={0.75} alignItems="baseline">
            <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 600 }}>
                {formatDateShort(item.datePeremption)}
            </Typography>
            {days !== null && (
                <Typography variant="caption" color="text.secondary">
                    (J−{days})
                </Typography>
            )}
        </Stack>
    );
}

function LowStockContext({ item }: { item: StockCatalogItem }) {
    return (
        <Stack direction="row" spacing={0.75} alignItems="baseline">
            <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
                {item.quantite ?? 0} {item.unite ?? ''}
            </Typography>
            {item.seuilAlerte !== null && (
                <Typography variant="caption" color="text.secondary">
                    / seuil {item.seuilAlerte}
                </Typography>
            )}
        </Stack>
    );
}

function AlertsLoadingSkeleton() {
    return (
        <Stack spacing={4}>
            {Array.from({ length: 2 }, (_, i) => (
                <Box key={i}>
                    <Skeleton variant="text" width={220} height={28} sx={{ mb: 1 }} />
                    <Skeleton variant="rounded" height={140} />
                </Box>
            ))}
        </Stack>
    );
}

export function AlertsTab() {
    const { data: alerts, isLoading, error } = useStockAlerts();
    const openEditModal = useEditItemStore((s) => s.open);
    const openAdjust = useAdjustStockStore((s) => s.open);

    const handleRowClick = (item: StockCatalogItem) => openEditModal(item.uuid);

    if (isLoading) return <AlertsLoadingSkeleton />;
    if (error) {
        return (
            <Alert severity="error" role="alert">
                Erreur lors du chargement des alertes : {error instanceof Error ? error.message : 'inconnue'}
            </Alert>
        );
    }
    if (!alerts) return null;

    const totalAlerts = alerts.expired.length + alerts.expiringSoon.length + alerts.lowStock.length;
    if (totalAlerts === 0) {
        return (
            <Box>
                <EmptyAlerts />
                <EditItemModal />
                <AdjustStockDialog />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {totalAlerts} alerte{totalAlerts > 1 ? 's' : ''} à traiter.
            </Typography>

            <AlertSectionTable
                title="Consommables périmés"
                items={alerts.expired}
                contextLabel="Périmé le"
                renderContext={(item) => <ExpiredContext item={item} />}
                onRowClick={handleRowClick}
                onAdjust={openAdjust}
            />

            <AlertSectionTable
                title="Péremption proche (≤ 30 jours)"
                items={alerts.expiringSoon}
                contextLabel="Péremption"
                renderContext={(item) => <ExpiringSoonContext item={item} />}
                onRowClick={handleRowClick}
                onAdjust={openAdjust}
            />

            <AlertSectionTable
                title="Stock bas (sous seuil d'alerte)"
                items={alerts.lowStock}
                contextLabel="Stock"
                renderContext={(item) => <LowStockContext item={item} />}
                onRowClick={handleRowClick}
                onAdjust={openAdjust}
            />

            <EditItemModal />
            <AdjustStockDialog />
        </Box>
    );
}
