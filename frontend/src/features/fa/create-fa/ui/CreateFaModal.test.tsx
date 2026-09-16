/**
 * Tests for CreateFaModal Component
 *
 * Tests the FA (Fiche d'Anomalie) creation modal including:
 * - Form rendering
 * - Cascading campaign/FSEC selection
 * - Phase Ouvert fields validation
 * - API submission
 * - Navigation after creation
 * - Error handling
 * - Preselection support
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { CreateFaModal } from './CreateFaModal';
import { useCreateFaStore } from '../model';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock notification
const mockShowNotification = vi.fn();
vi.mock('@shared/ui', async () => {
    const actual = await vi.importActual('@shared/ui');
    return {
        ...actual,
        useNotification: () => ({
            showNotification: mockShowNotification,
        }),
    };
});

// ============================================================================
// MOCK DATA - snake_case format matching Zod API schemas
// ============================================================================

// Valid UUIDs required by z.string().uuid()
const CAMPAIGN_UUID_1 = '00000000-0000-4000-8000-000000000001';
const CAMPAIGN_UUID_2 = '00000000-0000-4000-8000-000000000002';
const FSEC_VERSION_UUID_1 = '10000000-0000-4000-8000-000000000001';
const FSEC_VERSION_UUID_2 = '10000000-0000-4000-8000-000000000002';
const FSEC_VERSION_UUID_3 = '10000000-0000-4000-8000-000000000003';
const FSEC_UUID_1 = '20000000-0000-4000-8000-000000000001';
const FSEC_UUID_2 = '20000000-0000-4000-8000-000000000002';
const FSEC_UUID_3 = '20000000-0000-4000-8000-000000000003';
const FA_UUID_1 = '30000000-0000-4000-8000-000000000001';
const FA_UUID_NEW = '30000000-0000-4000-8000-000000000099';

// CampaignApiSchema: snake_case, all required fields
const mockCampaignsApi = [
    {
        uuid: CAMPAIGN_UUID_1,
        type_id: 0,
        status_id: 0,
        installation_id: 0,
        name: 'Campaign Test 1',
        year: 2025,
        semester: 'S1',
        last_updated: null,
        start_date: null,
        end_date: null,
        dtri_number: null,
        description: null,
    },
    {
        uuid: CAMPAIGN_UUID_2,
        type_id: 0,
        status_id: 0,
        installation_id: 1,
        name: 'Campaign Test 2',
        year: 2025,
        semester: 'S2',
        last_updated: null,
        start_date: null,
        end_date: null,
        dtri_number: null,
        description: null,
    },
];

// FsecApiSchema: snake_case, all required fields
const mockFsecsApi = [
    {
        version_uuid: FSEC_VERSION_UUID_1,
        fsec_uuid: FSEC_UUID_1,
        campaign_id: CAMPAIGN_UUID_1,
        status_id: 0,
        category_id: 0,
        rack_id: null,
        name: 'FSEC-001',
        display_name: '2025-LMJ_Campaign Test 1_FSEC-001',
        comments: null,
        last_updated: null,
        is_active: true,
        created_at: null,
        delivery_date: null,
        shooting_date: null,
        preshooting_pressure: null,
        experience_srxx: null,
        localisation: null,
        depressurization_failed: null,
    },
    {
        version_uuid: FSEC_VERSION_UUID_2,
        fsec_uuid: FSEC_UUID_2,
        campaign_id: CAMPAIGN_UUID_1,
        status_id: 0,
        category_id: 1,
        rack_id: null,
        name: 'FSEC-002',
        display_name: '2025-LMJ_Campaign Test 1_FSEC-002',
        comments: null,
        last_updated: null,
        is_active: true,
        created_at: null,
        delivery_date: null,
        shooting_date: null,
        preshooting_pressure: null,
        experience_srxx: null,
        localisation: null,
        depressurization_failed: null,
    },
    {
        version_uuid: FSEC_VERSION_UUID_3,
        fsec_uuid: FSEC_UUID_3,
        campaign_id: CAMPAIGN_UUID_1,
        status_id: 0,
        category_id: 2,
        rack_id: null,
        name: 'FSEC-003',
        display_name: '2025-LMJ_Campaign Test 1_FSEC-003',
        comments: null,
        last_updated: null,
        is_active: true,
        created_at: null,
        delivery_date: null,
        shooting_date: null,
        preshooting_pressure: null,
        experience_srxx: null,
        localisation: null,
        depressurization_failed: null,
    },
];

// FaApiSchema: snake_case, all required fields
const mockFasApi = [
    {
        uuid: FA_UUID_1,
        fsec_version_id: FSEC_VERSION_UUID_1, // This FSEC already has a FA
        status_id: 0,
        type_id: 0,
        criticality_id: 0,
        identifier: 'FA-001',
        fsec_step_id: null,
        fsec_step_other: null,
        discoverer: 'Someone',
        event_date: '2025-01-01',
        observation: 'Observation',
        location_equipment: null,
        quick_analysis: 'Analysis',
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
        created_at: null,
        last_updated: null,
    },
];

// Full FaApiSchema response for created FA
const mockCreatedFaApi = {
    uuid: FA_UUID_NEW,
    slug: 'fa-2025-new',
    fsec_version_id: FSEC_VERSION_UUID_2,
    status_id: 0,
    type_id: null,
    criticality_id: null,
    identifier: 'FA-002',
    fsec_step_id: null,
    fsec_step_other: null,
    discoverer: 'John Doe',
    event_date: '2025-01-15',
    observation: 'Anomalie detectee',
    location_equipment: null,
    quick_analysis: 'Analyse rapide',
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
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
};

// ============================================================================
// Campaign label format: "${year}-${installation.label}_${name}"
// After hydration, installation_id=0 -> { label: 'LMJ' }
// So campaign 1 label = "2025-LMJ_Campaign Test 1"
// Campaign 2: installation_id=1 -> { label: 'OMEGA' }
// So campaign 2 label = "2025-OMEGA_Campaign Test 2"
// FSEC options (FsecAutocomplete) : nom complet calculé backend "${campaignLabel}_${fsec.name}"
// ============================================================================

const CAMPAIGN_1_LABEL = '2025-LMJ_Campaign Test 1';
const FSEC_001_LABEL = `${CAMPAIGN_1_LABEL}_FSEC-001`;
const FSEC_002_LABEL = `${CAMPAIGN_1_LABEL}_FSEC-002`;
const FSEC_003_LABEL = `${CAMPAIGN_1_LABEL}_FSEC-003`;

/** Helper to find the close IconButton (which has no aria-label) via its CloseIcon child */
function getCloseButton(): HTMLElement {
    const closeIcon = screen.getByTestId('CloseIcon');
    // The icon is inside the IconButton: <button><svg data-testid="CloseIcon" /></button>
    return closeIcon.closest('button') as HTMLElement;
}

