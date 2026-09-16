/**
 * Tests TaskRow — priorités, échéance dépassée, badges, callbacks.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import dayjs from 'dayjs';

import { renderWithProviders, setup } from '@test/test-utils';
import { createMockTaskItem } from '@test/mocks/tasklist-handlers';
import { TaskItemSchema, type TaskItem } from '@entities/task-list';
import { TaskRow } from './TaskRow';

/** Construit une tâche domaine (camelCase) depuis la factory API (snake_case). */
function buildTask(overrides: Record<string, unknown> = {}): TaskItem {
    return TaskItemSchema.parse(createMockTaskItem(overrides));
}

const noop = { onToggle: vi.fn(), onDelete: vi.fn(), onOpen: vi.fn() };

describe('TaskRow', () => {
    it('affiche le titre et le drapeau de la priorité', () => {
        const task = buildTask({ title: 'Vérifier la cible', priority: 'critical' });
        renderWithProviders(<TaskRow task={task} {...noop} />);

        expect(screen.getByText('Vérifier la cible')).toBeInTheDocument();
        expect(screen.getByTestId('priority-flag-critical')).toBeInTheDocument();
    });

    it.each(['low', 'normal', 'high', 'critical'] as const)('rend le drapeau de la priorité %s', (priority) => {
        const task = buildTask({ priority });
        renderWithProviders(<TaskRow task={task} {...noop} />);
        expect(screen.getByTestId(`priority-flag-${priority}`)).toBeInTheDocument();
    });

    it('marque une échéance dépassée (non faite) en rouge', () => {
        const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        const task = buildTask({ due_date: yesterday, done: false });
        renderWithProviders(<TaskRow task={task} {...noop} />);

        expect(screen.getByTestId('due-date-overdue')).toBeInTheDocument();
    });

    it("n'est pas en retard si la tâche est terminée ou l'échéance future", () => {
        const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

        const { unmount } = renderWithProviders(
            <TaskRow task={buildTask({ due_date: yesterday, done: true })} {...noop} />,
        );
        expect(screen.getByTestId('due-date')).toBeInTheDocument();
        expect(screen.queryByTestId('due-date-overdue')).not.toBeInTheDocument();
        unmount();

        renderWithProviders(<TaskRow task={buildTask({ due_date: tomorrow, done: false })} {...noop} />);
        expect(screen.getByTestId('due-date')).toBeInTheDocument();
        expect(screen.queryByTestId('due-date-overdue')).not.toBeInTheDocument();
    });

    it("affiche le badge commentaires et l'icône note quand pertinents", () => {
        const task = buildTask({ comment_count: 3, note: 'Une note' });
        renderWithProviders(<TaskRow task={task} {...noop} />);

        expect(screen.getByTestId('comment-badge')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByTestId('note-icon')).toBeInTheDocument();
    });

    it('masque badges et échéance quand absents, barre le titre si terminée', () => {
        const task = buildTask({ title: 'Faite', done: true, comment_count: 0, note: '', due_date: null });
        renderWithProviders(<TaskRow task={task} {...noop} />);

        expect(screen.queryByTestId('comment-badge')).not.toBeInTheDocument();
        expect(screen.queryByTestId('note-icon')).not.toBeInTheDocument();
        expect(screen.queryByTestId('due-date')).not.toBeInTheDocument();
        expect(screen.getByText('Faite')).toHaveStyle({ textDecoration: 'line-through' });
        expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('déclenche onOpen au clic sur la ligne, onToggle sur la checkbox, onDelete sur la corbeille', async () => {
        const onToggle = vi.fn();
        const onDelete = vi.fn();
        const onOpen = vi.fn();
        const task = buildTask({ title: 'Interactions' });

        const { user } = setup(<TaskRow task={task} onToggle={onToggle} onDelete={onDelete} onOpen={onOpen} />);

        await user.click(screen.getByText('Interactions'));
        expect(onOpen).toHaveBeenCalledWith(task);

        await user.click(screen.getByRole('checkbox', { name: /cocher interactions/i }));
        expect(onToggle).toHaveBeenCalledWith(task);

        await user.click(screen.getByRole('button', { name: /supprimer la tâche interactions/i }));
        expect(onDelete).toHaveBeenCalledWith(task);

        // La checkbox et la corbeille ne doivent pas ouvrir le détail.
        expect(onOpen).toHaveBeenCalledTimes(1);
    });
});
