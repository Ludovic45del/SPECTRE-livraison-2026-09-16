/**
 * Hook for entity list pages with sorting and pagination.
 * Extracts the duplicated state management from CampaignsPage, FasPage, FsecsPage.
 */

import { useState, useCallback, useMemo } from 'react';

const DEFAULT_ROWS_PER_PAGE = 25;
export const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

interface UseEntityListOptions<TSortColumn extends string> {
    defaultSortColumn: TSortColumn;
    defaultSortDirection?: 'asc' | 'desc';
}

export function useEntityList<TSortColumn extends string>({
    defaultSortColumn,
    defaultSortDirection = 'asc',
}: UseEntityListOptions<TSortColumn>) {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
    const [sortColumn, setSortColumn] = useState<TSortColumn>(defaultSortColumn);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);

    const handleSort = useCallback((column: TSortColumn) => {
        setSortColumn((prevColumn) => {
            if (prevColumn === column) {
                setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            } else {
                setSortDirection('asc');
            }
            return column;
        });
        setPage(0);
    }, []);

    const handleChangePage = useCallback((_: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    const paginate = useCallback(
        <T>(items: T[]): T[] => {
            const start = page * rowsPerPage;
            return items.slice(start, start + rowsPerPage);
        },
        [page, rowsPerPage],
    );

    return useMemo(
        () => ({
            sortColumn,
            sortDirection,
            page,
            rowsPerPage,
            handleSort,
            handleChangePage,
            handleChangeRowsPerPage,
            paginate,
        }),
        [sortColumn, sortDirection, page, rowsPerPage, handleSort, handleChangePage, handleChangeRowsPerPage, paginate],
    );
}
