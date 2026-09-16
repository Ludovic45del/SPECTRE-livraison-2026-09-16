import { useCallback } from 'react';
import { useNotificationStore } from './notification';
import { getErrorMessage } from './error-utils';

interface UseModalSubmitOptions<TResult> {
    successMessage: string | ((result: TResult) => string);
    errorMessage: string;
    onSuccess?: (result: TResult) => void;
}

export function useModalSubmit<TData, TResult>(
    mutateAsync: (data: TData) => Promise<TResult>,
    options: UseModalSubmitOptions<TResult>,
) {
    const showNotification = useNotificationStore((s) => s.showNotification);

    return useCallback(
        async (data: TData): Promise<TResult | undefined> => {
            try {
                const result = await mutateAsync(data);
                const msg =
                    typeof options.successMessage === 'function'
                        ? options.successMessage(result)
                        : options.successMessage;
                showNotification(msg, 'success');
                options.onSuccess?.(result);
                return result;
            } catch (err: unknown) {
                showNotification(getErrorMessage(err, options.errorMessage), 'error');
                return undefined;
            }
        },
        [mutateAsync, options, showNotification],
    );
}
