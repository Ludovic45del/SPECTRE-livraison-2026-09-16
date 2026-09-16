/**
 * Tests for CreateFsecModal Component
 *
 * Tests the FSEC creation modal including:
 * - Form rendering
 * - Validation
 * - API submission
 * - Navigation after creation
 * - Error handling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, act, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { CreateFsecModal } from './CreateFsecModal';
import { useCreateFsecStore } from '../model';

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

// Mock campaigns in snake_case matching CampaignApiSchema
// These will be parsed by CampaignListSchema then hydrated with getCampaignInstallation
// installation_id: 0 -> { id: 0, label: 'LMJ', color: '#7ac7f5' }
// installation_id: 1 -> { id: 1, label: 'OMEGA', color: '#c9a0dc' }
const mockCampaigns = [
    {
        uuid: '00000000-0000-0000-0000-000000000001',
        name: 'Campaign Test 1',
        year: 2025,
        semester: 'S1',
        type_id: 0,
        status_id: 0,
        installation_id: 0,
        last_updated: null,
        start_date: null,
        end_date: null,
        dtri_number: null,
        description: null,
    },
    {
        uuid: '00000000-0000-0000-0000-000000000002',
        name: 'Campaign Test 2',
        year: 2025,
        semester: 'S2',
        type_id: 0,
        status_id: 0,
        installation_id: 1,
        last_updated: null,
        start_date: null,
        end_date: null,
        dtri_number: null,
        description: null,
    },
];

// Mock FSEC response in snake_case matching FsecApiSchema
const mockCreatedFsec = {
    version_uuid: '00000000-0000-0000-0000-000000000010',
    fsec_uuid: '00000000-0000-0000-0000-000000000011',
    slug: '2025-s1-lmj-campagne-fsec-test',
    name: 'FSEC Test',
    campaign_id: '00000000-0000-0000-0000-000000000001',
    category_id: 0,
    status_id: 0,
    rack_id: null,
    comments: 'Test comments',
    is_active: true,
    created_at: '2025-01-15T10:00:00Z',
    last_updated: '2025-01-15T10:00:00Z',
    delivery_date: null,
    shooting_date: null,
    preshooting_pressure: null,
    experience_srxx: null,
    localisation: null,
    depressurization_failed: null,
};

/** Helper: find the MUI Select combobox associated with a label text */
function findMuiSelectByLabel(labelText: RegExp): HTMLElement {
    // MUI Select renders a div[role="combobox"] inside a FormControl.
    // The InputLabel text is a sibling of the Select's root.
    // We find the label element then navigate up to the FormControl and find the combobox within it.
    const label = screen.getByText(labelText, { selector: 'label' });
    const formControl = label.closest('.MuiFormControl-root')!;
    const combobox = formControl.querySelector('[role="combobox"]') as HTMLElement;
    return combobox;
}

/** Helper: select a value in a ChipSelect (MUI Select dropdown) by its label */
async function selectChipSelectOption(
    user: ReturnType<typeof userEvent.setup>,
    selectLabel: RegExp,
    optionText: string,
) {
    const combobox = findMuiSelectByLabel(selectLabel);
    await user.click(combobox);
    const listbox = await screen.findByRole('listbox');
    const option = within(listbox).getByText(optionText);
    await user.click(option);
}

