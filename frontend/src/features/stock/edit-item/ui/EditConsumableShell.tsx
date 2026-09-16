/**
 * EditConsumableShell — formulaire d'édition d'un consommable.
 */

import { useCallback } from 'react';
import { Button, Stack } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    consumableFormToApi,
    ConsumableFormSchema,
    itemToConsumableFormValues,
    usePatchCatalogItem,
    type ConsumableFormValues,
    type StockCatalogItem,
} from '@entities/stock-item';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib/error-utils';
import { ConsumableForm } from '@features/stock/create-item';

interface EditConsumableShellProps {
    item: StockCatalogItem;
    onCancel: () => void;
    onSuccess: () => void;
    onDelete: () => void;
}

export function EditConsumableShell({ item, onCancel, onSuccess, onDelete }: EditConsumableShellProps) {
    const patchMutation = usePatchCatalogItem();
    const { showNotification } = useNotification();

    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<ConsumableFormValues>({
        mode: 'onBlur',
        resolver: zodResolver(ConsumableFormSchema),
        defaultValues: itemToConsumableFormValues(item),
    });

    const onSubmit = useCallback(
        async (values: ConsumableFormValues) => {
            try {
                const apiPayload = consumableFormToApi(values);
                // PATCH : on n'envoie pas `kind` (immuable). `quantite` est conservée
                // — toute modification de stock doit passer par un mouvement (CDC §3.2),
                // mais pour l'instant l'édition partielle est acceptée par le backend.
                const patch = {
                    category: apiPayload.category,
                    name: apiPayload.name,
                    reference: apiPayload.reference,
                    caracteristique: apiPayload.caracteristique,
                    type_de_colle: apiPayload.type_de_colle,
                    unite: apiPayload.unite,
                    quantite: apiPayload.quantite,
                    seuil_alerte: apiPayload.seuil_alerte,
                    type_d_achat: apiPayload.type_d_achat,
                    fournisseur: apiPayload.fournisseur,
                    date_peremption: apiPayload.date_peremption,
                    boite: apiPayload.boite,
                    emplacement: apiPayload.emplacement,
                    remarques: apiPayload.remarques,
                };
                await patchMutation.mutateAsync({ uuid: item.uuid, data: patch });
                showNotification(`Consommable "${values.name}" mis à jour`, 'success');
                onSuccess();
            } catch (err) {
                showNotification(getErrorMessage(err, 'Erreur lors de la mise à jour'), 'error');
            }
        },
        [item.uuid, onSuccess, patchMutation, showNotification],
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
                <Button
                    onClick={onDelete}
                    color="error"
                    variant="outlined"
                    startIcon={<DeleteOutlineIcon />}
                    disabled={isSubmitting}
                >
                    Supprimer
                </Button>
                <Stack direction="row" spacing={1.5}>
                    <Button onClick={onCancel} color="inherit" disabled={isSubmitting}>
                        Annuler
                    </Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting || !isDirty}>
                        {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                </Stack>
            </Stack>
        </form>
    );
}
