/**
 * Dialogue de création d'un étalonnage.
 * La voie (V1/V2) est choisie avant l'ouverture du dialog via le menu parent.
 */

import { memo, useCallback, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateEtalonnage } from '@entities/etalonnage';
import { etalonnageKeys } from '@entities/etalonnage/api/etalonnage.keys';
import { embaseKeys } from '@entities/embase/api/embase.keys';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';
import { parseNum } from '@features/embase/shared';
import { EtalonnageFormSchema, type EtalonnageFormData } from '@entities/etalonnage';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EtalonnageFormDialogProps {
    open: boolean;
    onClose: () => void;
    embaseUuid: string;
    /** Voie déjà choisie par l'utilisateur (via le menu) */
    voie: 1 | 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Numeric measure fields
// ─────────────────────────────────────────────────────────────────────────────

interface MesureFieldDef {
    name: 'offset0BarMv' | 'mesurande0BarLie' | 'signalEtendueMv' | 'signalPaMeteociel';
    label: string;
}

const MESURE_FIELDS: MesureFieldDef[] = [
    { name: 'offset0BarMv', label: 'Offset (b) à 0 barA (mV)' },
    { name: 'mesurande0BarLie', label: 'Mesurande à 0 barA au LIE' },
    { name: 'signalEtendueMv', label: 'Sensibilité (a) (mV)' },
    { name: 'signalPaMeteociel', label: 'Signal Pa météociel (mbar)' },
];

interface EtalonnageFormFieldsProps {
    control: ReturnType<typeof useForm<EtalonnageFormData>>['control'];
    errors: ReturnType<typeof useForm<EtalonnageFormData>>['formState']['errors'];
}

const EtalonnageFormFields = memo(function EtalonnageFormFields({ control, errors }: EtalonnageFormFieldsProps) {
    return (
        <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Date */}
            <Controller
                name="date"
                control={control}
                render={({ field }) => (
                    <DatePicker
                        label="Date *"
                        value={field.value ? dayjs(field.value) : null}
                        onChange={(d) => field.onChange(d?.toDate() ?? null)}
                        slotProps={{
                            textField: {
                                size: 'small',
                                error: Boolean(errors.date),
                                helperText: errors.date?.message,
                            },
                        }}
                    />
                )}
            />

            {/* Opérateur */}
            <Controller
                name="operateur"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Opérateur *"
                        size="small"
                        error={Boolean(errors.operateur)}
                        helperText={errors.operateur?.message}
                    />
                )}
            />

            {/* Mesures */}
            <Typography variant="subtitle2" fontWeight={600}>
                Mesures
            </Typography>

            {MESURE_FIELDS.map((mf) => (
                <Controller
                    key={mf.name}
                    name={mf.name}
                    control={control}
                    render={({ field }) => (
                        <TextField
                            label={mf.label}
                            size="small"
                            type="number"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(parseNum(e.target.value))}
                            inputProps={{ step: 'any' }}
                        />
                    )}
                />
            ))}
        </Stack>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const EtalonnageFormDialog = memo(function EtalonnageFormDialog({
    open,
    onClose,
    embaseUuid,
    voie,
}: EtalonnageFormDialogProps) {
    const queryClient = useQueryClient();
    const createMutation = useCreateEtalonnage();
    const { showSuccess, showError } = useNotification();

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<EtalonnageFormData>({
        mode: 'onBlur',
        resolver: zodResolver(EtalonnageFormSchema),
        defaultValues: {
            date: undefined,
            operateur: '',
            offset0BarMv: null,
            mesurande0BarLie: null,
            signalEtendueMv: null,
            signalPaMeteociel: null,
        },
    });

    useEffect(() => {
        if (open) reset();
    }, [open, reset]);

    const handleClose = useCallback(() => {
        reset();
        onClose();
    }, [reset, onClose]);

    const onSubmit = useCallback(
        async (data: EtalonnageFormData) => {
            try {
                await createMutation.mutateAsync({
                    embase_uuid: embaseUuid,
                    voie,
                    date: data.date ? dayjs(data.date).format('YYYY-MM-DD') : null,
                    operateur: data.operateur,
                    offset_0_bar_mv: data.offset0BarMv ?? null,
                    mesurande_0_bar_lie: data.mesurande0BarLie ?? null,
                    signal_etendue_mv: data.signalEtendueMv ?? null,
                    signal_pa_meteociel: data.signalPaMeteociel ?? null,
                });
                // Force refetch before closing dialog
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: etalonnageKeys.byEmbase(embaseUuid) }),
                    queryClient.invalidateQueries({ queryKey: embaseKeys.detail(embaseUuid) }),
                ]);
                showSuccess('Etalonnage ajouté');
                handleClose();
            } catch (err) {
                showError(getErrorMessage(err));
            }
        },
        [createMutation, queryClient, embaseUuid, voie, showSuccess, showError, handleClose],
    );

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogTitle>Ajouter un étalonnage {voie === 2 ? '(V2)' : '(V1)'}</DialogTitle>
                <DialogContent>
                    <EtalonnageFormFields control={control} errors={errors} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Annuler</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting || createMutation.isPending}>
                        Ajouter
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
});
