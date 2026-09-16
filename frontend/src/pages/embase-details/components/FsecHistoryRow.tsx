/**
 * FSEC History Row - Memoized sub-component
 * @module pages/embase-details/components
 */

import { useCallback, memo } from 'react';
import { Typography, TableCell, TableRow, IconButton, Tooltip, alpha, useTheme } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { EmbaseFsecHistoryItem } from '@entities/embase';
import { motion } from '@shared/ui/motion';

interface FsecHistoryRowProps {
    item: EmbaseFsecHistoryItem;
    onNavigate: (fsecVersionUuid: string) => void;
}

export const FsecHistoryRow = memo(function FsecHistoryRow({ item, onNavigate }: FsecHistoryRowProps) {
    const theme = useTheme();

    const handleDoubleClick = useCallback(() => {
        onNavigate(item.fsecVersionUuid);
    }, [item.fsecVersionUuid, onNavigate]);

    const handleButtonClick = useCallback(() => {
        onNavigate(item.fsecVersionUuid);
    }, [item.fsecVersionUuid, onNavigate]);

    return (
        <TableRow
            hover
            sx={{
                cursor: 'pointer',
                transition: `background-color ${motion.fast}`,
                '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
            }}
            onDoubleClick={handleDoubleClick}
        >
            <TableCell>
                <Typography fontWeight={500}>{item.fsecName}</Typography>
            </TableCell>
            <TableCell>
                <Typography>{item.campaignName ?? '-'}</Typography>
            </TableCell>
            <TableCell>
                <Typography>{item.gasType ?? '-'}</Typography>
            </TableCell>
            <TableCell>
                <Typography>
                    {item.dateOfFulfilment ? new Date(item.dateOfFulfilment).toLocaleDateString('fr-FR') : '-'}
                </Typography>
            </TableCell>
            <TableCell align="center">
                <Tooltip title="Voir le FSEC">
                    <IconButton
                        size="small"
                        onClick={handleButtonClick}
                        aria-label={`Voir les détails de ${item.fsecName}`}
                    >
                        <ArrowForwardIcon />
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>
    );
});
