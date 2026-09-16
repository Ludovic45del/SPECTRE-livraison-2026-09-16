/**
 * Tests du DnD HTML5 (palette → board) : sérialisation + résolution du jour cible.
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useFsecDrag } from './useFsecDrag';

/** DataTransfer minimal pour jsdom (getData/setData adossés à une Map). */
function makeDataTransfer(): DataTransfer {
    const store = new Map<string, string>();
    return {
        setData: (k: string, v: string) => store.set(k, v),
        getData: (k: string) => store.get(k) ?? '',
        dropEffect: 'none',
        effectAllowed: 'all',
    } as unknown as DataTransfer;
}

function Harness({ onDrop }: { onDrop: (uuid: string, colIdx: number) => void }) {
    const { dragProps, dropProps } = useFsecDrag(onDrop);
    return (
        <div {...dropProps}>
            <span data-testid="src" {...dragProps('fsec-1')}>
                FSEC 1
            </span>
            <table>
                <tbody>
                    <tr>
                        <td data-col-index={2} data-testid="cell-2">
                            j2
                        </td>
                        <td data-col-index={5} data-testid="cell-5">
                            j5
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

describe('useFsecDrag', () => {
    it('carries the versionUuid and resolves the dropped column index', () => {
        const onDrop = vi.fn();
        render(<Harness onDrop={onDrop} />);
        const dt = makeDataTransfer();

        fireEvent.dragStart(screen.getByTestId('src'), { dataTransfer: dt });
        fireEvent.dragOver(screen.getByTestId('cell-5'), { dataTransfer: dt });
        fireEvent.drop(screen.getByTestId('cell-5'), { dataTransfer: dt });

        expect(onDrop).toHaveBeenCalledWith('fsec-1', 5);
    });

    it('ignores a drop outside any day cell', () => {
        const onDrop = vi.fn();
        render(<Harness onDrop={onDrop} />);
        const dt = makeDataTransfer();
        fireEvent.dragStart(screen.getByTestId('src'), { dataTransfer: dt });
        fireEvent.drop(screen.getByTestId('src'), { dataTransfer: dt }); // pas un td[data-col-index]
        expect(onDrop).not.toHaveBeenCalled();
    });
});
