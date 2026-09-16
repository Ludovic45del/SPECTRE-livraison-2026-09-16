import { ApiError } from '@shared/api';

/**
 * Extract a user-friendly error message from an API error (EB-3 fix).
 */
export function getErrorMessage(error: unknown, fallback = 'Une erreur est survenue'): string {
    if (error instanceof ApiError) {
        const data = error.data as Record<string, unknown> | undefined;

        // Erreurs de validation métier (ValidationException → code VALIDATION_ERROR*) :
        // le message serveur est actionnable et sûr (instruction utilisateur, pas
        // de fuite de schéma, contrairement à InvalidDataException/INVALID_DATA qui
        // sérialise des erreurs de formulaire). On l'affiche tel quel.
        const code = typeof data?.code === 'string' ? data.code : '';
        if (code.startsWith('VALIDATION_ERROR')) {
            const message = data?.error ?? data?.detail;
            if (typeof message === 'string' && message.trim()) return message;
        }

        // Format natif DRF (auth/permissions) : `detail` est un message lisible.
        const detail = data?.detail;
        if (typeof detail === 'string') return detail;

        switch (error.status) {
            case 400:
                return 'Données invalides. Vérifiez les champs du formulaire.';
            case 403:
                return 'Accès non autorisé.';
            case 404:
                return 'Ressource introuvable.';
            case 409:
                return 'Conflit : cette donnée existe déjà.';
            case 422:
                return 'Données invalides.';
            case 500:
                return 'Erreur serveur. Veuillez réessayer.';
            default:
                return fallback;
        }
    }
    if (error instanceof Error) {
        return error.message;
    }
    return fallback;
}
