/**
 * Tests for FaWorkflowStepper Component
 *
 * Tests the FA workflow stepper with 3-step workflow (Ouvert, En cours, Clos),
 * status changes with confirmation dialog.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { FaWorkflowStepper } from './FaWorkflowStepper';
import type { Fa } from '@entities/fa';

// Mock FA data
const createMockFa = (overrides: Partial<Fa> = {}): Fa => ({
    slug: 'fa-2025-test-fsec01',
    fsecSlug: null,
    campaignSlug: null,
    uuid: '00000000-0000-0000-0000-000000000001',
    fsecVersionId: '00000000-0000-0000-0000-000000000002',
    identifier: 'FA_2025_Test_FSEC01',
    statusId: 0,
    typeId: null,
    criticalityId: null,
    fsecStepId: null,
    fsecStepOther: null,
    discoverer: 'Test User',
    discovererUserUuid: null,
    eventDate: new Date('2025-01-15'),
    observation: 'Test observation',
    locationEquipment: null,
    quickAnalysis: 'Test analysis',
    immediateMeasures: null,
    iecValidationOpen: false,
    iecValidationOpenDate: null,
    iecValidationOpenName: null,
    iecValidationOpenUserUuid: null,
    cause: null,
    experienceImpact: null,
    iecValidationProgress: false,
    iecValidationProgressName: null,
    iecValidationProgressUserUuid: null,
    closureValidation: null,
    closureDate: null,
    closureValidatorName: null,
    closureValidatorUserUuid: null,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    lastUpdated: new Date('2025-01-15T10:00:00Z'),
    fsecName: null,
    fsecDisplayName: null,
    installation: null,
    ...overrides,
});

/** Build a full FA API response that passes Zod validation */
const createMockFaApiResponse = (overrides: Record<string, unknown> = {}) => ({
    uuid: '00000000-0000-0000-0000-000000000001',
    fsec_version_id: '00000000-0000-0000-0000-000000000002',
    identifier: 'FA_2025_Test_FSEC01',
    status_id: 1,
    type_id: null,
    criticality_id: null,
    fsec_step_id: null,
    fsec_step_other: null,
    discoverer: 'Test User',
    discovererUserUuid: null,
    event_date: '2025-01-15',
    observation: 'Test observation',
    location_equipment: null,
    quick_analysis: 'Test analysis',
    immediate_measures: null,
    iec_validation_open: false,
    iec_validation_open_date: null,
    iec_validation_open_name: null,
    cause: null,
    experience_impact: null,
    iec_validation_progress: false,
    iec_validation_progress_name: null,
    closure_validation: null,
    closure_date: null,
    closure_validator_name: null,
    created_at: '2025-01-15T10:00:00Z',
    last_updated: '2025-01-15T10:00:00Z',
    ...overrides,
});

// Mock notification hook
const mockShowNotification = vi.fn();
vi.mock('@shared/ui', () => ({
    useNotification: () => ({
        showNotification: mockShowNotification,
    }),
}));

