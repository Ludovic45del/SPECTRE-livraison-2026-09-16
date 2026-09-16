/**
 * Create FA Modal
 * @module features/fa/create-fa
 *
 * Modal for creating a new Fiche d'Anomalie (FA) with:
 * - Campaign selection (cascading to FSEC selection)
 * - FSEC selection (required)
 * - Phase Ouvert fields (discoverer, event_date, observation, etc.)
 */

import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, Divider, IconButton, Tab, Tabs } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useCampaigns } from '@entities/campaign';
import { useCreateFa, FSEC_STEP_ID } from '@entities/fa';
import { useFsecsByCampaign } from '@entities/fsec';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib/error-utils';
import { paths } from '@shared/config';

import { useCreateFaStore, CreateFaFormSchema, type CreateFaForm } from '../model';
import { CreateFaFormFields } from './CreateFaFormFields';

export function CreateFaModal() {
    const navigate = useNavigate();
    const { isOpen, preselectedFsecVersionId, preselectedCampaignId, close, reset } = useCreateFaStore();
    const createMutation = useCreateFa();
    const { showNotification } = useNotification();
    const { data: campaigns } = useCampaigns();
    const [tabValue, setTabValue] = useState(0);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

    // Fetch FSECs for selected campaign
    const { data: fsecs } = useFsecsByCampaign(selectedCampaignId);

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset: resetForm,
        setValue,
        watch,
    } = useForm<CreateFaForm>({
        mode: 'onBlur',
        resolver: zodResolver(CreateFaFormSchema),
        defaultValues: {
            campaignId: '',
            fsecVersionId: '',
            fsecStepId: null,
            fsecStepOther: '',
            discovererUserUuid: '',
            eventDate: dayjs(),
            observation: '',
            locationEquipment: null,
            quickAnalysis: '',
            immediateMeasures: null,
        },
    });

    const watchCampaignId = watch('campaignId');

    // Update selected campaign when form changes
    useEffect(() => {
        if (watchCampaignId) {
            setSelectedCampaignId(watchCampaignId);
        }
    }, [watchCampaignId]);

    // Pre-fill form if values are provided
    useEffect(() => {
        if (isOpen && preselectedCampaignId) {
            setValue('campaignId', preselectedCampaignId);
            setSelectedCampaignId(preselectedCampaignId);
        }
        if (isOpen && preselectedFsecVersionId) {
            setValue('fsecVersionId', preselectedFsecVersionId);
        }
    }, [isOpen, preselectedCampaignId, preselectedFsecVersionId, setValue]);

    // Une FSEC peut désormais porter plusieurs FA : aucune n'est filtrée.
    const availableFsecs = fsecs ?? [];

    const onSubmit = useCallback(
        async (data: CreateFaForm) => {
            try {
                const newFa = await createMutation.mutateAsync({
                    fsecVersionId: data.fsecVersionId,
                    fsecStepId: data.fsecStepId,
                    fsecStepOther: data.fsecStepId === FSEC_STEP_ID.AUTRE ? data.fsecStepOther?.trim() || null : null,
                    discovererUserUuid: data.discovererUserUuid,
                    eventDate: data.eventDate.toDate(),
                    observation: data.observation,
                    locationEquipment: data.locationEquipment ?? null,
                    quickAnalysis: data.quickAnalysis,
                    immediateMeasures: data.immediateMeasures ?? null,
                });

                showNotification("Fiche d'Anomalie créée avec succès", 'success');
                resetForm();
                setTabValue(0);
                setSelectedCampaignId('');
                reset();

                navigate(paths.fa.tab(newFa.slug, 'phase1'));
            } catch (err: unknown) {
                showNotification(getErrorMessage(err, 'Erreur lors de la création de la FA'), 'error');
            }
        },
        [createMutation, showNotification, resetForm, reset, navigate],
    );

    const handleClose = useCallback(() => {
        resetForm();
        setTabValue(0);
        setSelectedCampaignId('');
        close();
    }, [resetForm, close]);

    return (
        <Dialog
            open={isOpen}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            aria-label="Nouvelle Fiche d'Anomalie"
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
                    <Tab label="Nouvelle Fiche d'Anomalie" sx={{ height: 64, fontWeight: 700, fontSize: '0.95rem' }} />
                </Tabs>
                <IconButton onClick={handleClose} size="small" sx={{ mr: 1 }} aria-label="Fermer">
                    <CloseIcon />
                </IconButton>
            </Box>

            <form id="create-fa-form" onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ minHeight: 400, p: 4, pt: 3 }}>
                    {tabValue === 0 && (
                        <CreateFaFormFields
                            control={control}
                            errors={errors}
                            setValue={setValue}
                            campaigns={campaigns}
                            availableFsecs={availableFsecs}
                            selectedCampaignId={selectedCampaignId}
                        />
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
