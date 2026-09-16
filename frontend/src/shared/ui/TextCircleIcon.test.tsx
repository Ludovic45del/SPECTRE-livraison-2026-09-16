/**
 * Tests de TextCircleIcon — pastille à libellé court partagée.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TextCircleIcon } from './TextCircleIcon';

describe('TextCircleIcon', () => {
    it('rend le libellé dans une pastille accessible (role img)', () => {
        render(<TextCircleIcon label="Fsec" />);
        const icon = screen.getByRole('img', { name: 'Fsec' });
        expect(icon).toHaveTextContent('Fsec');
    });

    it('applique le diamètre demandé', () => {
        render(<TextCircleIcon label="C" size={22} />);
        expect(screen.getByRole('img', { name: 'C' })).toHaveStyle({ width: '22px', height: '22px' });
    });
});
