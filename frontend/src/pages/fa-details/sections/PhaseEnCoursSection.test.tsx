/**
 * Tests for PhaseEnCoursSection Component
 *
 * Tests the Phase 2 (En cours) section with view and edit modes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { PhaseEnCoursSection } from './PhaseEnCoursSection';
import type { Fa } from '@entities/fa';

// Valid UUIDs for Zod validation
const MOCK_FA_UUID = '00000000-0000-0000-0000-000000000001';
const MOCK_FSEC_VERSION_UUID = '00000000-0000-0000-0000-000000000002';

// Mock FA data
const createMockFa = (overrides: Partial<Fa> = {}): Fa => ({
    slug: 'fa-001',
    fsecSlug: null,
    campaignSlug: null,
    uuid: MOCK_FA_UUID,
    fsecVersionId: MOCK_FSEC_VERSION_UUID,
    identifier: 'FA-001',
    statusId: 1,
    typeId: 1,
    criticalityId: 2,
    fsecStepId: null,
    fsecStepOther: null,
    eventDate: null,
    discoverer: 'Test Discoverer',
    discovererUserUuid: null,
    observation: 'Test observation',
    locationEquipment: null,
    quickAnalysis: 'Test analysis',
    immediateMeasures: null,
    iecValidationOpen: false,
    iecValidationOpenDate: null,
    iecValidationOpenName: null,
    iecValidationOpenUserUuid: null,
    cause: 'Test cause',
    experienceImpact: 'Test impact',
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
    uuid: MOCK_FA_UUID,
    fsec_version_id: MOCK_FSEC_VERSION_UUID,
    identifier: 'FA-001',
    status_id: 1,
    type_id: 1,
    criticality_id: 2,
    fsec_step_id: null,
    fsec_step_other: null,
    discoverer: 'Test Discoverer',
    discovererUserUuid: null,
    event_date: null,
    observation: 'Test observation',
    location_equipment: null,
    quick_analysis: 'Test analysis',
    immediate_measures: null,
    iec_validation_open: false,
    iec_validation_open_date: null,
    iec_validation_open_name: null,
    cause: 'Updated cause',
    experience_impact: 'Test impact',
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
vi.mock('@shared/ui', async (importOriginal) => {
    const original = await importOriginal<typeof import('@shared/ui')>();
    return {
        ...original,
        useNotification: () => ({
            showNotification: mockShowNotification,
        }),
    };
});

describe('PhaseEnCoursSection', () => {
    beforeEach(() => {
        mockShowNotification.mockClear();

        // useUpdateFa uses api.put (not patch)
        server.use(
            http.put('/api/v1/fas/:uuid/', () => {
                return HttpResponse.json(createMockFaApiResponse());
            }),
        );
    });

    // ============================================================================
    // RENDERING TESTS - VIEW MODE
    // ============================================================================

    describe('View Mode Rendering', () => {
        it('should render Phase 2 title', () => {
            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            expect(screen.getByText('Phase 2 - En cours')).toBeInTheDocument();
        });

        it('should render section with proper aria-label', () => {
            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            expect(screen.getByRole('region', { name: /Phase 2/i })).toBeInTheDocument();
        });

        it('should display Type (5M) label', () => {
            const fa = createMockFa({ typeId: 1 });
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            expect(screen.getByText('Type (5M)')).toBeInTheDocument();
        });

        it('should display Criticité label', () => {
            const fa = createMockFa({ criticalityId: 2 });
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            expect(screen.getByText('Criticité')).toBeInTheDocument();
        });

        it('should display cause identifiée', () => {
            const fa = createMockFa({ cause: 'Root cause identified' });
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            expect(screen.getByText('Cause identifiée')).toBeInTheDocument();
            expect(screen.getByText('Root cause identified')).toBeInTheDocument();
        });

        it('should display experience impact', () => {
            const fa = createMockFa({ experienceImpact: 'Impact on experience' });
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            expect(screen.getByText("Impact sur l'expérience")).toBeInTheDocument();
            expect(screen.getByText('Impact on experience')).toBeInTheDocument();
        });

        it('should show dash for null type', () => {
            const fa = createMockFa({ typeId: null });
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            // At least one dash for empty type
            const dashes = screen.getAllByText('-');
            expect(dashes.length).toBeGreaterThan(0);
        });

        it('should show dash for null criticality', () => {
            const fa = createMockFa({ criticalityId: null });
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const dashes = screen.getAllByText('-');
            expect(dashes.length).toBeGreaterThan(0);
        });

        it('should show dash for empty cause', () => {
            const fa = createMockFa({ cause: null });
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const dashes = screen.getAllByText('-');
            expect(dashes.length).toBeGreaterThan(0);
        });

        it('should render edit button', () => {
            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            expect(
                screen.getByRole('button', { name: /Modifier les informations de la Phase 2 En cours/i }),
            ).toBeInTheDocument();
        });
    });

    // ============================================================================
    // EDIT MODE TESTS
    // ============================================================================

    describe('Edit Mode', () => {
        it('should switch to edit mode when edit button clicked', async () => {
            const user = userEvent.setup();
            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            expect(screen.getByRole('form', { name: /Formulaire d'édition Phase 2/i })).toBeInTheDocument();
        });

        it('should pre-fill form with existing cause', async () => {
            const user = userEvent.setup();
            const fa = createMockFa({ cause: 'Existing cause' });
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            const causeInput = screen.getByRole('textbox', { name: /Cause identifiée/i });
            expect(causeInput).toHaveValue('Existing cause');
        });

        it('should pre-fill form with existing experience impact', async () => {
            const user = userEvent.setup();
            const fa = createMockFa({ experienceImpact: 'Existing impact' });
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            const impactInput = screen.getByRole('textbox', { name: /Impact/i });
            expect(impactInput).toHaveValue('Existing impact');
        });

        it('should render Type (5M) select in edit mode', async () => {
            const user = userEvent.setup();
            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            expect(screen.getByLabelText(/Type \(5M\)/i)).toBeInTheDocument();
        });

        it('should render Criticité select in edit mode', async () => {
            const user = userEvent.setup();
            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            expect(screen.getByLabelText(/Criticité/i)).toBeInTheDocument();
        });

        it('should render cancel button in edit mode', async () => {
            const user = userEvent.setup();
            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            expect(screen.getByRole('button', { name: /Annuler/i })).toBeInTheDocument();
        });

        it('should render save button in edit mode', async () => {
            const user = userEvent.setup();
            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            expect(screen.getByRole('button', { name: /Enregistrer/i })).toBeInTheDocument();
        });

        it('should cancel edit mode when cancel button clicked', async () => {
            const user = userEvent.setup();
            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            // Enter edit mode
            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            // Cancel
            const cancelButton = screen.getByRole('button', { name: /Annuler/i });
            await user.click(cancelButton);

            // Should be back to view mode
            expect(screen.queryByRole('form')).not.toBeInTheDocument();
        });

        it('should allow editing cause field', async () => {
            const user = userEvent.setup();
            const fa = createMockFa({ cause: '' });
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            const causeInput = screen.getByRole('textbox', { name: /Cause identifiée/i });
            await user.type(causeInput, 'New cause');

            expect(causeInput).toHaveValue('New cause');
        });

        it('should allow editing experience impact field', async () => {
            const user = userEvent.setup();
            const fa = createMockFa({ experienceImpact: '' });
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            const impactInput = screen.getByRole('textbox', { name: /Impact/i });
            await user.type(impactInput, 'New impact');

            expect(impactInput).toHaveValue('New impact');
        });
    });

    // ============================================================================
    // SAVE TESTS
    // ============================================================================

    describe('Save Functionality', () => {
        it('should call API on save', async () => {
            const user = userEvent.setup();
            let apiCalled = false;

            server.use(
                http.put('/api/v1/fas/:uuid/', () => {
                    apiCalled = true;
                    return HttpResponse.json(createMockFaApiResponse());
                }),
            );

            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
            await user.click(saveButton);

            await waitFor(() => {
                expect(apiCalled).toBe(true);
            });
        });

        it('should show success notification on save', async () => {
            const user = userEvent.setup();

            server.use(
                http.put('/api/v1/fas/:uuid/', () => {
                    return HttpResponse.json(createMockFaApiResponse());
                }),
            );

            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
            await user.click(saveButton);

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith('Phase En cours mise à jour', 'success');
            });
        });

        it('should show error notification on API failure', async () => {
            const user = userEvent.setup();

            server.use(
                http.put('/api/v1/fas/:uuid/', () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
            await user.click(saveButton);

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith(expect.any(String), 'error');
            });
        });

        it('should disable save button during pending state', async () => {
            const user = userEvent.setup();

            server.use(
                http.put('/api/v1/fas/:uuid/', async () => {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    return HttpResponse.json(createMockFaApiResponse());
                }),
            );

            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
            await user.click(saveButton);

            await waitFor(() => {
                expect(saveButton).toBeDisabled();
            });
        });

        it('should show loading text during pending state', async () => {
            const user = userEvent.setup();

            server.use(
                http.put('/api/v1/fas/:uuid/', async () => {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    return HttpResponse.json(createMockFaApiResponse());
                }),
            );

            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
            await user.click(saveButton);

            await waitFor(() => {
                expect(screen.getByText(/Enregistrement/i)).toBeInTheDocument();
            });
        });

        it('should return to view mode after successful save', async () => {
            const user = userEvent.setup();

            server.use(
                http.put('/api/v1/fas/:uuid/', () => {
                    return HttpResponse.json(createMockFaApiResponse());
                }),
            );

            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
            await user.click(saveButton);

            await waitFor(() => {
                expect(screen.queryByRole('form')).not.toBeInTheDocument();
            });
        });
    });

    // ============================================================================
    // ACCESSIBILITY TESTS
    // ============================================================================

    describe('Accessibility', () => {
        it('should have proper section role', () => {
            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            expect(screen.getByRole('region')).toBeInTheDocument();
        });

        it('should indicate busy state during update', async () => {
            const user = userEvent.setup();

            server.use(
                http.put('/api/v1/fas/:uuid/', async () => {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    return HttpResponse.json(createMockFaApiResponse());
                }),
            );

            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
            await user.click(saveButton);

            await waitFor(() => {
                const section = screen.getByRole('region');
                expect(section).toHaveAttribute('aria-busy', 'true');
            });
        });

        it('should have proper form role in edit mode', async () => {
            const user = userEvent.setup();
            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            expect(screen.getByRole('form')).toBeInTheDocument();
        });

        it('should have cancel and save buttons in edit mode', async () => {
            const user = userEvent.setup();
            const fa = createMockFa();
            renderWithProviders(<PhaseEnCoursSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 2 En cours/i,
            });
            await user.click(editButton);

            expect(screen.getByRole('button', { name: /Annuler/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Enregistrer/i })).toBeInTheDocument();
        });
    });
});
