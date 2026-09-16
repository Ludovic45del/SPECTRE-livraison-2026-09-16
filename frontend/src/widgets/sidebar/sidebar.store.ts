/**
 * Sidebar State Store
 * @module widgets/sidebar
 *
 * Pinned-by-default avec persistence localStorage. L'utilisateur clique sur
 * le bouton de toggle pour basculer entre `expanded` (240px) et `collapsed` (64px) ;
 * l'état est conservé entre les sessions.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
    isOpen: boolean;
    toggle: () => void;
    open: () => void;
    close: () => void;
}

export const useSidebarStore = create<SidebarState>()(
    persist(
        (set) => ({
            isOpen: true,
            toggle: () => set((state) => ({ isOpen: !state.isOpen })),
            open: () => set({ isOpen: true }),
            close: () => set({ isOpen: false }),
        }),
        { name: 'sidebar-state' },
    ),
);
