/**
 * FSECs Page Loading Skeleton
 * @module pages/fsecs/components/FsecsPageSkeleton
 */

import {
    Box,
    Typography,
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Skeleton,
} from '@mui/material';
import { FsecsToolbar } from '@features/fsec/filter-fsecs';
import { COLUMNS, COLUMN_WIDTHS } from '../constants';

export function FsecsPageSkeleton() {
    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <FsecsToolbar />
            <Paper variant="outlined" sx={{ borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', py: 1.25 }}>
                    {COLUMNS.map((col) => (
                        <Box key={col.key} sx={{ width: col.width, pl: 2 }}>
                            <Typography sx={{ fontWeight: 500, fontSize: '0.95rem' }}>{col.label}</Typography>
                        </Box>
                    ))}
                    <Box sx={{ width: COLUMN_WIDTHS.actions }} />
                </Box>
            </Paper>
            <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ borderColor: 'divider', borderRadius: 1, mt: 3 }}
            >
                <Table sx={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        {Object.values(COLUMN_WIDTHS).map((width, i) => (
                            <col key={i} style={{ width }} />
                        ))}
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
                                    <Skeleton variant="text" width={50} height={24} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="rounded" width={80} height={24} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="rounded" width={80} height={24} />
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
}
