/**
 * Tests du hook d'état du calque d'annotations.
 *
 * Couvre : add / update / remove / revert, suivi de `isDirty`, et la
 * resynchronisation serveur (adoption si pas de modif locale, conservation du
 * travail en cours sinon).
 */
import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { PlanAnnotation } from '@entities/fsec';
import { usePlanAnnotations } from './usePlanAnnotations';

const arrow = (id: string): PlanAnnotation => ({
    id,
    type: 'arrow',
    x1: 10,
    y1: 10,
    x2: 40,
    y2: 40,
    color: '#e53935',
});

describe('usePlanAnnotations', () => {
    it('démarre sur le calque serveur, non dirty', () => {
        const { result } = renderHook(() => usePlanAnnotations([arrow('a')]));
        expect(result.current.annotations).toHaveLength(1);
        expect(result.current.isDirty).toBe(false);
    });

    it('add rend le calque dirty', () => {
        const { result } = renderHook(() => usePlanAnnotations([]));
        act(() => result.current.add(arrow('a')));
        expect(result.current.annotations).toHaveLength(1);
        expect(result.current.isDirty).toBe(true);
    });

    it('update modifie une annotation existante', () => {
        const { result } = renderHook(() => usePlanAnnotations([arrow('a')]));
        act(() => result.current.update('a', { color: '#1e88e5' }));
        expect(result.current.annotations[0].color).toBe('#1e88e5');
        expect(result.current.isDirty).toBe(true);
    });

    it('remove retire une annotation', () => {
        const { result } = renderHook(() => usePlanAnnotations([arrow('a'), arrow('b')]));
        act(() => result.current.remove('a'));
        expect(result.current.annotations.map((x) => x.id)).toEqual(['b']);
    });

    it('revert revient à la base serveur', () => {
        const { result } = renderHook(() => usePlanAnnotations([arrow('a')]));
        act(() => result.current.add(arrow('b')));
        expect(result.current.isDirty).toBe(true);
        act(() => result.current.revert());
        expect(result.current.annotations.map((x) => x.id)).toEqual(['a']);
        expect(result.current.isDirty).toBe(false);
    });

    it('adopte un nouveau calque serveur quand il n’y a pas de modif locale', () => {
        const { result, rerender } = renderHook(({ server }) => usePlanAnnotations(server), {
            initialProps: { server: [arrow('a')] },
        });
        rerender({ server: [arrow('a'), arrow('b')] });
        expect(result.current.annotations.map((x) => x.id)).toEqual(['a', 'b']);
        expect(result.current.isDirty).toBe(false);
    });

    it('conserve le travail local si le serveur change pendant l’édition', () => {
        const { result, rerender } = renderHook(({ server }) => usePlanAnnotations(server), {
            initialProps: { server: [arrow('a')] },
        });
        act(() => result.current.add(arrow('local')));
        rerender({ server: [arrow('a'), arrow('external')] });
        // Le dessin local n'est pas écrasé par la maj serveur.
        expect(result.current.annotations.map((x) => x.id)).toEqual(['a', 'local']);
        expect(result.current.isDirty).toBe(true);
    });
});
