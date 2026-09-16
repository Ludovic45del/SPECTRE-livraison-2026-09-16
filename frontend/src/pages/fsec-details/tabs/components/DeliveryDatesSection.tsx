/**
 * Delivery & Shooting Dates Section
 * @module pages/fsec-details/tabs/components
 *
 * Inline edit des dates de livraison et de tir de la FSEC.
 * Calqué sur le pattern de GeneralInfoSection.
 */

import { useCallback, useState } from 'react';
import { Box, Button, Divider, Grid, IconButton, Paper, Stack, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import dayjs from 'dayjs';
import { Fsec, useUpdateFsec } from '@entities/fsec';
import { formatDateDisplay } from '@shared/lib';
import { useNotification } from '@shared/ui';

interface DeliveryDatesSectionProps {
    fsec: Fsec;
    paperSx: Record<string, unknown>;
    editButtonSx: Record<string, unknown>;
}

interface DeliveryDatesForm {
    deliveryDate: Date | null;
    shootingDate: Date | null;
}

const buildInitialForm = (fsec: Fsec): DeliveryDatesForm => ({
    deliveryDate: fsec.deliveryDate,
    shootingDate: fsec.shootingDate,
});

export function DeliveryDatesSection({ fsec, paperSx, editButtonSx }: DeliveryDatesSectionProps) {
    const { showNotification } = useNotification();
    const updateMutation = useUpdateFsec();

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<DeliveryDatesForm>(() => buildInitialForm(fsec));

    const handleEdit = useCallback(() => {
        setForm(buildInitialForm(fsec));
        setIsEditing(true);
    }, [fsec]);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
    }, []);

    const handleSave = useCallback(async () => {
        if (form.deliveryDate && form.shootingDate && form.shootingDate < form.deliveryDate) {
            showNotification('La date de tir doit être postérieure à la date de livraison', 'error');
            return;
        }

        try {
            await updateMutation.mutateAsync({
                versionUuid: fsec.versionUuid,
                data: {
                    name: fsec.name,
                    campaignId: fsec.campaignId,
                    statusId: fsec.statusId,
                    categoryId: fsec.categoryId,
                    rackId: fsec.rackId,
                    preshootingPressure: fsec.preshootingPressure,
                    experienceSrxx: fsec.experienceSrxx,
                    depressurizationFailed: fsec.depressurizationFailed,
                    localisation: fsec.localisation,
                    comments: fsec.comments,
                    deliveryDate: form.deliveryDate,
                    shootingDate: form.shootingDate,
                },
            });
            showNotification('Dates mises à jour', 'success');
            setIsEditing(false);
        } catch {
            showNotification('Erreur lors de la mise à jour', 'error');
        }
    }, [fsec, form, updateMutation, showNotification]);

    return (
        <Paper variant="outlined" sx={paperSx}>
            {!isEditing && (
                <IconButton size="small" onClick={handleEdit} sx={editButtonSx} aria-label="Modifier les dates">
                    <EditIcon fontSize="small" />
                </IconButton>
            )}

            <Typography variant="h6" mb={2}>
                Livraison &amp; Tir
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {isEditing ? (
                <Box>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <DatePicker
                                label="Date de livraison"
                                value={form.deliveryDate ? dayjs(form.deliveryDate) : null}
                                onChange={(date) =>
                                    setForm((prev) => ({ ...prev, deliveryDate: date?.toDate() ?? null }))
                                }
                                slotProps={{
                                    textField: { fullWidth: true, size: 'small' },
                                    popper: { placement: 'bottom-end' },
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <DatePicker
                                label="Date de tir"
                                value={form.shootingDate ? dayjs(form.shootingDate) : null}
                                onChange={(date) =>
                                    setForm((prev) => ({ ...prev, shootingDate: date?.toDate() ?? null }))
                                }
                                slotProps={{
                                    textField: { fullWidth: true, size: 'small' },
                                    popper: { placement: 'bottom-end' },
                                }}
                            />
                        </Grid>
                    </Grid>
                    <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
                        <Button size="small" onClick={handleCancel} startIcon={<CloseIcon />} color="inherit">
                            Annuler
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            onClick={handleSave}
                            startIcon={<SaveIcon />}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                    </Stack>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Date de livraison
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                            {formatDateDisplay(fsec.deliveryDate)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Date de tir
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                            {formatDateDisplay(fsec.shootingDate)}
                        </Typography>
                    </Grid>
                </Grid>
            )}
        </Paper>
    );
}
