/**
 * Tests des helpers de la liste des FSECs (enrichissement, filtre, tri).
 * @module pages/fsecs/fsec-list-utils
 */
import { describe, it, expect } from 'vitest';
import type { Fsec } from '@entities/fsec';
import { sortFsecs, type FsecWithCampaign } from './fsec-list-utils';

const baseFsec: Fsec = {
    slug: 'fsec-test',
    campaignSlug: null,
    fsecUuid: '00000000-0000-0000-0000-000000000002',
    versionUuid: '00000000-0000-0000-0000-000000000001',
    name: 'FSEC',
    displayName: 'FSEC',
    campaignId: null,
    statusId: 0,
    categoryId: 0,
    rackId: null,
    comments: null,
    isActive: true,
    deliveryDate: null,
    shootingDate: null,
    preshootingPressure: null,
    experienceSrxx: null,
    localisation: null,
    depressurizationFailed: null,
    overviewImage: null,
    assemblyPlanImage: null,
    assemblyPlanAnnotations: [],
    alignmentFileLink: null,
    fdieLink: null,
    deliveryValidation: null,
    deliveryRemarques: null,
    deliveryValidatedByUsername: null,
    deliveryValidatedAt: null,
    requestedViews: null,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    lastUpdated: new Date('2025-01-15T10:00:00Z'),
};

const makeFsec = (name: string, statusId: number | null): FsecWithCampaign => ({
    ...baseFsec,
    name,
    displayName: name,
    statusId,
    campaignIndex: 0,
});

describe('sortFsecs — colonne statut', () => {
    // Ids non monotones : 16 (Vérification scellement) entre 3 et 4, gaz 9..14 entre 4 et 5.
    const fsecs = [
        makeFsec('tiree', 7),
        makeFsec('verif-scellement', 16),
        makeFsec('etancheite', 10),
        makeFsec('scellement', 3),
        makeFsec('hs', 8),
        makeFsec('photos', 4),
        makeFsec('disponible', 5),
        makeFsec('sans-statut', null),
    ];

    it('trie par rang de workflow croissant (16 entre Scellement et Photos, gaz avant Disponible)', () => {
        expect(sortFsecs(fsecs, 'status', 'asc').map((f) => f.name)).toEqual([
            'sans-statut',
            'scellement',
            'verif-scellement',
            'photos',
            'etancheite',
            'disponible',
            'tiree',
            'hs',
        ]);
    });

    it('inverse l’ordre en tri décroissant sans muter la liste source', () => {
        const before = fsecs.map((f) => f.name);
        expect(sortFsecs(fsecs, 'status', 'desc').map((f) => f.name)).toEqual([
            'hs',
            'tiree',
            'disponible',
            'etancheite',
            'photos',
            'verif-scellement',
            'scellement',
            'sans-statut',
        ]);
        expect(fsecs.map((f) => f.name)).toEqual(before);
    });
});
