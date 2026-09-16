/**
 * Entity Ref Paths Tests — chemin de fiche par type, null si supprimée / sans slug.
 * @module entities/messaging/lib
 */

import { describe, it, expect } from 'vitest';
import { EntityRefSchema, type EntityRef } from '../model';
import { getEntityRefPath } from './entity-ref-paths';
import { createMockEntityRef } from '@test/mocks/messaging-handlers';

const FSEC_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001';

const ref = (overrides: Record<string, unknown> = {}): EntityRef =>
    EntityRefSchema.parse(createMockEntityRef({ entity_uuid: FSEC_UUID, ...overrides }));

describe('getEntityRefPath', () => {
    it('pointe vers la fiche FSEC par slug', () => {
        expect(getEntityRefPath(ref({ entity_type: 'fsec', slug: '2026-s1-lmj-campagne-fsec-12' }))).toBe(
            '/fsec-details/2026-s1-lmj-campagne-fsec-12',
        );
    });

    it('pointe vers la fiche campagne par slug', () => {
        expect(getEntityRefPath(ref({ entity_type: 'campaign', slug: '2026-s1-lmj-campagne' }))).toBe(
            '/campagne-details/2026-s1-lmj-campagne',
        );
    });

    it('pointe vers la fiche FA par slug', () => {
        expect(getEntityRefPath(ref({ entity_type: 'fa', slug: 'fa-2026-001' }))).toBe('/fa-details/fa-2026-001');
    });

    it('encode le slug dans l’URL', () => {
        expect(getEntityRefPath(ref({ entity_type: 'fa', slug: 'fa 2026/001' }))).toBe('/fa-details/fa%202026%2F001');
    });

    it('renvoie null pour une entité supprimée (exists = false)', () => {
        expect(getEntityRefPath(ref({ exists: false, slug: null }))).toBeNull();
        // Sécurité : même avec un slug résiduel, une entité supprimée n'est pas cliquable.
        expect(getEntityRefPath(ref({ exists: false, slug: 'fsec-12' }))).toBeNull();
    });

    it('renvoie null sans slug (entité existante mais non adressable)', () => {
        expect(getEntityRefPath(ref({ exists: true, slug: null }))).toBeNull();
        expect(getEntityRefPath(ref({ exists: true, slug: '' }))).toBeNull();
    });
});
