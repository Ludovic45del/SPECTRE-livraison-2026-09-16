/**
 * Tests de la modale unifiée de planification campagne.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { setup } from '@test/test-utils';
import { CampaignStepDialog } from './CampaignStepDialog';
import type { Etape } from '../../lib/planning.constants';
import type { PlanningData } from '../../lib/planning.hooks';
import type { FsecInfo } from './types';
import type { PlanningCampaignStep } from '@entities/planning/core/model/planning.schema';
import type { CampaignWithRelations } from '@entities/campaign/core/model/referential.schema';

const etape = (over: Partial<Etape>): Etape => ({
    id: 1,
    label: 'X',
    color: '#888888',
    displayOrder: 1,
    minStatusForDone: null,
    useShootingDate: false,
    gasOnly: false,
    ...over,
});

const etapes: Etape[] = [
    etape({ label: 'Réception cibles', displayOrder: 0 }),
    etape({ label: 'Assemblage', displayOrder: 1 }),
    etape({ label: 'Tir', displayOrder: 5 }),
];

const fsec = (over: Partial<FsecInfo>): FsecInfo => ({
    versionUuid: 'v',
    fsecUuid: 'f',
    name: 'X',
    categoryId: 0,
    statusId: 0,
    shootingDate: null,
    ...over,
    displayName: over.displayName ?? over.name ?? 'X',
});
const campaignFsecs = [fsec({ versionUuid: 'v1', name: 'Alpha' }), fsec({ versionUuid: 'v2', name: 'Beta' })];

const assemblageStep: PlanningCampaignStep = {
    uuid: 's1',
    campaignUuid: 'c1',
    fsecUuid: 'v1',
    stepLabel: 'Assemblage',
    year: 2026,
    startDate: '2026-05-07',
    endDate: '2026-05-09',
};

const planningData = {
    campaignStepsMap: new Map([['c1#Assemblage', [assemblageStep]]]),
    weekStatesMap: new Map(),
} as unknown as PlanningData;

const campagne = {
    uuid: 'c1',
    name: 'SS22',
    slug: 'ss22',
    installation: { label: 'LMJ', color: '#123456' },
} as unknown as CampaignWithRelations;

function renderDialog(initialStepLabel: string) {
    return setup(
        <CampaignStepDialog
            campagne={campagne}
            etapes={etapes}
            campaignFsecs={campaignFsecs}
            gasFsecs={[]}
            planningData={planningData}
            membres={[]}
            salles={[]}
            labEvents={new Map()}
            initialStepLabel={initialStepLabel}
            defaultDate="2026-05-07"
            onClose={vi.fn()}
        />,
    );
}

describe('CampaignStepDialog', () => {
    it('renders one tab per visible step and the campaign title (modale unique)', () => {
        renderDialog('Réception cibles');
        expect(screen.getByText('Planifier — SS22')).toBeInTheDocument();
        for (const label of ['Réception cibles', 'Assemblage', 'Tir']) {
            expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
        }
    });

    it('shows all FSECs as unscheduled for a step with no plan', () => {
        renderDialog('Réception cibles');
        expect(screen.getByText('FSEC à planifier (2)')).toBeInTheDocument();
        expect(screen.getByText('Alpha')).toBeInTheDocument();
        expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('switching tab reloads palette + board (Assemblage: Alpha scheduled, Beta left)', async () => {
        const { user } = renderDialog('Réception cibles');
        await user.click(screen.getByRole('button', { name: /Assemblage/ }));

        // Alpha est planifiée sur Assemblage → reste 1 FSEC en palette (Beta).
        expect(screen.getByText('FSEC à planifier (1)')).toBeInTheDocument();
        expect(screen.getByText('Beta')).toBeInTheDocument();
        // Alpha apparaît sur le board (barre) + son bouton de suppression.
        expect(screen.getByRole('button', { name: 'Supprimer Alpha' })).toBeInTheDocument();
    });

    it('shows the availability panel only for steps with a config (Assemblage, not Réception)', async () => {
        const { user } = renderDialog('Réception cibles');
        expect(screen.queryByText(/disponibilité sur la période/i)).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: /Assemblage/ }));
        expect(screen.getByText(/disponibilité sur la période/i)).toBeInTheDocument();
    });

    it('is a labelled dialog', () => {
        renderDialog('Tir');
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-labelledby');
        expect(within(dialog).getByText('Planifier — SS22')).toBeInTheDocument();
    });
});
