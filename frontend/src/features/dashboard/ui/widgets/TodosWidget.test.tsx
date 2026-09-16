/**
 * Tests du widget Liste de tâches (R21 : édition inline du texte).
 * @module features/dashboard/ui/widgets
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setup, screen, waitFor } from '@test/test-utils';
import { useDashboardStore } from '../../model/dashboard.store';
import TodosWidget from './TodosWidget';

const { mutateSpy } = vi.hoisted(() => ({ mutateSpy: vi.fn() }));

// Préférences mockées : une tâche active + une tâche terminée.
vi.mock('@entities/dashboard-preferences', () => ({
    useDashboardPreferences: () => ({
        data: {
            layout: [],
            widgets: {},
            shortcuts: [],
            todos: [
                { id: 't1', text: 'Préparer le rapport', done: false },
                { id: 't2', text: 'Tâche terminée', done: true },
            ],
        },
    }),
    // Le widget sérialise ses sauvegardes via `mutateAsync` (file d'envoi).
    useUpdateDashboardPreferences: () => ({ mutateAsync: mutateSpy }),
}));

/** Champ d'édition inline (absent tant qu'aucune édition n'est en cours). */
const editField = () => screen.getByRole('textbox', { name: 'Texte de la tâche' });

describe('TodosWidget — édition inline', () => {
    beforeEach(() => {
        mutateSpy.mockReset();
        useDashboardStore.setState({ isEditMode: false, draftPrefs: null, snapshotPrefs: null });
    });

    it("double-clic sur le texte : ouvre le champ d'édition pré-rempli", async () => {
        const { user } = setup(<TodosWidget />);

        await user.dblClick(screen.getByText('Préparer le rapport'));

        expect(editField()).toHaveValue('Préparer le rapport');
    });

    it("le bouton « Modifier la tâche » ouvre aussi le champ d'édition", async () => {
        const { user } = setup(<TodosWidget />);

        // Une ligne par tâche → un bouton par ligne ; la première est la tâche active.
        await user.click(screen.getAllByRole('button', { name: 'Modifier la tâche' })[0]);

        expect(editField()).toHaveValue('Préparer le rapport');
    });

    it('Entrée : sauvegarde le nouveau texte en conservant id et statut', async () => {
        const { user } = setup(<TodosWidget />);

        await user.dblClick(screen.getByText('Préparer le rapport'));
        await user.clear(editField());
        await user.type(editField(), 'Relire le rapport{Enter}');

        // La sauvegarde part via la file d'envoi (microtâche) : attendre sa vidange.
        await waitFor(() => expect(mutateSpy).toHaveBeenCalledTimes(1));
        expect(mutateSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                todos: [
                    { id: 't1', text: 'Relire le rapport', done: false },
                    { id: 't2', text: 'Tâche terminée', done: true },
                ],
            }),
        );
        // Sortie du mode édition.
        expect(screen.queryByRole('textbox', { name: 'Texte de la tâche' })).not.toBeInTheDocument();
    });

    it('Échap : annule sans sauvegarder, le texte original reste affiché', async () => {
        const { user } = setup(<TodosWidget />);

        await user.dblClick(screen.getByText('Préparer le rapport'));
        await user.clear(editField());
        await user.type(editField(), 'Texte abandonné{Escape}');

        expect(mutateSpy).not.toHaveBeenCalled();
        expect(screen.getByText('Préparer le rapport')).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: 'Texte de la tâche' })).not.toBeInTheDocument();
    });

    it('brouillon vide + Entrée : annule (ne supprime pas la tâche, pas de mutation)', async () => {
        const { user } = setup(<TodosWidget />);

        await user.dblClick(screen.getByText('Préparer le rapport'));
        await user.clear(editField());
        await user.keyboard('{Enter}');

        expect(mutateSpy).not.toHaveBeenCalled();
        expect(screen.getByText('Préparer le rapport')).toBeInTheDocument();
    });

    it('blur : valide le brouillon (comportement type todo-app)', async () => {
        const { user } = setup(<TodosWidget />);

        await user.dblClick(screen.getByText('Préparer le rapport'));
        await user.clear(editField());
        await user.type(editField(), 'Validé au blur');
        // Clic ailleurs → blur du champ d'édition.
        await user.click(screen.getByText('Liste de tâches'));

        await waitFor(() => expect(mutateSpy).toHaveBeenCalledTimes(1));
        expect(mutateSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                todos: expect.arrayContaining([{ id: 't1', text: 'Validé au blur', done: false }]),
            }),
        );
    });

    it('texte inchangé + Entrée : pas de mutation inutile', async () => {
        const { user } = setup(<TodosWidget />);

        await user.dblClick(screen.getByText('Préparer le rapport'));
        await user.keyboard('{Enter}');

        expect(mutateSpy).not.toHaveBeenCalled();
    });

    it('les tâches terminées sont aussi éditables', async () => {
        const { user } = setup(<TodosWidget />);

        await user.dblClick(screen.getByText('Tâche terminée'));

        expect(editField()).toHaveValue('Tâche terminée');
    });

    it('REPRO: éditer puis cliquer la case à cocher conserve le texte modifié', async () => {
        const { user } = setup(<TodosWidget />);

        await user.dblClick(screen.getByText('Préparer le rapport'));
        await user.clear(editField());
        await user.type(editField(), 'Relire le rapport');
        // Clic direct sur la case à cocher de la même ligne (blur → commit, puis toggle).
        await user.click(screen.getAllByRole('checkbox')[0]);

        // Deux sauvegardes séquentielles (commit du texte, puis toggle) : la
        // seconde doit être calculée sur l'état déjà édité, pas sur le cache.
        await waitFor(() => expect(mutateSpy).toHaveBeenCalledTimes(2));
        const lastCall = mutateSpy.mock.lastCall?.[0];
        expect(lastCall.todos).toEqual([
            { id: 't1', text: 'Relire le rapport', done: true },
            { id: 't2', text: 'Tâche terminée', done: true },
        ]);
    });
});
