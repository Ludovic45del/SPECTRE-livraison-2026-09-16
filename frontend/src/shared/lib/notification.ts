/**
 * Notification Store - Global Snackbar State
 * @module shared/lib/notification
 *
 * Per Code_Cleanup_Guidelines.md: Replace console.log/alert with global notification
 */

import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
    autoHideDuration?: number;
}

interface NotificationState {
    notifications: Notification[];

    // Actions
    showNotification: (message: string, type?: NotificationType, duration?: number) => void;
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showWarning: (message: string) => void;
    showInfo: (message: string) => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

let notificationId = 0;
const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

const DEFAULT_DURATIONS: Record<NotificationType, number> = {
    success: 4000,
    error: 8000,
    warning: 6000,
    info: 5000,
};

export const useNotificationStore = create<NotificationState>((set) => {
    const show = (message: string, type: NotificationType, duration: number) => {
        const id = `notification-${++notificationId}`;
        set((state) => ({
            notifications: [...state.notifications, { id, message, type, autoHideDuration: duration }],
        }));

        if (duration > 0) {
            const timer = setTimeout(() => {
                activeTimers.delete(id);
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id),
                }));
            }, duration);
            activeTimers.set(id, timer);
        }
    };

    return {
        notifications: [],

        showNotification: (message, type = 'info', duration = DEFAULT_DURATIONS.info) => show(message, type, duration),

        showSuccess: (message) => show(message, 'success', DEFAULT_DURATIONS.success),
        showError: (message) => show(message, 'error', DEFAULT_DURATIONS.error),
        showWarning: (message) => show(message, 'warning', DEFAULT_DURATIONS.warning),
        showInfo: (message) => show(message, 'info', DEFAULT_DURATIONS.info),

        removeNotification: (id) => {
            const timer = activeTimers.get(id);
            if (timer) {
                clearTimeout(timer);
                activeTimers.delete(id);
            }
            set((state) => ({
                notifications: state.notifications.filter((n) => n.id !== id),
            }));
        },

        clearAll: () => {
            activeTimers.forEach((timer) => clearTimeout(timer));
            activeTimers.clear();
            set({ notifications: [] });
        },
    };
});

/**
 * Hook for components to trigger notifications
 */
export function useNotification() {
    const showNotification = useNotificationStore((state) => state.showNotification);
    const showSuccess = useNotificationStore((state) => state.showSuccess);
    const showError = useNotificationStore((state) => state.showError);
    const showWarning = useNotificationStore((state) => state.showWarning);
    const showInfo = useNotificationStore((state) => state.showInfo);

    return {
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
    };
}
