/**
 * Create FSEC Form Store - Zustand
 * @module features/create-fsec/model
 *
 * Client state for FSEC creation modal
 */

import { create } from 'zustand';

interface CreateFsecState {
    isOpen: boolean;
    preselectedCampaignId: string | null;

    // Actions
    open: (campaignId?: string) => void;
    close: () => void;
    reset: () => void;
}

export const useCreateFsecStore = create<CreateFsecState>((set) => ({
    isOpen: false,
    preselectedCampaignId: null,

    // Guard against a non-string arg (e.g. a click MouseEvent passed by mistake
    // when the action is used directly as an onClick handler): only a real
    // campaign id should preselect/lock the campaign field in the modal.
    open: (campaignId?: string) =>
        set({ isOpen: true, preselectedCampaignId: typeof campaignId === 'string' ? campaignId : null }),
    close: () => set({ isOpen: false }),
    reset: () => set({ isOpen: false, preselectedCampaignId: null }),
}));
