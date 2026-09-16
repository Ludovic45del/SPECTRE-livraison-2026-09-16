import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    LinearProgress,
    Box,
    Typography,
} from '@mui/material';
import { ReactNode, useCallback, useMemo } from 'react';

export interface Column<T> {
    id: string;
    label: string;
    // Accessor path ('type.label') or function
    accessor?: string | ((row: T) => ReactNode);
    render?: (row: T) => ReactNode;
    minWidth?: number;
    align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
    onRowClick?: (row: T) => void;
    emptyMessage?: string;
    rowKey?: (row: T) => string | number;
}

// Helper to get nested value
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, part) => {
        if (acc && typeof acc === 'object' && part in acc) {
            return (acc as Record<string, unknown>)[part];
        }
        return undefined;
    }, obj);
}

const ROW_SX_CLICKABLE = { cursor: 'pointer' } as const;
const ROW_SX_DEFAULT = { cursor: 'default' } as const;
const EMPTY_BOX_SX = { py: 3 } as const;

export function DataTable<T extends { uuid?: string; id?: number | string }>({
    columns,
    data,
    isLoading,
    onRowClick,
    emptyMessage = 'Aucune donnée disponible',
    rowKey,
}: DataTableProps<T>) {
    const rowSx = onRowClick ? ROW_SX_CLICKABLE : ROW_SX_DEFAULT;

    // onClick stable : référence le `onRowClick` courant via une closure unique
    // pour éviter la création d'une fonction inline par ligne et par render.
    const handleRowClick = useCallback(
        (row: T) => () => {
            onRowClick?.(row);
        },
        [onRowClick],
    );

    const renderedRows = useMemo(() => {
        return data.map((row, index) => {
            const key = rowKey ? rowKey(row) : row.uuid || row.id || index;
            return (
                <TableRow hover key={key} onClick={handleRowClick(row)} sx={rowSx}>
                    {columns.map((col) => {
                        let value;
                        if (col.render) {
                            value = col.render(row);
                        } else if (typeof col.accessor === 'function') {
                            value = col.accessor(row);
                        } else if (typeof col.accessor === 'string') {
                            value = getNestedValue(row, col.accessor);
                        } else {
                            value = '-';
                        }

                        return (
                            <TableCell key={col.id} align={col.align}>
                                {value as ReactNode}
                            </TableCell>
                        );
                    })}
                </TableRow>
            );
        });
    }, [data, columns, rowKey, handleRowClick, rowSx]);

    return (
        <TableContainer component={Paper}>
            {isLoading && <LinearProgress aria-label="Chargement des données" />}
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        {columns.map((col) => (
                            <TableCell
                                key={col.id}
                                component="th"
                                scope="col"
                                style={{ minWidth: col.minWidth }}
                                align={col.align}
                            >
                                {col.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {!isLoading && data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} align="center">
                                <Box sx={EMPTY_BOX_SX}>
                                    <Typography color="text.secondary">{emptyMessage}</Typography>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ) : (
                        renderedRows
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
