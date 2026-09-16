/**
 * CampaignContext — Shared data for campaign sub-components.
 * Avoids prop drilling of columns, planningData, membres, salles, labEvents.
 */
import { createContext, useContext } from 'react';
import type { CampaignWithRelations } from '@entities/campaign/core/model/referential.schema';
import type { PlanningSalle } from '../../lib/planning.lab';
import type { Membre } from '../../lib/planning.constants';
import type { PlanningData, LabEventsMap } from '../../lib/planning.hooks';
import type { Etape } from '../../lib/planning.constants';
import type { TimelineColumn } from '../../lib/planning.utils';
import type { VisibleColumnRange } from '../../lib/useColumnVirtualization';

export interface CampaignContextValue {
    campagne: CampaignWithRelations;
    columns: TimelineColumn[];
    planningData: PlanningData;
    membres: Membre[];
    salles: PlanningSalle[];
    labEvents: LabEventsMap;
    visibleRange: VisibleColumnRange;
    onNavigate: () => void;
    /** Ouvre la modale de planification campagne sur l'étape donnée. */
    onOpenStepDialog: (etape: Etape, defaultDate?: string) => void;
}

export const CampaignContext = createContext<CampaignContextValue | null>(null);

export function useCampaignContext(): CampaignContextValue {
    const ctx = useContext(CampaignContext);
    if (!ctx) throw new Error('useCampaignContext must be used within CampaignContext.Provider');
    return ctx;
}
