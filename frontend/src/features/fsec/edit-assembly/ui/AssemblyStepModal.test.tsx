/**
 * Tests for AssemblyStepModal Component
 *
 * Tests the Assembly step modal for create, edit, and delete operations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { useNotificationStore } from '@shared/lib';
import { AssemblyStepModal } from './AssemblyStepModal';

// UUID de l'assembleur disponible dans mockUserLookup (Lucie Petit, role: 'assembleur').
const ASSEMBLER_UUID = '44444444-4444-4444-4444-444444444444';

// Mock data - camelCase domain model for component props
const mockAssemblyStep = {
    uuid: '00000000-0000-0000-0000-000000000001',
    fsecVersionId: '00000000-0000-0000-0000-000000000002',
    operator: 'Lucie Petit',
    operatorUserUuid: ASSEMBLER_UUID,
    operatorUserUuids: [ASSEMBLER_UUID],
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-02-15'),
    comments: 'Test assembly step',
    machineUuids: [],
};

// Mock API response - snake_case matching AssemblyStepApiSchema
const mockAssemblyStepApi = {
    uuid: '00000000-0000-0000-0000-000000000001',
    fsec_version_id: '00000000-0000-0000-0000-000000000002',
    operator: 'Lucie Petit',
    operator_user_uuid: ASSEMBLER_UUID,
    operator_user_uuids: [ASSEMBLER_UUID],
    start_date: '2025-02-01',
    end_date: '2025-02-15',
    comments: 'Test assembly step',
    machine_uuids: [],
};

describe('AssemblyStepModal', () => {
    const mockOnClose = vi.fn();
    const fsecVersionId = '00000000-0000-0000-0000-000000000002';

    beforeEach(() => {
        mockOnClose.mockClear();

        // Setup default handlers
        server.use(
            http.post('/api/v1/assembly-steps/', () => {
                return HttpResponse.json(mockAssemblyStepApi, { status: 201 });
            }),
            http.put('/api/v1/assembly-steps/:uuid/', () => {
                return HttpResponse.json(mockAssemblyStepApi);
            }),
            http.delete('/api/v1/assembly-steps/:uuid/', () => {
                return new HttpResponse(null, { status: 204 });
            }),
        );
    });

    describe('Rendering', () => {
        it('should render modal when open', () => {
            renderWithProviders(<AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('should not render modal when closed', () => {
            renderWithProviders(<AssemblyStepModal open={false} onClose={mockOnClose} fsecVersionId={fsecVersionId} />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('should render create form when no step provided', () => {
            renderWithProviders(<AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} />);

            // Should show create title ("Nouvel assemblage")
            expect(screen.getByText(/nouvel assemblage/i)).toBeInTheDocument();
        });

        it('should render edit form when step provided', () => {
            renderWithProviders(
                <AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} step={mockAssemblyStep} />,
            );

            // Should show edit title
            expect(screen.getByText(/modifier|éditer/i)).toBeInTheDocument();
        });

        it('should render Assembleur selector', () => {
            renderWithProviders(<AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} />);

            // UserSelect rend un Autocomplete avec label "Assembleur"
            expect(screen.getByLabelText(/assembleur/i)).toBeInTheDocument();
        });
    });

    describe('Create Mode', () => {
        it('should call update API on edit submit (Assembleurs préservés)', async () => {
            const user = userEvent.setup();
            const putBody: { current: Record<string, unknown> | null } = { current: null };

            server.use(
                http.put(`/api/v1/assembly-steps/${mockAssemblyStep.uuid}/`, async ({ request }) => {
                    putBody.current = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(mockAssemblyStepApi);
                }),
            );

            renderWithProviders(
                <AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} step={mockAssemblyStep} />,
            );

            // Submit (les Assembleurs et la date sont déjà pré-remplis depuis step).
            // Le clic sur le bouton ne doit PAS être bloqué par la validation native
            // bien que l'input du multi-select soit vide (régression du bug "Please
            // fill out this field" avec des assembleurs pourtant sélectionnés).
            await user.click(screen.getByRole('button', { name: /sauvegarder/i }));

            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalled();
            });
            expect(putBody.current?.operator_user_uuids).toEqual([ASSEMBLER_UUID]);
        });

        it('lève le required natif HTML une fois un Assembleur sélectionné', async () => {
            // Régression : la validation navigateur bloquait la soumission
            // (« Please fill out this field ») car l'input du multi-select reste vide
            // même avec des assembleurs en chips. L'input ne doit être `required` que
            // tant que rien n'est sélectionné.
            const user = userEvent.setup();
            renderWithProviders(<AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} />);

            const input = screen.getByLabelText(/assembleurs/i);
            expect(input).toBeRequired();

            await user.click(input);
            await user.click(await screen.findByRole('option', { name: /Lucie Petit/i }));

            expect(screen.getByLabelText(/assembleurs/i)).not.toBeRequired();
        });

        it('should block submission when no Assembleur is selected', async () => {
            const user = userEvent.setup();

            renderWithProviders(<AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} />);

            const submitButton = screen.getByRole('button', { name: /sauvegarder/i });
            await user.click(submitButton);

            // Validation Zod doit empêcher la soumission → onClose pas appelé.
            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });

    describe('Edit Mode', () => {
        it('should pre-fill Assembleurs with step.operatorUserUuids', async () => {
            renderWithProviders(
                <AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} step={mockAssemblyStep} />,
            );

            // Le UserMultiSelect rend la sélection en chip(s) : on cherche le nom affiché.
            await waitFor(() => {
                expect(screen.getByText(/Lucie Petit/i)).toBeInTheDocument();
            });
        });

        it('should call update API on submit', async () => {
            const user = userEvent.setup();
            let apiCalled = false;

            server.use(
                http.put(`/api/v1/assembly-steps/${mockAssemblyStep.uuid}/`, () => {
                    apiCalled = true;
                    return HttpResponse.json(mockAssemblyStepApi);
                }),
            );

            renderWithProviders(
                <AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} step={mockAssemblyStep} />,
            );

            await user.click(screen.getByRole('button', { name: /sauvegarder/i }));

            await waitFor(() => {
                expect(apiCalled).toBe(true);
            });
        });
    });

    describe('Delete Mode', () => {
        it('should show delete button in edit mode', () => {
            renderWithProviders(
                <AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} step={mockAssemblyStep} />,
            );

            expect(screen.getByRole('button', { name: /supprimer/i })).toBeInTheDocument();
        });

        it('should not show delete button in create mode', () => {
            renderWithProviders(<AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} />);

            expect(screen.queryByRole('button', { name: /supprimer/i })).not.toBeInTheDocument();
        });

        it('should show confirmation before delete', async () => {
            const user = userEvent.setup();
            renderWithProviders(
                <AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} step={mockAssemblyStep} />,
            );

            const deleteButton = screen.getByRole('button', { name: /supprimer/i });
            await user.click(deleteButton);

            // Should show confirmation dialog or change button state
            await waitFor(() => {
                expect(screen.getByText(/confirmer|êtes-vous sûr/i)).toBeInTheDocument();
            });
        });

        it('should call delete API on confirm', async () => {
            const user = userEvent.setup();
            let deleteCalled = false;

            server.use(
                http.delete(`/api/v1/assembly-steps/${mockAssemblyStep.uuid}/`, () => {
                    deleteCalled = true;
                    return new HttpResponse(null, { status: 204 });
                }),
            );

            renderWithProviders(
                <AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} step={mockAssemblyStep} />,
            );

            // Click delete
            const deleteButton = screen.getByRole('button', { name: /supprimer/i });
            await user.click(deleteButton);

            // Confirm deletion
            const confirmButton = screen.getByRole('button', { name: /confirmer la suppression/i });
            await user.click(confirmButton);

            await waitFor(() => {
                expect(deleteCalled).toBe(true);
            });
        });
    });

    describe('Cancel & Close', () => {
        it('should call onClose when cancel button clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} />);

            const cancelButton = screen.getByRole('button', { name: /annuler/i });
            await user.click(cancelButton);

            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should call onClose when clicking outside modal', async () => {
            const user = userEvent.setup();
            renderWithProviders(<AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} />);

            // Click backdrop
            const backdrop = document.querySelector('.MuiBackdrop-root');
            if (backdrop) {
                await user.click(backdrop);
                expect(mockOnClose).toHaveBeenCalled();
            }
        });
    });

    describe('Error Handling', () => {
        it('should show error message on API failure', async () => {
            const user = userEvent.setup();
            const showNotificationSpy = vi.spyOn(useNotificationStore.getState(), 'showNotification');

            server.use(
                http.put(`/api/v1/assembly-steps/${mockAssemblyStep.uuid}/`, () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            renderWithProviders(
                <AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} step={mockAssemblyStep} />,
            );

            // Submit form
            await user.click(screen.getByRole('button', { name: /sauvegarder/i }));

            // Should show error notification
            await waitFor(() => {
                expect(showNotificationSpy).toHaveBeenCalledWith(expect.stringContaining('Erreur'), 'error');
            });

            showNotificationSpy.mockRestore();
        });

        it('should not close modal on error', async () => {
            const user = userEvent.setup();

            server.use(
                http.put(`/api/v1/assembly-steps/${mockAssemblyStep.uuid}/`, () => {
                    return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
                }),
            );

            renderWithProviders(
                <AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} step={mockAssemblyStep} />,
            );

            await user.click(screen.getByRole('button', { name: /sauvegarder/i }));

            await waitFor(() => {
                expect(mockOnClose).not.toHaveBeenCalled();
            });
        });
    });

    describe('Accessibility', () => {
        it('should have accessible dialog role', () => {
            renderWithProviders(<AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} />);

            expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
        });

        it('should trap focus within modal', async () => {
            const user = userEvent.setup();
            renderWithProviders(<AssemblyStepModal open onClose={mockOnClose} fsecVersionId={fsecVersionId} />);

            // Tab through the modal
            await user.tab();
            await user.tab();
            await user.tab();

            // Focus should still be within the modal
            const dialog = screen.getByRole('dialog');
            expect(dialog.contains(document.activeElement)).toBe(true);
        });
    });
});
