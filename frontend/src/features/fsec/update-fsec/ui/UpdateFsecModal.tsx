/**
 * Update FSEC Modal
 * @module features/update-fsec
 *
 * Fields from backend:
 * - campaign_id (required)
 * - name (required)
 * - category_id (read-only)
 * - comments
 * - delivery_date
 * - shooting_date
 * - localisation
 * - Team members: RCE (role_id=0), MOE (role_id=1), IEC (role_id=2)
 */

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Box,
    Typography,
    Grid,
    Divider,
    IconButton,
    Tabs,
    Tab,
    Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Fsec, useUpdateFsec, useDeleteFsec } from '@entities/fsec';
import { useCampaigns, CampaignWithRelations } from '@entities/campaign';
import { useCampaignTeam } from '@entities/campaign/team';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib/error-utils';
import { useNavigate } from 'react-router-dom';
import { DataChip } from '@widgets/data-chip';

interface UpdateFsecModalProps {
    open: boolean;
    onClose: () => void;
    fsec: Fsec;
}

// Form schema - only fields from backend
const UpdateFsecFormSchema = z.object({
    name: z.string().min(1, 'Le nom est requis'),
    campaignId: z.string().uuid('La campagne est requise'),
    comments: z.string().nullable().optional(),
    deliveryDate: z.date().nullable().optional(),
    shootingDate: z.date().nullable().optional(),
    localisation: z.string().nullable().optional(),
    // Team members
    rce: z.string().optional(),
    moe: z.string().optional(),
    iec: z.string().optional(),
});

type UpdateFsecForm = z.infer<typeof UpdateFsecFormSchema>;

// FSEC Categories from backend referential
const FSEC_CATEGORIES = [
    { id: 0, label: 'Sans Gaz', color: '#00FF66' },
    { id: 1, label: 'Gaz BP', color: '#1FDFED' },
    { id: 2, label: 'Gaz HP', color: '#1FEDB7' },
    { id: 3, label: 'Gaz BP + HP', color: '#1FED2B' },
    { id: 4, label: 'Gaz Permeation + HP', color: '#1F9DED' },
];

