/**
 * EditMessageDialog — modification du corps d'un de mes messages (M4).
 * @module features/messaging/ui
 *
 * `TextField` multiligne pré-rempli avec le corps courant à chaque ouverture,
 * validation `MessageBodySchema` (react-hook-form + zod), `useEditMessage`
 * (PATCH …/messages/<uuid>/ ; le message est remplacé dans le cache du fil),
 * notifications « Message modifié » / erreur. Entrée enregistre, Maj+Entrée
 * insère un retour à la ligne (même convention que la zone de saisie).
 * Un corps identique est envoyé tel quel : le backend répond sans écrire.
 */

import { memo, useCallback, useEffect, type KeyboardEvent } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { MAX_MESSAGE_LENGTH, MessageBodySchema, useEditMessage, type Message } from '@entities/messaging';
import { getErrorMessage } from '@shared/lib';
import { useNotification } from '@shared/ui';

export interface EditMessageDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly conversationUuid: string;
    /** Message à modifier (null tant qu'aucun n'est ciblé : le dialogue reste fermé). */
    readonly message: Message | null;
}

const EditSchema = z.object({ body: MessageBodySchema });
type EditForm = z.infer<typeof EditSchema>;

export const EditMessageDialog = memo(function EditMessageDialog({
    open,
    onClose,
    conversationUuid,
    message,
}: EditMessageDialogProps) {
    const editMessage = useEditMessage();
    const { showNotification } = useNotification();
    const initialBody = message?.body ?? '';

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<EditForm>({
        mode: 'onSubmit',
        resolver: zodResolver(EditSchema),
        defaultValues: { body: initialBody },
    });

    // Pré-remplit avec le corps courant à chaque ouverture (ou changement de cible).
    useEffect(() => {
        if (open) reset({ body: initialBody });
    }, [open, initialBody, reset]);

    const onSubmit = useCallback(
        async (data: EditForm) => {
            if (!message) return;
            try {
                await editMessage.mutateAsync({ uuid: conversationUuid, messageUuid: message.uuid, body: data.body });
                showNotification('Message modifié', 'success');
                onClose();
            } catch (err: unknown) {
                showNotification(getErrorMessage(err, 'Erreur lors de la modification du message'), 'error');
            }
        },
        [message, editMessage, conversationUuid, showNotification, onClose],
    );

    const handleClose = useCallback(() => {
        reset({ body: initialBody });
        onClose();
    }, [reset, initialBody, onClose]);

    const submit = handleSubmit(onSubmit);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.nativeEvent.isComposing || event.key !== 'Enter' || event.shiftKey) return;
            event.preventDefault();
            if (!editMessage.isPending) void submit();
        },
        [editMessage.isPending, submit],
    );

    return (
        <Dialog
            open={open && message !== null}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            aria-label="Modifier le message"
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>Modifier le message</DialogTitle>
            <form onSubmit={submit} noValidate>
                <DialogContent sx={{ pt: 0.5 }}>
                    <Controller
                        name="body"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                onKeyDown={handleKeyDown}
                                label="Message"
                                required
                                autoFocus
                                fullWidth
                                multiline
                                minRows={2}
                                maxRows={10}
                                error={Boolean(errors.body)}
                                helperText={
                                    errors.body?.message ?? 'Entrée pour enregistrer, Maj+Entrée pour un saut de ligne'
                                }
                                inputProps={{ maxLength: MAX_MESSAGE_LENGTH, 'aria-label': 'Corps du message' }}
                            />
                        )}
                    />
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button type="button" onClick={handleClose} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                        Annuler
                    </Button>
                    <Button type="submit" variant="contained" size="small" disabled={editMessage.isPending}>
                        {editMessage.isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
});
