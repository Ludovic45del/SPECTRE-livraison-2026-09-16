import { memo } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableRow, Skeleton } from '@mui/material';

interface Column {
    key: string;
    label: string;
    width: string;
}

interface EmbaseTableSkeletonProps {
    columns: Column[];
    columnWidths: Record<string, string>;
}

const SkeletonRow = memo(function SkeletonRow() {
    return (
        <TableRow>
            <TableCell>
                <Skeleton variant="text" width="80%" height={24} />
            </TableCell>
            <TableCell>
                <Skeleton variant="rounded" width={80} height={24} />
            </TableCell>
            <TableCell>
                <Skeleton variant="text" width="70%" height={24} />
            </TableCell>
            <TableCell>
                <Skeleton variant="text" width="60%" height={24} />
            </TableCell>
            <TableCell>
                <Skeleton variant="rounded" width={40} height={24} />
            </TableCell>
            <TableCell>
                <Skeleton variant="rounded" width={80} height={24} />
            </TableCell>
            <TableCell>
                <Skeleton variant="rounded" width={40} height={24} />
            </TableCell>
            <TableCell>
                <Skeleton variant="text" width={20} height={24} />
            </TableCell>
            <TableCell align="center">
                <Skeleton variant="circular" width={32} height={32} />
            </TableCell>
        </TableRow>
    );
});

function EmbaseTableSkeletonComponent({ columns, columnWidths }: EmbaseTableSkeletonProps) {
    return (
        <>
            <Paper variant="outlined" sx={{ borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', py: 1.25 }}>
                    {columns.map((col) => (
                        <Box key={col.key} sx={{ width: col.width, pl: 2 }}>
                            <Typography sx={{ fontWeight: 500, fontSize: '0.95rem' }}>{col.label}</Typography>
                        </Box>
                    ))}
                    <Box sx={{ width: columnWidths.actions }} />
                </Box>
            </Paper>
            <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ borderColor: 'divider', borderRadius: 1, mt: 1.5 }}
            >
                <Table sx={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        {Object.values(columnWidths).map((width, i) => (
                            <col key={i} style={{ width }} />
                        ))}
                    </colgroup>
                    <TableBody>
                        {[...Array(6)].map((_, i) => (
                            <SkeletonRow key={i} />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
}

export const EmbaseTableSkeleton = memo(EmbaseTableSkeletonComponent);
