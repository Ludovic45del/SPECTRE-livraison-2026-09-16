/**
 * Tests Zod pour le schema Indicators.
 *
 * L'entrée des tests est en snake_case (forme brute API). La sortie du schema
 * domaine est attendue en camelCase grâce à la transformation Zod.
 * @module entities/indicators/model
 */

import { describe, expect, it } from 'vitest';
import { IndicatorsSchema } from './indicators.schema';

const validPayload = {
    year: 2026,
    fa: {
        total_created_in_year: 5,
        by_status: { '0': 2, '1': 1, '2': 2 },
        by_criticality: { '1': 3 },
        by_discovery_step: { '3': 2 },
        open_stock_all_years: 7,
        avg_event_to_open_days: 1.5,
        avg_open_to_closure_days: 7.0,
        avg_total_lifecycle_days: 8.5,
        created_per_month: { '2026-01': 1, '2026-02': 4 },
    },
    fsec: {
        total_created_in_year: 10,
        total_shot_in_year: 3,
        by_status: { '7': 3, '5': 7 },
        by_category: { '0': 6, '1': 4 },
        avg_cycle_time_days: 42.0,
        median_cycle_time_days: 40.0,
        shot_per_month: { '2026-01': 1, '2026-02': 2 },
    },
    campaign: {
        total_in_period: 3,
        by_status: { '2': 2, '3': 1 },
        by_type: { '0': 2, '1': 1 },
        by_installation: { '0': 2, '1': 1 },
        total_fsec: 20,
        total_fsec_shot: 7,
        avg_fsec_per_campaign: 6.67,
        avg_duration_days: 42.0,
        started_per_month: { '2026-01': 1, '2026-02': 2 },
        top_by_volume: [{ uuid: 'c1', name: 'Campagne 1', fsec_count: 12 }],
    },
    step_durations: [
        {
            key: 'assembly_to_metrology',
            label: 'Assemblage → Métrologie',
            count: 3,
            avg_days: 4.5,
            median_days: 4.0,
            min_days: 1.0,
            max_days: 8.0,
            is_gas: false,
        },
    ],
    bottleneck_step_key: 'assembly_to_metrology',
};

describe('IndicatorsSchema', () => {
    it('parses a valid payload and transforms to camelCase', () => {
        const parsed = IndicatorsSchema.parse(validPayload);
        expect(parsed.year).toBe(2026);
        expect(parsed.fa.totalCreatedInYear).toBe(5);
        expect(parsed.fa.byStatus).toEqual({ '0': 2, '1': 1, '2': 2 });
        expect(parsed.fa.openStockAllYears).toBe(7);
        expect(parsed.fa.createdPerMonth).toEqual({ '2026-01': 1, '2026-02': 4 });
        expect(parsed.fsec.totalShotInYear).toBe(3);
        expect(parsed.fsec.shotPerMonth).toEqual({ '2026-01': 1, '2026-02': 2 });
        expect(parsed.campaign.totalInPeriod).toBe(3);
        expect(parsed.campaign.byStatus).toEqual({ '2': 2, '3': 1 });
        expect(parsed.campaign.byType).toEqual({ '0': 2, '1': 1 });
        expect(parsed.campaign.totalFsec).toBe(20);
        expect(parsed.campaign.avgFsecPerCampaign).toBe(6.67);
        expect(parsed.campaign.avgDurationDays).toBe(42.0);
        expect(parsed.campaign.topByVolume).toHaveLength(1);
        expect(parsed.campaign.topByVolume[0].fsecCount).toBe(12);
        expect(parsed.campaign.startedPerMonth).toEqual({ '2026-01': 1, '2026-02': 2 });
        expect(parsed.stepDurations).toHaveLength(1);
        expect(parsed.stepDurations[0].avgDays).toBe(4.5);
        expect(parsed.stepDurations[0].isGas).toBe(false);
        expect(parsed.bottleneckStepKey).toBe('assembly_to_metrology');
    });

    it('allows null avg/median in step_durations', () => {
        const payload = {
            ...validPayload,
            step_durations: [
                {
                    key: 'k',
                    label: 'l',
                    count: 0,
                    avg_days: null,
                    median_days: null,
                    min_days: null,
                    max_days: null,
                    is_gas: false,
                },
            ],
        };
        const parsed = IndicatorsSchema.parse(payload);
        expect(parsed.stepDurations[0].avgDays).toBeNull();
        expect(parsed.stepDurations[0].minDays).toBeNull();
    });

    it('allows null bottleneck_step_key', () => {
        const payload = { ...validPayload, bottleneck_step_key: null };
        const parsed = IndicatorsSchema.parse(payload);
        expect(parsed.bottleneckStepKey).toBeNull();
    });

    it('rejects negative counts', () => {
        const payload = {
            ...validPayload,
            fa: { ...validPayload.fa, total_created_in_year: -1 },
        };
        expect(() => IndicatorsSchema.parse(payload)).toThrow();
    });
});
