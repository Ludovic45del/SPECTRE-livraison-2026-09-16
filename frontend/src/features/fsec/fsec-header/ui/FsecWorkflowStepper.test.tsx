/**
 * Tests for FsecWorkflowStepper Component
 *
 * Tests the FSEC workflow stepper with dynamic workflows based on category,
 * status changes with confirmation dialog, and HS chip functionality.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { FsecWorkflowStepper } from './FsecWorkflowStepper';
import type { Fsec } from '@entities/fsec';

// Valid UUIDs for Zod validation
const MOCK_VERSION_UUID = '00000000-0000-0000-0000-000000000001';
const MOCK_FSEC_UUID = '00000000-0000-0000-0000-000000000002';
const MOCK_CAMPAIGN_UUID = '00000000-0000-0000-0000-000000000003';

// Mock FSEC data for different categories
const createMockFsec = (overrides: Partial<Fsec> = {}): Fsec => ({
    slug: 'fsec-test-001',
    campaignSlug: null,
    fsecUuid: MOCK_FSEC_UUID,
    versionUuid: MOCK_VERSION_UUID,
    name: 'FSEC Test 001',
    displayName: '2025-LMJ_Campagne Test_FSEC Test 001',
    campaignId: MOCK_CAMPAIGN_UUID,
    statusId: 0,
    categoryId: 0,
    rackId: null,
    comments: null,
    isActive: true,
    deliveryDate: null,
    shootingDate: null,
    preshootingPressure: null,
    experienceSrxx: null,
    localisation: null,
    depressurizationFailed: null,
    overviewImage: null,
    assemblyPlanImage: null,
    assemblyPlanAnnotations: [],
    alignmentFileLink: null,
    fdieLink: null,
    deliveryValidation: null,
    deliveryRemarques: null,
    deliveryValidatedByUsername: null,
    deliveryValidatedAt: null,
    requestedViews: null,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    lastUpdated: new Date('2025-01-15T10:00:00Z'),
    ...overrides,
});

/** Build a full FSEC API response that passes Zod validation */
const createMockFsecApiResponse = (overrides: Record<string, unknown> = {}) => ({
    version_uuid: MOCK_VERSION_UUID,
    fsec_uuid: MOCK_FSEC_UUID,
    campaign_id: MOCK_CAMPAIGN_UUID,
    name: 'FSEC Test 001',
    displayName: '2025-LMJ_Campagne Test_FSEC Test 001',
    status_id: 1,
    category_id: 0,
    rack_id: null,
    comments: null,
    is_active: true,
    delivery_date: null,
    shooting_date: null,
    preshooting_pressure: null,
    experience_srxx: null,
    localisation: null,
    depressurization_failed: null,
    created_at: '2025-01-15T10:00:00Z',
    last_updated: '2025-01-15T10:00:00Z',
    ...overrides,
});

/**
 * Helper to click a custom step icon by its label text.
 * The FSEC stepper uses custom styled Box elements (not MUI StepButtons),
 * so we find the label, navigate to the parent StepWrapper, and click the icon.
 */
function clickStepByLabel(label: string) {
    const labelEl = screen.getByText(label);
    // Parent is StepWrapper, which contains the icon (StepIconWrapper) and label
    const stepWrapper = labelEl.parentElement!;
    // The StepIconWrapper is a sibling with onClick - find the div with a number or check icon
    // Click the icon wrapper (which is the second child, after connector)
    // StepWrapper children: [Connector?, StepIconWrapper, StepLabel]
    const children = Array.from(stepWrapper.children);
    // The StepIconWrapper is the one that is NOT a connector and NOT a paragraph
    const clickable =
        children.find((child) => child.tagName === 'DIV' && child !== children[0] && !child.querySelector('span')) ||
        children[1]; // Fallback to second child
    fireEvent.click(clickable);
}

/**
 * Assertion d'ordre DOM : les StepWrapper sont rendus séquentiellement dans le
 * conteneur du stepper, l'ordre du document reflète donc l'ordre du workflow.
 */
