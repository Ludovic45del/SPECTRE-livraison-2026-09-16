/**
 * Planning Hooks — timeline, drag selection, data aggregation
 * @module features/planning/lib
 */

import { useMemo } from 'react';
import {
    useCampaignSteps,
    useCellAnnotations,
    useFsecCellLinks,
    useMemberPeriods,
    useWeekStates,
} from '@entities/planning/core/api/planning.queries';
import type {
    LabEvent,
    PlanningCampaignStep,
    PlanningCellAnnotation,
    PlanningFsecCellLink,
    PlanningMemberPeriod,
    PlanningWeekState,
} from '@entities/planning/core/model/planning.schema';

/** Map from machineUuid -> array of lab events for that machine. */
export type LabEventsMap = Map<string, LabEvent[]>;
import {
    type PlanningColors,
    PLANNING_COLORS_CREAM,
    PLANNING_COLORS_DARK,
    PLANNING_COLORS_LIGHT,
} from './planning.constants';
import { type TimelineData, computeTimeline } from './planning.utils';
import { useThemeStore } from '@shared/lib/theme.store';

// ====================== Theme-aware Colors ======================

// On lit le mode applicatif depuis le store (et non `theme.palette.mode`) :
// MUI réduit « crème » à 'light', donc seule la source `useThemeStore` permet
// de distinguer crème du clair et de servir le bon référentiel de couleurs.
export function usePlanningColors(): PlanningColors {
    const mode = useThemeStore((s) => s.mode);
    if (mode === 'dark') return PLANNING_COLORS_DARK;
    if (mode === 'cream') return PLANNING_COLORS_CREAM;
    return PLANNING_COLORS_LIGHT;
}

// ====================== Timeline Hook ======================

export function usePlanningTimeline(anchorDate: string): TimelineData {
    return useMemo(() => computeTimeline(anchorDate), [anchorDate]);
}

// ====================== Data Aggregation Hook ======================

/** Map from memberName → array of their periods */
export type MemberPeriodsMap = Map<string, PlanningMemberPeriod[]>;

/** Map from "campaignUuid#stepLabel" → array of PlanningCampaignStep (one per FSEC) */
export type CampaignStepsMap = Map<string, PlanningCampaignStep[]>;

/** Map from "campaignUuid#stepLabel#fsecUuid" → single PlanningCampaignStep */
export type FsecStepMap = Map<string, PlanningCampaignStep>;

export interface PlanningData {
    weekStates: PlanningWeekState[];
    weekStatesMap: Map<number, 'vacances' | 'fermeture'>;
    memberPeriods: PlanningMemberPeriod[];
    memberPeriodsMap: MemberPeriodsMap;
    campaignSteps: PlanningCampaignStep[];
    campaignStepsMap: CampaignStepsMap;
    fsecStepMap: FsecStepMap;
    fsecCellLinks: PlanningFsecCellLink[];
    fsecLinksMap: Map<string, PlanningFsecCellLink[]>;
    cellAnnotations: PlanningCellAnnotation[];
    annotationsMap: Map<string, { uuid: string; text: string }>;
    isLoading: boolean;
}

export function usePlanningData(year: number): PlanningData {
    const { data: weekStates = [], isLoading: wsLoading } = useWeekStates(year);
    const { data: memberPeriods = [], isLoading: mpLoading } = useMemberPeriods(year);
    const { data: campaignSteps = [], isLoading: csLoading } = useCampaignSteps(year);
    const { data: fsecCellLinks = [], isLoading: flLoading } = useFsecCellLinks(year);
    const { data: cellAnnotations = [], isLoading: caLoading } = useCellAnnotations(year);

    const weekStatesMap = useMemo(() => {
        const map = new Map<number, 'vacances' | 'fermeture'>();
        for (const ws of weekStates) map.set(ws.weekNum, ws.state);
        return map;
    }, [weekStates]);

    const memberPeriodsMap: MemberPeriodsMap = useMemo(() => {
        const map = new Map<string, PlanningMemberPeriod[]>();
        for (const p of memberPeriods) {
            const list = map.get(p.memberName) ?? [];
            list.push(p);
            map.set(p.memberName, list);
        }
        return map;
    }, [memberPeriods]);

    const campaignStepsMap: CampaignStepsMap = useMemo(() => {
        const map = new Map<string, PlanningCampaignStep[]>();
        for (const cs of campaignSteps) {
            const key = `${cs.campaignUuid}#${cs.stepLabel}`;
            const arr = map.get(key) ?? [];
            arr.push(cs);
            map.set(key, arr);
        }
        return map;
    }, [campaignSteps]);

    const fsecStepMap: FsecStepMap = useMemo(() => {
        const map = new Map<string, PlanningCampaignStep>();
        for (const cs of campaignSteps) {
            map.set(`${cs.campaignUuid}#${cs.stepLabel}#${cs.fsecUuid}`, cs);
        }
        return map;
    }, [campaignSteps]);

    const fsecLinksMap = useMemo(() => {
        const map = new Map<string, PlanningFsecCellLink[]>();
        for (const link of fsecCellLinks) {
            const key = `${link.campaignUuid}#${link.stepLabel}#${link.weekNum}`;
            const arr = map.get(key) ?? [];
            arr.push(link);
            map.set(key, arr);
        }
        return map;
    }, [fsecCellLinks]);

    const annotationsMap = useMemo(() => {
        const map = new Map<string, { uuid: string; text: string }>();
        for (const ann of cellAnnotations) {
            map.set(`${ann.campaignUuid}#${ann.stepLabel}#${ann.weekNum}`, { uuid: ann.uuid, text: ann.text });
        }
        return map;
    }, [cellAnnotations]);

    return {
        weekStates,
        weekStatesMap,
        memberPeriods,
        memberPeriodsMap,
        campaignSteps,
        campaignStepsMap,
        fsecStepMap,
        fsecCellLinks,
        fsecLinksMap,
        cellAnnotations,
        annotationsMap,
        isLoading: wsLoading || mpLoading || csLoading || flLoading || caLoading,
    };
}
