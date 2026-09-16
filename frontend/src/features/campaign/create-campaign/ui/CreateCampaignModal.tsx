/**
 * Create Campaign Modal
 * @module features/create-campaign
 *
 * Modal for creating a new campaign with:
 * - Name, Year, Semester (required)
 * - Type, Installation (required)
 * - Dates, DTRI number, Description (optional)
 * - Team members: MOE, RCE, IEC (optional)
 */

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Divider,
    Box,
    IconButton,
    Tabs,
    Tab,
    useTheme,
} from '@mui/material';
import dayjs from 'dayjs';
import CloseIcon from '@mui/icons-material/Close';
import { ChipSelect } from '@widgets/chip-select';
import { TeamMemberInput } from '@widgets/team-member-input';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CampaignCreateSchema, CampaignCreate, useCreateCampaign } from '@entities/campaign';
import { useAddTeamMember } from '@entities/campaign/team';
import { useCreateCampaignStore } from '../model';
import { CAMPAIGN_TYPES, CAMPAIGN_INSTALLATIONS, CAMPAIGN_ROLE_ID } from '@entities/campaign/core/lib';
import { useNotification, RangeCalendar } from '@shared/ui';
import { getErrorMessage } from '@shared/lib/error-utils';

const typeOptions = Object.values(CAMPAIGN_TYPES).map((t) => ({
    value: t.id,
    label: t.label,
    color: t.color || '#999',
}));

const installationOptions = Object.values(CAMPAIGN_INSTALLATIONS).map((i) => ({
    value: i.id,
    label: i.label,
    color: i.color || '#999',
}));

