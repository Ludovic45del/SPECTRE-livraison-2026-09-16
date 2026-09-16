/**
 * planning.availability — calcul pur de la disponibilité jour par jour des
 * rôles (assembleurs / métrologues) et des machines de salle.
 *
 * Logique extraite de l'ancien AvailabilityDay (la factory PickersDay associée
 * a disparu avec FsecPlanningRow) ; consommée par {@link AvailabilityPanel}.
 * @module features/planning/lib
 */
import type { Dayjs } from 'dayjs';
import { getPeriodeMeta, type Membre } from './planning.constants';
import type { PlanningMemberPeriod } from '@entities/planning/core/model/planning.schema';
import type { LabEventsMap, MemberPeriodsMap } from './planning.hooks';

function dayOverlapsPeriod(day: Dayjs, period: { startDate: string | null; endDate: string | null }): boolean {
    if (!period.startDate || !period.endDate) return false;
    return !day.isBefore(period.startDate, 'day') && !day.isAfter(period.endDate, 'day');
}

export interface DayAvailability {
    assemblers: Array<{ name: string; available: boolean; reason?: string }>;
    machines: Array<{ name: string; available: boolean; reason?: string }>;
    availableAssemblers: number;
    totalAssemblers: number;
    availableMachines: number;
    totalMachines: number;
}

export function computeDayAvailability(
    day: Dayjs,
    assemblers: Membre[],
    memberPeriodsMap: MemberPeriodsMap,
    salleMachines: Array<{ uuid: string; name: string }>,
    labEvents: LabEventsMap,
): DayAvailability {
    const assemblerResults = assemblers.map((m) => {
        const periods: PlanningMemberPeriod[] = memberPeriodsMap.get(m.nom) ?? [];
        const overlap = periods.find((p) => dayOverlapsPeriod(day, p));
        if (overlap) {
            const meta = getPeriodeMeta(overlap.periodType);
            return { name: m.nom, available: false, reason: meta?.label ?? overlap.periodType };
        }
        return { name: m.nom, available: true };
    });

    const machineResults = salleMachines.map((machine) => {
        const events = labEvents.get(machine.uuid) ?? [];
        const overlap = events.find((ev) => dayOverlapsPeriod(day, ev));
        if (overlap) {
            return { name: machine.name, available: false, reason: overlap.category };
        }
        return { name: machine.name, available: true };
    });

    return {
        assemblers: assemblerResults,
        machines: machineResults,
        availableAssemblers: assemblerResults.filter((a) => a.available).length,
        totalAssemblers: assemblerResults.length,
        availableMachines: machineResults.filter((m) => m.available).length,
        totalMachines: machineResults.length,
    };
}
