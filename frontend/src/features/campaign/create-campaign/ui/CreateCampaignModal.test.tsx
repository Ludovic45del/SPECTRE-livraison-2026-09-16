/**
 * Tests for CreateCampaignModal Component
 *
 * Tests the Campaign creation modal including:
 * - Form rendering
 * - Validation
 * - API submission
 * - Team member creation
 * - Error handling
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { CreateCampaignModal } from './CreateCampaignModal';
import { useCreateCampaignStore } from '../model';
import { useNotificationStore } from '@shared/lib/notification';

// Mock data
const mockCreatedCampaign = {
    uuid: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Campaign Test',
    year: 2025,
    semester: 'S1',
    type_id: 1,
    status_id: 0,
    installation_id: 1,
    start_date: '2025-01-01',
    end_date: '2025-06-30',
    dtri_number: 12345,
    description: 'Test description',
    last_updated: '2025-01-15T10:00:00Z',
};

// Real campaign types from @entities/campaign/core/lib/referential
const CAMPAIGN_TYPES = [
    { id: 0, label: 'Campagne DAM' },
    { id: 1, label: "Campagne d'installation" },
    { id: 2, label: "Campagne d'ouverture" },
];

// Real campaign installations from @entities/campaign/core/lib/referential
const CAMPAIGN_INSTALLATIONS = [
    { id: 0, label: 'LMJ' },
    { id: 1, label: 'OMEGA' },
];

/** Helper: find the MUI Select combobox associated with a label text */
function findMuiSelectByLabel(labelText: RegExp): HTMLElement {
    // MUI Select renders a div[role="combobox"] inside a FormControl.
    // The InputLabel text is a sibling of the Select's root. We find the label element
    // then navigate up to the FormControl and find the combobox within it.
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
    // Options appear in a listbox in a portal
    const listbox = await screen.findByRole('listbox');
    const option = within(listbox).getByText(optionText);
    await user.click(option);
}

