/**
 * DataTable Component Tests
 * @module widgets/data-table
 *
 * Tests for:
 * - Rendering with data
 * - Empty state
 * - Loading state
 * - Row click handling
 * - Accessibility (axe-core)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { DataTable, Column } from './DataTable';

interface TestItem {
    uuid: string;
    name: string;
    status: string;
    nested: { value: number };
}

const mockData: TestItem[] = [
    { uuid: '1', name: 'Item 1', status: 'Active', nested: { value: 10 } },
    { uuid: '2', name: 'Item 2', status: 'Inactive', nested: { value: 20 } },
    { uuid: '3', name: 'Item 3', status: 'Pending', nested: { value: 30 } },
];

const columns: Column<TestItem>[] = [
    { id: 'name', label: 'Name', accessor: 'name' },
    { id: 'status', label: 'Status', accessor: 'status' },
    { id: 'value', label: 'Value', accessor: 'nested.value' },
];

describe('DataTable', () => {
    // =========================================================================
    // RENDERING TESTS
    // =========================================================================

    describe('Rendering', () => {
        it('renders table headers correctly', () => {
            render(<DataTable columns={columns} data={mockData} />);

            expect(screen.getByText('Name')).toBeInTheDocument();
            expect(screen.getByText('Status')).toBeInTheDocument();
            expect(screen.getByText('Value')).toBeInTheDocument();
        });

        it('renders data rows correctly', () => {
            render(<DataTable columns={columns} data={mockData} />);

            expect(screen.getByText('Item 1')).toBeInTheDocument();
            expect(screen.getByText('Item 2')).toBeInTheDocument();
            expect(screen.getByText('Item 3')).toBeInTheDocument();
            expect(screen.getByText('Active')).toBeInTheDocument();
            expect(screen.getByText('Inactive')).toBeInTheDocument();
        });

        it('renders nested values using dot notation accessor', () => {
            render(<DataTable columns={columns} data={mockData} />);

            expect(screen.getByText('10')).toBeInTheDocument();
            expect(screen.getByText('20')).toBeInTheDocument();
            expect(screen.getByText('30')).toBeInTheDocument();
        });

        it('renders custom render function correctly', () => {
            const customColumns: Column<TestItem>[] = [
                {
                    id: 'custom',
                    label: 'Custom',
                    render: (row) => <span data-testid="custom">{row.name.toUpperCase()}</span>,
                },
            ];

            render(<DataTable columns={customColumns} data={mockData} />);

            expect(screen.getByText('ITEM 1')).toBeInTheDocument();
        });

        it('renders accessor function correctly', () => {
            const fnColumns: Column<TestItem>[] = [
                {
                    id: 'computed',
                    label: 'Computed',
                    accessor: (row) => `${row.name} - ${row.status}`,
                },
            ];

            render(<DataTable columns={fnColumns} data={mockData} />);

            expect(screen.getByText('Item 1 - Active')).toBeInTheDocument();
        });
    });

    // =========================================================================
    // EMPTY STATE
    // =========================================================================

    describe('Empty State', () => {
        it('shows default empty message when no data', () => {
            render(<DataTable columns={columns} data={[]} />);

            expect(screen.getByText('Aucune donnée disponible')).toBeInTheDocument();
        });

        it('shows custom empty message', () => {
            render(<DataTable columns={columns} data={[]} emptyMessage="No items found" />);

            expect(screen.getByText('No items found')).toBeInTheDocument();
        });
    });

    // =========================================================================
    // LOADING STATE
    // =========================================================================

    describe('Loading State', () => {
        it('shows loading indicator when isLoading is true', () => {
            render(<DataTable columns={columns} data={[]} isLoading />);

            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        it('does not show empty message while loading', () => {
            render(<DataTable columns={columns} data={[]} isLoading />);

            expect(screen.queryByText('Aucune donnée disponible')).not.toBeInTheDocument();
        });
    });

    // =========================================================================
    // ROW CLICK
    // =========================================================================

    describe('Row Click', () => {
        it('calls onRowClick when a row is clicked', () => {
            const handleClick = vi.fn();
            render(<DataTable columns={columns} data={mockData} onRowClick={handleClick} />);

            fireEvent.click(screen.getByText('Item 1'));

            expect(handleClick).toHaveBeenCalledWith(mockData[0]);
        });

        it('applies pointer cursor when onRowClick is provided', () => {
            const handleClick = vi.fn();
            const { container } = render(<DataTable columns={columns} data={mockData} onRowClick={handleClick} />);

            const row = container.querySelector('tbody tr');
            expect(row).toHaveStyle({ cursor: 'pointer' });
        });

        it('applies default cursor when onRowClick is not provided', () => {
            const { container } = render(<DataTable columns={columns} data={mockData} />);

            const row = container.querySelector('tbody tr');
            expect(row).toHaveStyle({ cursor: 'default' });
        });
    });

    // =========================================================================
    // ACCESSIBILITY (axe-core)
    // =========================================================================

    describe('Accessibility', () => {
        it('should have no accessibility violations with data', async () => {
            const { container } = render(<DataTable columns={columns} data={mockData} />);

            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        it('should have no accessibility violations when empty', async () => {
            const { container } = render(<DataTable columns={columns} data={[]} />);

            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        it('should have no accessibility violations when loading', async () => {
            const { container } = render(<DataTable columns={columns} data={[]} isLoading />);

            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        it('renders table with proper semantic structure', () => {
            render(<DataTable columns={columns} data={mockData} />);

            expect(screen.getByRole('table')).toBeInTheDocument();
            expect(screen.getAllByRole('columnheader')).toHaveLength(3);
            expect(screen.getAllByRole('row')).toHaveLength(4); // 1 header + 3 data rows
        });
    });
});