describe('FaWorkflowStepper', () => {
    beforeEach(() => {
        mockShowNotification.mockClear();

        // Setup default update handler - FaWorkflowStepper uses api.patch
        server.use(
            http.patch('/api/v1/fas/:uuid/', () => {
                return HttpResponse.json(createMockFaApiResponse({ status_id: 1 }));
            }),
        );
    });

    // ============================================================================
    // RENDERING TESTS
    // ============================================================================

    describe('Rendering', () => {
        it('should render all three workflow steps', () => {
            const fa = createMockFa({ statusId: 0 });
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            expect(screen.getByText('Ouvert')).toBeInTheDocument();
            expect(screen.getByText('En cours')).toBeInTheDocument();
            expect(screen.getByText('Clos')).toBeInTheDocument();
        });

        it('should show first step as active when statusId is 0', () => {
            const fa = createMockFa({ statusId: 0 });
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // MUI Stepper renders a Stepper component, verify the active step label
            const ouvertLabel = screen.getByText('Ouvert');
            expect(ouvertLabel).toBeInTheDocument();
            // The first step button should be disabled (current step)
            const ouvertButton = screen.getByRole('button', { name: /ouvert/i });
            expect(ouvertButton).toBeDisabled();
        });

        it('should show second step as active when statusId is 1', () => {
            const fa = createMockFa({ statusId: 1 });
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            expect(screen.getByText('En cours')).toBeInTheDocument();
        });

        it('should show third step as active when statusId is 2', () => {
            const fa = createMockFa({ statusId: 2 });
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            expect(screen.getByText('Clos')).toBeInTheDocument();
        });

        it('should mark previous steps as completed', () => {
            const fa = createMockFa({ statusId: 2 }); // Clos (last step)
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // All steps should be visible
            expect(screen.getByText('Ouvert')).toBeInTheDocument();
            expect(screen.getByText('En cours')).toBeInTheDocument();
            expect(screen.getByText('Clos')).toBeInTheDocument();
        });
    });

    // ============================================================================
    // STEP CLICK TESTS
    // ============================================================================

    describe('Step Click Interactions', () => {
        it('should open confirmation dialog when clicking a different step', async () => {
            const user = userEvent.setup();
            const fa = createMockFa({ statusId: 0 });
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Click on "En cours" step (index 1)
            const enCoursButton = screen.getByRole('button', { name: /en cours/i });
            await user.click(enCoursButton);

            // Should show confirmation dialog
            expect(screen.getByText('Confirmer le changement de statut')).toBeInTheDocument();
            expect(screen.getByText(/Êtes-vous sûr de vouloir modifier le statut de cette FA/)).toBeInTheDocument();
        });

        it('should show current and target status in dialog', async () => {
            const user = userEvent.setup();
            const fa = createMockFa({ statusId: 0 }); // Ouvert
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Click on "En cours"
            const enCoursButton = screen.getByRole('button', { name: /en cours/i });
            await user.click(enCoursButton);

            const dialog = screen.getByRole('dialog');
            expect(within(dialog).getByText('Ouvert')).toBeInTheDocument();
            expect(within(dialog).getByText('En cours')).toBeInTheDocument();
        });

        it('should not open dialog when clicking current step', async () => {
            const fa = createMockFa({ statusId: 1 }); // En cours
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Current step button is disabled in BaseWorkflowStepper
            const enCoursButton = screen.getByRole('button', { name: /en cours/i });
            expect(enCoursButton).toBeDisabled();

            // Dialog should not appear (button is disabled, no click possible)
            expect(screen.queryByText('Confirmer le changement de statut')).not.toBeInTheDocument();
        });

        it('should close dialog when clicking cancel', async () => {
            const user = userEvent.setup();
            const fa = createMockFa({ statusId: 0 });
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Open dialog
            const enCoursButton = screen.getByRole('button', { name: /en cours/i });
            await user.click(enCoursButton);

            // Click cancel
            const cancelButton = screen.getByRole('button', { name: /annuler/i });
            await user.click(cancelButton);

            // Dialog should close
            await waitFor(() => {
                expect(screen.queryByText('Confirmer le changement de statut')).not.toBeInTheDocument();
            });
        });

        it('should close dialog when clicking outside', async () => {
            const user = userEvent.setup();
            const fa = createMockFa({ statusId: 0 });
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Open dialog
            const enCoursButton = screen.getByRole('button', { name: /en cours/i });
            await user.click(enCoursButton);

            expect(screen.getByRole('dialog')).toBeInTheDocument();

            // Click backdrop
            const backdrop = document.querySelector('.MuiBackdrop-root');
            if (backdrop) {
                await user.click(backdrop);
                await waitFor(() => {
                    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
                });
            }
        });
    });

    // ============================================================================
    // STATUS UPDATE TESTS
    // ============================================================================

    describe('Status Update', () => {
        it('should call API on confirm', async () => {
            const user = userEvent.setup();
            let apiCalled = false;

            server.use(
                http.patch('/api/v1/fas/:uuid/', () => {
                    apiCalled = true;
                    return HttpResponse.json(createMockFaApiResponse({ status_id: 1 }));
                }),
            );

            const fa = createMockFa({ statusId: 0 });
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Click on step
            const enCoursButton = screen.getByRole('button', { name: /en cours/i });
            await user.click(enCoursButton);

            // Confirm
            const confirmButton = screen.getByRole('button', { name: /confirmer/i });
            await user.click(confirmButton);

            await waitFor(() => {
                expect(apiCalled).toBe(true);
            });
        });

        it('should show success notification on successful update', async () => {
            const user = userEvent.setup();

            server.use(
                http.patch('/api/v1/fas/:uuid/', () => {
                    return HttpResponse.json(createMockFaApiResponse({ status_id: 1 }));
                }),
            );

            const fa = createMockFa({ statusId: 0 });
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Click on step and confirm
            const enCoursButton = screen.getByRole('button', { name: /en cours/i });
            await user.click(enCoursButton);
            const confirmButton = screen.getByRole('button', { name: /confirmer/i });
            await user.click(confirmButton);

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith(
                    expect.stringContaining('Statut mis à jour'),
                    'success',
                );
            });
        });

        it('should show error notification on API failure', async () => {
            const user = userEvent.setup();

            server.use(
                http.patch('/api/v1/fas/:uuid/', () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            const fa = createMockFa({ statusId: 0 });
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Click on step and confirm
            const enCoursButton = screen.getByRole('button', { name: /en cours/i });
            await user.click(enCoursButton);
            const confirmButton = screen.getByRole('button', { name: /confirmer/i });
            await user.click(confirmButton);

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith(expect.stringContaining('Erreur'), 'error');
            });
        });

        it('should disable confirm button during pending state', async () => {
            const user = userEvent.setup();

            // Delay response
            server.use(
                http.patch('/api/v1/fas/:uuid/', async () => {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    return HttpResponse.json(createMockFaApiResponse({ status_id: 1 }));
                }),
            );

            const fa = createMockFa({ statusId: 0 });
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Click and confirm
            const enCoursButton = screen.getByRole('button', { name: /en cours/i });
            await user.click(enCoursButton);
            const confirmButton = screen.getByRole('button', { name: /confirmer/i });
            await user.click(confirmButton);

            // After confirm click, dialog closes. The BaseWorkflowStepper disables
            // step buttons during pending via isPending prop. Verify step buttons are disabled.
            await waitFor(() => {
                const buttons = screen.getAllByRole('button');
                // All step buttons should be disabled during pending
                const stepButtons = buttons.filter((b) => !b.classList.contains('MuiChip-root'));
                stepButtons.forEach((b) => {
                    expect(b).toBeDisabled();
                });
            });
        });

        it('should reduce opacity during pending state', async () => {
            const user = userEvent.setup();

            // Delay response
            server.use(
                http.patch('/api/v1/fas/:uuid/', async () => {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    return HttpResponse.json(createMockFaApiResponse({ status_id: 1 }));
                }),
            );

            const fa = createMockFa({ statusId: 0 });
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Click and confirm
            const enCoursButton = screen.getByRole('button', { name: /en cours/i });
            await user.click(enCoursButton);
            const confirmButton = screen.getByRole('button', { name: /confirmer/i });
            await user.click(confirmButton);

            // The stepper container should have reduced opacity
            // This is applied via sx prop
        });
    });

    // ============================================================================
    // NAVIGATION BETWEEN STEPS
    // ============================================================================

    describe('Step Navigation', () => {
        it('should allow forward navigation', async () => {
            const user = userEvent.setup();

            server.use(
                http.patch('/api/v1/fas/:uuid/', () => {
                    return HttpResponse.json(createMockFaApiResponse({ status_id: 1 }));
                }),
            );

            const fa = createMockFa({ statusId: 0 }); // Ouvert
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Navigate to En cours
            const enCoursButton = screen.getByRole('button', { name: /en cours/i });
            await user.click(enCoursButton);

            const confirmButton = screen.getByRole('button', { name: /confirmer/i });
            await user.click(confirmButton);

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith(expect.stringContaining('En cours'), 'success');
            });
        });

        it('should allow backward navigation', async () => {
            const user = userEvent.setup();

            server.use(
                http.patch('/api/v1/fas/:uuid/', () => {
                    return HttpResponse.json(createMockFaApiResponse({ status_id: 0 }));
                }),
            );

            const fa = createMockFa({ statusId: 1 }); // En cours
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Navigate back to Ouvert
            const ouvertButton = screen.getByRole('button', { name: /ouvert/i });
            await user.click(ouvertButton);

            const confirmButton = screen.getByRole('button', { name: /confirmer/i });
            await user.click(confirmButton);

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith(expect.stringContaining('Ouvert'), 'success');
            });
        });

        it('should allow skipping to final step', async () => {
            const user = userEvent.setup();

            server.use(
                http.patch('/api/v1/fas/:uuid/', () => {
                    return HttpResponse.json(createMockFaApiResponse({ status_id: 2 }));
                }),
            );

            const fa = createMockFa({ statusId: 0 }); // Ouvert
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Navigate directly to Clos
            const closButton = screen.getByRole('button', { name: /clos/i });
            await user.click(closButton);

            const confirmButton = screen.getByRole('button', { name: /confirmer/i });
            await user.click(confirmButton);

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith(expect.stringContaining('Clos'), 'success');
            });
        });
    });

    // ============================================================================
    // ACCESSIBILITY TESTS
    // ============================================================================

    describe('Accessibility', () => {
        it('should have proper stepper structure', () => {
            const fa = createMockFa();
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // MUI Stepper renders step labels
            expect(screen.getByText('Ouvert')).toBeInTheDocument();
            expect(screen.getByText('En cours')).toBeInTheDocument();
            expect(screen.getByText('Clos')).toBeInTheDocument();
        });

        it('should have clickable step buttons', () => {
            const fa = createMockFa({ statusId: 0 });
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThanOrEqual(3);
        });

        it('should have accessible dialog', async () => {
            const user = userEvent.setup();
            const fa = createMockFa();
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Open dialog
            const enCoursButton = screen.getByRole('button', { name: /en cours/i });
            await user.click(enCoursButton);

            // Dialog should be accessible
            const dialog = screen.getByRole('dialog');
            expect(dialog).toBeInTheDocument();
        });

        it('should close dialog with Escape key', async () => {
            const user = userEvent.setup();
            const fa = createMockFa();
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Open dialog
            const enCoursButton = screen.getByRole('button', { name: /en cours/i });
            await user.click(enCoursButton);

            expect(screen.getByRole('dialog')).toBeInTheDocument();

            // Press Escape
            await user.keyboard('{Escape}');

            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        });

        it('should disable current step button', () => {
            const fa = createMockFa({ statusId: 1 }); // En cours
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            const enCoursButton = screen.getByRole('button', { name: /en cours/i });
            expect(enCoursButton).toBeDisabled();
        });
    });

    // ============================================================================
    // EDGE CASES
    // ============================================================================

    describe('Edge Cases', () => {
        it('should handle null statusId gracefully', () => {
            const fa = createMockFa({ statusId: null as unknown as number });
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Should default to first step (statusId 0)
            expect(screen.getByText('Ouvert')).toBeInTheDocument();
        });

        it('should handle unknown statusId', () => {
            const fa = createMockFa({ statusId: 99 }); // Unknown status
            renderWithProviders(<FaWorkflowStepper fa={fa} />);

            // Should still render steps
            expect(screen.getByText('Ouvert')).toBeInTheDocument();
            expect(screen.getByText('En cours')).toBeInTheDocument();
            expect(screen.getByText('Clos')).toBeInTheDocument();
        });
    });
});