function expectStepBefore(firstLabel: string, secondLabel: string) {
    const first = screen.getByText(firstLabel);
    const second = screen.getByText(secondLabel);
    // DOCUMENT_POSITION_FOLLOWING : `second` est situé APRÈS `first` dans le DOM.
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

// Mock notification hook
const mockShowNotification = vi.fn();
vi.mock('@shared/ui', () => ({
    useNotification: () => ({
        showNotification: mockShowNotification,
    }),
}));

describe('FsecWorkflowStepper', () => {
    beforeEach(() => {
        mockShowNotification.mockClear();

        // Setup default update handler - useUpdateFsec uses api.put('/fsecs/:uuid/')
        server.use(
            http.put('/api/v1/fsecs/:uuid/', () => {
                return HttpResponse.json(createMockFsecApiResponse({ status_id: 1 }));
            }),
        );
    });

    // ============================================================================
    // RENDERING TESTS
    // ============================================================================

    describe('Rendering', () => {
        it('should render all workflow steps for category 0 (Sans gaz)', () => {
            const fsec = createMockFsec({ categoryId: 0, statusId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Category 0: Design, Assemblage, Métrologie, Scellement, Vérif. scellement,
            // Photos, Disponible, Installation, Tirée
            expect(screen.getByText('Design')).toBeInTheDocument();
            expect(screen.getByText('Assemblage')).toBeInTheDocument();
            expect(screen.getByText('Métrologie')).toBeInTheDocument();
            expect(screen.getByText('Scellement')).toBeInTheDocument();
            expect(screen.getByText('Vérif. scellement')).toBeInTheDocument();
            expect(screen.getByText('Photos')).toBeInTheDocument();
            expect(screen.getByText('Disponible')).toBeInTheDocument();
            expect(screen.getByText('Installation')).toBeInTheDocument();
            expect(screen.getByText('Tirée')).toBeInTheDocument();
        });

        it('should render workflow steps for category 1 (Avec gaz BP)', () => {
            const fsec = createMockFsec({ categoryId: 1, statusId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Category 1 includes Étanchéité and Remp. BP
            expect(screen.getByText('Étanchéité')).toBeInTheDocument();
            expect(screen.getByText('Remp. BP')).toBeInTheDocument();
        });

        it('should render workflow steps for category 2 (HP sans étanchéité)', () => {
            const fsec = createMockFsec({ categoryId: 2, statusId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Category 2 includes Remp. HP
            expect(screen.getByText('Remp. HP')).toBeInTheDocument();
        });

        it('should render workflow steps for category 4 (Perméation)', () => {
            const fsec = createMockFsec({ categoryId: 4, statusId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Category 4 includes Perméation and Dépress.
            expect(screen.getByText('Perméation')).toBeInTheDocument();
            expect(screen.getByText('Dépress.')).toBeInTheDocument();
        });

        it('should render Repressurization step when depressurization failed', () => {
            const fsec = createMockFsec({ categoryId: 4, statusId: 13, depressurizationFailed: true });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Should include Repress. step
            expect(screen.getByText('Repress.')).toBeInTheDocument();
        });

        it('should render HS chip', () => {
            const fsec = createMockFsec();
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // HS chip is a MUI Chip with role="button"
            const hsChip = screen.getByRole('button', { name: /HS/ });
            expect(hsChip).toBeInTheDocument();
        });

        it('should highlight HS chip when status is HS (8)', () => {
            const fsec = createMockFsec({ statusId: 8 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            const hsChip = screen.getByRole('button', { name: /HS/ });
            expect(hsChip).toHaveClass('MuiChip-colorError');
        });

        it('should show active step based on current status', () => {
            const fsec = createMockFsec({ categoryId: 0, statusId: 2 }); // Métrologie
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // The step label for Métrologie should be highlighted
            const metrologieLabel = screen.getByText('Métrologie');
            expect(metrologieLabel).toBeInTheDocument();
        });
    });

    // ============================================================================
    // STEP CLICK TESTS
    // ============================================================================

    describe('Step Click Interactions', () => {
        it('should open confirmation dialog when clicking a different step', async () => {
            const fsec = createMockFsec({ categoryId: 0, statusId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Click on Assemblage step icon (the step icons are custom Box elements, not buttons)
            clickStepByLabel('Assemblage');

            // Should show confirmation dialog
            await waitFor(() => {
                expect(screen.getByText('Confirmer le changement de statut')).toBeInTheDocument();
            });
            expect(screen.getByText(/Êtes-vous sûr/)).toBeInTheDocument();
        });

        it('should show current and target status in dialog', async () => {
            const fsec = createMockFsec({ categoryId: 0, statusId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Click on Assemblage step (step id=1)
            clickStepByLabel('Assemblage');

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });

            const dialog = screen.getByRole('dialog');
            expect(within(dialog).getByText('Design')).toBeInTheDocument();
            expect(within(dialog).getByText('Assemblage')).toBeInTheDocument();
        });

        it('should not open dialog when clicking current step', async () => {
            const fsec = createMockFsec({ categoryId: 0, statusId: 1 }); // Assemblage
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Click on current step (Assemblage)
            clickStepByLabel('Assemblage');

            // Dialog should not appear (handleStepClick returns early for current step)
            expect(screen.queryByText('Confirmer le changement de statut')).not.toBeInTheDocument();
        });

        it('should close dialog when clicking cancel', async () => {
            const user = userEvent.setup();
            const fsec = createMockFsec({ categoryId: 0, statusId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Open dialog
            clickStepByLabel('Assemblage');

            await waitFor(() => {
                expect(screen.getByText('Confirmer le changement de statut')).toBeInTheDocument();
            });

            // Click cancel
            const cancelButton = screen.getByRole('button', { name: /annuler/i });
            await user.click(cancelButton);

            // Dialog should close
            await waitFor(() => {
                expect(screen.queryByText('Confirmer le changement de statut')).not.toBeInTheDocument();
            });
        });
    });

    // ============================================================================
    // HS CHIP TESTS
    // ============================================================================

    describe('HS Chip Functionality', () => {
        it('should open confirmation dialog when clicking HS chip', async () => {
            const user = userEvent.setup();
            const fsec = createMockFsec({ statusId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // The HS chip is the MUI Chip with role="button"
            const hsChip = screen.getByRole('button', { name: /HS/ });
            await user.click(hsChip);

            await waitFor(() => {
                expect(screen.getByText('Confirmer le changement de statut')).toBeInTheDocument();
            });
        });

        it('should not open dialog when clicking HS chip if already HS', async () => {
            const user = userEvent.setup();
            const fsec = createMockFsec({ statusId: 8 }); // Already HS
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            const hsChip = screen.getByRole('button', { name: /HS/ });
            await user.click(hsChip);

            // Dialog should not appear
            expect(screen.queryByText('Confirmer le changement de statut')).not.toBeInTheDocument();
        });
    });

    // ============================================================================
    // DÉCISION MOE CHIP TESTS
    // ============================================================================

    describe('Décision MOE Chip Functionality', () => {
        it('should render Décision MOE chip', () => {
            const fsec = createMockFsec();
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            expect(screen.getByRole('button', { name: /Décision MOE/ })).toBeInTheDocument();
        });

        it('should highlight (filled) Décision MOE chip when status is Décision MOE (15)', () => {
            const fsec = createMockFsec({ statusId: 15 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            const chip = screen.getByRole('button', { name: /Décision MOE/ });
            // Actif = variante "filled" ; inactif = "outlined".
            expect(chip).toHaveClass('MuiChip-filled');
        });

        it('should keep Décision MOE chip outlined when not in that status', () => {
            const fsec = createMockFsec({ statusId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            const chip = screen.getByRole('button', { name: /Décision MOE/ });
            expect(chip).toHaveClass('MuiChip-outlined');
        });

        it('should open confirmation dialog when clicking Décision MOE chip', async () => {
            const user = userEvent.setup();
            const fsec = createMockFsec({ statusId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            await user.click(screen.getByRole('button', { name: /Décision MOE/ }));

            await waitFor(() => {
                expect(screen.getByText('Confirmer le changement de statut')).toBeInTheDocument();
            });

            // The target status shown in the dialog is "Décision MOE"
            const dialog = screen.getByRole('dialog');
            expect(within(dialog).getByText('Décision MOE')).toBeInTheDocument();
        });

        it('should not open dialog when clicking Décision MOE chip if already in that status', async () => {
            const user = userEvent.setup();
            const fsec = createMockFsec({ statusId: 15 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            await user.click(screen.getByRole('button', { name: /Décision MOE/ }));

            expect(screen.queryByText('Confirmer le changement de statut')).not.toBeInTheDocument();
        });

        it('should show the paused visual state (chip filled, no completed step) when status is Décision MOE', () => {
            const fsec = createMockFsec({ categoryId: 0, statusId: 15 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Paused FSEC : chip rempli et aucune étape marquée terminée.
            // NB : la logique d'avancement figé (isPausedFsecStatus) est testée à la
            // source dans planning.utils.test.ts (isFsecStepDone), seul endroit où elle
            // a un effet observable — un statut de pause n'apparaît dans aucune séquence.
            expect(screen.getByRole('button', { name: /Décision MOE/ })).toHaveClass('MuiChip-filled');
            expect(screen.queryAllByTestId('CheckIcon')).toHaveLength(0);
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
                http.put('/api/v1/fsecs/:uuid/', () => {
                    apiCalled = true;
                    return HttpResponse.json(createMockFsecApiResponse({ status_id: 1 }));
                }),
            );

            const fsec = createMockFsec({ categoryId: 0, statusId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Click on step
            clickStepByLabel('Assemblage');

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });

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
                http.put('/api/v1/fsecs/:uuid/', () => {
                    return HttpResponse.json(createMockFsecApiResponse({ status_id: 1 }));
                }),
            );

            const fsec = createMockFsec({ categoryId: 0, statusId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Click on step and confirm
            clickStepByLabel('Assemblage');

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });

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
                http.put('/api/v1/fsecs/:uuid/', () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            const fsec = createMockFsec({ categoryId: 0, statusId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Click on step and confirm
            clickStepByLabel('Assemblage');

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });

            const confirmButton = screen.getByRole('button', { name: /confirmer/i });
            await user.click(confirmButton);

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith(expect.stringContaining('Erreur'), 'error');
            });
        });

        it('should disable stepper during pending state', async () => {
            const user = userEvent.setup();

            // Delay response
            server.use(
                http.put('/api/v1/fsecs/:uuid/', async () => {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    return HttpResponse.json(createMockFsecApiResponse({ status_id: 1 }));
                }),
            );

            const fsec = createMockFsec({ categoryId: 0, statusId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Click and confirm
            clickStepByLabel('Assemblage');

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });

            const confirmButton = screen.getByRole('button', { name: /confirmer/i });
            await user.click(confirmButton);

            // After confirm, dialog closes and isPending becomes true
            // The HS chip should be disabled during pending state
            await waitFor(() => {
                const hsChip = screen.getByRole('button', { name: /HS/ });
                expect(hsChip).toHaveAttribute('aria-disabled', 'true');
            });
        });
    });

    // ============================================================================
    // WORKFLOW SEQUENCE TESTS
    // ============================================================================

    describe('Workflow Sequences', () => {
        it('should use correct sequence for category 0', () => {
            const fsec = createMockFsec({ categoryId: 0 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Category 0: [0, 1, 2, 3, 16, 4, 5, 6, 7]
            const labels = [
                'Design',
                'Assemblage',
                'Métrologie',
                'Scellement',
                'Vérif. scellement',
                'Photos',
                'Disponible',
                'Installation',
                'Tirée',
            ];
            labels.forEach((label) => {
                expect(screen.getByText(label)).toBeInTheDocument();
            });

            // Ordre : Vérif. scellement (16) entre Scellement (3) et Photos (4)
            expectStepBefore('Scellement', 'Vérif. scellement');
            expectStepBefore('Vérif. scellement', 'Photos');
        });

        it('should use correct sequence for category 1', () => {
            const fsec = createMockFsec({ categoryId: 1 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Category 1: [0, 1, 2, 3, 16, 4, 10, 11, 5, 6, 7]
            // Should include Vérif. scellement (16), Étanchéité (10) and Remp. BP (11)
            expect(screen.getByText('Vérif. scellement')).toBeInTheDocument();
            expect(screen.getByText('Étanchéité')).toBeInTheDocument();
            expect(screen.getByText('Remp. BP')).toBeInTheDocument();

            // Ordre : 16 entre Scellement et Photos, et Photos AVANT Étanchéité
            expectStepBefore('Scellement', 'Vérif. scellement');
            expectStepBefore('Vérif. scellement', 'Photos');
            expectStepBefore('Photos', 'Étanchéité');
        });

        it('should use correct sequence for category 2', () => {
            const fsec = createMockFsec({ categoryId: 2 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Category 2: [0, 1, 2, 3, 16, 4, 9, 5, 6, 7]
            expect(screen.getByText('Vérif. scellement')).toBeInTheDocument();
            expect(screen.getByText('Remp. HP')).toBeInTheDocument();

            // Ordre : 16 entre Scellement et Photos
            expectStepBefore('Scellement', 'Vérif. scellement');
            expectStepBefore('Vérif. scellement', 'Photos');
        });

        it('should use correct sequence for category 3', () => {
            const fsec = createMockFsec({ categoryId: 3 });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Category 3: [0, 1, 2, 3, 16, 4, 10, 11, 9, 5, 6, 7]
            // Should include Vérif. scellement, Étanchéité, Remp. BP, Remp. HP
            expect(screen.getByText('Vérif. scellement')).toBeInTheDocument();
            expect(screen.getByText('Étanchéité')).toBeInTheDocument();
            expect(screen.getByText('Remp. BP')).toBeInTheDocument();
            expect(screen.getByText('Remp. HP')).toBeInTheDocument();

            // Ordre : 16 entre Scellement et Photos, et Photos AVANT Étanchéité
            expectStepBefore('Scellement', 'Vérif. scellement');
            expectStepBefore('Vérif. scellement', 'Photos');
            expectStepBefore('Photos', 'Étanchéité');
        });

        it('should use correct sequence for category 4 without repressurization', () => {
            const fsec = createMockFsec({ categoryId: 4, depressurizationFailed: false });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Category 4 without repress: [0, 1, 2, 3, 16, 4, 10, 12, 13, 11, 5, 6, 7]
            expect(screen.getByText('Vérif. scellement')).toBeInTheDocument();
            expect(screen.getByText('Perméation')).toBeInTheDocument();
            expect(screen.getByText('Dépress.')).toBeInTheDocument();
            expect(screen.queryByText('Repress.')).not.toBeInTheDocument();

            // Ordre : 16 entre Scellement et Photos, et Photos AVANT Étanchéité
            expectStepBefore('Scellement', 'Vérif. scellement');
            expectStepBefore('Vérif. scellement', 'Photos');
            expectStepBefore('Photos', 'Étanchéité');
        });

        it('should add repressurization for category 4 when depressurization failed', () => {
            const fsec = createMockFsec({ categoryId: 4, depressurizationFailed: true });
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Should include Repress. (14), inséré après Dépress. (13)
            expect(screen.getByText('Repress.')).toBeInTheDocument();
            expectStepBefore('Dépress.', 'Repress.');
        });

        it('should fallback to category 0 for unknown category', () => {
            const fsec = createMockFsec({ categoryId: 99 }); // Unknown
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Should use category 0 sequence (9 steps)
            const stepLabels = screen.getAllByText(
                /Design|Assemblage|Métrologie|Scellement|Vérif\. scellement|Photos|Disponible|Installation|Tirée/,
            );
            expect(stepLabels.length).toBeGreaterThanOrEqual(9);
        });
    });

    // ============================================================================
    // ACCESSIBILITY TESTS
    // ============================================================================

    describe('Accessibility', () => {
        it('should have clickable step icons', () => {
            const fsec = createMockFsec();
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // The HS chip is the main button role element
            const hsButton = screen.getByRole('button', { name: /HS/ });
            expect(hsButton).toBeInTheDocument();
            // Step labels are all rendered
            expect(screen.getByText('Design')).toBeInTheDocument();
        });

        it('should have accessible dialog', async () => {
            const fsec = createMockFsec();
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Open dialog by clicking a step
            clickStepByLabel('Assemblage');

            // Dialog should be accessible
            await waitFor(() => {
                const dialog = screen.getByRole('dialog');
                expect(dialog).toBeInTheDocument();
            });
        });

        it('should allow keyboard navigation to close dialog', async () => {
            const user = userEvent.setup();
            const fsec = createMockFsec();
            renderWithProviders(<FsecWorkflowStepper fsec={fsec} />);

            // Open dialog
            clickStepByLabel('Assemblage');

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });

            // Press Escape to close
            await user.keyboard('{Escape}');

            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        });
    });
});