export function UpdateFsecModal({ open, onClose, fsec }: UpdateFsecModalProps) {
    const [tabValue, setTabValue] = useState(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const updateMutation = useUpdateFsec();
    const deleteMutation = useDeleteFsec();
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    // Fetch campaigns for selector
    const { data: campaigns } = useCampaigns();

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
        setValue,
    } = useForm<UpdateFsecForm>({
        mode: 'onBlur',
        resolver: zodResolver(UpdateFsecFormSchema),
        defaultValues: {
            name: fsec.name,
            campaignId: fsec.campaignId ?? '',
            comments: fsec.comments,
            deliveryDate: fsec.deliveryDate,
            shootingDate: fsec.shootingDate,
            localisation: fsec.localisation,
            rce: '',
            moe: '',
            iec: '',
        },
    });

    // Watch campaignId to sync team members from campaign
    const watchedCampaignId = watch('campaignId');

    // Fetch campaign team members (roles: 0=MOE, 1=RCE, 2=IEC)
    const { data: campaignTeam } = useCampaignTeam(watchedCampaignId);

    // Reset form when modal opens
    useEffect(() => {
        if (open) {
            reset({
                name: fsec.name,
                campaignId: fsec.campaignId ?? '',
                comments: fsec.comments,
                deliveryDate: fsec.deliveryDate,
                shootingDate: fsec.shootingDate,
                localisation: fsec.localisation,
                rce: '',
                moe: '',
                iec: '',
            });
            setTabValue(0);
            setShowDeleteConfirm(false);
        }
    }, [open, fsec, reset]);

    // Sync RCE, MOE, IEC from campaign team when campaign changes or team loads
    // Campaign roles: 0=MOE, 1=RCE, 2=IEC
    useEffect(() => {
        if (campaignTeam && watchedCampaignId) {
            const campaignMoe = campaignTeam.find((m) => m.role?.id === 0);
            const campaignRce = campaignTeam.find((m) => m.role?.id === 1);
            const campaignIec = campaignTeam.find((m) => m.role?.id === 2);

            setValue('moe', campaignMoe?.name ?? '');
            setValue('rce', campaignRce?.name ?? '');
            setValue('iec', campaignIec?.name ?? '');
        }
    }, [campaignTeam, watchedCampaignId, setValue]);

    const onSubmit = async (data: UpdateFsecForm) => {
        try {
            // Update FSEC - include existing statusId and categoryId as they are required by backend
            // Note: RCE, MOE, IEC are inherited from campaign and not stored in FSEC_TEAMS
            await updateMutation.mutateAsync({
                versionUuid: fsec.versionUuid,
                data: {
                    name: data.name,
                    campaignId: data.campaignId,
                    statusId: fsec.statusId,
                    categoryId: fsec.categoryId,
                    comments: data.comments,
                    deliveryDate: data.deliveryDate,
                    shootingDate: data.shootingDate,
                    localisation: data.localisation,
                },
            });

            showNotification('FSEC mis à jour avec succès', 'success');
            onClose();
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la mise à jour'), 'error');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(fsec.versionUuid);
            showNotification('FSEC supprimé', 'success');
            navigate('/fsecs');
        } catch {
            showNotification('Erreur lors de la suppression', 'error');
        }
    };

    // Get category info
    const category = FSEC_CATEGORIES.find((c) => c.id === fsec.categoryId) ?? FSEC_CATEGORIES[0];

    // Format campaign label
    const formatCampaignLabel = (campaign: CampaignWithRelations) => {
        return `${campaign.year}-${campaign.installation?.label ?? 'N/A'}_${campaign.name}`;
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            aria-label="Modifier la FSEC"
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            {/* Header with tabs */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: 1,
                    borderColor: 'divider',
                    pr: 1,
                }}
            >
                <Tabs
                    value={tabValue}
                    onChange={(_, v) => setTabValue(v)}
                    sx={{ px: 2, minHeight: 64, alignItems: 'center' }}
                >
                    <Tab label="Données générales" sx={{ height: 64, fontWeight: 700, fontSize: '0.95rem' }} />
                </Tabs>
                <IconButton onClick={onClose} size="small" sx={{ mr: 1 }} aria-label="Fermer">
                    <CloseIcon />
                </IconButton>
            </Box>

            <form id="update-fsec-form" onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ minHeight: 400, p: 4, pt: 3 }}>
                    {tabValue === 0 && (
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={6}>
                                <Stack spacing={3}>
                                    {/* Campaign Selector (required) */}
                                    <Controller
                                        name="campaignId"
                                        control={control}
                                        render={({ field }) => (
                                            <Autocomplete
                                                options={campaigns ?? []}
                                                value={campaigns?.find((c) => c.uuid === field.value) ?? null}
                                                onChange={(_, value) => field.onChange(value?.uuid ?? '')}
                                                getOptionLabel={formatCampaignLabel}
                                                isOptionEqualToValue={(option, value) => option.uuid === value?.uuid}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Campagne"
                                                        required
                                                        error={Boolean(errors.campaignId)}
                                                        helperText={errors.campaignId?.message}
                                                    />
                                                )}
                                                renderOption={(props, option) => (
                                                    <li {...props} key={option.uuid}>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <DataChip
                                                                label={option.installation?.label ?? 'N/A'}
                                                                color={option.installation?.color ?? '#666'}
                                                            />
                                                            <Typography>{formatCampaignLabel(option)}</Typography>
                                                        </Stack>
                                                    </li>
                                                )}
                                            />
                                        )}
                                    />

                                    {/* Name (required) */}
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label="Nom de la FSEC"
                                                required
                                                error={Boolean(errors.name)}
                                                helperText={errors.name?.message}
                                                fullWidth
                                            />
                                        )}
                                    />

                                    {/* Category (read-only from backend) */}
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Catégorie
                                        </Typography>
                                        <DataChip label={category.label} color={category.color} />
                                    </Box>

                                    {/* Comments */}
                                    <Controller
                                        name="comments"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                value={field.value ?? ''}
                                                label="Remarques"
                                                multiline
                                                rows={3}
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Stack>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Stack spacing={3}>
                                    {/* La date de livraison est gérée exclusivement
                                        via la fiche de livraison (header FSEC) →
                                        retirée du formulaire général. */}

                                    {/* Shooting Date */}
                                    <Controller
                                        name="shootingDate"
                                        control={control}
                                        render={({ field: { value, onChange, ...field } }) => (
                                            <DatePicker
                                                {...field}
                                                label="Date du tir"
                                                value={value ? dayjs(value) : null}
                                                onChange={(date) => onChange(date?.toDate() || null)}
                                                slotProps={{ textField: { fullWidth: true } }}
                                            />
                                        )}
                                    />

                                    {/* Localisation */}
                                    <Controller
                                        name="localisation"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                value={field.value ?? ''}
                                                label="Localisation"
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Stack>
                            </Grid>

                            {/* Team Section - Read-only, inherited from campaign */}
                            <Grid item xs={12}>
                                <Box sx={{ pt: 2 }}>
                                    <Divider sx={{ mb: 3 }}>
                                        <Typography variant="overline" color="text.secondary" fontWeight={700}>
                                            Équipe projet (héritée de la campagne)
                                        </Typography>
                                    </Divider>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} md={4}>
                                            <Controller
                                                name="rce"
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        label="RCE"
                                                        fullWidth
                                                        disabled
                                                        helperText="Valeur de la campagne"
                                                    />
                                                )}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <Controller
                                                name="moe"
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        label="MOE"
                                                        fullWidth
                                                        disabled
                                                        helperText="Valeur de la campagne"
                                                    />
                                                )}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <Controller
                                                name="iec"
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        label="IEC"
                                                        fullWidth
                                                        disabled
                                                        helperText="Valeur de la campagne"
                                                    />
                                                )}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>

                <Divider />

                <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
                    <Box>
                        {!showDeleteConfirm ? (
                            <Button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                sx={{ fontWeight: 600 }}
                            >
                                Supprimer
                            </Button>
                        ) : (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" color="error" fontWeight={600}>
                                    Confirmer ?
                                </Typography>
                                <Button
                                    type="button"
                                    onClick={handleDelete}
                                    variant="contained"
                                    color="error"
                                    size="small"
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? 'Suppression...' : 'Oui'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    variant="text"
                                    size="small"
                                >
                                    Non
                                </Button>
                            </Stack>
                        )}
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button type="button" onClick={onClose} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={updateMutation.isPending}
                            sx={{
                                px: 4,
                                fontWeight: 700,
                                borderRadius: 1.5,
                                textTransform: 'none',
                            }}
                        >
                            {updateMutation.isPending ? 'Enregistrement...' : 'Sauvegarder'}
                        </Button>
                    </Stack>
                </DialogActions>
            </form>
        </Dialog>
    );
}
