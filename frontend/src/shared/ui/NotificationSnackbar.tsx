/**
 * Notification Snackbar Component
 * @module shared/ui/NotificationSnackbar
 */

import { Snackbar, Alert } from '@mui/material';
import { useNotificationStore } from '../lib/notification';

export function NotificationSnackbar() {
    const { notifications, removeNotification } = useNotificationStore();

    return (
        <>
            {notifications.map((notification, index) => (
                <Snackbar
                    key={notification.id}
                    open={true}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    sx={{ bottom: { xs: 90 + index * 60, sm: 24 + index * 60 } }}
                >
                    <Alert
                        severity={notification.type}
                        onClose={() => removeNotification(notification.id)}
                        sx={{ width: '100%' }}
                    >
                        {notification.message}
                    </Alert>
                </Snackbar>
            ))}
        </>
    );
}
