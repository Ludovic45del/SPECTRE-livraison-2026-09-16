/**
 * Create Embase Form Store - Zustand
 * @module features/embase/create-embase/model
 *
 * Client state for embase creation modal
 */

import { create } from 'zustand';

interface CreateEmbaseState {
    isOpen: boolean;

    // Actions
    open: () => void;
    close: () => void;
    reset: () => void;
}

export const useCreateEmbaseStore = create<CreateEmbaseState>((set) => ({
    isOpen: false,

    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    reset: () => set({ isOpen: false }),
}));
