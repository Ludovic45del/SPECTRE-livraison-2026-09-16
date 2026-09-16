/**
 * Tests des helpers de pièces jointes : extension, image, taille lisible et
 * validation côté client (nombre, taille, extension — messages FR).
 * @module entities/messaging/lib
 */

import { describe, it, expect } from 'vitest';
import { formatFileSize, getFileExtension, isImageFile, validateAttachmentFiles } from './attachments';
import { MAX_ATTACHMENTS_PER_MESSAGE, MAX_ATTACHMENT_SIZE_BYTES } from '../model/messaging.constants';

/** Fichier de test de taille donnée (contenu non alloué au-delà : `size` seul compte pour la validation). */
const file = (name: string, size = 10, type = 'application/octet-stream'): File => {
    const f = new File([new Uint8Array(Math.min(size, 16))], name, { type });
    if (size > 16) Object.defineProperty(f, 'size', { value: size });
    return f;
};

describe('getFileExtension', () => {
    it('renvoie l’extension en minuscules sans point', () => {
        expect(getFileExtension('rapport.PDF')).toBe('pdf');
        expect(getFileExtension('photo.essai.JPG')).toBe('jpg');
        expect(getFileExtension('C:\\dossier\\fichier.xlsx')).toBe('xlsx');
        expect(getFileExtension('/tmp/archive.zip')).toBe('zip');
    });

    it('renvoie une chaîne vide sans extension (nom nu, fichier caché, point final, dossier avec point)', () => {
        expect(getFileExtension('README')).toBe('');
        expect(getFileExtension('.env')).toBe('');
        expect(getFileExtension('archive.')).toBe('');
        expect(getFileExtension('dossier.v2/fichier')).toBe('');
        expect(getFileExtension('')).toBe('');
    });
});

describe('isImageFile', () => {
    it('reconnaît les images par extension (insensible à la casse), depuis un File ou un nom', () => {
        expect(isImageFile(file('photo.PNG'))).toBe(true);
        expect(isImageFile(file('photo.jpeg'))).toBe(true);
        expect(isImageFile('anim.gif')).toBe(true);
        expect(isImageFile('image.webp')).toBe(true);
    });

    it('refuse les autres types, même avec un content-type image', () => {
        expect(isImageFile(file('rapport.pdf', 10, 'image/png'))).toBe(false);
        expect(isImageFile('photo.svg')).toBe(false);
        expect(isImageFile('sans-extension')).toBe(false);
    });
});

describe('formatFileSize', () => {
    it('formate en octets, Ko, Mo, Go avec virgule décimale', () => {
        expect(formatFileSize(0)).toBe('0 o');
        expect(formatFileSize(512)).toBe('512 o');
        expect(formatFileSize(1023)).toBe('1023 o');
        expect(formatFileSize(1024)).toBe('1 Ko');
        expect(formatFileSize(1536)).toBe('1,5 Ko');
        expect(formatFileSize(12 * 1024)).toBe('12 Ko');
        expect(formatFileSize(1.2 * 1024 * 1024)).toBe('1,2 Mo');
        expect(formatFileSize(10 * 1024 * 1024)).toBe('10 Mo');
        expect(formatFileSize(2 * 1024 ** 3)).toBe('2 Go');
    });

    it('n’affiche pas de « ,0 » et arrondit correctement', () => {
        expect(formatFileSize(2048)).toBe('2 Ko');
        expect(formatFileSize(9.96 * 1024)).toBe('10 Ko');
        expect(formatFileSize(1500 * 1024)).toBe('1,5 Mo');
    });

    it('reste borné : au-delà du Go et valeurs invalides', () => {
        expect(formatFileSize(3000 * 1024 ** 3)).toBe('3000 Go');
        expect(formatFileSize(-5)).toBe('0 o');
        expect(formatFileSize(Number.NaN)).toBe('0 o');
    });
});

describe('validateAttachmentFiles', () => {
    it('accepte des fichiers valides dans l’ordre, sans erreur', () => {
        const files = [file('photo.jpg'), file('Rapport.PDF'), file('data.csv')];
        expect(validateAttachmentFiles(files, 0)).toEqual({ accepted: files, errors: [] });
    });

    it('refuse une extension non autorisée (message FR avec la liste) et garde les autres', () => {
        const ok = file('note.txt');
        const { accepted, errors } = validateAttachmentFiles([file('virus.exe'), ok, file('sans-extension')], 0);
        expect(accepted).toEqual([ok]);
        expect(errors).toHaveLength(2);
        expect(errors[0]).toContain('« virus.exe »');
        expect(errors[0]).toContain('type de fichier non autorisé');
        expect(errors[0]).toContain('jpg, jpeg, png');
        expect(errors[1]).toContain('« sans-extension »');
    });

    it('refuse un fichier de plus de 10 Mo (taille lisible dans le message) et accepte 10 Mo pile', () => {
        const limit = file('limite.zip', MAX_ATTACHMENT_SIZE_BYTES);
        const tooBig = file('gros.zip', MAX_ATTACHMENT_SIZE_BYTES + 1);
        const { accepted, errors } = validateAttachmentFiles([limit, tooBig], 0);
        expect(accepted).toEqual([limit]);
        expect(errors).toEqual([
            expect.stringContaining('« gros.zip » : fichier trop volumineux (10 Mo, maximum 10 Mo)'),
        ]);
    });

    it('ignore un fichier sans nom avec un message dédié', () => {
        const { accepted, errors } = validateAttachmentFiles([file('  ')], 0);
        expect(accepted).toEqual([]);
        expect(errors).toEqual(['Un fichier sans nom a été ignoré']);
    });

    it('applique le plafond de 5 en comptant les fichiers déjà en attente (un seul message d’erreur)', () => {
        const files = Array.from({ length: 4 }, (_, i) => file(`f${i}.png`));
        const { accepted, errors } = validateAttachmentFiles(files, 3);
        expect(accepted).toEqual(files.slice(0, 2));
        expect(errors).toEqual([
            `Nombre maximal de pièces jointes atteint (${MAX_ATTACHMENTS_PER_MESSAGE} par message)`,
        ]);
    });

    it('n’accepte rien quand le plafond est déjà atteint ou dépassé, sans erreur si aucun fichier', () => {
        expect(validateAttachmentFiles([file('a.png')], 5).accepted).toEqual([]);
        expect(validateAttachmentFiles([file('a.png')], 7).errors).toHaveLength(1);
        expect(validateAttachmentFiles([], 5)).toEqual({ accepted: [], errors: [] });
    });

    it('ne compte pas les fichiers refusés dans le plafond', () => {
        const files = [file('bad.exe'), ...Array.from({ length: 5 }, (_, i) => file(`ok${i}.pdf`))];
        const { accepted, errors } = validateAttachmentFiles(files, 0);
        expect(accepted).toHaveLength(5);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('bad.exe');
    });
});
