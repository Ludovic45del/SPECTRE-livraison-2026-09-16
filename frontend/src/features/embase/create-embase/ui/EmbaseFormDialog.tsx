/**
 * Create Embase Modal
 * @module features/embase/create-embase
 *
 * Modal for creating a new embase with:
 * - Identifier, Type, Nombre de voies (required)
 * - Voie V1, Mécanique, Voie V2 tabs
 */

import { memo, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogActions, Button, Box, Divider, IconButton, Tabs, Tab } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type EmbaseCreate, EmbaseCreateSchema, useCreateEmbase } from '@entities/embase';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib/error-utils';
import { paths } from '@shared/config';
import { useNavigate } from 'react-router-dom';
import { useCreateEmbaseStore } from '../model';
import { GeneralTab, VoieV1FormTab, MecaniqueFormTab, VoieV2FormTab } from './tabs';

/* ── Sub-components ─────────────────────────────────────────────── */

const tabSx = { height: 64, fontWeight: 700, fontSize: '0.95rem' } as const;

interface FormDialogHeaderProps {
    tabValue: number;
    onTabChange: (value: number) => void;
    nombreVoies: number;
    onClose: () => void;
}

const FormDialogHeader = memo(function FormDialogHeader({
    tabValue,
    onTabChange,
    nombreVoies,
    onClose,
}: FormDialogHeaderProps) {
    return (
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
                onChange={(_, v) => onTabChange(v)}
                sx={{ px: 2, minHeight: 64, alignItems: 'center' }}
            >
                <Tab label="Général" sx={tabSx} />
                <Tab label="Voie V1" sx={tabSx} />
                <Tab label="Mécanique" sx={tabSx} />
                <Tab label="Voie V2" sx={tabSx} disabled={nombreVoies === 1} />
            </Tabs>
            <IconButton onClick={onClose} size="small" sx={{ mr: 1 }} aria-label="Fermer">
                <CloseIcon />
            </IconButton>
        </Box>
    );
});

interface FormDialogFooterProps {
    onClose: () => void;
    isPending: boolean;
}

const FormDialogFooter = memo(function FormDialogFooter({ onClose, isPending }: FormDialogFooterProps) {
    return (
        <DialogActions sx={{ p: 3 }}>
            <Button type="button" onClick={onClose} variant="text" color="inherit" sx={{ fontWeight: 600 }}>
                Annuler
            </Button>
            <Button type="submit" variant="contained" size="small" disabled={isPending}>
                {isPending ? 'Création...' : 'Créer'}
            </Button>
        </DialogActions>
    );
});

/* ── Main component ─────────────────────────────────────────────── */

export const CreateEmbaseModal = memo(function CreateEmbaseModal() {
    const navigate = useNavigate();
    const { isOpen, close, reset } = useCreateEmbaseStore();
    const createMutation = useCreateEmbase();
    const { showNotification } = useNotification();
    const [tabValue, setTabValue] = useState(0);

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset: resetForm,
        watch,
        setValue,
    } = useForm<EmbaseCreate>({
        mode: 'onBlur',
        resolver: zodResolver(EmbaseCreateSchema),
        defaultValues: {
            identifier: '',
            type: 'jet_de_gaz',
            nombreVoies: 1,
            souffletV1: '',
            capteurV1: '',
            offsetV1Mv: null,
            mesurandeLieV1Mv: null,
            sensibiliteV1Mv: null,
            signalMeteocielV1Mv: null,
            capteurCiblePfeifferMbar: null,
            etendueV1Mbar: null,
            testEtancheiteHe: '',
            testCapteurMrg: '',
            etalonnageDate: null,
            observationsV1: '',
            operationnelleAimant: false,
            operationnelleBroche: false,
            localisationActuelle: '',
            coteVe: null,
            decalageAngulaire: '',
            chargementMcc: '',
            souffletV2: '',
            capteurV2: '',
            offsetV2Mv: null,
            sensibiliteV2Mv: null,
            etendueV2Mbar: null,
            mesurandeLieV2Mv: null,
            signalMeteocielV2Mv: null,
            capteurCiblePfeifferV2Mbar: null,
            testEtancheiteHeV2: '',
            testCapteurMrgV2: '',
            observationsV2: '',
            electrovanne: false,
        },
    });

    const onSubmit = useCallback(
        async (data: EmbaseCreate) => {
            try {
                const newEmbase = await createMutation.mutateAsync(data);
                showNotification('Embase créée avec succès', 'success');
                resetForm();
                setTabValue(0);
                reset();
                navigate(paths.embase.tab(newEmbase.slug, 'voie-v1'));
            } catch (err: unknown) {
                showNotification(getErrorMessage(err, "Erreur lors de la création de l'embase"), 'error');
            }
        },
        [createMutation, showNotification, resetForm, reset, navigate],
    );

    const handleClose = useCallback(() => {
        resetForm();
        setTabValue(0);
        close();
    }, [resetForm, close]);

    const nombreVoies = watch('nombreVoies');

    return (
        <Dialog
            open={isOpen}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            aria-label="Créer une embase"
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            <FormDialogHeader
                tabValue={tabValue}
                onTabChange={setTabValue}
                nombreVoies={nombreVoies}
                onClose={handleClose}
            />
            <form id="create-embase-form" onSubmit={handleSubmit(onSubmit)}>
                <DialogContent sx={{ minHeight: 400, p: 4, pt: 3 }}>
                    {tabValue === 0 && <GeneralTab control={control} errors={errors} />}
                    {tabValue === 1 && <VoieV1FormTab control={control} />}
                    {tabValue === 2 && <MecaniqueFormTab control={control} watch={watch} setValue={setValue} />}
                    {tabValue === 3 && <VoieV2FormTab control={control} />}
                </DialogContent>
                <Divider />
                <FormDialogFooter onClose={handleClose} isPending={createMutation.isPending} />
            </form>
        </Dialog>
    );
});
