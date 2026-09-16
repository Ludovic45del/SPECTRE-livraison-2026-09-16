/**
 * Tests for PlanningGrid — integration test for the main planning table.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, server } from '@test/test-utils';
import userEvent from '@testing-library/user-event';
import { planningHandlers } from '@test/mocks/planning-handlers';
import { PlanningGrid } from '../PlanningGrid';
import { usePlanningStore } from '../../lib/planning.store';

const MOCK_MEMBRES = [
    { nom: 'Dupont Jean', fonction: 'Assembleur' },
    { nom: 'Martin Claire', fonction: 'Métrologue' },
];

beforeEach(() => {
    server.use(...planningHandlers);
    // Reset store to default state
    usePlanningStore.setState({
        collapsedSections: {},
        collapsedStepGroups: {},
    });
});

describe('PlanningGrid', () => {
    describe('Rendering', () => {
        it('should render the grid table', () => {
            renderWithProviders(<PlanningGrid membres={MOCK_MEMBRES} salles={[]} labEvents={new Map()} />);
            expect(screen.getByRole('grid')).toBeInTheDocument();
        });

        it('should render all 3 section labels', () => {
            renderWithProviders(<PlanningGrid membres={MOCK_MEMBRES} salles={[]} labEvents={new Map()} />);
            expect(screen.getByText('Équipe')).toBeInTheDocument();
            expect(screen.getByText('Vie Labo')).toBeInTheDocument();
            expect(screen.getByText('Campagnes')).toBeInTheDocument();
        });

        it('should render member names', () => {
            renderWithProviders(<PlanningGrid membres={MOCK_MEMBRES} salles={[]} labEvents={new Map()} />);
            expect(screen.getByText('Dupont Jean')).toBeInTheDocument();
            expect(screen.getByText('Martin Claire')).toBeInTheDocument();
        });

        it('should render member roles', () => {
            renderWithProviders(<PlanningGrid membres={MOCK_MEMBRES} salles={[]} labEvents={new Map()} />);
            expect(screen.getByText('Assembleur')).toBeInTheDocument();
            expect(screen.getByText('Métrologue')).toBeInTheDocument();
        });

        it('should render empty grid with no members', () => {
            renderWithProviders(<PlanningGrid membres={[]} salles={[]} labEvents={new Map()} />);
            expect(screen.getByRole('grid')).toBeInTheDocument();
            expect(screen.getByText('Équipe')).toBeInTheDocument();
        });
    });

    describe('Section collapse', () => {
        it('should have all sections expanded by default', () => {
            renderWithProviders(<PlanningGrid membres={MOCK_MEMBRES} salles={[]} labEvents={new Map()} />);
            // All section toggle buttons should show aria-expanded=true
            const toggleButtons = screen.getAllByRole('button', { expanded: true });
            // There should be at least 3 (one per section)
            expect(toggleButtons.length).toBeGreaterThanOrEqual(3);
        });

        it('should collapse Équipe section when clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<PlanningGrid membres={MOCK_MEMBRES} salles={[]} labEvents={new Map()} />);

            // Click the Équipe section toggle
            const equipeLabel = screen.getByText('Équipe');
            const toggleButton = equipeLabel.closest('[role="button"]')!;
            await user.click(toggleButton);

            // After collapse, the toggle should show aria-expanded=false
            expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
        });
    });
});
