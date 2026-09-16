/**
 * Tests des schémas Zod LabContact — transformation snake_case → camelCase
 * et validation du formulaire (messages FR, normalisation trim).
 */
import { describe, expect, it } from 'vitest';
import {
    LAB_CONTACT_NAME_MAX_LENGTH,
    LAB_CONTACT_PHONE_MAX_LENGTH,
    LabContactInputSchema,
    LabContactListSchema,
    LabContactSchema,
    labContactInputToApi,
} from './lab-contact.schema';

const API_CONTACT = {
    uuid: '77777777-7777-4777-8777-777777777777',
    name: 'Labo 426',
    phone: '426',
    comment: 'Salle blanche',
    created_at: '2026-08-30T10:00:00Z',
    updated_at: '2026-08-30T10:00:00Z',
};

describe('LabContactSchema', () => {
    it('transforme la réponse API en camelCase', () => {
        const result = LabContactSchema.parse(API_CONTACT);

        expect(result).toEqual({
            uuid: API_CONTACT.uuid,
            name: 'Labo 426',
            phone: '426',
            comment: 'Salle blanche',
            createdAt: '2026-08-30T10:00:00Z',
            updatedAt: '2026-08-30T10:00:00Z',
        });
    });

    it('tolère phone / comment absents ou null (→ chaîne vide)', () => {
        const result = LabContactSchema.parse({
            uuid: API_CONTACT.uuid,
            name: 'Accueil',
            phone: null,
            created_at: null,
            updated_at: null,
        });

        expect(result.phone).toBe('');
        expect(result.comment).toBe('');
        expect(result.createdAt).toBeNull();
    });

    it('rejette un uuid invalide', () => {
        expect(() => LabContactSchema.parse({ ...API_CONTACT, uuid: 'not-a-uuid' })).toThrow();
    });

    it('parse une liste', () => {
        const result = LabContactListSchema.parse([API_CONTACT, { ...API_CONTACT, name: 'Labo 215' }]);
        expect(result).toHaveLength(2);
        expect(result[1].name).toBe('Labo 215');
    });
});

describe('LabContactInputSchema', () => {
    it('accepte un nom seul (phone / comment vides)', () => {
        const result = LabContactInputSchema.parse({ name: 'Gardiennage', phone: '', comment: '' });
        expect(result).toEqual({ name: 'Gardiennage', phone: '', comment: '' });
    });

    it('normalise les espaces parasites (trim)', () => {
        const result = LabContactInputSchema.parse({ name: '  Labo 215 ', phone: ' 215 ', comment: ' note ' });
        expect(result).toEqual({ name: 'Labo 215', phone: '215', comment: 'note' });
    });

    it('refuse un nom vide ou blanc avec un message FR', () => {
        const result = LabContactInputSchema.safeParse({ name: '   ', phone: '', comment: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Le nom est requis');
        }
    });

    it('refuse un nom trop long', () => {
        const result = LabContactInputSchema.safeParse({
            name: 'x'.repeat(LAB_CONTACT_NAME_MAX_LENGTH + 1),
            phone: '',
            comment: '',
        });
        expect(result.success).toBe(false);
    });

    it('refuse un téléphone trop long', () => {
        const result = LabContactInputSchema.safeParse({
            name: 'Labo',
            phone: '9'.repeat(LAB_CONTACT_PHONE_MAX_LENGTH + 1),
            comment: '',
        });
        expect(result.success).toBe(false);
    });
});

describe('labContactInputToApi', () => {
    it('produit le payload snake_case attendu par le backend', () => {
        expect(labContactInputToApi({ name: 'Labo 426', phone: '426', comment: '' })).toEqual({
            name: 'Labo 426',
            phone: '426',
            comment: '',
        });
    });
});
