/**
 * useFsecDrag — encapsule le drag & drop HTML5 natif d'une FSEC depuis la palette
 * vers le board jours. Pas de dnd-kit/react-dnd dans le projet ; le drop résout
 * le jour cible via `data-col-index` déjà présent sur les `<td>` du board.
 *
 * Le DnD HTML5 n'étant pas accessible au clavier, la palette fournit en plus un
 * bouton « Planifier » (fallback) — voir FsecPalette.
 * @module features/planning/lib
 */
import { useMemo } from 'react';

/** MIME custom (le text/plain est dupliqué en repli pour robustesse). */
export const FSEC_DRAG_MIME = 'application/x-fsec-version-uuid';

export interface FsecDragProps {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
}

export interface FsecDropProps {
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
}

export interface FsecDragHandlers {
    /** Props à étaler sur un item de palette draggable. */
    dragProps: (versionUuid: string) => FsecDragProps;
    /** Props à étaler sur le conteneur de drop (résout le jour via data-col-index). */
    dropProps: FsecDropProps;
}

export function useFsecDrag(onDrop: (versionUuid: string, colIdx: number) => void): FsecDragHandlers {
    return useMemo(
        () => ({
            dragProps: (versionUuid: string) => ({
                draggable: true,
                onDragStart: (e: React.DragEvent) => {
                    e.dataTransfer.setData(FSEC_DRAG_MIME, versionUuid);
                    e.dataTransfer.setData('text/plain', versionUuid);
                    e.dataTransfer.effectAllowed = 'copy';
                },
            }),
            dropProps: {
                onDragOver: (e: React.DragEvent) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                },
                onDrop: (e: React.DragEvent) => {
                    e.preventDefault();
                    const versionUuid = e.dataTransfer.getData(FSEC_DRAG_MIME) || e.dataTransfer.getData('text/plain');
                    const td = (e.target as HTMLElement).closest('td[data-col-index]') as HTMLElement | null;
                    if (!td || !versionUuid) return;
                    const ci = parseInt(td.dataset.colIndex ?? '', 10);
                    if (!isNaN(ci)) onDrop(versionUuid, ci);
                },
            },
        }),
        [onDrop],
    );
}
