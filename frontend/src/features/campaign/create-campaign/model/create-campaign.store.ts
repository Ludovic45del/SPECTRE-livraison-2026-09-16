/**
 * Create Campaign Form Store - Zustand
 * @module features/create-campaign/model
 *
 * Client state for campaign creation modal
 */

import { create } from 'zustand';

interface CreateCampaignState {
    isOpen: boolean;

    // Actions
    open: () => void;
    close: () => void;
    reset: () => void;
}

export const useCreateCampaignStore = create<CreateCampaignState>((set) => ({
    isOpen: false,

    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    reset: () => set({ isOpen: false }),
}));
