import { describe, it, expect } from 'vitest';
import { paths } from './paths';

describe('paths', () => {
    it('builds list paths', () => {
        expect(paths.campaigns).toBe('/campagnes');
        expect(paths.fsecs).toBe('/fsecs');
        expect(paths.fas).toBe('/fas');
        expect(paths.embases).toBe('/embases');
    });

    it('builds detail roots from slug', () => {
        expect(paths.campaign.root('2024-s1-lmj-essai')).toBe('/campagne-details/2024-s1-lmj-essai');
        expect(paths.fsec.root('2024-s1-lmj-essai-joint')).toBe('/fsec-details/2024-s1-lmj-essai-joint');
        expect(paths.fa.root('fa-2024-0042')).toBe('/fa-details/fa-2024-0042');
        expect(paths.embase.root('g01')).toBe('/embase-details/g01');
    });

    it('builds tab paths with default and explicit tabs', () => {
        expect(paths.campaign.tab('essai')).toBe('/campagne-details/essai/overview');
        expect(paths.campaign.tab('essai', 'documents')).toBe('/campagne-details/essai/documents');
        expect(paths.fa.tab('fa-1', 'phase1')).toBe('/fa-details/fa-1/phase1');
        expect(paths.embase.tab('g01', 'etalonnage')).toBe('/embase-details/g01/etalonnage');
    });

    it('URL-encodes slugs defensively', () => {
        expect(paths.campaign.root('a/b c')).toBe('/campagne-details/a%2Fb%20c');
    });
});
