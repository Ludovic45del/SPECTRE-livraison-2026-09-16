/**
 * Phase 1 Tab - Phase Ouvert
 * @module pages/fa-details/tabs
 *
 * Displays Phase 1 (Ouvert) section with view/edit and timeline
 */

import { Fa } from '@entities/fa';
import { ErrorBoundary } from '@shared/ui';
import { PhaseOuvertSection } from '../sections';

interface Phase1TabProps {
    fa: Fa;
    onReset: () => void;
}

export function Phase1Tab({ fa, onReset }: Phase1TabProps) {
    return (
        <ErrorBoundary sectionName="Phase 1 - Ouvert" compact onReset={onReset}>
            <PhaseOuvertSection fa={fa} />
        </ErrorBoundary>
    );
}
