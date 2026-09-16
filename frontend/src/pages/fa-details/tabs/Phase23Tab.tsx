/**
 * Phases 2 & 3 Tab - En cours + Clos
 * @module pages/fa-details/tabs
 *
 * Displays Phase 2 (En cours) and Phase 3 (Clos) sections
 */

import { Grid } from '@mui/material';
import { Fa } from '@entities/fa';
import { ErrorBoundary } from '@shared/ui';
import { PhaseEnCoursSection, PhaseClosSection } from '../sections';

interface Phase23TabProps {
    fa: Fa;
    onReset: () => void;
}

export function Phase23Tab({ fa, onReset }: Phase23TabProps) {
    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <ErrorBoundary sectionName="Phase 2 - En cours" compact onReset={onReset}>
                    <PhaseEnCoursSection fa={fa} />
                </ErrorBoundary>
            </Grid>
            <Grid item xs={12}>
                <ErrorBoundary sectionName="Phase 3 - Clos" compact onReset={onReset}>
                    <PhaseClosSection fa={fa} />
                </ErrorBoundary>
            </Grid>
        </Grid>
    );
}
