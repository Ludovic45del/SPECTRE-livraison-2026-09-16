/**
 * Tests for PhaseOuvertSection Component
 *
 * Tests the Phase 1 (Ouvert) section with view and edit modes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { PhaseOuvertSection } from './PhaseOuvertSection';
import type { Fa } from '@entities/fa';

// Valid UUIDs for Zod validation
const MOCK_FA_UUID = '00000000-0000-0000-0000-000000000001';
const MOCK_FSEC_VERSION_UUID = '00000000-0000-0000-0000-000000000002';
// UUID présent dans le mock MSW /api/v1/users/lookup/ (Alice Martin, métrologue)
const MOCK_DISCOVERER_UUID = '22222222-2222-2222-2222-222222222222';

// Mock FA data
const createMockFa = (overrides: Partial<Fa> = {}): Fa => ({
    slug: 'fa-001',
    fsecSlug: null,
    campaignSlug: null,
    uuid: MOCK_FA_UUID,
    fsecVersionId: MOCK_FSEC_VERSION_UUID,
    identifier: 'FA-001',
    statusId: 0,
    typeId: null,
    criticalityId: null,
    fsecStepId: 2,
    fsecStepOther: null,
    eventDate: new Date('2025-02-15'),
    discoverer: 'Jean Dupont',
    discovererUserUuid: null,
    observation: 'Test observation',
    locationEquipment: 'Salle A',
    quickAnalysis: 'Analyse rapide test',
    immediateMeasures: 'Mesures prises',
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
    uuid: MOCK_FA_UUID,
    fsec_version_id: MOCK_FSEC_VERSION_UUID,
    identifier: 'FA-001',
    status_id: 0,
    type_id: null,
    criticality_id: null,
    fsec_step_id: 2,
    fsec_step_other: null,
    discoverer: 'Jean Dupont',
    discovererUserUuid: null,
    event_date: '2025-02-15',
    observation: 'Test observation',
    location_equipment: 'Salle A',
    quick_analysis: 'Analyse rapide test',
    immediate_measures: 'Mesures prises',
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
vi.mock('@shared/ui', async (importOriginal) => {
    const original = await importOriginal<typeof import('@shared/ui')>();
    return {
        ...original,
        useNotification: () => ({
            showNotification: mockShowNotification,
        }),
    };
});

describe('PhaseOuvertSection', () => {
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
        it('should render Phase 1 title', () => {
            const fa = createMockFa();
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            expect(screen.getByText('Phase 1 - Ouvert')).toBeInTheDocument();
        });

        it('should render section with proper aria-label', () => {
            const fa = createMockFa();
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            expect(screen.getByRole('region', { name: /Phase 1/i })).toBeInTheDocument();
        });

        it('should display FSEC step', () => {
            const fa = createMockFa({ fsecStepId: 2 });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            expect(screen.getByText('Étape FSEC')).toBeInTheDocument();
        });

        it('should display custom FSEC step when id is 7', () => {
            const fa = createMockFa({ fsecStepId: 7, fsecStepOther: 'Custom Step' });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            expect(screen.getByText(/Autre: Custom Step/)).toBeInTheDocument();
        });

        it('should display event date', () => {
            const fa = createMockFa({ eventDate: new Date('2025-02-15') });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            expect(screen.getByText("Date de l'évènement")).toBeInTheDocument();
        });

        it('should display discoverer', () => {
            const fa = createMockFa({ discoverer: 'Jean Dupont' });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            expect(screen.getByText('Découvreur')).toBeInTheDocument();
            expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
        });

        it('should display observation', () => {
            const fa = createMockFa({ observation: 'Test observation content' });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            expect(screen.getByText('Constat')).toBeInTheDocument();
            expect(screen.getByText('Test observation content')).toBeInTheDocument();
        });

        it('should display quick analysis', () => {
            const fa = createMockFa({ quickAnalysis: 'Quick analysis content' });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            expect(screen.getByText('Analyse rapide')).toBeInTheDocument();
            expect(screen.getByText('Quick analysis content')).toBeInTheDocument();
        });

        it('should display location equipment', () => {
            const fa = createMockFa({ locationEquipment: 'Equipment Room A' });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            expect(screen.getByText('Lieu / Équipement')).toBeInTheDocument();
            expect(screen.getByText('Equipment Room A')).toBeInTheDocument();
        });

        it('should display immediate measures when provided', () => {
            const fa = createMockFa({ immediateMeasures: 'Immediate action taken' });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            expect(screen.getByText('Mesures immédiates')).toBeInTheDocument();
            expect(screen.getByText('Immediate action taken')).toBeInTheDocument();
        });

        it('should show dash for empty fields', () => {
            const fa = createMockFa({
                discoverer: '',
                discovererUserUuid: null,
                observation: '',
                locationEquipment: '',
            });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            // Check that dashes are shown for empty fields
            const dashes = screen.getAllByText('-');
            expect(dashes.length).toBeGreaterThan(0);
        });

        it('should render edit button', () => {
            const fa = createMockFa();
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            expect(
                screen.getByRole('button', { name: /Modifier les informations de la Phase 1 Ouvert/i }),
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
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            // Should show form
            expect(screen.getByRole('form', { name: /Formulaire d'édition Phase 1/i })).toBeInTheDocument();
        });

        it('should pre-fill discoverer combobox from the FK (discovererUserUuid)', async () => {
            const user = userEvent.setup();
            const fa = createMockFa({
                discoverer: '',
                discovererUserUuid: MOCK_DISCOVERER_UUID,
                observation: 'Test observation',
            });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            // UserSelect (Autocomplete) : le combobox se pré-remplit une fois le
            // lookup /users/lookup/ résolu (handler MSW global).
            const discovererCombobox = screen.getByRole('combobox', { name: /Découvreur/i });
            await waitFor(() => {
                expect(discovererCombobox).toHaveValue('Alice Martin');
            });
        });

        it('should show legacy discoverer as helper text when FK is null', async () => {
            const user = userEvent.setup();
            const fa = createMockFa({
                discoverer: 'Jean Dupont',
                discovererUserUuid: null,
            });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            // FA legacy : combobox vide + rappel de la saisie historique.
            const discovererCombobox = screen.getByRole('combobox', { name: /Découvreur/i });
            expect(discovererCombobox).toHaveValue('');
            expect(screen.getByText('Saisie historique : Jean Dupont')).toBeInTheDocument();
        });

        it('should render cancel button in edit mode', async () => {
            const user = userEvent.setup();
            const fa = createMockFa();
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            expect(screen.getByRole('button', { name: /Annuler/i })).toBeInTheDocument();
        });

        it('should render save button in edit mode', async () => {
            const user = userEvent.setup();
            const fa = createMockFa();
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            expect(screen.getByRole('button', { name: /Enregistrer/i })).toBeInTheDocument();
        });

        it('should cancel edit mode when cancel button clicked', async () => {
            const user = userEvent.setup();
            const fa = createMockFa();
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            // Enter edit mode
            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            // Cancel
            const cancelButton = screen.getByRole('button', { name: /Annuler/i });
            await user.click(cancelButton);

            // Should be back to view mode
            expect(screen.queryByRole('form')).not.toBeInTheDocument();
        });

        it('should show fsecStepOther field when FSEC step is 7 (Autre)', async () => {
            const user = userEvent.setup();
            const fa = createMockFa({ fsecStepId: 7 });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            expect(screen.getByRole('textbox', { name: /Préciser/i })).toBeInTheDocument();
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
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            // Enter edit mode
            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            // Save
            const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
            await user.click(saveButton);

            await waitFor(() => {
                expect(apiCalled).toBe(true);
            });
        });

        it('should never send the discoverer key so the backend merge preserves legacy text', async () => {
            const user = userEvent.setup();
            let capturedBody: Record<string, unknown> | null = null;

            server.use(
                http.put('/api/v1/fas/:uuid/', async ({ request }) => {
                    capturedBody = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(createMockFaApiResponse());
                }),
            );

            // FA legacy : uuid null + texte historique non vide.
            const fa = createMockFa({ discoverer: 'Jean Dupont', discovererUserUuid: null });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
            await user.click(saveButton);

            await waitFor(() => {
                expect(capturedBody).not.toBeNull();
            });
            // La clé `discoverer` est omise (le merge backend conserve le texte
            // legacy) ; sans sélection, la FK est omise elle aussi.
            expect(capturedBody).not.toHaveProperty('discoverer');
            expect(capturedBody).not.toHaveProperty('discoverer_user_uuid');
        });

        it('should send discoverer_user_uuid when a user is selected', async () => {
            const user = userEvent.setup();
            let capturedBody: Record<string, unknown> | null = null;

            server.use(
                http.put('/api/v1/fas/:uuid/', async ({ request }) => {
                    capturedBody = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(createMockFaApiResponse());
                }),
            );

            const fa = createMockFa({ discoverer: '', discovererUserUuid: MOCK_DISCOVERER_UUID });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            // Attendre le pré-remplissage (lookup résolu) avant de sauvegarder.
            const discovererCombobox = screen.getByRole('combobox', { name: /Découvreur/i });
            await waitFor(() => {
                expect(discovererCombobox).toHaveValue('Alice Martin');
            });

            const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
            await user.click(saveButton);

            await waitFor(() => {
                expect(capturedBody).not.toBeNull();
            });
            expect(capturedBody).toHaveProperty('discoverer_user_uuid', MOCK_DISCOVERER_UUID);
            expect(capturedBody).not.toHaveProperty('discoverer');
        });

        it('should block save when neither FK nor legacy discoverer exists', async () => {
            const user = userEvent.setup();
            let apiCalled = false;

            server.use(
                http.put('/api/v1/fas/:uuid/', () => {
                    apiCalled = true;
                    return HttpResponse.json(createMockFaApiResponse());
                }),
            );

            const fa = createMockFa({ discoverer: '', discovererUserUuid: null });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            // Sans FK ni texte legacy, le combobox est requis : la validation
            // native du formulaire bloque la soumission.
            const discovererCombobox = screen.getByRole('combobox', { name: /Découvreur/i });
            expect(discovererCombobox).toBeRequired();

            const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
            await user.click(saveButton);

            // La sauvegarde est bloquée : pas d'appel API, formulaire toujours affiché.
            expect(apiCalled).toBe(false);
            expect(screen.getByRole('form', { name: /Formulaire d'édition Phase 1/i })).toBeInTheDocument();
        });

        it('should not require the discoverer select when a legacy text exists', async () => {
            const user = userEvent.setup();
            const fa = createMockFa({ discoverer: 'Jean Dupont', discovererUserUuid: null });
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            // La saisie historique tient lieu de valeur : le champ n'est pas requis
            // (sinon la validation native empêcherait toute sauvegarde de la FA legacy).
            const discovererCombobox = screen.getByRole('combobox', { name: /Découvreur/i });
            expect(discovererCombobox).not.toBeRequired();
        });

        it('should show success notification on save', async () => {
            const user = userEvent.setup();

            server.use(
                http.put('/api/v1/fas/:uuid/', () => {
                    return HttpResponse.json(createMockFaApiResponse());
                }),
            );

            const fa = createMockFa();
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            // Enter edit mode
            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            // Save
            const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
            await user.click(saveButton);

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith('Phase Ouvert mise à jour', 'success');
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
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            // Enter edit mode
            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            // Save
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
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            // Enter edit mode
            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            // Save
            const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
            await user.click(saveButton);

            await waitFor(() => {
                expect(saveButton).toBeDisabled();
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
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            // Enter edit mode
            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            // Save
            const saveButton = screen.getByRole('button', { name: /Enregistrer/i });
            await user.click(saveButton);

            // Should return to view mode
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
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

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
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            // Enter edit mode
            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            // Save
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
            renderWithProviders(<PhaseOuvertSection fa={fa} />);

            const editButton = screen.getByRole('button', {
                name: /Modifier les informations de la Phase 1 Ouvert/i,
            });
            await user.click(editButton);

            expect(screen.getByRole('form')).toBeInTheDocument();
        });
    });
});
