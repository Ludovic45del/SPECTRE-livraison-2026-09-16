/**
 * FSEC Results Tab — Alignement / Livraison / Résultats
 * @module pages/fsec-details/tabs
 *
 * Affiche pour l'instant la section Livraison & Tir.
 * Les sections Alignement et Résultats seront ajoutées ultérieurement.
 */

import { useMemo } from 'react';
import { Box, Stack, alpha, useTheme } from '@mui/material';
import { Fsec } from '@entities/fsec';
import { DeliveryDatesSection } from './components/DeliveryDatesSection';
import { AlignmentLinksSection } from './components/AlignmentLinksSection';

interface ResultsTabProps {
    fsec: Fsec;
}

export function ResultsTab({ fsec }: ResultsTabProps) {
    const theme = useTheme();

    const paperSx = useMemo(
        () => ({
            p: 3,
            borderRadius: 1,
            bgcolor: 'background.paper',
            borderColor: 'divider',
            position: 'relative' as const,
        }),
        [],
    );

    const editButtonSx = useMemo(
        () => ({
            position: 'absolute' as const,
            top: 12,
            right: 12,
            color: 'text.secondary',
            '&:hover': {
                color: 'primary.main',
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
            },
        }),
        [theme.palette.primary.main],
    );

    return (
        <Box>
            <Stack spacing={3}>
                <DeliveryDatesSection fsec={fsec} paperSx={paperSx} editButtonSx={editButtonSx} />
                <AlignmentLinksSection fsec={fsec} paperSx={paperSx} editButtonSx={editButtonSx} />
            </Stack>
        </Box>
    );
}
