/**
 * Tests du panneau de disponibilité (récap par jour, par ressource).
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import dayjs from 'dayjs';
import { setup } from '@test/test-utils';
import { buildDayColumns } from '../../lib/planning.day-columns';
import { AvailabilityPanel } from './AvailabilityPanel';
import type { StepAvailabilityConfig, Membre } from '../../lib/planning.constants';
import type { MemberPeriodsMap, LabEventsMap } from '../../lib/planning.hooks';
import type { PlanningSalle } from '../../lib/planning.lab';
import type { PlanningMemberPeriod } from '@entities/planning/core/model/planning.schema';

const columns = buildDayColumns(dayjs('2026-05-04'), 5);
const config: StepAvailabilityConfig = {
    fonctionFilter: 'Assembleur',
    fonctionLabel: 'Assembleurs',
    salleName: 'B1',
};

const membres: Membre[] = [
    { nom: 'Alice A', fonction: 'Assembleur' },
    { nom: 'Bob B', fonction: 'Métrologue' },
];

const salles = [{ id: 1, name: 'B1', machines: [{ uuid: 'm1', name: 'BAR' }] }] as unknown as PlanningSalle[];

const period: PlanningMemberPeriod = {
    uuid: 'p1',
    memberName: 'Alice A',
    memberRole: 'Assembleur',
    year: 2026,
    periodType: 'congés',
    commentaire: null,
    startDate: '2026-05-05',
    endDate: '2026-05-05',
};
const memberPeriodsMap: MemberPeriodsMap = new Map([['Alice A', [period]]]);
const labEvents: LabEventsMap = new Map();

describe('AvailabilityPanel', () => {
    it('shows only the role members and the salle machines', () => {
        setup(
            <AvailabilityPanel
                columns={columns}
                config={config}
                membres={membres}
                salles={salles}
                memberPeriodsMap={memberPeriodsMap}
                labEvents={labEvents}
            />,
        );
        expect(screen.getByText('Assembleurs')).toBeInTheDocument();
        expect(screen.getByText('Alice A')).toBeInTheDocument();
        expect(screen.queryByText('Bob B')).not.toBeInTheDocument(); // métrologue filtré
        expect(screen.getByText('Machines — Salle B1')).toBeInTheDocument();
        expect(screen.getByText('BAR')).toBeInTheDocument();
    });

    it('falls back gracefully when the salle is unknown', () => {
        setup(
            <AvailabilityPanel
                columns={columns}
                config={{ ...config, salleName: 'ZZ' }}
                membres={membres}
                salles={salles}
                memberPeriodsMap={memberPeriodsMap}
                labEvents={labEvents}
            />,
        );
        expect(screen.getByText('Salle ZZ non trouvée')).toBeInTheDocument();
    });
});
