/**
 * FsecPalette — colonne des FSEC NON planifiées pour l'étape active.
 *
 * Chaque item est glissable (HTML5) vers le board jours, et dispose d'un bouton
 * « Planifier » (fallback clavier/clic, le DnD natif n'étant pas accessible).
 * Une FSEC quitte la palette dès qu'elle a un step sur l'étape.
 */
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { usePlanningColors } from '../../lib/planning.hooks';
import type { FsecDragProps } from '../../lib/useFsecDrag';
import type { FsecInfo } from './types';

interface FsecPaletteProps {
    fsecs: FsecInfo[];
    accentColor: string;
    /** Props de drag (from useFsecDrag), liés au versionUuid. */
    dragProps: (versionUuid: string) => FsecDragProps;
    /** Fallback clic : planifie la FSEC (au début de la fenêtre du board). */
    onPlan: (versionUuid: string) => void;
}

export function FsecPalette({ fsecs, accentColor, dragProps, onPlan }: FsecPaletteProps) {
    const colors = usePlanningColors();

    return (
        <Box sx={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Typography fontSize={12} fontWeight={700} sx={{ mb: 1, color: colors.accent }}>
                FSEC à planifier ({fsecs.length})
            </Typography>

            {fsecs.length === 0 ? (
                <Typography fontSize={12} color="text.secondary" fontStyle="italic">
                    Toutes les FSEC sont planifiées.
                </Typography>
            ) : (
                <Stack spacing={0.75} sx={{ overflowY: 'auto', pr: 0.5 }}>
                    {fsecs.map((fsec) => (
                        <Box
                            key={fsec.versionUuid}
                            {...dragProps(fsec.versionUuid)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.75,
                                borderRadius: 1,
                                border: `1px solid ${colors.border}`,
                                bgcolor: colors.cellBg,
                                cursor: 'grab',
                                '&:active': { cursor: 'grabbing' },
                                '&:hover': { borderColor: accentColor },
                            }}
                        >
                            <DragIndicatorIcon sx={{ fontSize: 16, color: colors.textSecondary, flexShrink: 0 }} />
                            <Typography noWrap fontSize={12} fontWeight={500} sx={{ flex: 1 }}>
                                {fsec.displayName}
                            </Typography>
                            <Tooltip title="Planifier au début de la période affichée" placement="top">
                                <IconButton
                                    size="small"
                                    aria-label={`Planifier ${fsec.displayName}`}
                                    onClick={() => onPlan(fsec.versionUuid)}
                                    sx={{ p: 0.25, color: accentColor, flexShrink: 0 }}
                                >
                                    <AddCircleOutlineIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    ))}
                </Stack>
            )}
        </Box>
    );
}
