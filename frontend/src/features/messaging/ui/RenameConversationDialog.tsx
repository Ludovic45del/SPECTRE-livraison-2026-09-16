/**
 * RenameConversationDialog — renommage d'un groupe (propriétaire).
 * @module features/messaging/ui
 *
 * react-hook-form + zod (nom requis, max 120), champ pré-rempli avec le nom
 * courant à chaque ouverture, `useRenameConversation`, notifications.
 */

import { memo, useCallback, useEffect } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { MAX_CONVERSATION_NAME_LENGTH, useRenameConversation, type Conversation } from '@entities/messaging';
import { getErrorMessage } from '@shared/lib';
import { useNotification } from '@shared/ui';

export interface RenameConversationDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly conversation: Conversation;
}

const RenameSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, 'Le nom du groupe est requis')
        .max(MAX_CONVERSATION_NAME_LENGTH, `Le nom ne doit pas dépasser ${MAX_CONVERSATION_NAME_LENGTH} caractères`),
});
type RenameForm = z.infer<typeof RenameSchema>;

export const RenameConversationDialog = memo(function RenameConversationDialog({
    open,
    onClose,
    conversation,
}: RenameConversationDialogProps) {
    const renameConversation = useRenameConversation();
    const { showNotification } = useNotification();

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<RenameForm>({
        mode: 'onBlur',
        resolver: zodResolver(RenameSchema),
        defaultValues: { name: conversation.name },
    });

    // Pré-remplit avec le nom courant à chaque ouverture.
    useEffect(() => {
        if (open) reset({ name: conversation.name });
    }, [open, conversation.name, reset]);

    const onSubmit = useCallback(
        async (data: RenameForm) => {
            try {
                await renameConversation.mutateAsync({ uuid: conversation.uuid, name: data.name });
                showNotification('Groupe renommé', 'success');
                onClose();
            } catch (err: unknown) {
                showNotification(getErrorMessage(err, 'Erreur lors du renommage du groupe'), 'error');
            }
        },
        [renameConversation, conversation.uuid, showNotification, onClose],
    );

    const handleClose = useCallback(() => {
        reset({ name: conversation.name });
        onClose();
    }, [reset, conversation.name, onClose]);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
            aria-label="Renommer le groupe"
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>Renommer le groupe</DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <DialogContent sx={{ pt: 0.5 }}>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Nom du groupe"
                                required
                                autoFocus
                                fullWidth
                                error={Boolean(errors.name)}
                                helperText={errors.name?.message}
                                inputProps={{ maxLength: MAX_CONVERSATION_NAME_LENGTH }}
                            />
                        )}
                    />
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button type="button" onClick={handleClose} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                        Annuler
                    </Button>
                    <Button type="submit" variant="contained" size="small" disabled={renameConversation.isPending}>
                        {renameConversation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
});
