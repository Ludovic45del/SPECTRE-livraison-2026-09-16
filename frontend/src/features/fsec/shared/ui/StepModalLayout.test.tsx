/**
 * Unit tests for StepModalLayout component
 * @module features/fsec/shared/ui
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepModalLayout } from './StepModalLayout';

// Mock MUI components that might cause issues in tests
vi.mock('@mui/icons-material/Close', () => ({
    default: () => <span data-testid="close-icon">X</span>,
}));
vi.mock('@mui/icons-material/Delete', () => ({
    default: () => <span data-testid="delete-icon">Delete</span>,
}));

describe('StepModalLayout', () => {
    const defaultProps = {
        open: true,
        onClose: vi.fn(),
        title: 'Create Step',
        editTitle: 'Edit Step',
        isEditMode: false,
        isPending: false,
        isDeleting: false,
        showDeleteConfirm: false,
        onShowDeleteConfirm: vi.fn(),
        onHideDeleteConfirm: vi.fn(),
        onDelete: vi.fn(),
        onSubmit: vi.fn((e) => e?.preventDefault()),
        children: <div data-testid="modal-content">Form Content</div>,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render create title when not in edit mode', () => {
            render(<StepModalLayout {...defaultProps} />);
            expect(screen.getByText('Create Step')).toBeInTheDocument();
        });

        it('should render edit title when in edit mode', () => {
            render(<StepModalLayout {...defaultProps} isEditMode={true} />);
            expect(screen.getByText('Edit Step')).toBeInTheDocument();
        });

        it('should render children content', () => {
            render(<StepModalLayout {...defaultProps} />);
            expect(screen.getByTestId('modal-content')).toBeInTheDocument();
        });

        it('should not render when closed', () => {
            render(<StepModalLayout {...defaultProps} open={false} />);
            expect(screen.queryByText('Create Step')).not.toBeInTheDocument();
        });

        it('should render with different maxWidth sizes', () => {
            const { rerender } = render(<StepModalLayout {...defaultProps} maxWidth="sm" />);
            expect(screen.getByRole('dialog')).toBeInTheDocument();

            rerender(<StepModalLayout {...defaultProps} maxWidth="lg" />);
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
    });

    describe('Action Buttons', () => {
        it('should show save button', () => {
            render(<StepModalLayout {...defaultProps} />);
            expect(screen.getByRole('button', { name: /sauvegarder/i })).toBeInTheDocument();
        });

        it('should show cancel button', () => {
            render(<StepModalLayout {...defaultProps} />);
            expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
        });

        it('should disable save button when pending', () => {
            render(<StepModalLayout {...defaultProps} isPending={true} />);
            const saveButton = screen.getByRole('button', { name: /enregistrement/i });
            expect(saveButton).toBeDisabled();
        });

        it('should show "Enregistrement..." text when pending', () => {
            render(<StepModalLayout {...defaultProps} isPending={true} />);
            expect(screen.getByText('Enregistrement...')).toBeInTheDocument();
        });

        it('should not show delete button in create mode', () => {
            render(<StepModalLayout {...defaultProps} isEditMode={false} />);
            expect(screen.queryByRole('button', { name: /supprimer/i })).not.toBeInTheDocument();
        });

        it('should show delete button in edit mode', () => {
            render(<StepModalLayout {...defaultProps} isEditMode={true} />);
            expect(screen.getByRole('button', { name: /supprimer/i })).toBeInTheDocument();
        });
    });

    describe('Delete Confirmation Flow', () => {
        it('should show confirmation when showDeleteConfirm is true', () => {
            render(<StepModalLayout {...defaultProps} isEditMode={true} showDeleteConfirm={true} />);
            expect(screen.getByText('Confirmer ?')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /confirmer la suppression/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /annuler la suppression/i })).toBeInTheDocument();
        });

        it('should hide delete button when showing confirmation', () => {
            render(<StepModalLayout {...defaultProps} isEditMode={true} showDeleteConfirm={true} />);
            expect(screen.queryByRole('button', { name: /supprimer/i })).not.toBeInTheDocument();
        });

        it('should call onShowDeleteConfirm when delete clicked', async () => {
            render(<StepModalLayout {...defaultProps} isEditMode={true} />);

            const deleteButton = screen.getByRole('button', { name: /supprimer/i });
            fireEvent.click(deleteButton);

            expect(defaultProps.onShowDeleteConfirm).toHaveBeenCalledTimes(1);
        });

        it('should call onDelete when Yes clicked', async () => {
            render(<StepModalLayout {...defaultProps} isEditMode={true} showDeleteConfirm={true} />);

            const yesButton = screen.getByRole('button', { name: /confirmer la suppression/i });
            fireEvent.click(yesButton);

            expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
        });

        it('should call onHideDeleteConfirm when No clicked', async () => {
            render(<StepModalLayout {...defaultProps} isEditMode={true} showDeleteConfirm={true} />);

            const noButton = screen.getByRole('button', { name: /annuler la suppression/i });
            fireEvent.click(noButton);

            expect(defaultProps.onHideDeleteConfirm).toHaveBeenCalledTimes(1);
        });

        it('should disable Yes button when deleting', () => {
            render(<StepModalLayout {...defaultProps} isEditMode={true} showDeleteConfirm={true} isDeleting={true} />);

            const yesButton = screen.getByRole('button', { name: /confirmer la suppression/i });
            expect(yesButton).toBeDisabled();
        });
    });

    describe('Close Actions', () => {
        it('should call onClose when close icon clicked', async () => {
            render(<StepModalLayout {...defaultProps} />);

            const closeButton = screen.getByTestId('close-icon').parentElement;
            if (closeButton) {
                fireEvent.click(closeButton);
                expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
            }
        });

        it('should call onClose when cancel clicked', async () => {
            render(<StepModalLayout {...defaultProps} />);

            const cancelButton = screen.getByRole('button', { name: /annuler/i });
            fireEvent.click(cancelButton);

            expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Form Submission', () => {
        it('should call onSubmit when form is submitted', async () => {
            render(<StepModalLayout {...defaultProps} />);

            const saveButton = screen.getByRole('button', { name: /sauvegarder/i });
            fireEvent.click(saveButton);

            expect(defaultProps.onSubmit).toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        it('should have dialog role', () => {
            render(<StepModalLayout {...defaultProps} />);
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('should have proper button types', () => {
            render(<StepModalLayout {...defaultProps} isEditMode={true} />);

            const saveButton = screen.getByRole('button', { name: /sauvegarder/i });
            const cancelButton = screen.getByRole('button', { name: /annuler/i });
            const deleteButton = screen.getByRole('button', { name: /supprimer/i });

            expect(saveButton).toHaveAttribute('type', 'submit');
            expect(cancelButton).toHaveAttribute('type', 'button');
            expect(deleteButton).toHaveAttribute('type', 'button');
        });
    });
});
