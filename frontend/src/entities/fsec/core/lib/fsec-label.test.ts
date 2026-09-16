/**
 * Libellés d'affichage des FSEC : nom complet calculé par le backend.
 */
import { describe, expect, it } from 'vitest';

import { FsecSchema, type Fsec } from '../model/fsec.schema';
import { formatFsecCampaignPrefix, formatFsecOptionLabel, type FsecCampaignContext } from './fsec-label';

const CAMPAIGN_UUID = '00000000-0000-4000-8000-000000000001';

const campaign: FsecCampaignContext = {
    uuid: CAMPAIGN_UUID,
    year: 2026,
    name: 'gorfou',
    installation: { label: 'LMJ' },
};

const buildFsec = (overrides: Partial<Fsec> = {}): Fsec => ({
    ...FsecSchema.parse({
        version_uuid: '10000000-0000-4000-8000-000000000001',
        fsec_uuid: '20000000-0000-4000-8000-000000000001',
        campaign_id: CAMPAIGN_UUID,
        status_id: 0,
        category_id: 0,
        rack_id: null,
        name: '2',
        display_name: '2026-LMJ_gorfou_2',
        comments: null,
        last_updated: null,
        is_active: true,
        created_at: null,
        delivery_date: null,
        shooting_date: null,
        preshooting_pressure: null,
        experience_srxx: null,
        localisation: null,
        depressurization_failed: null,
    }),
    ...overrides,
});

describe('formatFsecCampaignPrefix', () => {
    it('suit la convention « {year}-{installation}_{name} »', () => {
        expect(formatFsecCampaignPrefix(campaign)).toBe('2026-LMJ_gorfou');
    });

    it('retombe sur UNK sans installation (aligné backend)', () => {
        expect(formatFsecCampaignPrefix({ ...campaign, installation: null })).toBe('2026-UNK_gorfou');
        expect(formatFsecCampaignPrefix({ ...campaign, installation: undefined })).toBe('2026-UNK_gorfou');
    });
});

describe('formatFsecOptionLabel', () => {
    it('renvoie le nom complet calculé par le backend', () => {
        expect(formatFsecOptionLabel(buildFsec())).toBe('2026-LMJ_gorfou_2');
    });

    it('retombe sur le nom court si le nom complet est vide', () => {
        expect(formatFsecOptionLabel(buildFsec({ displayName: '' }))).toBe('2');
    });

    it('ne tronque jamais un nom long', () => {
        const longName = 'X'.repeat(80);
        expect(formatFsecOptionLabel(buildFsec({ displayName: longName }))).toBe(longName);
    });
});

describe('FsecSchema.displayName', () => {
    it("retombe sur `name` quand l'API ne fournit pas display_name (payload ancien)", () => {
        const fsec = buildFsec();
        const parsed = FsecSchema.parse({
            version_uuid: fsec.versionUuid,
            fsec_uuid: fsec.fsecUuid,
            campaign_id: CAMPAIGN_UUID,
            status_id: 0,
            category_id: 0,
            rack_id: null,
            name: '2',
            comments: null,
            last_updated: null,
            is_active: true,
            created_at: null,
            delivery_date: null,
            shooting_date: null,
            preshooting_pressure: null,
            experience_srxx: null,
            localisation: null,
            depressurization_failed: null,
        });
        expect(parsed.displayName).toBe('2');
    });
});
