/**
 * Lane packing — empile des barres datées sur le minimum de couloirs.
 *
 * Utilisé par la vue campagne : une étape dépliée affiche toutes ses FSEC
 * dans une seule ligne, les barres se répartissant sur des couloirs
 * (deux barres ne partagent un couloir que si leurs plages ne se chevauchent pas).
 */
import type { PlanningCampaignStep } from '@entities/planning/core/model/planning.schema';

export interface LanePackingResult {
    /** uuid du step → index de couloir (0-based). */
    laneByStep: Map<string, number>;
    /** Nombre de couloirs occupés (toujours >= 1). */
    laneCount: number;
}

/**
 * Interval partitioning : assigne chaque step daté au premier couloir libre.
 * Les steps sans dates sont ignorés (pas de barre à afficher).
 *
 * @param steps  Steps d'une étape donnée (campagne + étape).
 */
export function assignLanes(steps: PlanningCampaignStep[]): LanePackingResult {
    const dated = steps
        .filter((s): s is PlanningCampaignStep & { startDate: string; endDate: string } =>
            Boolean(s.startDate && s.endDate),
        )
        .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));

    const laneByStep = new Map<string, number>();
    // laneEnds[i] = date de fin du dernier step placé sur le couloir i.
    const laneEnds: string[] = [];

    for (const step of dated) {
        // Premier couloir dont la dernière barre se termine avant ce step.
        let lane = laneEnds.findIndex((end) => end < step.startDate);
        if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(step.endDate);
        } else {
            laneEnds[lane] = step.endDate;
        }
        laneByStep.set(step.uuid, lane);
    }

    return { laneByStep, laneCount: Math.max(laneEnds.length, 1) };
}

// ====================== Dimensions ======================

/** Hauteur d'un couloir en pixels. */
export const LANE_HEIGHT = 28;
/** Marge verticale (haut + bas) de la ligne couloirs. */
export const LANE_ROW_VPAD = 2;

/** Hauteur totale d'une ligne couloirs pour `laneCount` couloirs. */
export function laneRowHeight(laneCount: number): number {
    return Math.max(laneCount, 1) * LANE_HEIGHT + 2 * LANE_ROW_VPAD;
}
