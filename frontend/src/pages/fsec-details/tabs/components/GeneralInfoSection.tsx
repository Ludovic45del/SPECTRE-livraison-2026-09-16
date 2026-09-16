/**
 * General Info Section for FSEC Overview Tab
 * @module pages/fsec-details/tabs/components
 *
 * Affiche les champs de la modale de création (Campagne, Nom, Catégorie, Remarques)
 * + Localisation.
 */

import { useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { faKeys } from '@entities/fa/core/api/fa.keys';
import {
    Autocomplete,
    Box,
    Button,
    Divider,
    Grid,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { Fsec, useUpdateFsec } from '@entities/fsec';
import { FSEC_CATEGORY_LIST, getCategoryInfo } from '@entities/fsec/core/model/fsec.constants';
import { FsecGeneralFormSchema } from '@entities/fsec/core/model/fsec.schema';
import { useCampaigns, CampaignWithRelations } from '@entities/campaign';
import { useNotification } from '@shared/ui';
import { DataChip } from '@widgets/data-chip';
import { ChipSelect } from '@widgets/chip-select';
import { OverviewImageSection } from './OverviewImageSection';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface GeneralInfoSectionProps {
    fsec: Fsec;
    campaign?: CampaignWithRelations | null;
    paperSx: Record<string, unknown>;
    editButtonSx: Record<string, unknown>;
}

interface GeneralInfoForm {
    campaignId: string;
    name: string;
    categoryId: number;
    localisation: string;
    comments: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatCampaignLabel = (campaign: CampaignWithRelations) =>
    `${campaign.year}-${campaign.installation?.label ?? 'N/A'}_${campaign.name}`;

const buildInitialForm = (fsec: Fsec): GeneralInfoForm => ({
    campaignId: fsec.campaignId ?? '',
    name: fsec.name,
    categoryId: fsec.categoryId ?? 0,
    localisation: fsec.localisation ?? '',
    comments: fsec.comments ?? '',
});

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function GeneralInfoSection({ fsec, campaign, paperSx, editButtonSx }: GeneralInfoSectionProps) {
    const { showNotification } = useNotification();
    const updateMutation = useUpdateFsec();
    const { data: campaigns } = useCampaigns();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { fsecSlug = '' } = useParams<{ fsecSlug: string }>();

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<GeneralInfoForm>(() => buildInitialForm(fsec));

    const categoryInfo = getCategoryInfo(fsec.categoryId);

    const handleEdit = useCallback(() => {
        setForm(buildInitialForm(fsec));
        setIsEditing(true);
    }, [fsec]);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
    }, []);

    const handleSave = useCallback(async () => {
        if (!form.name.trim()) {
            showNotification('Le nom est requis', 'error');
            return;
        }
        if (!form.campaignId) {
            showNotification('La campagne est requise', 'error');
            return;
        }
        const validation = FsecGeneralFormSchema.safeParse({
            localisation: form.localisation,
            comments: form.comments,
        });
        if (!validation.success) {
            showNotification(validation.error.issues[0].message, 'error');
            return;
        }

        try {
            const updated = await updateMutation.mutateAsync({
                versionUuid: fsec.versionUuid,
                data: {
                    name: form.name.trim(),
                    campaignId: form.campaignId,
                    statusId: fsec.statusId,
                    categoryId: form.categoryId,
                    rackId: fsec.rackId,
                    preshootingPressure: fsec.preshootingPressure,
                    experienceSrxx: fsec.experienceSrxx,
                    depressurizationFailed: fsec.depressurizationFailed,
                    shootingDate: fsec.shootingDate,
                    deliveryDate: fsec.deliveryDate,
                    localisation: form.localisation || null,
                    comments: form.comments || null,
                },
            });
            showNotification('Informations générales mises à jour', 'success');
            setIsEditing(false);
            // Renommer / changer de campagne change le slug calculé : l'URL pointe
            // encore sur l'ancien slug, dont la query 404 désormais. On rebascule
            // sur le slug canonique renvoyé par l'API (cache déjà peuplé par la
            // mutation), en préservant l'onglet courant.
            if (updated.slug && updated.slug !== fsecSlug) {
                // Le backend a réaligné l'identifiant des FA de cette FSEC sur le
                // nouveau contexte (nom/campagne) : on invalide les caches FA pour
                // que leur « nom » se rafraîchisse partout (liste, détail, par FSEC).
                queryClient.invalidateQueries({ queryKey: faKeys.all });
                navigate(location.pathname.replace(`/fsec-details/${fsecSlug}`, `/fsec-details/${updated.slug}`), {
                    replace: true,
                });
            }
        } catch {
            showNotification('Erreur lors de la mise à jour', 'error');
        }
    }, [fsec, form, updateMutation, showNotification, navigate, location.pathname, fsecSlug, queryClient]);

    const selectedCampaign = campaigns?.find((c) => c.uuid === form.campaignId) ?? null;

    return (
        <Paper variant="outlined" sx={paperSx}>
            {!isEditing && (
                <IconButton size="small" onClick={handleEdit} sx={editButtonSx}>
                    <EditIcon fontSize="small" />
                </IconButton>
            )}

            <Typography variant="h6" mb={2}>
                Informations Générales
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {isEditing ? (
                <Box>
                    <Stack spacing={3}>
                        <Autocomplete
                            options={campaigns ?? []}
                            value={selectedCampaign}
                            onChange={(_, value) => setForm((prev) => ({ ...prev, campaignId: value?.uuid ?? '' }))}
                            getOptionLabel={formatCampaignLabel}
                            isOptionEqualToValue={(option, value) => option.uuid === value?.uuid}
                            renderInput={(params) => <TextField {...params} label="Campagne" required size="small" />}
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

                        <TextField
                            label="Nom de la FSEC"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            required
                            size="small"
                            fullWidth
                        />

                        <ChipSelect
                            label="Catégorie"
                            options={FSEC_CATEGORY_LIST.map((cat) => ({
                                value: cat.id,
                                label: cat.label,
                                color: cat.color,
                            }))}
                            required
                            size="small"
                            value={form.categoryId}
                            onChange={(e) => setForm((prev) => ({ ...prev, categoryId: Number(e.target.value) }))}
                        />

                        <TextField
                            label="Localisation"
                            value={form.localisation}
                            onChange={(e) => setForm((prev) => ({ ...prev, localisation: e.target.value }))}
                            size="small"
                            fullWidth
                        />

                        <TextField
                            label="Remarques"
                            value={form.comments}
                            onChange={(e) => setForm((prev) => ({ ...prev, comments: e.target.value }))}
                            multiline
                            rows={3}
                            size="small"
                            fullWidth
                        />
                    </Stack>
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
                            Campagne
                        </Typography>
                        {campaign ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <DataChip
                                    label={campaign.installation?.label ?? 'N/A'}
                                    color={campaign.installation?.color ?? '#666'}
                                />
                                <Typography variant="body1" fontWeight="medium">
                                    {formatCampaignLabel(campaign)}
                                </Typography>
                            </Stack>
                        ) : (
                            <Typography variant="body1" fontWeight="medium">
                                -
                            </Typography>
                        )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Nom de la FSEC
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                            {fsec.displayName || '-'}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Catégorie
                        </Typography>
                        <DataChip label={categoryInfo.label} color={categoryInfo.color} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Localisation
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                            {fsec.localisation || '-'}
                        </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Remarques
                        </Typography>
                        <Typography variant="body1">{fsec.comments || 'Aucune remarque'}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <OverviewImageSection
                            versionUuid={fsec.versionUuid}
                            fsecName={fsec.displayName}
                            imageUrl={fsec.overviewImage ?? null}
                        />
                    </Grid>
                </Grid>
            )}
        </Paper>
    );
}
