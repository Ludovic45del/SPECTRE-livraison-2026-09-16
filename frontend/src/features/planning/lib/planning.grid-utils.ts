/**
 * Shared grid utilities for planning row components.
 * Centralizes logic that was previously duplicated across
 * PlanningMemberRows, PlanningLabRows, and PlanningCampaignRows.
 */
import { type TimelineColumn, columnToWeekNums } from './planning.utils';

/**
 * Resolve the week state for a column from the weekStatesMap.
 * Replaces 5+ inline duplications of this pattern.
 */
export function resolveWeekState(
    col: TimelineColumn,
    weekStatesMap: Map<number, 'vacances' | 'fermeture'>,
): 'vacances' | 'fermeture' | undefined {
    const weekNums = columnToWeekNums(col);
    return weekNums.reduce<'vacances' | 'fermeture' | undefined>((acc, wn) => acc ?? weekStatesMap.get(wn), undefined);
}
