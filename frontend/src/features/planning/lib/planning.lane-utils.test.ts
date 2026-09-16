/**
 * Tests for lane packing (vue couloirs campagne).
 */
import { describe, it, expect } from 'vitest';
import type { PlanningCampaignStep } from '@entities/planning/core/model/planning.schema';
import { assignLanes, laneRowHeight, LANE_HEIGHT, LANE_ROW_VPAD } from './planning.lane-utils';

let counter = 0;
function step(startDate: string | null, endDate: string | null): PlanningCampaignStep {
    counter += 1;
    return {
        uuid: `step-${counter}`,
        campaignUuid: 'camp',
        fsecUuid: `fsec-${counter}`,
        stepLabel: 'Assemblage',
        year: 2025,
        startDate,
        endDate,
    };
}

describe('assignLanes', () => {
    it('returns 1 lane for an empty list', () => {
        const { laneByStep, laneCount } = assignLanes([]);
        expect(laneCount).toBe(1);
        expect(laneByStep.size).toBe(0);
    });

    it('places a single step on lane 0', () => {
        const s = step('2025-03-01', '2025-03-05');
        const { laneByStep, laneCount } = assignLanes([s]);
        expect(laneCount).toBe(1);
        expect(laneByStep.get(s.uuid)).toBe(0);
    });

    it('keeps non-overlapping steps on the same lane', () => {
        const a = step('2025-03-01', '2025-03-05');
        const b = step('2025-03-06', '2025-03-10');
        const { laneByStep, laneCount } = assignLanes([a, b]);
        expect(laneCount).toBe(1);
        expect(laneByStep.get(a.uuid)).toBe(0);
        expect(laneByStep.get(b.uuid)).toBe(0);
    });

    it('pushes overlapping steps onto separate lanes', () => {
        const a = step('2025-03-01', '2025-03-10');
        const b = step('2025-03-05', '2025-03-15');
        const { laneByStep, laneCount } = assignLanes([a, b]);
        expect(laneCount).toBe(2);
        expect(laneByStep.get(a.uuid)).toBe(0);
        expect(laneByStep.get(b.uuid)).toBe(1);
    });

    it('reuses a freed lane once a step has ended', () => {
        const a = step('2025-03-01', '2025-03-10');
        const b = step('2025-03-05', '2025-03-15');
        const c = step('2025-03-12', '2025-03-20');
        const { laneByStep, laneCount } = assignLanes([a, b, c]);
        // c starts after a ends → reuses lane 0; b still occupies lane 1.
        expect(laneCount).toBe(2);
        expect(laneByStep.get(c.uuid)).toBe(0);
    });

    it('ignores steps without dates', () => {
        const dated = step('2025-03-01', '2025-03-05');
        const undatedA = step(null, null);
        const undatedB = step('2025-03-01', null);
        const { laneByStep, laneCount } = assignLanes([dated, undatedA, undatedB]);
        expect(laneCount).toBe(1);
        expect(laneByStep.size).toBe(1);
        expect(laneByStep.has(dated.uuid)).toBe(true);
    });
});

describe('laneRowHeight', () => {
    it('scales with the lane count', () => {
        expect(laneRowHeight(1)).toBe(LANE_HEIGHT + 2 * LANE_ROW_VPAD);
        expect(laneRowHeight(3)).toBe(3 * LANE_HEIGHT + 2 * LANE_ROW_VPAD);
    });

    it('never collapses below one lane', () => {
        expect(laneRowHeight(0)).toBe(LANE_HEIGHT + 2 * LANE_ROW_VPAD);
    });
});
