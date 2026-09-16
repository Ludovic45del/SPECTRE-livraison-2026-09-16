/**
 * SectionHeader Component Tests
 * @module pages/campaign-details/overview/components
 *
 * Tests for section header rendering and accessibility.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionHeader } from './SectionHeader';

describe('SectionHeader', () => {
    describe('Rendering', () => {
        it('should render title correctly', () => {
            render(<SectionHeader title="Test Title" />);

            expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Test Title');
        });

        it('should render divider by default', () => {
            const { container } = render(<SectionHeader title="Test" />);

            expect(container.querySelector('hr')).toBeInTheDocument();
        });

        it('should not render divider when showDivider is false', () => {
            const { container } = render(<SectionHeader title="Test" showDivider={false} />);

            expect(container.querySelector('hr')).not.toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should use h3 heading for semantic structure', () => {
            render(<SectionHeader title="Section Title" />);

            const heading = screen.getByRole('heading', { level: 3 });
            expect(heading).toBeInTheDocument();
            expect(heading.tagName).toBe('H3');
        });
    });

    describe('Styling', () => {
        it('should apply h6 variant typography', () => {
            render(<SectionHeader title="Test" />);

            const heading = screen.getByRole('heading', { level: 3 });
            expect(heading).toHaveClass('MuiTypography-h6');
        });
    });
});