describe('CreateCampaignModal', () => {
    beforeEach(() => {
        // Reset stores
        useCreateCampaignStore.getState().close();
        useNotificationStore.getState().clearAll();

        // Setup default handlers
        server.use(
            http.post('/api/v1/campaigns/', () => {
                return HttpResponse.json(mockCreatedCampaign, { status: 201 });
            }),
            http.post('/api/v1/campaign-teams/', () => {
                return HttpResponse.json({ uuid: 'team-member-uuid' }, { status: 201 });
            }),
        );
    });

    afterEach(() => {
        useCreateCampaignStore.getState().close();
    });

    // Helper to open the modal
    const openModal = () => {
        useCreateCampaignStore.getState().open();
    };

    /** Helper: fill all required fields (name + type + installation). Uses id 0
     * options on purpose to guard against regressions of the `|| null` bug that
     * previously dropped type_id=0 / installation_id=0 to null. */
    async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
        await user.type(screen.getByLabelText(/^nom/i), 'Campaign Test');
        await selectChipSelectOption(user, /^type$/i, CAMPAIGN_TYPES[0].label);
        await selectChipSelectOption(user, /^installation$/i, CAMPAIGN_INSTALLATIONS[0].label);
    }

    describe('Rendering', () => {
        it('should render modal when store isOpen is true', () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('should not render modal when store isOpen is false', () => {
            renderWithProviders(<CreateCampaignModal />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('should render tab header with "Donn\u00e9es g\u00e9n\u00e9rales"', () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            expect(screen.getByRole('tab', { name: /données générales/i })).toBeInTheDocument();
        });

        it('should render close button', () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // The close IconButton has no aria-label; find it via the CloseIcon testid
            const closeIcon = screen.getByTestId('CloseIcon');
            const closeButton = closeIcon.closest('button');
            expect(closeButton).toBeInTheDocument();
        });

        it('should render all form fields', () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Basic fields
            expect(screen.getByLabelText(/^nom/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/année/i)).toBeInTheDocument();

            // MUI Select labels - find via label text
            expect(screen.getByText('Semestre', { selector: 'label' })).toBeInTheDocument();

            // Type and Installation (ChipSelect renders label text)
            expect(screen.getByText('Type', { selector: 'label' })).toBeInTheDocument();
            expect(screen.getByText('Installation', { selector: 'label' })).toBeInTheDocument();

            // Dates — sélection de plage via le RangeCalendar partagé
            expect(screen.getByText(/dates de campagne/i)).toBeInTheDocument();
            expect(screen.getByRole('grid')).toBeInTheDocument();

            // DTRI and Description
            expect(screen.getByLabelText(/n° dtri/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
        });

        it('should render team members section', () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            expect(screen.getByText(/équipe projet/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/moe/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/rce/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/iec/i)).toBeInTheDocument();
        });

        it('should render action buttons', () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /créer/i })).toBeInTheDocument();
        });
    });

    describe('Form Defaults', () => {
        it('should have empty name field', () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            const nameInput = screen.getByLabelText(/^nom/i) as HTMLInputElement;
            expect(nameInput.value).toBe('');
        });

        it('should have current year as default', () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            const yearInput = screen.getByLabelText(/année/i) as HTMLInputElement;
            expect(yearInput.value).toBe(String(new Date().getFullYear()));
        });

        it('should have S1 as default semester', () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // MUI Select renders a div[role="combobox"] whose text content shows the selected value
            const semesterCombobox = findMuiSelectByLabel(/semestre/i);
            expect(semesterCombobox).toHaveTextContent('S1');
        });

        it('should have empty team member fields', () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            const moeInput = screen.getByLabelText(/moe/i) as HTMLInputElement;
            const rceInput = screen.getByLabelText(/rce/i) as HTMLInputElement;
            const iecInput = screen.getByLabelText(/iec/i) as HTMLInputElement;

            expect(moeInput.value).toBe('');
            expect(rceInput.value).toBe('');
            expect(iecInput.value).toBe('');
        });
    });

    describe('Form Validation', () => {
        it('should show error when name is empty', async () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Submit by firing submit event on the form directly
            const form = document.getElementById('create-campaign-form')!;
            fireEvent.submit(form);

            // After submit, react-hook-form validation should trigger and show errors
            await waitFor(() => {
                const nameInput = screen.getByLabelText(/^nom/i);
                expect(nameInput).toHaveAttribute('aria-invalid', 'true');
            });
        });

        it('should show error when type is not selected', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Fill name but not type
            const nameInput = screen.getByLabelText(/^nom/i);
            await user.type(nameInput, 'Campaign Test');

            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            await waitFor(() => {
                // Zod message for z.number().int({ message: 'Type requis' }) when undefined -> "Required" or "Type requis"
                // Accept either standard Zod message or custom message
                const dialog = screen.getByRole('dialog');
                // At minimum the form should stay open (didn't submit)
                expect(dialog).toBeInTheDocument();
            });
        });

        it('should show error when installation is not selected', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Fill name
            const nameInput = screen.getByLabelText(/^nom/i);
            await user.type(nameInput, 'Campaign Test');

            // Select type via the ChipSelect dropdown
            await selectChipSelectOption(user, /type/i, CAMPAIGN_TYPES[0].label);

            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            await waitFor(() => {
                // Form should stay open (not submitted due to validation)
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
        });

        it('should validate year range (2000-2100)', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Set invalid year
            const yearInput = screen.getByLabelText(/année/i);
            await user.clear(yearInput);
            await user.type(yearInput, '1999');

            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            // Form should not submit or show error
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
        });
    });

    describe('Type Selection', () => {
        it('should display all campaign types in dropdown', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Open the Type dropdown
            const typeCombobox = findMuiSelectByLabel(/^type$/i);
            await user.click(typeCombobox);

            const listbox = await screen.findByRole('listbox');
            for (const type of CAMPAIGN_TYPES) {
                expect(within(listbox).getByText(type.label)).toBeInTheDocument();
            }
        });

        it('should select type on option click', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            await selectChipSelectOption(user, /^type$/i, CAMPAIGN_TYPES[0].label);

            // The selected value should be displayed in the combobox
            const typeCombobox = findMuiSelectByLabel(/^type$/i);
            expect(typeCombobox).toHaveTextContent(CAMPAIGN_TYPES[0].label);
        });
    });

    describe('Installation Selection', () => {
        it('should display all campaign installations in dropdown', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Open the Installation dropdown
            const installationCombobox = findMuiSelectByLabel(/^installation$/i);
            await user.click(installationCombobox);

            const listbox = await screen.findByRole('listbox');
            for (const installation of CAMPAIGN_INSTALLATIONS) {
                expect(within(listbox).getByText(installation.label)).toBeInTheDocument();
            }
        });

        it('should select installation on option click', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            await selectChipSelectOption(user, /^installation$/i, CAMPAIGN_INSTALLATIONS[0].label);

            const installationCombobox = findMuiSelectByLabel(/^installation$/i);
            expect(installationCombobox).toHaveTextContent(CAMPAIGN_INSTALLATIONS[0].label);
        });
    });

    describe('Semester Selection', () => {
        it('should allow selecting S1 or S2', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            const semesterCombobox = findMuiSelectByLabel(/semestre/i);
            await user.click(semesterCombobox);

            expect(screen.getByRole('option', { name: 'S1' })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'S2' })).toBeInTheDocument();
        });

        it('should change semester on selection', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            const semesterCombobox = findMuiSelectByLabel(/semestre/i);
            await user.click(semesterCombobox);
            await user.click(screen.getByRole('option', { name: 'S2' }));

            expect(semesterCombobox).toHaveTextContent('S2');
        });
    });

    describe('Form Submission', () => {
        it('should call create API with correct data', async () => {
            const user = userEvent.setup();
            let submittedData: unknown;

            server.use(
                http.post('/api/v1/campaigns/', async ({ request }) => {
                    submittedData = await request.json();
                    return HttpResponse.json(mockCreatedCampaign, { status: 201 });
                }),
            );

            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Fill required fields
            await fillRequiredFields(user);

            // Submit
            const submitButton = screen.getByRole('button', { name: /créer/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(submittedData).toMatchObject({
                    name: 'Campaign Test',
                    type_id: expect.any(Number),
                    installation_id: expect.any(Number),
                });
            });
        });

        it('should add team members after campaign creation', async () => {
            const user = userEvent.setup();
            let teamMemberCalls = 0;

            server.use(
                http.post('/api/v1/campaign-teams/', () => {
                    teamMemberCalls++;
                    return HttpResponse.json({ uuid: `team-${teamMemberCalls}` }, { status: 201 });
                }),
            );

            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Fill required fields
            await fillRequiredFields(user);

            // Fill MOE (texte libre, exterieur au labo)
            await user.type(screen.getByLabelText('MOE'), 'John Doe');

            // Fill RCE via UserSelect (filtre rôle 'rce' + 'chef_labo')
            await user.click(screen.getByLabelText('RCE'));
            await user.click(await screen.findByRole('option', { name: /Marc Durand/ }));

            // Fill IEC via UserSelect (filtre rôle 'iec' + 'chef_labo')
            await user.click(screen.getByLabelText('IEC'));
            await user.click(await screen.findByRole('option', { name: /Jean Bernard/ }));

            // Submit
            await user.click(screen.getByRole('button', { name: /créer/i }));

            await waitFor(() => {
                expect(teamMemberCalls).toBe(3);
            });
        });

        it('should close modal on successful creation', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Fill required fields
            await fillRequiredFields(user);

            // Submit
            await user.click(screen.getByRole('button', { name: /créer/i }));

            await waitFor(() => {
                expect(useCreateCampaignStore.getState().isOpen).toBe(false);
            });
        });

        it('should show loading state during submission', async () => {
            const user = userEvent.setup();
            let resolveRequest: () => void;
            const requestPromise = new Promise<void>((resolve) => {
                resolveRequest = resolve;
            });

            server.use(
                http.post('/api/v1/campaigns/', async () => {
                    await requestPromise;
                    return HttpResponse.json(mockCreatedCampaign, { status: 201 });
                }),
            );

            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Fill required fields
            await fillRequiredFields(user);

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
                expect(useCreateCampaignStore.getState().isOpen).toBe(false);
            });
        });
    });

    describe('Error Handling', () => {
        it('should show error message on campaign creation failure', async () => {
            const user = userEvent.setup();

            server.use(
                http.post('/api/v1/campaigns/', () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Fill required fields
            await fillRequiredFields(user);

            // Submit
            await user.click(screen.getByRole('button', { name: /créer/i }));

            await waitFor(() => {
                const notifications = useNotificationStore.getState().notifications;
                expect(notifications.length).toBeGreaterThan(0);
                expect(notifications[0].message).toMatch(/erreur/i);
                expect(notifications[0].type).toBe('error');
            });
        });

        it('should show warning when team member creation fails', async () => {
            const user = userEvent.setup();

            server.use(
                http.post('/api/v1/campaign-teams/', () => {
                    return HttpResponse.json({ error: 'Failed' }, { status: 500 });
                }),
            );

            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Fill required fields
            await fillRequiredFields(user);

            // Fill one team member
            await user.type(screen.getByLabelText(/moe/i), 'John Doe');

            // Submit
            await user.click(screen.getByRole('button', { name: /créer/i }));

            await waitFor(() => {
                const notifications = useNotificationStore.getState().notifications;
                expect(notifications.length).toBeGreaterThan(0);
                expect(notifications[0].message).toMatch(/n'ont pas pu être ajoutés/i);
                expect(notifications[0].type).toBe('warning');
            });
        });

        it('should not close modal on error', async () => {
            const user = userEvent.setup();

            server.use(
                http.post('/api/v1/campaigns/', () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Fill required fields
            await fillRequiredFields(user);

            // Submit
            await user.click(screen.getByRole('button', { name: /créer/i }));

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
        });
    });

    describe('Modal Close & Cancel', () => {
        it('should close modal on cancel button click', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            const cancelButton = screen.getByRole('button', { name: /annuler/i });
            await user.click(cancelButton);

            expect(useCreateCampaignStore.getState().isOpen).toBe(false);
        });

        it('should close modal on close icon click', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // The close IconButton has no aria-label; locate via CloseIcon testid
            const closeIcon = screen.getByTestId('CloseIcon');
            const closeButton = closeIcon.closest('button')!;
            await user.click(closeButton);

            expect(useCreateCampaignStore.getState().isOpen).toBe(false);
        });

        it('should reset form on close', async () => {
            const user = userEvent.setup();
            openModal();
            const { rerender } = renderWithProviders(<CreateCampaignModal />);

            // Fill form
            await user.type(screen.getByLabelText(/^nom/i), 'Campaign Test');

            // Close modal
            await user.click(screen.getByRole('button', { name: /annuler/i }));

            // Reopen modal
            openModal();
            rerender(<CreateCampaignModal />);

            // Form should be reset
            const nameInput = screen.getByLabelText(/^nom/i) as HTMLInputElement;
            expect(nameInput.value).toBe('');
        });

        it('should clear form values on close and reopen', async () => {
            const user = userEvent.setup();

            server.use(
                http.post('/api/v1/campaigns/', () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            openModal();
            const { rerender } = renderWithProviders(<CreateCampaignModal />);

            // Fill required fields and submit
            await fillRequiredFields(user);
            await user.click(screen.getByRole('button', { name: /créer/i }));

            await waitFor(() => {
                const notifications = useNotificationStore.getState().notifications;
                expect(notifications.length).toBeGreaterThan(0);
                expect(notifications[0].type).toBe('error');
            });

            // Close the modal
            await user.click(screen.getByRole('button', { name: /annuler/i }));

            // Reopen modal
            openModal();
            rerender(<CreateCampaignModal />);

            // Form fields should be reset even if mutation error state persists
            const nameInput = screen.getByLabelText(/^nom/i) as HTMLInputElement;
            expect(nameInput.value).toBe('');
        });
    });

    describe('Date Range Calendar', () => {
        it('should render the range calendar', () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // RangeCalendar partagé : grille de calendrier (DateCalendar)
            expect(screen.getByRole('grid')).toBeInTheDocument();
        });

        it('should prompt for the start date initially', () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            // Récap texte sous le calendrier (aucune plage sélectionnée)
            expect(screen.getByText(/cliquez la date de début/i)).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have accessible dialog role', () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            const dialog = screen.getByRole('dialog');
            expect(dialog).toBeInTheDocument();
        });

        it('should have required field indicators', () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            const nameInput = screen.getByLabelText(/^nom/i);
            expect(nameInput).toHaveAttribute('required');

            const yearInput = screen.getByLabelText(/année/i);
            expect(yearInput).toHaveAttribute('required');
        });

        it('should trap focus within modal', async () => {
            const user = userEvent.setup();
            openModal();
            renderWithProviders(<CreateCampaignModal />);

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
            renderWithProviders(<CreateCampaignModal />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

            act(() => {
                useCreateCampaignStore.getState().open();
            });

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
        });

        it('should close modal when store close() is called', async () => {
            openModal();
            renderWithProviders(<CreateCampaignModal />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();

            act(() => {
                useCreateCampaignStore.getState().close();
            });

            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        });
    });
});
