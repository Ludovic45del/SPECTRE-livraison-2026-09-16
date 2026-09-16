/**
 * Tests de la palette de FSEC à planifier.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { setup } from '@test/test-utils';
import { FsecPalette } from './FsecPalette';
import type { FsecInfo } from './types';

const fsec = (over: Partial<FsecInfo>): FsecInfo => ({
    versionUuid: 'v',
    fsecUuid: 'f',
    name: 'X',
    categoryId: 0,
    statusId: 0,
    shootingDate: null,
    ...over,
    displayName: over.displayName ?? over.name ?? 'X',
});

const dragProps = () => ({ draggable: true as const, onDragStart: () => {} });

describe('FsecPalette', () => {
    it('lists the FSECs with a count and fires onPlan on the fallback button', async () => {
        const onPlan = vi.fn();
        const { user } = setup(
            <FsecPalette
                fsecs={[fsec({ versionUuid: 'v1', name: 'Alpha' }), fsec({ versionUuid: 'v2', name: 'Beta' })]}
                accentColor="#000"
                dragProps={dragProps}
                onPlan={onPlan}
            />,
        );

        expect(screen.getByText('FSEC à planifier (2)')).toBeInTheDocument();
        expect(screen.getByText('Alpha')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Planifier Alpha' }));
        expect(onPlan).toHaveBeenCalledWith('v1');
    });

    it('shows an empty state when nothing is left to schedule', () => {
        setup(<FsecPalette fsecs={[]} accentColor="#000" dragProps={dragProps} onPlan={vi.fn()} />);
        expect(screen.getByText(/toutes les fsec sont planifiées/i)).toBeInTheDocument();
    });
});
