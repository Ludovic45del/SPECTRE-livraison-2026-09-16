/**
 * Campaign & FSEC Cascading Selector
 * @module features/fa/create-fa
 *
 * Autocomplete pair for selecting a Campaign then a FSEC (filtered by campaign).
 * Used in the CreateFaModal form.
 *
 * Le sélecteur FSEC réutilise le composant commun `FsecAutocomplete` (R02) :
 * libellé = nom complet « {year}-{installation}_{campagne}_{fsec} » calculé par
 * le backend, options sans troncature. La valeur persistée reste `versionUuid`.
 */

import { memo } from 'react';
import { Autocomplete, Stack, TextField, Typography } from '@mui/material';
import { Control, Controller, FieldErrors, UseFormSetValue } from 'react-hook-form';
import type { CampaignWithRelations } from '@entities/campaign';
import { FsecAutocomplete, formatFsecCampaignPrefix, type Fsec } from '@entities/fsec';
import { DataChip } from '@widgets/data-chip';

import type { CreateFaForm } from '../model';

// ============================================================================
// Types
// ============================================================================

interface CampaignFsecSelectorProps {
    control: Control<CreateFaForm>;
    errors: FieldErrors<CreateFaForm>;
    setValue: UseFormSetValue<CreateFaForm>;
    campaigns: CampaignWithRelations[] | undefined;
    availableFsecs: Fsec[];
    selectedCampaignId: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Libellé campagne : même convention que le préfixe des options FSEC. */
const formatCampaignLabel = (campaign: CampaignWithRelations) => formatFsecCampaignPrefix(campaign);

// ============================================================================
// Component
// ============================================================================

export const CampaignFsecSelector = memo(function CampaignFsecSelector({
    control,
    errors,
    setValue,
    campaigns,
    availableFsecs,
    selectedCampaignId,
}: CampaignFsecSelectorProps) {
    return (
        <>
            {/* Campaign Selector (cascading) */}
            <Controller
                name="campaignId"
                control={control}
                render={({ field }) => (
                    <Autocomplete
                        options={campaigns ?? []}
                        value={campaigns?.find((c) => c.uuid === field.value) ?? null}
                        onChange={(_, value) => {
                            field.onChange(value?.uuid ?? '');
                            // Reset FSEC when campaign changes
                            setValue('fsecVersionId', '');
                        }}
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

            {/* FSEC Selector (filtered by campaign) */}
            <Controller
                name="fsecVersionId"
                control={control}
                render={({ field }) => (
                    <FsecAutocomplete
                        options={availableFsecs}
                        value={availableFsecs.find((f) => f.versionUuid === field.value) ?? null}
                        onChange={(fsec) => field.onChange(fsec?.versionUuid ?? '')}
                        onBlur={field.onBlur}
                        required
                        disabled={!selectedCampaignId}
                        error={Boolean(errors.fsecVersionId)}
                        helperText={
                            errors.fsecVersionId?.message ??
                            (!selectedCampaignId ? "Sélectionnez d'abord une campagne" : undefined)
                        }
                        noOptionsText="Aucune FSEC dans cette campagne"
                    />
                )}
            />
        </>
    );
});
