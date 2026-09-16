/**
 * FA Timeline - Chronological history of FA events
 * @module pages/fa-details/sections
 *
 * Custom vertical timeline showing creation, IEC validations, and closure
 */

import { useMemo, memo } from 'react';
import { Box, Paper, Typography, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Fa } from '@entities/fa';
import { UserChip } from '@entities/user';
import { formatDateShort } from '@shared/lib';
import { FaSectionHeader, PAPER_BASE_SX } from '../components';

// ============================================================================
// Types
// ============================================================================

interface FaTimelineProps {
    fa: Fa;
}

interface TimelineEvent {
    label: string;
    date: string | Date | null | undefined;
    validatorName: string | null | undefined;
    validatorUserUuid: string | null | undefined;
    isCompleted: boolean;
    color: string;
}

// ============================================================================
// Component
// ============================================================================

export const FaTimeline = memo(function FaTimeline({ fa }: FaTimelineProps) {
    const events = useMemo<TimelineEvent[]>(
        () => [
            {
                label: 'Création de la FA',
                date: fa.createdAt,
                validatorName: null,
                validatorUserUuid: null,
                isCompleted: true,
                color: '#FFA726',
            },
            {
                label: 'Validation IEC - Phase Ouvert',
                date: fa.iecValidationOpenDate,
                validatorName: fa.iecValidationOpenName,
                validatorUserUuid: fa.iecValidationOpenUserUuid,
                isCompleted: fa.iecValidationOpen === true,
                color: '#FFA726',
            },
            {
                label: 'Validation IEC - Phase En cours',
                // Pas de date dédiée pour la phase En cours : seules les dates
                // d'ouverture et de clôture sont suivies. On affiche uniquement
                // le validateur et l'état de la validation.
                date: null,
                validatorName: fa.iecValidationProgressName,
                validatorUserUuid: fa.iecValidationProgressUserUuid,
                isCompleted: fa.iecValidationProgress === true,
                color: '#42A5F5',
            },
            {
                label: 'Clôture',
                date: fa.closureDate,
                validatorName: fa.closureValidatorName,
                validatorUserUuid: fa.closureValidatorUserUuid,
                isCompleted: fa.statusId === 2,
                color: '#66BB6A',
            },
        ],
        [fa],
    );

    return (
        <Paper variant="outlined" sx={PAPER_BASE_SX} component="section" aria-label="Historique de la FA">
            <FaSectionHeader label="Historique" chipColor="default" />

            <Stack spacing={0}>
                {events.map((event, index) => (
                    <Box key={event.label} sx={{ display: 'flex', gap: 2 }}>
                        {/* Left: icon + connector line */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                width: 24,
                                flexShrink: 0,
                            }}
                        >
                            {event.isCompleted ? (
                                <CheckCircleIcon sx={{ fontSize: 24, color: event.color }} aria-hidden="true" />
                            ) : (
                                <RadioButtonUncheckedIcon sx={{ fontSize: 24, color: 'grey.400' }} aria-hidden="true" />
                            )}
                            {index < events.length - 1 && (
                                <Box
                                    sx={{
                                        width: 2,
                                        flexGrow: 1,
                                        minHeight: 24,
                                        bgcolor: event.isCompleted ? event.color : 'grey.300',
                                    }}
                                />
                            )}
                        </Box>

                        {/* Right: content */}
                        <Box sx={{ pb: index < events.length - 1 ? 2 : 0, minHeight: 48 }}>
                            <Typography
                                variant="body2"
                                fontWeight={event.isCompleted ? 600 : 400}
                                color={event.isCompleted ? 'text.primary' : 'text.disabled'}
                            >
                                {event.label}
                            </Typography>
                            {event.isCompleted && (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    {event.date && (
                                        <Typography variant="caption" color="text.secondary">
                                            {formatDateShort(event.date)}
                                        </Typography>
                                    )}
                                    {(event.validatorUserUuid || event.validatorName) && (
                                        <>
                                            {event.date && (
                                                <Typography variant="caption" color="text.secondary">
                                                    —
                                                </Typography>
                                            )}
                                            <UserChip
                                                userUuid={event.validatorUserUuid}
                                                fallbackText={event.validatorName}
                                            />
                                        </>
                                    )}
                                </Stack>
                            )}
                        </Box>
                    </Box>
                ))}
            </Stack>
        </Paper>
    );
});
