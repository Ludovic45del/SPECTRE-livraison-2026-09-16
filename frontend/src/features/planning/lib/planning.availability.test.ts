/**
 * Tests du calcul pur de disponibilité jour par jour.
 */
import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { computeDayAvailability } from './planning.availability';
import type { MemberPeriodsMap, LabEventsMap } from './planning.hooks';
import type { Membre } from './planning.constants';
import type { PlanningMemberPeriod, LabEvent } from '@entities/planning/core/model/planning.schema';

const assemblers: Membre[] = [{ nom: 'Alice', fonction: 'Assembleur' }];
const machines = [{ uuid: 'm1', name: 'BAR' }];

const period: PlanningMemberPeriod = {
    uuid: 'p',
    memberName: 'Alice',
    memberRole: 'Assembleur',
    year: 2026,
    periodType: 'congés',
    commentaire: null,
    startDate: '2026-05-05',
    endDate: '2026-05-06',
};
const memberPeriodsMap: MemberPeriodsMap = new Map([['Alice', [period]]]);

const event: LabEvent = {
    uuid: 'e',
    machineUuid: 'm1',
    category: 'Maintenance',
    description: '',
    startDate: '2026-05-05',
    endDate: '2026-05-05',
};
const labEvents: LabEventsMap = new Map([['m1', [event]]]);

describe('computeDayAvailability', () => {
    it('marks a member busy during their period (reason = period label)', () => {
        const a = computeDayAvailability(dayjs('2026-05-05'), assemblers, memberPeriodsMap, machines, labEvents);
        expect(a.assemblers[0]).toEqual({ name: 'Alice', available: false, reason: 'Congés' });
        expect(a.availableAssemblers).toBe(0);
        expect(a.totalAssemblers).toBe(1);
    });

    it('marks a member available outside their period', () => {
        const a = computeDayAvailability(dayjs('2026-05-09'), assemblers, memberPeriodsMap, machines, labEvents);
        expect(a.assemblers[0].available).toBe(true);
        expect(a.availableAssemblers).toBe(1);
    });

    it('marks a machine busy during a lab event (reason = category)', () => {
        const a = computeDayAvailability(dayjs('2026-05-05'), assemblers, memberPeriodsMap, machines, labEvents);
        expect(a.machines[0]).toEqual({ name: 'BAR', available: false, reason: 'Maintenance' });
        expect(a.availableMachines).toBe(0);
        expect(a.totalMachines).toBe(1);
    });
});
