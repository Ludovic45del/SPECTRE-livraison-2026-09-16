/**
 * EditElementShell — formulaire d'édition d'un élément sérialisé.
 *
 * Réutilise `ElementForm` (champs purs) avec un useForm pré-rempli.
 * La soumission utilise `usePatchCatalogItem` au lieu de create.
 */

import { useCallback } from 'react';
import { Button, Stack } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    CATEGORY,
    elementFormToApi,
    ElementFormSchema,
    itemToElementFormValues,
    STRUCTURATION_TYPE,
    usePatchCatalogItem,
    type ElementFormValues,
    type StockCatalogItem,
} from '@entities/stock-item';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib/error-utils';
import { ElementForm } from '@features/stock/create-item';

interface EditElementShellProps {
    item: StockCatalogItem;
    onCancel: () => void;
    onSuccess: () => void;
    onDelete: () => void;
}

export function EditElementShell({ item, onCancel, onSuccess, onDelete }: EditElementShellProps) {
    const patchMutation = usePatchCatalogItem();
    const { showNotification } = useNotification();

    const {
        control,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<ElementFormValues>({
        mode: 'onBlur',
        resolver: zodResolver(ElementFormSchema),
        defaultValues: itemToElementFormValues(item),
    });

    const selectedCategory = watch('category');
    const selectedStructurationType = watch('structurationType');
    const showStructurationType = selectedCategory === CATEGORY.STRUCTURATION;
    const showMateriaux = showStructurationType && selectedStructurationType === STRUCTURATION_TYPE.SPECIALE;

    const onSubmit = useCallback(
        async (values: ElementFormValues) => {
            try {
                const apiPayload = elementFormToApi(values);
                // En PATCH on n'envoie pas `kind` (immuable côté backend, cf. CDC §5.1).
                // `status` est géré uniquement par le couplage FSEC (cf. §4.2).
                const patch = {
                    category: apiPayload.category,
                    structuration_type: apiPayload.structuration_type ?? null,
                    name: apiPayload.name,
                    reference: apiPayload.reference,
                    fsec_name: apiPayload.fsec_name ?? null,
                    caracteristique: apiPayload.caracteristique,
                    type_de_colle: apiPayload.type_de_colle,
                    materiaux_mat: apiPayload.materiaux_mat,
                    matiere: apiPayload.matiere ?? null,
                    masse_mg: apiPayload.masse_mg ?? null,
                    fournisseur: apiPayload.fournisseur,
                    installation: apiPayload.installation,
                    boite: apiPayload.boite,
                    emplacement: apiPayload.emplacement,
                    remarques: apiPayload.remarques,
                };
                await patchMutation.mutateAsync({ uuid: item.uuid, data: patch });
                showNotification(`Élément "${values.name}" mis à jour`, 'success');
                onSuccess();
            } catch (err) {
                showNotification(getErrorMessage(err, 'Erreur lors de la mise à jour'), 'error');
            }
        },
        [item.uuid, onSuccess, patchMutation, showNotification],
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <ElementForm
                control={control}
                errors={errors}
                showStructurationType={showStructurationType}
                showMateriaux={showMateriaux}
            />
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
