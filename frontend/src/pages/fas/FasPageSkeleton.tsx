/**
 * FA List Page Skeleton
 * @module pages/fas
 *
 * Loading skeleton for the FA list page.
 */

import { memo } from 'react';
import {
    Box,
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Typography,
    Skeleton,
} from '@mui/material';
import { FasToolbar } from '@features/fa';

interface ColumnDef {
    key: string;
    label: string;
    width: string;
}

interface FasPageSkeletonProps {
    columns: ColumnDef[];
    actionsWidth: string;
}

export const FasPageSkeleton = memo(function FasPageSkeleton({ columns, actionsWidth }: FasPageSkeletonProps) {
    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <FasToolbar />
            <Paper variant="outlined" sx={{ borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', py: 1.25 }}>
                    {columns.map((col) => (
                        <Box key={col.key} sx={{ width: col.width, pl: 2 }}>
                            <Typography sx={{ fontWeight: 500, fontSize: '0.95rem' }}>{col.label}</Typography>
                        </Box>
                    ))}
                    <Box sx={{ width: actionsWidth }} />
                </Box>
            </Paper>
            <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ borderColor: 'divider', borderRadius: 1, mt: 3 }}
            >
                <Table sx={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        {columns.map((col) => (
                            <col key={col.key} style={{ width: col.width }} />
                        ))}
                        <col style={{ width: actionsWidth }} />
                    </colgroup>
                    <TableBody>
                        {[...Array(10)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <Skeleton variant="text" width="80%" height={24} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="text" width="70%" height={24} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="rounded" width={80} height={24} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="rounded" width={80} height={24} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="text" width={80} height={24} />
                                </TableCell>
                                <TableCell align="center">
                                    <Skeleton variant="circular" width={32} height={32} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
});