export function CreateCampaignModal() {
    const { isOpen, close, reset } = useCreateCampaignStore();
    const createMutation = useCreateCampaign();
    const addTeamMember = useAddTeamMember();
    const { showNotification } = useNotification();
    const theme = useTheme();
    const [tabValue, setTabValue] = useState(0);

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset: resetForm,
        setValue,
        watch,
    } = useForm<CampaignCreate>({
        mode: 'onBlur',
        resolver: zodResolver(CampaignCreateSchema),
        defaultValues: {
            name: '',
            year: new Date().getFullYear(),
            semester: 'S1',
            typeId: undefined,
            installationId: undefined,
            dtriNumber: null,
            description: null,
            moeName: '',
            rceUserUuid: '',
            iecUserUuid: '',
        },
    });

    // Plage de dates pilotée par le calendrier (cf. RangeCalendar partagé).
    const startDate = watch('startDate');
    const endDate = watch('endDate');

    const onSubmit = async (data: CampaignCreate) => {
        try {
            const campaign = await createMutation.mutateAsync(data);

            // Add team members after campaign creation.
            // MOE = name texte libre, RCE/IEC = user_uuid FK (decision metier).
            const teamMembers: ReadonlyArray<{
                role_id: number;
                label: string;
                name: string | null;
                user_uuid: string | null;
            }> = [
                {
                    role_id: CAMPAIGN_ROLE_ID.MOE,
                    label: 'MOE',
                    name: data.moeName?.trim() || null,
                    user_uuid: null,
                },
                {
                    role_id: CAMPAIGN_ROLE_ID.RCE,
                    label: 'RCE',
                    name: null,
                    user_uuid: data.rceUserUuid?.trim() || null,
                },
                {
                    role_id: CAMPAIGN_ROLE_ID.IEC,
                    label: 'IEC',
                    name: null,
                    user_uuid: data.iecUserUuid?.trim() || null,
                },
            ];

            const failedMembers: string[] = [];
            for (const member of teamMembers) {
                if (member.name || member.user_uuid) {
                    try {
                        await addTeamMember.mutateAsync({
                            campaign_uuid: campaign.uuid,
                            role_id: member.role_id,
                            name: member.name,
                            user_uuid: member.user_uuid,
                        });
                    } catch {
                        failedMembers.push(member.label);
                    }
                }
            }

            if (failedMembers.length > 0) {
                showNotification(
                    `Campagne créée mais les membres suivants n'ont pas pu être ajoutés : ${failedMembers.join(', ')}`,
                    'warning',
                );
            } else {
                showNotification('Campagne créée avec succès', 'success');
            }

            resetForm();
            setTabValue(0);
            reset();
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la création de la campagne'), 'error');
        }
    };

    const handleClose = () => {
        resetForm();
        setTabValue(0);
        close();
    };

    return (
        <Dialog
            open={isOpen}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            aria-label="Créer une campagne"
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            {/* Header with Tabs */}
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
                <IconButton onClick={handleClose} size="small" sx={{ mr: 1 }} aria-label="Fermer">
                    <CloseIcon />
                </IconButton>
            </Box>

            <form id="create-campaign-form" onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ minHeight: 400, p: 4, pt: 3 }}>
                    {tabValue === 0 && (
                        <Stack spacing={3}>
                            {/* Name (required) */}
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Nom"
                                        required
                                        error={Boolean(errors.name)}
                                        helperText={errors.name?.message}
                                        fullWidth
                                    />
                                )}
                            />

                            {/* Year + Semester (required) */}
                            <Stack direction="row" spacing={2}>
                                <Controller
                                    name="year"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Année"
                                            type="number"
                                            required
                                            error={Boolean(errors.year)}
                                            helperText={errors.year?.message}
                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                            fullWidth
                                        />
                                    )}
                                />
                                <Controller
                                    name="semester"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth required>
                                            <InputLabel>Semestre</InputLabel>
                                            <Select {...field} label="Semestre">
                                                <MenuItem value="S1">S1</MenuItem>
                                                <MenuItem value="S2">S2</MenuItem>
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Stack>

                            {/* Type (required) */}
                            <Controller
                                name="typeId"
                                control={control}
                                render={({ field }) => (
                                    <Box>
                                        <ChipSelect
                                            {...field}
                                            label="Type"
                                            options={typeOptions}
                                            required
                                            error={Boolean(errors.typeId)}
                                            value={field.value ?? ''}
                                        />
                                        {errors.typeId && (
                                            <Typography
                                                variant="caption"
                                                color="error"
                                                sx={{ mt: 0.5, ml: 2, display: 'block' }}
                                            >
                                                {errors.typeId.message}
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            />

                            {/* Installation (required) */}
                            <Controller
                                name="installationId"
                                control={control}
                                render={({ field }) => (
                                    <Box>
                                        <ChipSelect
                                            {...field}
                                            label="Installation"
                                            options={installationOptions}
                                            required
                                            error={Boolean(errors.installationId)}
                                            value={field.value ?? ''}
                                        />
                                        {errors.installationId && (
                                            <Typography
                                                variant="caption"
                                                color="error"
                                                sx={{ mt: 0.5, ml: 2, display: 'block' }}
                                            >
                                                {errors.installationId.message}
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            />

                            {/* Dates (optional) — sélection de plage au calendrier */}
                            <Box>
                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                                    Dates de campagne
                                </Typography>
                                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, px: 1, py: 0.5 }}>
                                    <RangeCalendar
                                        value={{
                                            start: startDate ? dayjs(startDate) : null,
                                            end: endDate ? dayjs(endDate) : null,
                                        }}
                                        onChange={(range) => {
                                            setValue('startDate', range.start?.toDate() ?? null);
                                            setValue('endDate', range.end?.toDate() ?? null);
                                        }}
                                        accentColor={theme.palette.primary.main}
                                    />
                                </Box>
                            </Box>

                            {/* DTRI Number (optional, 0 à 999999) */}
                            <Controller
                                name="dtriNumber"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        value={field.value ?? ''}
                                        label="N° DTRI"
                                        type="number"
                                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                        error={Boolean(errors.dtriNumber)}
                                        helperText={errors.dtriNumber?.message}
                                        inputProps={{ min: 0, max: 999999, step: 1 }}
                                        fullWidth
                                    />
                                )}
                            />

                            {/* Description (optional) */}
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        value={field.value ?? ''}
                                        label="Description"
                                        multiline
                                        rows={3}
                                        fullWidth
                                    />
                                )}
                            />

                            {/* Team members section */}
                            <Divider>
                                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                                    Équipe projet
                                </Typography>
                            </Divider>

                            <Stack direction="row" spacing={2}>
                                <Controller
                                    name="moeName"
                                    control={control}
                                    render={({ field }) => (
                                        <TeamMemberInput
                                            roleLabel="MOE"
                                            value={{ name: field.value ?? '', userUuid: null }}
                                            onChange={(v) => field.onChange(v.name ?? '')}
                                            label="MOE"
                                        />
                                    )}
                                />
                                <Controller
                                    name="rceUserUuid"
                                    control={control}
                                    render={({ field }) => (
                                        <TeamMemberInput
                                            roleLabel="RCE"
                                            value={{ name: null, userUuid: field.value || null }}
                                            onChange={(v) => field.onChange(v.userUuid ?? '')}
                                            label="RCE"
                                        />
                                    )}
                                />
                                <Controller
                                    name="iecUserUuid"
                                    control={control}
                                    render={({ field }) => (
                                        <TeamMemberInput
                                            roleLabel="IEC"
                                            value={{ name: null, userUuid: field.value || null }}
                                            onChange={(v) => field.onChange(v.userUuid ?? '')}
                                            label="IEC"
                                        />
                                    )}
                                />
                            </Stack>
                        </Stack>
                    )}
                </DialogContent>

                <Divider />

                <DialogActions sx={{ p: 3 }}>
                    <Button type="button" onClick={handleClose} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                        Annuler
                    </Button>
                    <Button type="submit" variant="contained" size="small" disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Création...' : 'Créer'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