describe('CreateFaModal', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
        mockShowNotification.mockClear();

        // Reset store
        useCreateFaStore.getState().reset();

        // Setup default handlers with snake_case API-format data
        server.use(
            http.get('/api/v1/campaigns/', () => {
                return HttpResponse.json(mockCampaignsApi);
            }),
            http.get('/api/v1/fsecs/campaign/:campaignUuid/', () => {
                return HttpResponse.json(mockFsecsApi);
            }),
            http.get('/api/v1/fas/', () => {
                return HttpResponse.json(mockFasApi);
            }),
            http.post('/api/v1/fas/', () => {
                return HttpResponse.json(mockCreatedFaApi, { status: 201 });
            }),
        );
    });

    afterEach(() => {
        useCreateFaStore.getState().reset();
    });

    // Helper to open the modal
    const openModal = (fsecVersionId?: string, campaignId?: string) => {
        useCreateFaStore.getState().open(fsecVersionId, campaignId);
    };

    // Helper: select campaign 1 from the autocomplete dropdown
    async function selectCampaign1(user: ReturnType<typeof userEvent.setup>) {
        const campaignInput = screen.getByLabelText(/campagne/i);
        await user.click(campaignInput);
        // Label format: "2025-LMJ_Campaign Test 1"
        const listbox = await screen.findByRole('listbox');
        const option = within(listbox).getByText(/Campaign Test 1/);
        await user.click(option);
    }

    // Helper: select campaign 2 from the autocomplete dropdown
    async function selectCampaign2(user: ReturnType<typeof userEvent.setup>) {
        const campaignInput = screen.getByLabelText(/campagne/i);
        await user.click(campaignInput);
        const listbox = await screen.findByRole('listbox');
        const option = within(listbox).getByText(/Campaign Test 2/);
        await user.click(option);
    }

    // Helper: select FSEC-002 from the FSEC dropdown.
    // Libellé = nom complet : "2025-LMJ_Campaign Test 1_FSEC-002"
    async function selectFsec002(user: ReturnType<typeof userEvent.setup>) {
        await waitFor(() => {
            expect(screen.getByLabelText(/^FSEC/i)).not.toBeDisabled();
        });
        await user.click(screen.getByLabelText(/^FSEC/i));
        const listbox = await screen.findByRole('listbox');
        const option = within(listbox).getByText(FSEC_002_LABEL);
        await user.click(option);
    }

    // Helper: select first discoverer in UserSelect dropdown (mock /users/lookup/).
    async function selectDiscoverer(user: ReturnType<typeof userEvent.setup>) {
        const input = screen.getByLabelText(/découvreur/i);
        await user.click(input);
        const option = await screen.findByRole('option', { name: /Pierre Dupont/ });
        await user.click(option);
    }

    // Helper: fill all required Phase Ouvert fields
    async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
        await selectDiscoverer(user);
        await user.type(screen.getByLabelText(/constat/i), 'Test observation');
        await user.type(screen.getByLabelText(/analyse rapide/i), 'Test analysis');
    }

    // Helper: submit the form (works reliably in jsdom unlike button click)
    function submitForm() {
        const form = document.getElementById('create-fa-form')!;
        fireEvent.submit(form);
    }

    describe('Rendering', () => {
        it('should render modal when store isOpen is true', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('should not render modal when store isOpen is false', () => {
            renderWithProviders(<CreateFaModal />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('should render tab header with "Nouvelle Fiche d\'Anomalie"', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            expect(screen.getByRole('tab', { name: /nouvelle fiche d'anomalie/i })).toBeInTheDocument();
        });

        it('should render close button', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            // The close IconButton has no aria-label, find via CloseIcon data-testid
            const closeButton = getCloseButton();
            expect(closeButton).toBeInTheDocument();
        });

        it('should render campaign selector', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            expect(screen.getByLabelText(/campagne/i)).toBeInTheDocument();
        });

        it('should render FSEC selector', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            expect(screen.getByLabelText(/^FSEC/i)).toBeInTheDocument();
        });

        it('should render Phase Ouvert fields', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            expect(screen.getByLabelText(/découvreur/i)).toBeInTheDocument();
            // DatePicker renders label on multiple elements; use getAllByLabelText
            const dateElements = screen.getAllByLabelText(/date de l'évènement/i);
            expect(dateElements.length).toBeGreaterThan(0);
            expect(screen.getByLabelText(/constat/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/lieu/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/analyse rapide/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/mesures immédiates/i)).toBeInTheDocument();
        });

        it('should render action buttons', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /créer/i })).toBeInTheDocument();
        });

        it('should render information subtitle', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            expect(screen.getByText(/informations de l'anomalie/i)).toBeInTheDocument();
        });
    });

    describe('Form Defaults', () => {
        it('should have empty discoverer field', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            // UserSelect (Autocomplete MUI) : input role textbox vide au démarrage
            const discovererInput = screen.getByLabelText(/découvreur/i) as HTMLInputElement;
            expect(discovererInput.value).toBe('');
        });

        it('should have today as default event date', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            // DatePicker may render label on multiple elements; find the input one
            const dateElements = screen.getAllByLabelText(/date de l'évènement/i);
            const dateInput = dateElements.find((el) => el.tagName === 'INPUT') as HTMLInputElement;
            // Date should be filled with today's date (DD/MM/YYYY in French locale)
            expect(dateInput).toBeDefined();
            expect(dateInput.value).not.toBe('');
        });

        it('should have empty observation field', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            const observationInput = screen.getByLabelText(/constat/i) as HTMLInputElement;
            expect(observationInput.value).toBe('');
        });

        it('should have FSEC selector disabled when no campaign selected', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            const fsecInput = screen.getByLabelText(/^FSEC/i);
            expect(fsecInput).toBeDisabled();
        });

        it('should show helper text for FSEC when no campaign selected', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            expect(screen.getByText(/sélectionnez d'abord une campagne/i)).toBeInTheDocument();
        });
    });

    describe('Cascading Selection', () => {
        it('should enable FSEC selector after campaign selection', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFaModal />);

            // Select campaign
            await selectCampaign1(user);

            // FSEC should be enabled
            await waitFor(() => {
                const fsecInput = screen.getByLabelText(/^FSEC/i);
                expect(fsecInput).not.toBeDisabled();
            });
        });

        it('should reset FSEC when campaign changes', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFaModal />);

            // Select campaign 1
            await selectCampaign1(user);

            // Wait for FSECs to load
            await waitFor(() => {
                expect(screen.getByLabelText(/^FSEC/i)).not.toBeDisabled();
            });

            // Select FSEC
            await selectFsec002(user);

            // Change campaign
            await selectCampaign2(user);

            // FSEC should be reset
            const fsecInput = screen.getByLabelText(/^FSEC/i) as HTMLInputElement;
            expect(fsecInput.value).toBe('');
        });

        it('should list all FSECs of the campaign (multiple FA per FSEC allowed)', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFaModal />);

            // Select campaign
            await selectCampaign1(user);

            // Open FSEC dropdown
            await waitFor(() => {
                expect(screen.getByLabelText(/^FSEC/i)).not.toBeDisabled();
            });
            await user.click(screen.getByLabelText(/^FSEC/i));

            const listbox = await screen.findByRole('listbox');

            // Une FSEC peut désormais porter plusieurs FA : aucune n'est filtrée,
            // y compris FSEC-001 qui a déjà une FA. Les options affichent le nom
            // complet de la cible (campagne + FSEC, R02).
            expect(within(listbox).getByText(FSEC_001_LABEL)).toBeInTheDocument();
            expect(within(listbox).getByText(FSEC_002_LABEL)).toBeInTheDocument();
            expect(within(listbox).getByText(FSEC_003_LABEL)).toBeInTheDocument();
        });

        it('should show the full target name in the FSEC field once selected', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFaModal />);

            await selectCampaign1(user);
            await selectFsec002(user);

            const fsecInput = screen.getByLabelText(/^FSEC/i) as HTMLInputElement;
            expect(fsecInput.value).toBe(FSEC_002_LABEL);
        });
    });

    describe('Form Validation', () => {
        it('should show error when campaign is not selected', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFaModal />);

            // Fill other fields but not campaign
            await selectDiscoverer(user);
            await user.type(screen.getByLabelText(/constat/i), 'Test observation');
            await user.type(screen.getByLabelText(/analyse rapide/i), 'Test analysis');

            // Submit via fireEvent.submit (button click unreliable in jsdom)
            submitForm();

            await waitFor(() => {
                // Zod message: "La campagne est requise"
                expect(screen.getByText(/campagne.*requise/i)).toBeInTheDocument();
            });
        });

        it('should show error when FSEC is not selected', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFaModal />);

            // Select campaign
            await selectCampaign1(user);

            // Fill other fields but not FSEC
            await selectDiscoverer(user);
            await user.type(screen.getByLabelText(/constat/i), 'Test observation');
            await user.type(screen.getByLabelText(/analyse rapide/i), 'Test analysis');

            // Submit via fireEvent.submit
            submitForm();

            await waitFor(() => {
                // Zod message: "La FSEC est requise"
                expect(screen.getByText(/fsec.*requise/i)).toBeInTheDocument();
            });
        });

        it('should show error when discoverer is empty', async () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            // Submit without filling any fields
            submitForm();

            await waitFor(() => {
                // Zod message: "Le decouvreur est requis"
                expect(screen.getByText(/découvreur.*requis/i)).toBeInTheDocument();
            });
        });

        it('should show error when observation is empty', async () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            // Submit without filling any fields
            submitForm();

            await waitFor(() => {
                // Zod message: "Le constat est requis"
                expect(screen.getByText(/constat.*requis/i)).toBeInTheDocument();
            });
        });

        it('should show error when quick analysis is empty', async () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            // Submit without filling any fields
            submitForm();

            await waitFor(() => {
                // Zod message: "L'analyse rapide est requise"
                expect(screen.getByText(/analyse rapide.*requise/i)).toBeInTheDocument();
            });
        });
    });

    describe('Form Submission', () => {
        it('should call create API with correct data', async () => {
            const user = userEvent.setup();
            let submittedData: unknown;

            server.use(
                http.post('/api/v1/fas/', async ({ request }) => {
                    submittedData = await request.json();
                    return HttpResponse.json(mockCreatedFaApi, { status: 201 });
                }),
            );

            openModal();
            renderWithProviders(<CreateFaModal />);

            // Select campaign
            await selectCampaign1(user);

            // Select FSEC
            await selectFsec002(user);

            // Fill Phase Ouvert fields
            await selectDiscoverer(user);
            await user.type(screen.getByLabelText(/constat/i), 'Anomalie detectee');
            await user.type(screen.getByLabelText(/analyse rapide/i), 'Analyse en cours');

            // Submit
            await user.click(screen.getByRole('button', { name: /créer/i }));

            await waitFor(() => {
                // faCreateToApi transforms to snake_case
                expect(submittedData).toMatchObject({
                    fsec_version_id: FSEC_VERSION_UUID_2,
                    discoverer_user_uuid: '11111111-1111-1111-1111-111111111111',
                    observation: 'Anomalie detectee',
                    quick_analysis: 'Analyse en cours',
                });
            });
        });

        it('should show success notification on success', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFaModal />);

            // Fill required fields
            await selectCampaign1(user);
            await selectFsec002(user);
            await fillRequiredFields(user);

            // Submit
            await user.click(screen.getByRole('button', { name: /créer/i }));

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith("Fiche d'Anomalie créée avec succès", 'success');
            });
        });

        it('should navigate to FA details on success', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFaModal />);

            // Fill required fields
            await selectCampaign1(user);
            await selectFsec002(user);
            await fillRequiredFields(user);

            // Submit
            await user.click(screen.getByRole('button', { name: /créer/i }));

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/fa-details/fa-2025-new/phase1');
            });
        });

        it('should close modal on success', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFaModal />);

            // Fill required fields
            await selectCampaign1(user);
            await selectFsec002(user);
            await fillRequiredFields(user);

            // Submit
            await user.click(screen.getByRole('button', { name: /créer/i }));

            await waitFor(() => {
                expect(useCreateFaStore.getState().isOpen).toBe(false);
            });
        });

        it('should show loading state during submission', async () => {
            const user = userEvent.setup();

            server.use(
                http.post('/api/v1/fas/', async () => {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    return HttpResponse.json(mockCreatedFaApi, { status: 201 });
                }),
            );

            openModal();
            renderWithProviders(<CreateFaModal />);

            // Fill required fields
            await selectCampaign1(user);
            await selectFsec002(user);
            await fillRequiredFields(user);

            // Submit
            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            // Button should show loading text
            await waitFor(() => {
                expect(screen.getByText(/création/i)).toBeInTheDocument();
            });

            // Wait for the mutation to fully resolve to avoid leaking into next test
            await waitFor(() => {
                expect(useCreateFaStore.getState().isOpen).toBe(false);
            });
        });
    });

    describe('Error Handling', () => {
        it('should show warning for duplicate FA (409)', async () => {
            const user = userEvent.setup();

            server.use(
                http.post('/api/v1/fas/', () => {
                    return HttpResponse.json({ error: 'Conflict' }, { status: 409 });
                }),
            );

            openModal();
            renderWithProviders(<CreateFaModal />);

            // Fill required fields
            await selectCampaign1(user);
            await selectFsec002(user);
            await fillRequiredFields(user);

            // Submit
            await user.click(screen.getByRole('button', { name: /créer/i }));

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith('Conflit : cette donnée existe déjà.', 'error');
            });
        });

        it('should show error for server error (500)', async () => {
            const user = userEvent.setup();

            server.use(
                http.post('/api/v1/fas/', () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            openModal();
            renderWithProviders(<CreateFaModal />);

            // Fill required fields
            await selectCampaign1(user);
            await selectFsec002(user);
            await fillRequiredFields(user);

            // Submit
            await user.click(screen.getByRole('button', { name: /créer/i }));

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith('Erreur serveur. Veuillez réessayer.', 'error');
            });
        });

        it('should show error notification on mutation error', async () => {
            const user = userEvent.setup();

            server.use(
                http.post('/api/v1/fas/', () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            openModal();
            renderWithProviders(<CreateFaModal />);

            // Fill required fields
            await selectCampaign1(user);
            await selectFsec002(user);
            await fillRequiredFields(user);

            // Submit
            await user.click(screen.getByRole('button', { name: /créer/i }));

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith('Erreur serveur. Veuillez réessayer.', 'error');
            });
        });

        it('should not close modal on error', async () => {
            const user = userEvent.setup();

            server.use(
                http.post('/api/v1/fas/', () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            openModal();
            renderWithProviders(<CreateFaModal />);

            // Fill required fields
            await selectCampaign1(user);
            await selectFsec002(user);
            await fillRequiredFields(user);

            // Submit
            await user.click(screen.getByRole('button', { name: /créer/i }));

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
        });
    });

    describe('Preselection', () => {
        it('should preselect campaign when provided', async () => {
            openModal(undefined, CAMPAIGN_UUID_1);
            renderWithProviders(<CreateFaModal />);

            await waitFor(() => {
                const campaignInput = screen.getByLabelText(/campagne/i) as HTMLInputElement;
                // Hydrated label: "2025-LMJ_Campaign Test 1"
                expect(campaignInput.value).toContain('Campaign Test 1');
            });
        });

        it('should preselect FSEC when provided', async () => {
            openModal(FSEC_VERSION_UUID_2, CAMPAIGN_UUID_1);
            renderWithProviders(<CreateFaModal />);

            await waitFor(() => {
                const fsecInput = screen.getByLabelText(/^FSEC/i) as HTMLInputElement;
                // Libellé contextualisé (R02) : campagne + nom de la FSEC.
                expect(fsecInput.value).toBe(FSEC_002_LABEL);
            });
        });

        it('should enable FSEC selector when campaign is preselected', async () => {
            openModal(undefined, CAMPAIGN_UUID_1);
            renderWithProviders(<CreateFaModal />);

            await waitFor(() => {
                const fsecInput = screen.getByLabelText(/^FSEC/i);
                expect(fsecInput).not.toBeDisabled();
            });
        });
    });

    describe('Modal Close & Cancel', () => {
        it('should close modal on cancel button click', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFaModal />);

            const cancelButton = screen.getByRole('button', { name: /annuler/i });
            await user.click(cancelButton);

            expect(useCreateFaStore.getState().isOpen).toBe(false);
        });

        it('should close modal on close icon click', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFaModal />);

            const closeButton = getCloseButton();
            await user.click(closeButton);

            expect(useCreateFaStore.getState().isOpen).toBe(false);
        });

        it('should reset form on close', async () => {
            const user = userEvent.setup();
            openModal();
            const { rerender } = renderWithProviders(<CreateFaModal />);

            // Fill form
            await selectDiscoverer(user);

            // Close modal
            await user.click(screen.getByRole('button', { name: /annuler/i }));

            // Reopen modal
            act(() => {
                openModal();
            });
            rerender(<CreateFaModal />);

            // Form should be reset
            await waitFor(() => {
                const discovererInput = screen.getByLabelText(/découvreur/i) as HTMLInputElement;
                expect(discovererInput.value).toBe('');
            });
        });

        it('should reset campaign selection on close', async () => {
            const user = userEvent.setup();
            openModal();
            const { rerender } = renderWithProviders(<CreateFaModal />);

            // Select campaign
            await selectCampaign1(user);

            // Close modal
            await user.click(screen.getByRole('button', { name: /annuler/i }));

            // Reopen modal
            act(() => {
                openModal();
            });
            rerender(<CreateFaModal />);

            // Campaign should be reset
            await waitFor(() => {
                const campaignInput = screen.getByLabelText(/campagne/i) as HTMLInputElement;
                expect(campaignInput.value).toBe('');
            });
        });
    });

    describe('Accessibility', () => {
        it('should have accessible dialog role', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            const dialog = screen.getByRole('dialog');
            expect(dialog).toBeInTheDocument();
        });

        it('should have required field indicators', () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            const campaignInput = screen.getByLabelText(/campagne/i);
            expect(campaignInput).toHaveAttribute('required');

            const fsecInput = screen.getByLabelText(/^FSEC/i);
            expect(fsecInput).toHaveAttribute('required');

            const discovererInput = screen.getByLabelText(/découvreur/i);
            expect(discovererInput).toHaveAttribute('required');

            const observationInput = screen.getByLabelText(/constat/i);
            expect(observationInput).toHaveAttribute('required');
        });

        it('should trap focus within modal', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFaModal />);

            // Tab through the modal multiple times
            for (let i = 0; i < 15; i++) {
                await user.tab();
            }

            // Focus should still be within the modal
            const dialog = screen.getByRole('dialog');
            expect(dialog.contains(document.activeElement)).toBe(true);
        });
    });

    describe('Store Integration', () => {
        it('should open modal when store open() is called', async () => {
            renderWithProviders(<CreateFaModal />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

            act(() => {
                useCreateFaStore.getState().open();
            });

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
        });

        it('should close modal when store close() is called', async () => {
            openModal();
            renderWithProviders(<CreateFaModal />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();

            act(() => {
                useCreateFaStore.getState().close();
            });

            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        });

        it('should reset modal and preselected values when store reset() is called', async () => {
            openModal(FSEC_VERSION_UUID_2, CAMPAIGN_UUID_1);
            renderWithProviders(<CreateFaModal />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();

            act(() => {
                useCreateFaStore.getState().reset();
            });

            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });

            // Preselected values should be reset
            expect(useCreateFaStore.getState().preselectedCampaignId).toBeNull();
            expect(useCreateFaStore.getState().preselectedFsecVersionId).toBeNull();
        });
    });
});