describe('CreateFsecModal', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
        mockShowNotification.mockClear();

        // Reset store
        useCreateFsecStore.getState().close();

        // Setup default handlers
        server.use(
            http.get('/api/v1/campaigns/', () => {
                return HttpResponse.json(mockCampaigns);
            }),
            http.post('/api/v1/fsecs/', () => {
                return HttpResponse.json(mockCreatedFsec, { status: 201 });
            }),
        );
    });

    afterEach(() => {
        useCreateFsecStore.getState().close();
    });

    // Helper to open the modal before rendering
    const openModal = () => {
        useCreateFsecStore.getState().open();
    };

    // Helper to find the close icon button (no aria-label on the IconButton)
    const getCloseButton = () => {
        const closeIcon = screen.getByTestId('CloseIcon');
        return closeIcon.closest('button') as HTMLElement;
    };

    // Campaign option labels after hydration through formatCampaignLabel:
    // "${year}-${installation.label}_${name}"
    // campaign 1: installation_id=0 -> LMJ -> "2025-LMJ_Campaign Test 1"
    // campaign 2: installation_id=1 -> OMEGA -> "2025-OMEGA_Campaign Test 2"

    // Helper to select a campaign in the Autocomplete
    const selectCampaign = async (user: ReturnType<typeof userEvent.setup>) => {
        const campaignInput = screen.getByLabelText(/campagne/i);
        await user.click(campaignInput);

        // Wait for options to load from MSW
        const option = await screen.findByText('2025-LMJ_Campaign Test 1');
        await user.click(option);
    };

    describe('Rendering', () => {
        it('should render modal when store isOpen is true', () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('should not render modal when store isOpen is false', () => {
            renderWithProviders(<CreateFsecModal />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('should render tab header with "Donnees generales"', () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            expect(screen.getByRole('tab', { name: /données générales/i })).toBeInTheDocument();
        });

        it('should render close button', () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            const closeButton = getCloseButton();
            expect(closeButton).toBeInTheDocument();
        });

        it('should render form fields', () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Campaign selector
            expect(screen.getByLabelText(/campagne/i)).toBeInTheDocument();

            // Name field
            expect(screen.getByLabelText(/nom de la fsec/i)).toBeInTheDocument();

            // Category field - ChipSelect uses InputLabel, which produces multiple elements
            // with text "Catégorie". Use getAllByText to verify at least one exists.
            expect(screen.getAllByText(/catégorie/i).length).toBeGreaterThan(0);

            // Comments field
            expect(screen.getByLabelText(/remarques/i)).toBeInTheDocument();
        });

        it('should render action buttons', () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /créer/i })).toBeInTheDocument();
        });

        it('should display default category "Sans Gaz" as selected', () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            // ChipSelect renders the selected value as a DataChip via renderValue
            // Default categoryId=0 maps to "Sans Gaz"
            expect(screen.getByText('Sans Gaz')).toBeInTheDocument();
        });
    });

    describe('Form Defaults', () => {
        it('should have empty name field', () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            const nameInput = screen.getByLabelText(/nom de la fsec/i) as HTMLInputElement;
            expect(nameInput.value).toBe('');
        });

        it('should have no campaign selected', () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            const campaignInput = screen.getByLabelText(/campagne/i) as HTMLInputElement;
            expect(campaignInput.value).toBe('');
        });

        it('should have "Sans Gaz" category selected by default', () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Default categoryId is 0 which is "Sans Gaz"
            const sansGazChip = screen.getByText('Sans Gaz');
            expect(sansGazChip).toBeInTheDocument();
        });

        it('should have empty comments field', () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            const commentsInput = screen.getByLabelText(/remarques/i) as HTMLInputElement;
            expect(commentsInput.value).toBe('');
        });
    });

    describe('Form Validation', () => {
        it('should show validation error when name is empty on submit', async () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Submit by firing submit event on the form directly
            // This bypasses browser native required validation in jsdom
            const form = document.getElementById('create-fsec-form')!;
            fireEvent.submit(form);

            // After submit, react-hook-form + zodResolver validation should trigger
            await waitFor(() => {
                const nameInput = screen.getByLabelText(/nom de la fsec/i);
                expect(nameInput).toHaveAttribute('aria-invalid', 'true');
            });
        });

        it('should show validation error when campaign is not selected on submit', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Fill name but not campaign
            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            await user.type(nameInput, 'FSEC Test');

            // Submit via fireEvent to bypass native required validation
            const form = document.getElementById('create-fsec-form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                // The campaign input should be marked as invalid
                const campaignInput = screen.getByLabelText(/campagne/i);
                expect(campaignInput).toHaveAttribute('aria-invalid', 'true');
            });
        });

        it('should clear validation errors when field is filled', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Trigger validation error via form submit
            const form = document.getElementById('create-fsec-form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                const nameInput = screen.getByLabelText(/nom de la fsec/i);
                expect(nameInput).toHaveAttribute('aria-invalid', 'true');
            });

            // Fill the name field
            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            await user.type(nameInput, 'FSEC Test');

            // Error should be cleared after input (react-hook-form re-validates on change after submit)
            await waitFor(
                () => {
                    expect(nameInput).toHaveAttribute('aria-invalid', 'false');
                },
                { timeout: 2000 },
            );
        });
    });

    describe('Campaign Selection', () => {
        it('should display campaign options in autocomplete', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFsecModal />);

            const campaignInput = screen.getByLabelText(/campagne/i);
            await user.click(campaignInput);

            // Should show campaign options with format: year-installation_name
            await waitFor(() => {
                expect(screen.getByText('2025-LMJ_Campaign Test 1')).toBeInTheDocument();
                expect(screen.getByText('2025-OMEGA_Campaign Test 2')).toBeInTheDocument();
            });
        });

        it('should select campaign on click', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFsecModal />);

            await selectCampaign(user);

            const campaignInput = screen.getByLabelText(/campagne/i);
            expect(campaignInput).toHaveDisplayValue(/2025-LMJ_Campaign Test 1/);
        });

        it('should display installation chip in campaign options', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFsecModal />);

            const campaignInput = screen.getByLabelText(/campagne/i);
            await user.click(campaignInput);

            // Should show installation label (from getCampaignInstallation referential)
            await waitFor(() => {
                expect(screen.getByText('LMJ')).toBeInTheDocument();
            });
        });
    });

    describe('Category Selection', () => {
        it('should change category via Select dropdown', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Use findMuiSelectByLabel to target the category ChipSelect specifically
            // (avoids conflict with the Autocomplete combobox)
            await selectChipSelectOption(user, /catégorie/i, 'Gaz BP');

            // After selection, the displayed value should now be "Gaz BP"
            const categoryCombobox = findMuiSelectByLabel(/catégorie/i);
            expect(categoryCombobox).toHaveTextContent('Gaz BP');
        });

        it('should only allow single category selection', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Select "Gaz BP"
            await selectChipSelectOption(user, /catégorie/i, 'Gaz BP');

            // Now select "Gaz HP" instead
            await selectChipSelectOption(user, /catégorie/i, 'Gaz HP');

            // Only "Gaz HP" should be shown as selected, not "Gaz BP"
            const categoryCombobox = findMuiSelectByLabel(/catégorie/i);
            expect(categoryCombobox).toHaveTextContent('Gaz HP');
        });
    });

    describe('Form Submission', () => {
        it('should call create API with correct data', async () => {
            const user = userEvent.setup();
            let submittedData: unknown;

            server.use(
                http.post('/api/v1/fsecs/', async ({ request }) => {
                    submittedData = await request.json();
                    return HttpResponse.json(mockCreatedFsec, { status: 201 });
                }),
            );

            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Fill form
            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            await user.type(nameInput, 'FSEC Test');

            // Select campaign
            await selectCampaign(user);

            // Select "Gaz BP" category via ChipSelect dropdown
            await selectChipSelectOption(user, /catégorie/i, 'Gaz BP');

            // Fill comments
            const commentsInput = screen.getByLabelText(/remarques/i);
            await user.type(commentsInput, 'Test comments');

            // Submit
            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            // The mutation calls fsecCreateToApi() which converts to snake_case
            await waitFor(() => {
                expect(submittedData).toMatchObject({
                    name: 'FSEC Test',
                    campaign_id: '00000000-0000-0000-0000-000000000001',
                    category_id: 1, // Gaz BP
                    comments: 'Test comments',
                    status_id: 0,
                });
            });
        });

        it('should show success notification on success', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Fill required fields
            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            await user.type(nameInput, 'FSEC Test');

            await selectCampaign(user);

            // Submit
            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith('FSEC créé avec succès', 'success');
            });
        });

        it('should navigate to FSEC details on success', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Fill required fields
            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            await user.type(nameInput, 'FSEC Test');

            await selectCampaign(user);

            // Submit
            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            await waitFor(() => {
                // slug from mockCreatedFsec drives the navigation URL
                expect(mockNavigate).toHaveBeenCalledWith('/fsec-details/2025-s1-lmj-campagne-fsec-test/overview');
            });
        });

        it('should close modal on success', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Fill required fields
            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            await user.type(nameInput, 'FSEC Test');

            await selectCampaign(user);

            // Submit
            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(useCreateFsecStore.getState().isOpen).toBe(false);
            });
        });

        it('should show loading state during submission', async () => {
            const user = userEvent.setup();
            let resolveRequest: () => void;
            const requestPromise = new Promise<void>((resolve) => {
                resolveRequest = resolve;
            });

            server.use(
                http.post('/api/v1/fsecs/', async () => {
                    await requestPromise;
                    return HttpResponse.json(mockCreatedFsec, { status: 201 });
                }),
            );

            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Fill required fields
            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            await user.type(nameInput, 'FSEC Test');

            await selectCampaign(user);

            // Submit
            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            // Button should show loading text while request is pending
            await waitFor(() => {
                expect(screen.getByText(/création/i)).toBeInTheDocument();
            });

            // Resolve the pending request to clean up
            resolveRequest!();
            await waitFor(() => {
                expect(useCreateFsecStore.getState().isOpen).toBe(false);
            });
        });
    });

    describe('Error Handling', () => {
        it('should show warning for duplicate FSEC (409)', async () => {
            const user = userEvent.setup();

            server.use(
                http.post('/api/v1/fsecs/', () => {
                    return HttpResponse.json({ error: 'Conflict' }, { status: 409 });
                }),
            );

            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Fill required fields
            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            await user.type(nameInput, 'FSEC Test');

            await selectCampaign(user);

            // Submit
            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith('Conflit : cette donnée existe déjà.', 'error');
            });
        });

        it('should show error for server error (500)', async () => {
            const user = userEvent.setup();

            server.use(
                http.post('/api/v1/fsecs/', () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Fill required fields
            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            await user.type(nameInput, 'FSEC Test');

            await selectCampaign(user);

            // Submit
            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith('Erreur serveur. Veuillez réessayer.', 'error');
            });
        });

        it('should show error notification on mutation error', async () => {
            const user = userEvent.setup();

            server.use(
                http.post('/api/v1/fsecs/', () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Fill required fields
            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            await user.type(nameInput, 'FSEC Test');

            await selectCampaign(user);

            // Submit
            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith('Erreur serveur. Veuillez réessayer.', 'error');
            });
        });

        it('should not close modal on error', async () => {
            const user = userEvent.setup();

            server.use(
                http.post('/api/v1/fsecs/', () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Fill required fields
            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            await user.type(nameInput, 'FSEC Test');

            await selectCampaign(user);

            // Submit
            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
        });

        it('should not navigate on error', async () => {
            const user = userEvent.setup();

            server.use(
                http.post('/api/v1/fsecs/', () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Fill required fields
            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            await user.type(nameInput, 'FSEC Test');

            await selectCampaign(user);

            // Submit
            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith('Erreur serveur. Veuillez réessayer.', 'error');
            });

            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    describe('Modal Close & Cancel', () => {
        it('should close modal on cancel button click', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFsecModal />);

            const cancelButton = screen.getByRole('button', { name: /annuler/i });
            await user.click(cancelButton);

            expect(useCreateFsecStore.getState().isOpen).toBe(false);
        });

        it('should close modal on close icon click', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFsecModal />);

            const closeButton = getCloseButton();
            await user.click(closeButton);

            expect(useCreateFsecStore.getState().isOpen).toBe(false);
        });

        it('should reset form on close', async () => {
            const user = userEvent.setup();
            openModal();
            const { rerender } = renderWithProviders(<CreateFsecModal />);

            // Fill form
            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            await user.type(nameInput, 'FSEC Test');

            // Close modal
            const cancelButton = screen.getByRole('button', { name: /annuler/i });
            await user.click(cancelButton);

            // Reopen modal
            act(() => {
                useCreateFsecStore.getState().open();
            });
            rerender(<CreateFsecModal />);

            // Form should be reset
            await waitFor(() => {
                const newNameInput = screen.getByLabelText(/nom de la fsec/i) as HTMLInputElement;
                expect(newNameInput.value).toBe('');
            });
        });

        it('should reset tab on close', async () => {
            const user = userEvent.setup();
            openModal();
            const { rerender } = renderWithProviders(<CreateFsecModal />);

            // Close modal
            const cancelButton = screen.getByRole('button', { name: /annuler/i });
            await user.click(cancelButton);

            // Reopen modal
            act(() => {
                useCreateFsecStore.getState().open();
            });
            rerender(<CreateFsecModal />);

            // Tab should be reset to first tab
            await waitFor(() => {
                const tab = screen.getByRole('tab', { name: /données générales/i });
                expect(tab).toHaveAttribute('aria-selected', 'true');
            });
        });
    });

    describe('Accessibility', () => {
        it('should have accessible dialog role', () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            const dialog = screen.getByRole('dialog');
            expect(dialog).toBeInTheDocument();
        });

        it('should have required field indicators', () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Check for required attribute
            const campaignInput = screen.getByLabelText(/campagne/i);
            expect(campaignInput).toHaveAttribute('required');

            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            expect(nameInput).toHaveAttribute('required');
        });

        it('should trap focus within modal', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateFsecModal />);

            // Tab through the modal
            await user.tab();
            await user.tab();
            await user.tab();
            await user.tab();
            await user.tab();

            // Focus should still be within the modal
            const dialog = screen.getByRole('dialog');
            expect(dialog.contains(document.activeElement)).toBe(true);
        });

        it('should have proper form labels', () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            // All inputs should have associated labels
            const campaignInput = screen.getByLabelText(/campagne/i);
            expect(campaignInput).toBeInTheDocument();

            const nameInput = screen.getByLabelText(/nom de la fsec/i);
            expect(nameInput).toBeInTheDocument();

            const commentsInput = screen.getByLabelText(/remarques/i);
            expect(commentsInput).toBeInTheDocument();
        });
    });

    describe('Store Integration', () => {
        it('should open modal when store open() is called', async () => {
            renderWithProviders(<CreateFsecModal />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

            act(() => {
                useCreateFsecStore.getState().open();
            });

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
        });

        it('should close modal when store close() is called', async () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();

            act(() => {
                useCreateFsecStore.getState().close();
            });

            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        });

        it('should reset modal when store reset() is called', async () => {
            openModal();
            renderWithProviders(<CreateFsecModal />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();

            act(() => {
                useCreateFsecStore.getState().reset();
            });

            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        });
    });
});
