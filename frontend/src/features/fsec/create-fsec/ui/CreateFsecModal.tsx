/**
 * Create FSEC Modal
 * @module features/create-fsec
 *
 * Simple modal for creating a new FSEC with:
 * - Campaign (required)
 * - Name (required)
 * - Category (required)
 * - Comments (optional)
 */

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    Box,
    Divider,
    IconButton,
    Autocomplete,
    Tabs,
    Tab,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useCreateFsec } from '@entities/fsec';
import { useCampaigns, CampaignWithRelations } from '@entities/campaign';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib/error-utils';
import { paths } from '@shared/config';
import { useCreateFsecStore } from '../model';
import { DataChip } from '@widgets/data-chip';
import { ChipSelect } from '@widgets/chip-select';

// Form schema - only the 4 required fields
const CreateFsecFormSchema = z.object({
    name: z.string().min(1, 'Le nom est requis'),
    campaignId: z.string().uuid('La campagne est requise'),
    categoryId: z.number().int().min(0, 'La catégorie est requise'),
    comments: z.string().nullable().optional(),
});

type CreateFsecForm = z.infer<typeof CreateFsecFormSchema>;

// FSEC Categories from backend referential
const FSEC_CATEGORIES = [
    { id: 0, label: 'Sans Gaz', color: '#00FF66' },
    { id: 1, label: 'Gaz BP', color: '#1FDFED' },
    { id: 2, label: 'Gaz HP', color: '#1FEDB7' },
    { id: 3, label: 'Gaz BP + HP', color: '#1FED2B' },
    { id: 4, label: 'Gaz Permeation + HP', color: '#1F9DED' },
];

export function CreateFsecModal() {
    const navigate = useNavigate();
    const { isOpen, preselectedCampaignId, close, reset } = useCreateFsecStore();
    const createMutation = useCreateFsec();
    const { showNotification } = useNotification();
    const { data: campaigns } = useCampaigns();
    const [tabValue, setTabValue] = useState(0);

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset: resetForm,
        setValue,
    } = useForm<CreateFsecForm>({
        mode: 'onBlur',
        resolver: zodResolver(CreateFsecFormSchema),
        defaultValues: {
            name: '',
            campaignId: '',
            categoryId: 0,
            comments: null,
        },
    });

    // Pre-fill campaign when opened from a campaign context
    useEffect(() => {
        if (isOpen && preselectedCampaignId) {
            setValue('campaignId', preselectedCampaignId);
        }
    }, [isOpen, preselectedCampaignId, setValue]);

    const onSubmit = async (data: CreateFsecForm) => {
        try {
            const newFsec = await createMutation.mutateAsync({
                name: data.name,
                campaignId: data.campaignId,
                categoryId: data.categoryId,
                statusId: 0, // Default to "Design" status
                comments: data.comments,
            });

            showNotification('FSEC créé avec succès', 'success');
            resetForm();
            setTabValue(0);
            reset();

            // Navigate to FSEC details page
            navigate(paths.fsec.tab(newFsec.slug, 'overview'));
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la création du FSEC'), 'error');
        }
    };

    const handleClose = () => {
        resetForm();
        setTabValue(0);
        close();
    };

    // Format campaign label
    const formatCampaignLabel = (campaign: CampaignWithRelations) => {
        return `${campaign.year}-${campaign.installation?.label ?? 'N/A'}_${campaign.name}`;
    };

    return (
        <Dialog
            open={isOpen}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            aria-label="Créer une FSEC"
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

            <form id="create-fsec-form" onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ minHeight: 300, p: 4, pt: 3 }}>
                    {tabValue === 0 && (
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
                                        disabled={Boolean(preselectedCampaignId)}
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

                            {/* Category (required) */}
                            <Controller
                                name="categoryId"
                                control={control}
                                render={({ field }) => (
                                    <Box>
                                        <ChipSelect
                                            {...field}
                                            label="Catégorie"
                                            options={FSEC_CATEGORIES.map((cat) => ({
                                                value: cat.id,
                                                label: cat.label,
                                                color: cat.color,
                                            }))}
                                            required
                                            error={Boolean(errors.categoryId)}
                                            value={field.value ?? ''}
                                        />
                                        {errors.categoryId && (
                                            <Typography
                                                variant="caption"
                                                color="error"
                                                sx={{ mt: 0.5, ml: 2, display: 'block' }}
                                            >
                                                {errors.categoryId.message}
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            />

                            {/* Comments (optional) */}
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
