/**
 * Create User Store - Zustand
 * @module features/admin/create-user/model
 */

import { create } from 'zustand';

interface CreateUserState {
    isOpen: boolean;
    open: () => void;
    close: () => void;
}

export const useCreateUserStore = create<CreateUserState>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
}));
