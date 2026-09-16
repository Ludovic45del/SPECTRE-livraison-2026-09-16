/**
 * Pièces jointes — validation côté client et helpers d'affichage.
 * @module entities/messaging/lib
 *
 * Les règles (nombre, taille, extensions) reflètent celles du backend
 * (`app/domain/messaging/constants.py`) : la validation côté client évite un
 * aller-retour inutile mais le serveur reste l'autorité.
 */

import {
    ALLOWED_ATTACHMENT_EXTENSIONS,
    IMAGE_ATTACHMENT_EXTENSIONS,
    MAX_ATTACHMENTS_PER_MESSAGE,
    MAX_ATTACHMENT_SIZE_BYTES,
} from '../model/messaging.constants';

/** Sous-ensemble de `File` suffisant pour la validation (facilite les tests et les objets « file-like »). */
export interface AttachmentFileLike {
    name: string;
    size: number;
}

/** Extension d'un nom de fichier, en minuscules et sans point ('' si absente : `README`, `.env`, `archive.`). */
export function getFileExtension(name: string): string {
    const base = name.split(/[\\/]/).pop() ?? '';
    const dot = base.lastIndexOf('.');
    if (dot <= 0 || dot === base.length - 1) return '';
    return base.slice(dot + 1).toLowerCase();
}

/** Le fichier est-il une image affichable en vignette (même règle que `is_image` côté backend) ? */
export function isImageFile(file: AttachmentFileLike | string): boolean {
    const name = typeof file === 'string' ? file : file.name;
    return (IMAGE_ATTACHMENT_EXTENSIONS as readonly string[]).includes(getFileExtension(name));
}

/** Taille lisible en français : « 512 o », « 12 Ko », « 1,2 Mo », « 2 Go ». */
export function formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return '0 o';
    if (bytes < 1024) return `${Math.round(bytes)} o`;
    const units = ['Ko', 'Mo', 'Go'];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    // Une décimale sous 10 (« 1,2 Mo »), aucune au-delà (« 12 Ko ») — sans « ,0 » parasite.
    const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
    return `${String(rounded).replace('.', ',')} ${units[unitIndex]}`;
}

/** Résultat de `validateAttachmentFiles` : fichiers acceptés dans l'ordre + messages d'erreur (FR). */
export interface AttachmentValidationResult {
    accepted: File[];
    errors: string[];
}

const ALLOWED_EXTENSIONS_LABEL = ALLOWED_ATTACHMENT_EXTENSIONS.join(', ');

/**
 * Filtre des fichiers à joindre : extension autorisée, taille ≤ 10 Mo, nom non
 * vide, et plafond de `MAX_ATTACHMENTS_PER_MESSAGE` en comptant les
 * `existingCount` fichiers déjà en attente. Les fichiers refusés produisent un
 * message chacun ; le dépassement du plafond un seul message (les fichiers en
 * trop sont ignorés, les premiers conservés).
 */
export function validateAttachmentFiles(files: File[], existingCount: number): AttachmentValidationResult {
    const accepted: File[] = [];
    const errors: string[] = [];
    let remaining = Math.max(0, MAX_ATTACHMENTS_PER_MESSAGE - Math.max(0, existingCount));
    let overflow = false;

    for (const file of files) {
        const name = file.name.trim();
        if (!name) {
            errors.push('Un fichier sans nom a été ignoré');
            continue;
        }
        const extension = getFileExtension(name);
        if (!(ALLOWED_ATTACHMENT_EXTENSIONS as readonly string[]).includes(extension)) {
            errors.push(
                `« ${name} » : type de fichier non autorisé (extensions acceptées : ${ALLOWED_EXTENSIONS_LABEL})`,
            );
            continue;
        }
        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
            errors.push(
                `« ${name} » : fichier trop volumineux (${formatFileSize(file.size)}, maximum ${formatFileSize(
                    MAX_ATTACHMENT_SIZE_BYTES,
                )})`,
            );
            continue;
        }
        if (remaining === 0) {
            overflow = true;
            continue;
        }
        accepted.push(file);
        remaining -= 1;
    }

    if (overflow) {
        errors.push(`Nombre maximal de pièces jointes atteint (${MAX_ATTACHMENTS_PER_MESSAGE} par message)`);
    }
    return { accepted, errors };
}
