/**
 * Tests EntityRefChip — pastille de type + nom de l'entité (le type reste dans
 * le nom accessible), lien vers la fiche par type, référence supprimée (grisée,
 * suffixe, title), sans slug (inerte), onDelete.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';

import { setup, renderWithProviders } from '@test/test-utils';
import { createMockEntityRef } from '@test/mocks/messaging-handlers';
import { EntityRefSchema, type EntityRef } from '@entities/messaging';
import { EntityRefChip } from './EntityRefChip';

const buildRef = (overrides: Record<string, unknown> = {}): EntityRef =>
    EntityRefSchema.parse(createMockEntityRef(overrides));

describe('EntityRefChip', () => {
    it('rend une FSEC existante comme lien vers sa fiche, préfixé « FSEC · »', () => {
        renderWithProviders(<EntityRefChip entityRef={buildRef({ label: 'FSEC-12', slug: '2026-s1-fsec-12' })} />);

        const link = screen.getByRole('link', { name: 'FSEC · FSEC-12' });
        expect(link).toHaveAttribute('href', '/fsec-details/2026-s1-fsec-12');
        expect(link).not.toHaveAttribute('title');
    });

    it('affiche la pastille de type (C / Fsec / FA) sans répéter le type en texte', () => {
        renderWithProviders(
            <>
                <EntityRefChip entityRef={buildRef({ label: 'FSEC-12', slug: 'fsec-12' })} />
                <EntityRefChip entityRef={buildRef({ entity_type: 'campaign', label: 'Campagne LMJ', slug: 'lmj' })} />
                <EntityRefChip entityRef={buildRef({ entity_type: 'fa', label: 'FA-7', slug: 'fa-7' })} />
            </>,
        );

        // Pastilles décoratives : leur libellé est présent visuellement…
        expect(screen.getByText('Fsec')).toBeInTheDocument();
        expect(screen.getByText('C')).toBeInTheDocument();
        expect(screen.getByText('FA')).toBeInTheDocument();
        // …le texte de la chip se limite au nom de l'entité…
        expect(screen.getByText('FSEC-12')).toBeInTheDocument();
        expect(screen.queryByText('FSEC · FSEC-12')).not.toBeInTheDocument();
        // …et le type reste porté par le nom accessible.
        expect(screen.getByRole('link', { name: 'Campagne · Campagne LMJ' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'FA · FA-7' })).toBeInTheDocument();
    });

    it('rend une campagne et une FA avec leur préfixe et leur route respective', () => {
        renderWithProviders(
            <>
                <EntityRefChip
                    entityRef={buildRef({ entity_type: 'campaign', label: 'Campagne LMJ', slug: '2026-s1-lmj' })}
                />
                <EntityRefChip
                    entityRef={buildRef({ entity_type: 'fa', label: 'FA-2026-0007', slug: 'fa-2026-0007' })}
                />
            </>,
        );

        expect(screen.getByRole('link', { name: 'Campagne · Campagne LMJ' })).toHaveAttribute(
            'href',
            '/campagne-details/2026-s1-lmj',
        );
        expect(screen.getByRole('link', { name: 'FA · FA-2026-0007' })).toHaveAttribute(
            'href',
            '/fa-details/fa-2026-0007',
        );
    });

    it('affiche une référence supprimée grisée, non cliquable, avec suffixe et title', () => {
        renderWithProviders(
            <EntityRefChip
                entityRef={buildRef({ entity_type: 'fa', label: 'FA-2025-0001', slug: null, exists: false })}
            />,
        );

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        const chip = screen.getByText('FA-2025-0001 (supprimée)').closest('.MuiChip-root');
        expect(chip).toHaveClass('Mui-disabled');
        expect(chip).toHaveAttribute('title', "Cette référence n'existe plus");
    });

    it('reste inerte (ni lien ni supprimée) quand l’entité existe sans slug', () => {
        renderWithProviders(<EntityRefChip entityRef={buildRef({ label: 'FSEC-3', slug: null })} />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        const chip = screen.getByText('FSEC-3').closest('.MuiChip-root');
        expect(chip).not.toHaveClass('Mui-disabled');
        expect(chip).not.toHaveAttribute('title');
    });

    it('appelle onDelete au clic sur la croix « Retirer la référence »', async () => {
        const onDelete = vi.fn();
        const { user } = setup(
            <EntityRefChip entityRef={buildRef({ label: 'FSEC-12', slug: null })} size="small" onDelete={onDelete} />,
        );

        await user.click(screen.getByLabelText('Retirer la référence FSEC-12'));

        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(screen.getByText('FSEC-12').closest('.MuiChip-root')).toHaveClass('MuiChip-sizeSmall');
    });
});
