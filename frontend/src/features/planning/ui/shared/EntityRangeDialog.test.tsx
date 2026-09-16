/**
 * Tests de la coquille générique EntityRangeDialog (labo/membre).
 */
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { screen } from '@testing-library/react';
import dayjs from 'dayjs';
import { setup, axe } from '@test/test-utils';
import { EntityRangeDialog, type EntityRangeDialogProps } from './EntityRangeDialog';
import type { DateRange } from '@shared/lib';

function Harness(overrides: Partial<EntityRangeDialogProps> = {}) {
    const [range, setRange] = useState<DateRange>({ start: dayjs('2026-05-15'), end: dayjs('2026-05-18') });
    const [note, setNote] = useState('');
    const props: EntityRangeDialogProps = {
        anchorEl: document.body,
        title: 'Nouvelle période',
        accentColor: '#007AFF',
        typologySlot: <div data-testid="typo-slot">SLOT</div>,
        range,
        onRangeChange: setRange,
        note: { label: 'Commentaire (optionnel)', value: note, onChange: setNote },
        mode: 'create',
        canSave: true,
        isSaving: false,
        onSave: vi.fn(),
        onClose: vi.fn(),
        ...overrides,
    };
    return <EntityRangeDialog {...props} />;
}

describe('EntityRangeDialog', () => {
    it('renders the title, typology slot and note field', () => {
        setup(<Harness />);
        expect(screen.getByText('Nouvelle période')).toBeInTheDocument();
        expect(screen.getByTestId('typo-slot')).toBeInTheDocument();
        expect(screen.getByLabelText('Commentaire (optionnel)')).toBeInTheDocument();
    });

    it('hides the delete button in create mode', () => {
        setup(<Harness mode="create" />);
        expect(screen.queryByRole('button', { name: 'Supprimer' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument();
    });

    it('shows the delete button in edit mode and wires onDelete', async () => {
        const onDelete = vi.fn();
        const { user } = setup(<Harness mode="edit" onDelete={onDelete} />);
        const del = screen.getByRole('button', { name: 'Supprimer' });
        await user.click(del);
        expect(onDelete).toHaveBeenCalledOnce();
        expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument();
    });

    it('disables save when canSave is false', () => {
        setup(<Harness canSave={false} />);
        expect(screen.getByRole('button', { name: 'Ajouter' })).toBeDisabled();
    });

    it('calls onSave when the save button is clicked', async () => {
        const onSave = vi.fn();
        const { user } = setup(<Harness onSave={onSave} />);
        await user.click(screen.getByRole('button', { name: 'Ajouter' }));
        expect(onSave).toHaveBeenCalledOnce();
    });

    it('has no accessibility violations (role dialog + labelledby)', async () => {
        setup(<Harness />);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-labelledby');
        const results = await axe(document.body);
        expect(results).toHaveNoViolations();
    });
});
