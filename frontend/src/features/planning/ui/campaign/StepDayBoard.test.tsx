/**
 * Tests du board jours : rendu des barres planifiées + suppression.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import dayjs from 'dayjs';
import { setup } from '@test/test-utils';
import { buildDayColumns } from '../../lib/planning.day-columns';
import { StepDayBoard, shiftStepDates } from './StepDayBoard';
import type { Etape } from '../../lib/planning.constants';
import type { FsecInfo } from './types';
import type { PlanningCampaignStep } from '@entities/planning/core/model/planning.schema';

const etape: Etape = {
    id: 1,
    label: 'Assemblage',
    color: '#5B7FC7',
    displayOrder: 1,
    minStatusForDone: null,
    useShootingDate: false,
    gasOnly: false,
};

const alpha: FsecInfo = {
    versionUuid: 'v1',
    fsecUuid: 'f1',
    name: 'Alpha',
    displayName: 'Alpha',
    categoryId: 0,
    statusId: 0,
    shootingDate: null,
};

const step: PlanningCampaignStep = {
    uuid: 's1',
    campaignUuid: 'c1',
    fsecUuid: 'v1',
    stepLabel: 'Assemblage',
    year: 2026,
    startDate: '2026-05-07',
    endDate: '2026-05-09',
};

const columns = buildDayColumns(dayjs('2026-05-04'), 14);
const noopDrop = { onDragOver: () => {}, onDrop: () => {} };

describe('StepDayBoard', () => {
    it('renders a bar with the FSEC name for a scheduled step', () => {
        setup(
            <StepDayBoard
                etape={etape}
                etapeFsecs={[alpha]}
                stepsForEtape={[step]}
                columns={columns}
                weekStatesMap={new Map()}
                dropProps={noopDrop}
                onMove={vi.fn()}
                onResize={vi.fn()}
                onDeleteStep={vi.fn()}
            />,
        );
        expect(screen.getByText('Alpha')).toBeInTheDocument();
    });

    it('deletes a step from its × button', async () => {
        const onDeleteStep = vi.fn();
        const { user } = setup(
            <StepDayBoard
                etape={etape}
                etapeFsecs={[alpha]}
                stepsForEtape={[step]}
                columns={columns}
                weekStatesMap={new Map()}
                dropProps={noopDrop}
                onMove={vi.fn()}
                onResize={vi.fn()}
                onDeleteStep={onDeleteStep}
            />,
        );
        await user.click(screen.getByRole('button', { name: 'Supprimer Alpha' }));
        expect(onDeleteStep).toHaveBeenCalledWith('s1');
    });
});

describe('shiftStepDates', () => {
    it('shifts both dates by the day offset', () => {
        expect(shiftStepDates(step, 3)).toEqual({ startDate: '2026-05-10', endDate: '2026-05-12' });
    });
    it('returns null when dates are missing', () => {
        expect(shiftStepDates({ ...step, startDate: null }, 1)).toBeNull();
    });
});
