/**
 * NewConversationDialog — création d'une conversation privée ou de groupe.
 * @module features/messaging/ui
 *
 * react-hook-form + zodResolver(ConversationCreateSchema) (union discriminée
 * sur `kind`). Bascule « Privée » / « Groupe » : chaque bascule réinitialise
 * le formulaire sur la forme vide du type choisi (les champs de l'autre
 * branche n'existent pas dans les valeurs soumises). Le type affiché est
 * porté par un état local mis à jour dans le même lot que `reset()` : la
 * branche rendue et les valeurs du formulaire restent toujours cohérentes
 * (un `useWatch('kind')` se mettrait à jour un rendu plus tard).
 * Privée : un destinataire (UserSelect). Groupe : nom + membres
 * (UserMultiSelect). L'utilisateur courant est exclu des sélections — il est
 * membre (et propriétaire) d'office côté backend.
 * Pour une privée déjà existante, l'API renvoie la conversation existante :
 * le flux est identique (notification + onCreated).
 */

import { memo, useCallback, useEffect, useState, type MouseEvent } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
    ConversationCreateSchema,
    MAX_CONVERSATION_NAME_LENGTH,
    useCreateConversation,
    type Conversation,
    type ConversationCreate,
    type ConversationKind,
} from '@entities/messaging';
import { UserMultiSelect, UserSelect, useMe } from '@entities/user';
import { getErrorMessage } from '@shared/lib';
import { useNotification } from '@shared/ui';

export interface NewConversationDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    /** Appelé avec la conversation renvoyée par l'API (créée ou privée existante). */
    readonly onCreated: (conversation: Conversation) => void;
}

const EMPTY_DIRECT: ConversationCreate = { kind: 'direct', memberUuid: '' };
const EMPTY_GROUP: ConversationCreate = { kind: 'group', name: '', memberUuids: [] };

export const NewConversationDialog = memo(function NewConversationDialog({
    open,
    onClose,
    onCreated,
}: NewConversationDialogProps) {
    const createConversation = useCreateConversation();
    const { data: me } = useMe();
    const { showNotification } = useNotification();

    const [kind, setKind] = useState<ConversationKind>('direct');

    const { control, handleSubmit, reset } = useForm<ConversationCreate>({
        mode: 'onBlur',
        resolver: zodResolver(ConversationCreateSchema),
        defaultValues: EMPTY_DIRECT,
    });

    /** Remet le formulaire sur la forme vide du type demandé (état + valeurs, même lot de rendu). */
    const resetTo = useCallback(
        (next: ConversationKind) => {
            setKind(next);
            reset(next === 'direct' ? EMPTY_DIRECT : EMPTY_GROUP);
        },
        [reset],
    );

    // Ré-initialise le formulaire (privée, vierge) à chaque ouverture.
    useEffect(() => {
        if (!open) return;
        resetTo('direct');
    }, [open, resetTo]);

    const handleKindChange = useCallback(
        (_event: MouseEvent<HTMLElement>, next: ConversationKind | null) => {
            if (!next || next === kind) return;
            resetTo(next);
        },
        [kind, resetTo],
    );

    const onSubmit = useCallback(
        async (data: ConversationCreate) => {
            try {
                const conversation = await createConversation.mutateAsync(data);
                showNotification('Conversation créée', 'success');
                onCreated(conversation);
                onClose();
            } catch (err: unknown) {
                showNotification(getErrorMessage(err, 'Erreur lors de la création de la conversation'), 'error');
            }
        },
        [createConversation, showNotification, onCreated, onClose],
    );

    const handleClose = useCallback(() => {
        resetTo('direct');
        onClose();
    }, [resetTo, onClose]);

    const isPending = createConversation.isPending;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="xs"
            fullWidth
            aria-label="Nouvelle conversation"
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>Nouvelle conversation</DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <DialogContent sx={{ pt: 0.5 }}>
                    <Stack spacing={2.5}>
                        <ToggleButtonGroup
                            value={kind}
                            exclusive
                            onChange={handleKindChange}
                            size="small"
                            fullWidth
                            aria-label="Type de conversation"
                        >
                            <ToggleButton value="direct" sx={{ textTransform: 'none', gap: 0.75, fontWeight: 600 }}>
                                <PersonOutlineIcon fontSize="small" />
                                Privée
                            </ToggleButton>
                            <ToggleButton value="group" sx={{ textTransform: 'none', gap: 0.75, fontWeight: 600 }}>
                                <GroupsRoundedIcon fontSize="small" />
                                Groupe
                            </ToggleButton>
                        </ToggleButtonGroup>

                        {kind === 'direct' ? (
                            <Controller
                                name="memberUuid"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <UserSelect
                                        value={field.value || null}
                                        onChange={(uuid) => field.onChange(uuid && uuid !== me?.uuid ? uuid : '')}
                                        label="Destinataire"
                                        ariaLabel="Destinataire"
                                        required
                                        error={Boolean(fieldState.error)}
                                        helperText={fieldState.error?.message}
                                    />
                                )}
                            />
                        ) : (
                            <>
                                <Controller
                                    name="name"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <TextField
                                            {...field}
                                            label="Nom du groupe"
                                            required
                                            autoFocus
                                            error={Boolean(fieldState.error)}
                                            helperText={fieldState.error?.message}
                                            fullWidth
                                            size="small"
                                            inputProps={{ maxLength: MAX_CONVERSATION_NAME_LENGTH }}
                                        />
                                    )}
                                />
                                <Controller
                                    name="memberUuids"
                                    control={control}
                                    render={({ field }) => (
                                        <UserMultiSelect
                                            value={field.value ?? []}
                                            onChange={(uuids) =>
                                                field.onChange(uuids.filter((uuid) => uuid !== me?.uuid))
                                            }
                                            label="Membres"
                                            ariaLabel="Membres"
                                            helperText="Vous serez membre et propriétaire du groupe."
                                        />
                                    )}
                                />
                            </>
                        )}
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button type="button" onClick={handleClose} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                        Annuler
                    </Button>
                    <Button type="submit" variant="contained" size="small" disabled={isPending}>
                        {isPending ? 'Création...' : 'Créer'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
});
