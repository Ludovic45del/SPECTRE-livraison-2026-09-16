/**
 * LabContactFormDialog — création / édition d'un contact de l'annuaire des labos.
 * @module pages/equipe
 *
 * react-hook-form + zodResolver(LabContactInputSchema) : nom (requis, max 150),
 * téléphone libre (max 30 — poste interne « 426 » ou numéro complet),
 * commentaire optionnel. En mode édition (`contact` fourni) le formulaire est
 * pré-rempli et la soumission fait un PUT complet.
 */

import { memo, useCallback, useEffect } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    LAB_CONTACT_NAME_MAX_LENGTH,
    LAB_CONTACT_PHONE_MAX_LENGTH,
    LabContactInputSchema,
    useCreateLabContact,
    useUpdateLabContact,
    type LabContact,
    type LabContactInput,
} from '@entities/lab-contact';
import { getErrorMessage } from '@shared/lib';
import { useNotification } from '@shared/ui';

export interface LabContactFormDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    /** Contact à éditer — absent = création. */
    readonly contact?: LabContact;
}

const EMPTY_FORM: LabContactInput = { name: '', phone: '', comment: '' };

export const LabContactFormDialog = memo(function LabContactFormDialog({
    open,
    onClose,
    contact,
}: LabContactFormDialogProps) {
    const isEdit = Boolean(contact);
    const createContact = useCreateLabContact();
    const updateContact = useUpdateLabContact();
    const { showNotification } = useNotification();

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<LabContactInput>({
        mode: 'onBlur',
        resolver: zodResolver(LabContactInputSchema),
        defaultValues: EMPTY_FORM,
    });

    // Ré-initialise le formulaire à chaque ouverture (création vierge ou pré-rempli).
    useEffect(() => {
        if (!open) return;
        reset(contact ? { name: contact.name, phone: contact.phone, comment: contact.comment } : EMPTY_FORM);
    }, [open, contact, reset]);

    const isPending = createContact.isPending || updateContact.isPending;

    const onSubmit = useCallback(
        async (data: LabContactInput) => {
            try {
                if (contact) {
                    await updateContact.mutateAsync({ uuid: contact.uuid, data });
                    showNotification('Contact modifié', 'success');
                } else {
                    await createContact.mutateAsync(data);
                    showNotification("Contact ajouté à l'annuaire", 'success');
                }
                onClose();
            } catch (err: unknown) {
                showNotification(getErrorMessage(err, "Erreur lors de l'enregistrement du contact"), 'error');
            }
        },
        [contact, updateContact, createContact, showNotification, onClose],
    );

    const handleClose = useCallback(() => {
        if (isPending) return;
        reset(EMPTY_FORM);
        onClose();
    }, [isPending, reset, onClose]);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
            aria-label={isEdit ? 'Modifier le contact' : 'Nouveau contact'}
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>
                {isEdit ? 'Modifier le contact' : 'Nouveau contact'}
            </DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <DialogContent sx={{ pt: 0.5 }}>
                    <Stack spacing={2.5}>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Nom / Laboratoire"
                                    placeholder="Ex. Labo 426, Gardiennage…"
                                    required
                                    autoFocus
                                    error={Boolean(errors.name)}
                                    helperText={errors.name?.message}
                                    fullWidth
                                    inputProps={{ maxLength: LAB_CONTACT_NAME_MAX_LENGTH }}
                                />
                            )}
                        />
                        <Controller
                            name="phone"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Téléphone"
                                    placeholder="Ex. 426 ou 01 23 45 67 89"
                                    error={Boolean(errors.phone)}
                                    helperText={errors.phone?.message ?? 'Poste interne ou numéro complet'}
                                    fullWidth
                                    inputProps={{ maxLength: LAB_CONTACT_PHONE_MAX_LENGTH, inputMode: 'tel' }}
                                />
                            )}
                        />
                        <Controller
                            name="comment"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Commentaire"
                                    multiline
                                    minRows={2}
                                    error={Boolean(errors.comment)}
                                    helperText={errors.comment?.message}
                                    fullWidth
                                />
                            )}
                        />
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button
                        type="button"
                        onClick={handleClose}
                        variant="text"
                        color="inherit"
                        disabled={isPending}
                        sx={{ fontWeight: 600 }}
                    >
                        Annuler
                    </Button>
                    <Button type="submit" variant="contained" size="small" disabled={isPending}>
                        {isPending ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Ajouter'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
});
