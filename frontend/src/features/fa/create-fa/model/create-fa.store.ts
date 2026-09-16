/**
 * Create FA Form Store - Zustand
 * @module features/fa/create-fa/model
 *
 * Client state for FA creation modal
 */

import { create } from 'zustand';

interface CreateFaState {
    isOpen: boolean;
    preselectedFsecVersionId: string | null;
    preselectedCampaignId: string | null;

    // Actions
    open: (fsecVersionId?: string, campaignId?: string) => void;
    close: () => void;
    reset: () => void;
}

export const useCreateFaStore = create<CreateFaState>((set) => ({
    isOpen: false,
    preselectedFsecVersionId: null,
    preselectedCampaignId: null,

    open: (fsecVersionId?: string, campaignId?: string) =>
        set({
            isOpen: true,
            preselectedFsecVersionId: fsecVersionId ?? null,
            preselectedCampaignId: campaignId ?? null,
        }),
    close: () => set({ isOpen: false }),
    reset: () =>
        set({
            isOpen: false,
            preselectedFsecVersionId: null,
            preselectedCampaignId: null,
        }),
}));
