/**
 * Tests AssemblyPlanSection — repli de la section + bascule édition/lecture.
 *
 * On ne teste pas la géométrie SVG (ResizeObserver est mocké no-op en jsdom),
 * mais le contrat d'affichage : ce qui est rendu selon replié/déplié et
 * lecture/édition.
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/test-utils';
import { AssemblyPlanSection } from './AssemblyPlanSection';

const VERSION = '00000000-0000-0000-0000-000000000001';
const IMAGE = '/media/fsec/plan.webp';

describe('AssemblyPlanSection', () => {
    it('est repliée par défaut : pas de bascule édition ni de barre d’outils', () => {
        renderWithProviders(<AssemblyPlanSection versionUuid={VERSION} imageUrl={IMAGE} annotations={[]} />);

        expect(screen.getByText("Plan d'assemblage")).toBeInTheDocument();
        // Replié → chevron « Déplier », pas de bouton « Éditer », pas d'outils.
        expect(screen.getByRole('button', { name: 'Déplier le plan' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Éditer' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
        // Indicateur compact qu'un plan existe.
        expect(screen.getByText('Plan ajouté')).toBeInTheDocument();
    });

    it('déplie en lecture, bascule en édition puis revient en lecture', async () => {
        const user = userEvent.setup();
        renderWithProviders(<AssemblyPlanSection versionUuid={VERSION} imageUrl={IMAGE} annotations={[]} />);

        await user.click(screen.getByRole('button', { name: 'Déplier le plan' }));

        // Déplié, mode lecture : bouton « Éditer » dispo, aucune action d'édition.
        expect(screen.getByRole('button', { name: 'Éditer' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Replier le plan' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Remplacer' })).not.toBeInTheDocument();

        // Passage en édition : barre d'outils + actions sur l'image.
        await user.click(screen.getByRole('button', { name: 'Éditer' }));
        expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Remplacer' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Supprimer le plan' })).toBeInTheDocument();

        // Retour en lecture : la barre d'outils disparaît.
        await user.click(screen.getByRole('button', { name: 'Lecture' }));
        expect(screen.getByRole('button', { name: 'Éditer' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
    });

    it('readOnly verrouille la consultation : aucune bascule vers l’édition', async () => {
        const user = userEvent.setup();
        renderWithProviders(<AssemblyPlanSection versionUuid={VERSION} imageUrl={IMAGE} annotations={[]} readOnly />);

        await user.click(screen.getByRole('button', { name: 'Déplier le plan' }));
        expect(screen.queryByRole('button', { name: 'Éditer' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
    });

    it('sans plan : message en lecture, zone d’upload une fois en édition', async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <AssemblyPlanSection versionUuid={VERSION} imageUrl={null} annotations={[]} defaultExpanded />,
        );

        expect(screen.getByText(/Aucun plan d'assemblage/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: "Ajouter un plan d'assemblage" })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Éditer' }));
        expect(screen.getByRole('button', { name: "Ajouter un plan d'assemblage" })).toBeInTheDocument();
    });
});
