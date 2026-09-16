/**
 * Modale de validation IEC d'une phase FA (Ouvert ou En cours).
 * @module features/fa/validate-phase
 *
 * Branche selon `phase` :
 * - 'open'      → useValidateOpenFa     (transition Ouvert → En cours)
 * - 'progress'  → useValidateProgressFa (transition En cours → Clos préparé)
 *
 * Le validateur est sélectionné via UserSelect filtré sur les rôles iec/chef_labo.
 * Le backend rejette en 400 toute validation par un user dont le rôle n'est ni
 * iec ni chef_labo (cf. fa_service._resolve_validator_user).
 */

import { memo, useCallback, useEffect } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Stack,
    Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { type Fa, useValidateOpenFa, useValidateProgressFa } from '@entities/fa';
import { UserSelect } from '@entities/user';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';

import { ValidatePhaseFormSchema, type ValidatePhaseFormData } from '../model/validate-phase.schema';

export type ValidatePhaseTarget = 'open' | 'progress';

interface ValidatePhaseModalProps {
    open: boolean;
    onClose: () => void;
    fa: Fa;
    /** 'open' = phase Ouvert (statusId 0 → 1) ; 'progress' = En cours (statusId 1 → 2 préparation). */
    phase: ValidatePhaseTarget;
}

const TITLES: Record<ValidatePhaseTarget, string> = {
    open: 'Valider la phase Ouvert',
    progress: 'Valider la phase En cours',
};

const SUCCESS_MESSAGES: Record<ValidatePhaseTarget, string> = {
    open: 'Phase Ouvert validée',
    progress: 'Phase En cours validée',
};

export const ValidatePhaseModal = memo(function ValidatePhaseModal({
    open,
    onClose,
    fa,
    phase,
}: ValidatePhaseModalProps) {
    const validateOpen = useValidateOpenFa();
    const validateProgress = useValidateProgressFa();
    const { showNotification } = useNotification();

    const activeMutation = phase === 'open' ? validateOpen : validateProgress;

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ValidatePhaseFormData>({
        resolver: zodResolver(ValidatePhaseFormSchema),
        defaultValues: {
            validatorUserUuid: '',
            validationDate: new Date(),
            confirmed: undefined as unknown as true,
        },
    });

    useEffect(() => {
        if (open) {
            reset({
                validatorUserUuid: '',
                validationDate: new Date(),
                confirmed: undefined as unknown as true,
            });
        }
    }, [open, reset]);

    const handleClose = useCallback(() => {
        reset();
        onClose();
    }, [reset, onClose]);

    const onSubmit = useCallback(
        async (data: ValidatePhaseFormData) => {
            try {
                await activeMutation.mutateAsync({
                    uuid: fa.uuid,
                    validatorUserUuid: data.validatorUserUuid,
                    validationDate: data.validationDate,
                });
                showNotification(SUCCESS_MESSAGES[phase], 'success');
                handleClose();
            } catch (err) {
                showNotification(getErrorMessage(err, 'Erreur lors de la validation'), 'error');
            }
        },
        [activeMutation, fa.uuid, phase, showNotification, handleClose],
    );

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogTitle>{TITLES[phase]}</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Cette validation est réservée aux IEC et chefs de laboratoire. Le backend rejette toute
                            autre selection.
                        </Typography>

                        <Controller
                            name="validatorUserUuid"
                            control={control}
                            render={({ field, fieldState }) => (
                                <UserSelect
                                    value={field.value || null}
                                    onChange={(uuid) => field.onChange(uuid ?? '')}
                                    roles={['iec', 'chef_labo']}
                                    label="Validateur IEC *"
                                    required
                                    error={Boolean(fieldState.error)}
                                    helperText={fieldState.error?.message}
                                />
                            )}
                        />

                        <Controller
                            name="validationDate"
                            control={control}
                            render={({ field }) => (
                                <DatePicker
                                    label="Date de validation *"
                                    value={field.value ? dayjs(field.value) : null}
                                    onChange={(d) => field.onChange(d?.toDate() ?? null)}
                                    slotProps={{
                                        textField: {
                                            size: 'small',
                                            fullWidth: true,
                                            error: Boolean(errors.validationDate),
                                            helperText: errors.validationDate?.message,
                                        },
                                    }}
                                />
                            )}
                        />

                        <Controller
                            name="confirmed"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Box>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={Boolean(field.value)}
                                                onChange={(e) => field.onChange(e.target.checked ? true : undefined)}
                                                inputProps={{
                                                    'aria-label': 'Confirmer la validation',
                                                }}
                                            />
                                        }
                                        label="Je confirme la validation de cette phase"
                                    />
                                    {fieldState.error && (
                                        <Typography variant="caption" color="error" display="block">
                                            {fieldState.error.message}
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleClose} disabled={activeMutation.isPending}>
                        Annuler
                    </Button>
                    <Button type="submit" variant="contained" disabled={activeMutation.isPending}>
                        {activeMutation.isPending ? 'Validation...' : 'Valider'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
});
