/**
 * useCampaignTeamForm Hook Tests
 * @module pages/campaign-details/overview/hooks
 *
 * Tests pour le state form + opérations CRUD.
 * MOE = texte libre. RCE/IEC = FK UserProfile (uuid).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useCampaignTeamForm } from './useCampaignTeamForm';
import { CampaignWithRelations } from '@entities/campaign';

const RCE_USER_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
const IEC_USER_UUID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2';
const NEW_USER_UUID = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';

const mockShowNotification = vi.fn();
const mockAddMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

interface MockMember {
    uuid: string;
    name: string | null;
    userUuid: string | null;
    roleId: number;
}

const mockTeamMembers: MockMember[] = [
    { uuid: 'member-1', name: 'John Doe', userUuid: null, roleId: 1 }, // MOE (texte)
    { uuid: 'member-2', name: null, userUuid: RCE_USER_UUID, roleId: 2 }, // RCE (FK)
];

vi.mock('@shared/ui', () => ({
    useNotification: () => ({ showNotification: mockShowNotification }),
}));

vi.mock('@entities/campaign/team', () => ({
    useCampaignTeam: () => ({ data: mockTeamMembers }),
    useAddTeamMember: () => ({ mutateAsync: mockAddMutateAsync, isPending: false }),
    useUpdateTeamMember: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
    useDeleteTeamMember: () => ({ mutateAsync: mockDeleteMutateAsync, isPending: false }),
    CampaignTeamFormSchema: z.object({
        moeName: z.string().max(50),
        rceUserUuid: z.string().uuid().or(z.literal('')),
        iecUserUuid: z.string().uuid().or(z.literal('')),
    }),
    getMemberByRole: (members: MockMember[] | undefined, role: string) => {
        if (!members) return undefined;
        const roleMap: Record<string, number> = { MOE: 1, RCE: 2, IEC: 3 };
        return members.find((m) => m.roleId === roleMap[role]);
    },
}));

vi.mock('@entities/campaign/core/lib', () => ({
    CAMPAIGN_ROLE_ID: { MOE: 1, RCE: 2, IEC: 3 },
}));

const mockCampaign: CampaignWithRelations = {
    slug: 'campagne-test',
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Campagne Test',
    year: 2024,
    semester: 'S1',
    dtriNumber: 42,
    description: 'Description test',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    lastUpdated: new Date(),
    type: { id: 1, label: 'Type A', color: '#FF0000' },
    status: { id: 2, label: 'En cours', color: '#00FF00' },
    installation: { id: 3, label: 'Installation X', color: '#0000FF' },
};

describe('useCampaignTeamForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAddMutateAsync.mockResolvedValue({});
        mockUpdateMutateAsync.mockResolvedValue({});
        mockDeleteMutateAsync.mockResolvedValue({});
    });

    describe('Initialisation', () => {
        it('initialise le form avec les données existantes (MOE name, RCE/IEC userUuid)', () => {
            const { result } = renderHook(() => useCampaignTeamForm(mockCampaign));

            expect(result.current.form).toEqual({
                moeName: 'John Doe',
                rceUserUuid: RCE_USER_UUID,
                iecUserUuid: '',
            });
        });

        it('démarre en mode lecture', () => {
            const { result } = renderHook(() => useCampaignTeamForm(mockCampaign));
            expect(result.current.isEditing).toBe(false);
        });
    });

    describe('Édition', () => {
        it('passe en mode édition', () => {
            const { result } = renderHook(() => useCampaignTeamForm(mockCampaign));
            act(() => result.current.startEditing());
            expect(result.current.isEditing).toBe(true);
        });

        it('annule l’édition', () => {
            const { result } = renderHook(() => useCampaignTeamForm(mockCampaign));
            act(() => result.current.startEditing());
            act(() => result.current.cancelEditing());
            expect(result.current.isEditing).toBe(false);
        });
    });

    describe('setField', () => {
        it('met à jour moeName', () => {
            const { result } = renderHook(() => useCampaignTeamForm(mockCampaign));
            act(() => result.current.setField('moeName', 'New MOE'));
            expect(result.current.form.moeName).toBe('New MOE');
        });

        it('met à jour rceUserUuid', () => {
            const { result } = renderHook(() => useCampaignTeamForm(mockCampaign));
            act(() => result.current.setField('rceUserUuid', NEW_USER_UUID));
            expect(result.current.form.rceUserUuid).toBe(NEW_USER_UUID);
        });

        it('met à jour iecUserUuid', () => {
            const { result } = renderHook(() => useCampaignTeamForm(mockCampaign));
            act(() => result.current.setField('iecUserUuid', NEW_USER_UUID));
            expect(result.current.form.iecUserUuid).toBe(NEW_USER_UUID);
        });
    });

    describe('Save', () => {
        it('met à jour MOE quand le nom change', async () => {
            const { result } = renderHook(() => useCampaignTeamForm(mockCampaign));
            act(() => {
                result.current.startEditing();
                result.current.setField('moeName', 'Updated MOE Name');
            });

            await act(async () => {
                await result.current.save();
            });

            expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    uuid: 'member-1',
                    campaign_uuid: mockCampaign.uuid,
                    name: 'Updated MOE Name',
                    user_uuid: null,
                }),
            );
        });

        it('supprime MOE quand le nom est vidé', async () => {
            const { result } = renderHook(() => useCampaignTeamForm(mockCampaign));
            act(() => {
                result.current.startEditing();
                result.current.setField('moeName', '');
            });

            await act(async () => {
                await result.current.save();
            });

            expect(mockDeleteMutateAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    uuid: 'member-1',
                    campaign_uuid: mockCampaign.uuid,
                }),
            );
        });

        it('ajoute IEC (FK) quand un nouvel uuid est fourni pour un rôle vide', async () => {
            const { result } = renderHook(() => useCampaignTeamForm(mockCampaign));
            act(() => {
                result.current.startEditing();
                result.current.setField('iecUserUuid', IEC_USER_UUID);
            });

            await act(async () => {
                await result.current.save();
            });

            expect(mockAddMutateAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    campaign_uuid: mockCampaign.uuid,
                    role_id: 3,
                    name: null,
                    user_uuid: IEC_USER_UUID,
                }),
            );
        });

        it('reporte une erreur métier remontée par la mutation', async () => {
            mockUpdateMutateAsync.mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() => useCampaignTeamForm(mockCampaign));
            act(() => {
                result.current.startEditing();
                result.current.setField('moeName', 'Changed Name');
            });

            let saveResult: boolean = true;
            await act(async () => {
                saveResult = await result.current.save();
            });

            expect(saveResult).toBe(false);
            expect(mockShowNotification).toHaveBeenCalledWith('Network error', 'error');
        });

        it("ne déclenche aucune mutation si rien n'a changé", async () => {
            const { result } = renderHook(() => useCampaignTeamForm(mockCampaign));
            act(() => result.current.startEditing());

            await act(async () => {
                await result.current.save();
            });

            expect(mockAddMutateAsync).not.toHaveBeenCalled();
            expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
            expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
        });
    });
});
