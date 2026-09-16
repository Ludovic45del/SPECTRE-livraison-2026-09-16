/**
 * ConsumableFormShell — useForm + boutons + soumission pour le kind=consumable.
 */

import { useCallback, useMemo } from 'react';
import { Button, Stack } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    consumableFormToApi,
    ConsumableFormSchema,
    useCreateCatalogItem,
    type ConsumableFormValues,
    type StockCatalogItem,
} from '@entities/stock-item';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib/error-utils';
import { buildConsumableDefaultValues } from '../model';
import { ConsumableForm } from './ConsumableForm';

interface ConsumableFormShellProps {
    onBack: () => void;
    onCancel: () => void;
    onSuccess: () => void;
    /**
     * Item source d'une duplication (R06) : caractéristiques, unité, seuil
     * d'alerte… copiés ; nom vidé (unicité) et quantité remise à 0 (le stock
     * réel se constitue ensuite par mouvements).
     */
    prefill?: StockCatalogItem | null;
}

export function ConsumableFormShell({ onBack, onCancel, onSuccess, prefill = null }: ConsumableFormShellProps) {
    const createMutation = useCreateCatalogItem();
    const { showNotification } = useNotification();

    const defaultValues = useMemo(() => buildConsumableDefaultValues(prefill), [prefill]);

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ConsumableFormValues>({
        mode: 'onBlur',
        resolver: zodResolver(ConsumableFormSchema),
        defaultValues,
    });

    const onSubmit = useCallback(
        async (values: ConsumableFormValues) => {
            try {
                const created = await createMutation.mutateAsync(consumableFormToApi(values));
                showNotification(`Consommable "${created.name}" ajouté au catalogue`, 'success');
                onSuccess();
            } catch (err) {
                showNotification(getErrorMessage(err, "Erreur lors de l'ajout"), 'error');
            }
        },
        [createMutation, onSuccess, showNotification],
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <ConsumableForm control={control} errors={errors} />
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}
            >
                <Button onClick={onBack} startIcon={<ChevronLeftIcon />} color="inherit" disabled={isSubmitting}>
                    Retour
                </Button>
                <Stack direction="row" spacing={1.5}>
                    <Button onClick={onCancel} color="inherit" disabled={isSubmitting}>
                        Annuler
                    </Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? 'Ajout en cours…' : 'Ajouter au catalogue'}
                    </Button>
                </Stack>
            </Stack>
        </form>
    );
}
