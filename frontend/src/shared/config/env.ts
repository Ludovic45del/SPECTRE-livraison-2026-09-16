/**
 * Variables d'environnement applicatives, centralisées et typées.
 * @module shared/config/env
 *
 * Source unique pour lire `import.meta.env.*` : évite d'éparpiller les accès
 * Vite dans le code et documente chaque variable + sa valeur par défaut.
 */

export const ENV = {
    /**
     * Racine UNC du partage réseau où sont rangées les photos FSEC.
     * Sert à construire le lien « Ouvrir le dossier photo » de l'onglet Vue/Photo.
     * Modifiable sans toucher au code via la variable d'env VITE_PHOTO_FOLDER_ROOT
     * (sinon la valeur par défaut ci-dessous est utilisée). Ex : \\serveur\photos
     */
    PHOTO_FOLDER_ROOT: import.meta.env.VITE_PHOTO_FOLDER_ROOT || '\\\\serveur\\photos',
} as const;
