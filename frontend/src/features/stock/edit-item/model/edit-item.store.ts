/**
 * Edit Catalog Item Modal Store — Zustand.
 */

import { create } from 'zustand';

interface EditItemState {
    isOpen: boolean;
    uuid: string | null;
    open: (uuid: string) => void;
    close: () => void;
}

export const useEditItemStore = create<EditItemState>((set) => ({
    isOpen: false,
    uuid: null,
    open: (uuid) => set({ isOpen: true, uuid }),
    close: () => set({ isOpen: false, uuid: null }),
}));
