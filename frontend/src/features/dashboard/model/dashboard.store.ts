/**
 * Dashboard edit mode store.
 * @module features/dashboard/model
 */

import { create } from 'zustand';
import type { DashboardPreferences } from '@entities/dashboard-preferences';

interface DashboardState {
    isEditMode: boolean;
    /** Snapshot of preferences when edit mode was entered (for cancel/revert). */
    snapshotPrefs: DashboardPreferences | null;
    /** Local draft of preferences being edited (not yet persisted). */
    draftPrefs: DashboardPreferences | null;
    enterEditMode: (currentPrefs: DashboardPreferences) => void;
    exitEditMode: () => void;
    updateDraft: (updater: (draft: DashboardPreferences) => DashboardPreferences) => void;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
    isEditMode: false,
    snapshotPrefs: null,
    draftPrefs: null,
    enterEditMode: (currentPrefs) =>
        set({
            isEditMode: true,
            snapshotPrefs: structuredClone(currentPrefs),
            draftPrefs: structuredClone(currentPrefs),
        }),
    exitEditMode: () => set({ isEditMode: false, snapshotPrefs: null, draftPrefs: null }),
    updateDraft: (updater) =>
        set((state) => ({
            draftPrefs: state.draftPrefs ? updater(state.draftPrefs) : null,
        })),
}));
