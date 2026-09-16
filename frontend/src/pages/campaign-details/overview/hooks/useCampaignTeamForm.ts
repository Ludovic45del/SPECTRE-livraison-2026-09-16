/**
 * Campaign Team Form Hook
 * @module pages/campaign-details/overview/hooks/useCampaignTeamForm
 *
 * Gère l'édition des 3 rôles d'équipe campagne :
 * - MOE : texte libre (membre extérieur au labo)
 * - RCE / IEC : FK UserProfile (sélection via UserSelect)
 *
 * Cohérent avec l'invariant backend (CampaignTeamsService) : MOE -> name,
 * autres rôles -> user_uuid.
 */

import { useState, useCallback } from 'react';
import { CampaignWithRelations } from '@entities/campaign';
import {
    useCampaignTeam,
    getMemberByRole,
    useAddTeamMember,
    useUpdateTeamMember,
    useDeleteTeamMember,
    CampaignTeamMember,
    CampaignTeamFormSchema,
} from '@entities/campaign/team';
import { CAMPAIGN_ROLE_ID } from '@entities/campaign/core/lib';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamFormData {
    /** MOE : nom texte libre (extérieur au labo). */
    moeName: string;
    /** RCE : UUID UserProfile (vide si non renseigné). */
    rceUserUuid: string;
    /** IEC : UUID UserProfile (vide si non renseigné). */
    iecUserUuid: string;
}

export interface UseCampaignTeamFormReturn {
    form: TeamFormData;
    isEditing: boolean;
    isSaving: boolean;
    teamMembers: CampaignTeamMember[] | undefined;

    setField: <K extends keyof TeamFormData>(field: K, value: string) => void;
    startEditing: () => void;
    cancelEditing: () => void;
    save: () => Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildInitialForm(teamMembers: CampaignTeamMember[] | undefined): TeamFormData {
    const moe = getMemberByRole(teamMembers, 'MOE');
    const rce = getMemberByRole(teamMembers, 'RCE');
    const iec = getMemberByRole(teamMembers, 'IEC');
    return {
        moeName: moe?.name ?? '',
        rceUserUuid: rce?.userUuid ?? '',
        iecUserUuid: iec?.userUuid ?? '',
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useCampaignTeamForm(campaign: CampaignWithRelations): UseCampaignTeamFormReturn {
    const { showNotification } = useNotification();

    const { data: teamMembers } = useCampaignTeam(campaign.uuid);
    const addTeamMember = useAddTeamMember();
    const updateTeamMember = useUpdateTeamMember();
    const deleteTeamMember = useDeleteTeamMember();

    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<TeamFormData>(() => buildInitialForm(teamMembers));

    const isSaving = addTeamMember.isPending || updateTeamMember.isPending || deleteTeamMember.isPending;

    const setField = useCallback(<K extends keyof TeamFormData>(field: K, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    }, []);

    const startEditing = useCallback(() => {
        setForm(buildInitialForm(teamMembers));
        setIsEditing(true);
    }, [teamMembers]);

    const cancelEditing = useCallback(() => {
        setIsEditing(false);
    }, []);

    const save = useCallback(async (): Promise<boolean> => {
        const validation = CampaignTeamFormSchema.safeParse(form);
        if (!validation.success) {
            showNotification(validation.error.issues[0].message, 'error');
            return false;
        }

        // Specs: MOE -> name (texte) ; RCE/IEC -> user_uuid (FK).
        const teamUpdates: ReadonlyArray<{
            roleId: number;
            roleLabel: 'MOE' | 'RCE' | 'IEC';
            name: string | null;
            userUuid: string | null;
        }> = [
            {
                roleId: CAMPAIGN_ROLE_ID.MOE,
                roleLabel: 'MOE',
                name: form.moeName.trim() || null,
                userUuid: null,
            },
            {
                roleId: CAMPAIGN_ROLE_ID.RCE,
                roleLabel: 'RCE',
                name: null,
                userUuid: form.rceUserUuid.trim() || null,
            },
            {
                roleId: CAMPAIGN_ROLE_ID.IEC,
                roleLabel: 'IEC',
                name: null,
                userUuid: form.iecUserUuid.trim() || null,
            },
        ];

        try {
            for (const update of teamUpdates) {
                const existing = getMemberByRole(teamMembers, update.roleLabel);
                const hasNewValue = Boolean(update.name || update.userUuid);
                const hasChanged = existing?.name !== update.name || existing?.userUuid !== update.userUuid;

                if (existing && hasNewValue && hasChanged) {
                    await updateTeamMember.mutateAsync({
                        uuid: existing.uuid,
                        campaign_uuid: campaign.uuid,
                        role_id: update.roleId,
                        name: update.name,
                        user_uuid: update.userUuid,
                    });
                } else if (existing && !hasNewValue) {
                    await deleteTeamMember.mutateAsync({
                        uuid: existing.uuid,
                        campaign_uuid: campaign.uuid,
                    });
                } else if (!existing && hasNewValue) {
                    await addTeamMember.mutateAsync({
                        campaign_uuid: campaign.uuid,
                        role_id: update.roleId,
                        name: update.name,
                        user_uuid: update.userUuid,
                    });
                }
            }

            showNotification('Équipe mise à jour', 'success');
            setIsEditing(false);
            return true;
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, "Erreur lors de la mise à jour de l'équipe"), 'error');
            return false;
        }
    }, [campaign.uuid, form, teamMembers, addTeamMember, updateTeamMember, deleteTeamMember, showNotification]);

    return {
        form,
        isEditing,
        isSaving,
        teamMembers,
        setField,
        startEditing,
        cancelEditing,
        save,
    };
}
