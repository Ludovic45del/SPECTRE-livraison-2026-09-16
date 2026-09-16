/**
 * État du calque d'annotations du plan d'assemblage.
 * @module features/fsec/edit-assembly-plan/lib
 *
 * Gère une copie de travail locale du calque, distincte de la base « serveur ».
 * `isDirty` compare les deux. La base se resynchronise sur les données serveur
 * SANS écraser un dessin local en cours (évite qu'un refetch efface le travail).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { PlanAnnotation } from '@entities/fsec';

/** Égalité structurelle du calque (ordre + contenu). */
function sameLayer(a: PlanAnnotation[], b: PlanAnnotation[]): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export interface UsePlanAnnotationsResult {
    annotations: PlanAnnotation[];
    isDirty: boolean;
    add: (annotation: PlanAnnotation) => void;
    update: (id: string, patch: Partial<PlanAnnotation>) => void;
    remove: (id: string) => void;
    clear: () => void;
    /** Annule les modifications locales → revient à la dernière base serveur. */
    revert: () => void;
}

export function usePlanAnnotations(serverAnnotations: PlanAnnotation[]): UsePlanAnnotationsResult {
    const [annotations, setAnnotations] = useState<PlanAnnotation[]>(serverAnnotations);
    const [baseline, setBaseline] = useState<PlanAnnotation[]>(serverAnnotations);

    // Refs pour lire le dernier état dans l'effet sans en faire des dépendances.
    const annotationsRef = useRef(annotations);
    annotationsRef.current = annotations;
    const baselineRef = useRef(baseline);
    baselineRef.current = baseline;

    // Le serveur a renvoyé un nouveau calque (save réussie ou maj externe).
    // On adopte la nouvelle base ; on n'écrase la copie de travail que si
    // l'utilisateur n'avait aucune modification locale en cours.
    useEffect(() => {
        // Garde structurelle : l'appelant peut fournir une nouvelle référence de
        // tableau à chaque rendu (`?? []`, tableau inline) sans que le contenu
        // change ; sans cette garde, setBaseline relancerait un rendu à l'infini.
        if (sameLayer(serverAnnotations, baselineRef.current)) return;
        const noLocalEdits = sameLayer(annotationsRef.current, baselineRef.current);
        setBaseline(serverAnnotations);
        if (noLocalEdits) setAnnotations(serverAnnotations);
    }, [serverAnnotations]);

    const isDirty = !sameLayer(annotations, baseline);

    const add = useCallback((annotation: PlanAnnotation) => {
        setAnnotations((prev) => [...prev, annotation]);
    }, []);

    const update = useCallback((id: string, patch: Partial<PlanAnnotation>) => {
        setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    }, []);

    const remove = useCallback((id: string) => {
        setAnnotations((prev) => prev.filter((a) => a.id !== id));
    }, []);

    const clear = useCallback(() => setAnnotations([]), []);

    const revert = useCallback(() => setAnnotations(baseline), [baseline]);

    return { annotations, isDirty, add, update, remove, clear, revert };
}
