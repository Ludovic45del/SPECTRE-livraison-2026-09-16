/**
 * FormActions Component Tests
 * @module pages/campaign-details/overview/components
 *
 * Tests for form action buttons behavior and states.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormActions } from './FormActions';

describe('FormActions', () => {
    describe('Rendering', () => {
        it('should render cancel button with default text', () => {
            render(<FormActions onCancel={vi.fn()} />);

            expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
        });

        it('should render save button with default text', () => {
            render(<FormActions onCancel={vi.fn()} />);

            expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
        });

        it('should render custom cancel text', () => {
            render(<FormActions onCancel={vi.fn()} cancelText="Retour" />);

            expect(screen.getByRole('button', { name: /retour/i })).toBeInTheDocument();
        });

        it('should render custom save text', () => {
            render(<FormActions onCancel={vi.fn()} saveText="Confirmer" />);

            expect(screen.getByRole('button', { name: /confirmer/i })).toBeInTheDocument();
        });

        it('should render saving text when isSaving is true', () => {
            render(<FormActions onCancel={vi.fn()} isSaving />);

            expect(screen.getByRole('button', { name: /enregistrement/i })).toBeInTheDocument();
        });

        it('should render custom saving text', () => {
            render(<FormActions onCancel={vi.fn()} isSaving savingText="Sauvegarde..." />);

            expect(screen.getByRole('button', { name: /sauvegarde/i })).toBeInTheDocument();
        });
    });

    describe('Button Types', () => {
        it('should render save button as submit type when no onSave provided', () => {
            render(<FormActions onCancel={vi.fn()} />);

            const saveButton = screen.getByRole('button', { name: /enregistrer/i });
            expect(saveButton).toHaveAttribute('type', 'submit');
        });

        it('should render save button as button type when onSave is provided', () => {
            render(<FormActions onCancel={vi.fn()} onSave={vi.fn()} />);

            const saveButton = screen.getByRole('button', { name: /enregistrer/i });
            expect(saveButton).toHaveAttribute('type', 'button');
        });
    });

    describe('Click Handlers', () => {
        it('should call onCancel when cancel button is clicked', () => {
            const onCancel = vi.fn();
            render(<FormActions onCancel={onCancel} />);

            fireEvent.click(screen.getByRole('button', { name: /annuler/i }));

            expect(onCancel).toHaveBeenCalledOnce();
        });

        it('should call onSave when save button is clicked', () => {
            const onSave = vi.fn();
            render(<FormActions onCancel={vi.fn()} onSave={onSave} />);

            fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

            expect(onSave).toHaveBeenCalledOnce();
        });

        it('should not call onSave when save button is disabled', () => {
            const onSave = vi.fn();
            render(<FormActions onCancel={vi.fn()} onSave={onSave} isSaving />);

            const saveButton = screen.getByRole('button', { name: /enregistrement/i });
            fireEvent.click(saveButton);

            // Button is disabled, click shouldn't trigger handler
            expect(onSave).not.toHaveBeenCalled();
        });
    });

    describe('Disabled State', () => {
        it('should disable both buttons when isSaving is true', () => {
            render(<FormActions onCancel={vi.fn()} isSaving />);

            const cancelButton = screen.getByRole('button', { name: /annuler/i });
            const saveButton = screen.getByRole('button', { name: /enregistrement/i });

            expect(cancelButton).toBeDisabled();
            expect(saveButton).toBeDisabled();
        });

        it('should enable both buttons when isSaving is false', () => {
            render(<FormActions onCancel={vi.fn()} isSaving={false} />);

            const cancelButton = screen.getByRole('button', { name: /annuler/i });
            const saveButton = screen.getByRole('button', { name: /enregistrer/i });

            expect(cancelButton).not.toBeDisabled();
            expect(saveButton).not.toBeDisabled();
        });
    });

    describe('Styling', () => {
        it('should render save button with contained variant', () => {
            render(<FormActions onCancel={vi.fn()} />);

            const saveButton = screen.getByRole('button', { name: /enregistrer/i });
            expect(saveButton).toHaveClass('MuiButton-contained');
        });

        it('should render cancel button with inherit color', () => {
            render(<FormActions onCancel={vi.fn()} />);

            const cancelButton = screen.getByRole('button', { name: /annuler/i });
            expect(cancelButton).toHaveClass('MuiButton-colorInherit');
        });
    });

    describe('Icons', () => {
        it('should render close icon in cancel button', () => {
            render(<FormActions onCancel={vi.fn()} />);

            const cancelButton = screen.getByRole('button', { name: /annuler/i });
            expect(cancelButton.querySelector('svg')).toBeInTheDocument();
        });

        it('should render save icon in save button', () => {
            render(<FormActions onCancel={vi.fn()} />);

            const saveButton = screen.getByRole('button', { name: /enregistrer/i });
            expect(saveButton.querySelector('svg')).toBeInTheDocument();
        });
    });
});
