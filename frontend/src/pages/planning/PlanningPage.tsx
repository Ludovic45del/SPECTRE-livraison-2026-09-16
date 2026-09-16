/**
 * PlanningPage — Page principale du planning SPECTRE.
 * Simple assembleur : toolbar + grid. Toute la logique est dans features/planning.
 */
import { useEffect, useMemo } from 'react';
import { Container } from '@mui/material';
import { useLabEvents } from '@entities/planning/core/api/planning.queries';
import type { LabEvent } from '@entities/planning/core/model/planning.schema';
import { useUserLookup } from '@entities/user';
import { usePlanningStore } from '@features/planning/lib/planning.store';
import { usePlanningLabSalles } from '@features/planning/lib/planning.lab';
import { usersToMembres } from '@features/planning/lib/planning.members';
import { PlanningToolbar } from '@features/planning/ui/PlanningToolbar';
import { PlanningGrid } from '@features/planning/ui/PlanningGrid';
import type { LabEventsMap } from '@features/planning/lib/planning.hooks';
import { ErrorBoundary } from '@shared/ui';

// Re-export for backward compat
export type { LabEventsMap } from '@features/planning/lib/planning.hooks';

export default function PlanningPage() {
    const resetUIState = usePlanningStore((s) => s.resetUIState);

    // Cleanup transient UI state (drag, selection, popover) on unmount
    useEffect(() => {
        return () => resetUIState();
    }, [resetUIState]);

    // `useUserLookup` (et non `useUsers`) : la projection annuaire est ouverte à
    // tout utilisateur authentifié, là où `/users/` est réservé aux admins. Sans
    // cela, la section Équipe du planning restait vide pour les non-chefs.
    const { data: users = [] } = useUserLookup();
    const salles = usePlanningLabSalles();
    const { data: labEventsList = [] } = useLabEvents();

    const membres = useMemo(() => usersToMembres(users), [users]);

    const labEvents: LabEventsMap = useMemo(() => {
        const map = new Map<string, LabEvent[]>();
        for (const ev of labEventsList) {
            const list = map.get(ev.machineUuid) ?? [];
            list.push(ev);
            map.set(ev.machineUuid, list);
        }
        return map;
    }, [labEventsList]);

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <ErrorBoundary compact>
                <PlanningToolbar />
            </ErrorBoundary>
            <ErrorBoundary compact>
                <PlanningGrid membres={membres} salles={salles} labEvents={labEvents} />
            </ErrorBoundary>
        </Container>
    );
}
