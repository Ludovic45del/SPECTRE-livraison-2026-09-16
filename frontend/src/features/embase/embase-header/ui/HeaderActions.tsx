/**
 * HeaderActions sub-component
 * Displays the right-side action buttons: add etalonnage, compare, delete.
 * The voie selection menu for 2-voies embases is managed locally.
 */

import { useState, useCallback, memo, type ReactNode } from 'react';
import { Stack, IconButton, Tooltip, Menu, MenuItem, ListItemText } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { motion } from '@shared/ui/motion';

/* ── Module-level constants (R-PERF-05) ─────────────────────────── */

const actionButtonBaseSx = {
    width: 40,
    height: 40,
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: '50%',
    bgcolor: 'background.paper',
    color: 'text.secondary',
    transition: `all ${motion.base}`,
} as const;

/* ── ActionButton sub-component ─────────────────────────────────── */

interface ActionButtonProps {
    tooltip: string;
    ariaLabel: string;
    onClick: (event: React.MouseEvent<HTMLElement>) => void;
    hoverSx: Record<string, string>;
    children: ReactNode;
}

const ActionButton = memo(function ActionButton({ tooltip, ariaLabel, onClick, hoverSx, children }: ActionButtonProps) {
    return (
        <Tooltip title={tooltip}>
            <IconButton onClick={onClick} aria-label={ariaLabel} sx={{ ...actionButtonBaseSx, '&:hover': hoverSx }}>
                {children}
            </IconButton>
        </Tooltip>
    );
});

const addHoverSx = { bgcolor: 'primary.lighter', borderColor: 'primary.main', color: 'primary.main' } as const;
const compareHoverSx = { bgcolor: '#f3e5f5', borderColor: '#9c27b0', color: '#9c27b0' } as const;
const deleteHoverSx = { bgcolor: 'error.lighter', borderColor: 'error.main', color: 'error.main' } as const;

/* ── Main component ─────────────────────────────────────────────── */

interface HeaderActionsProps {
    nombreVoies: number;
    onAddEtalonnage?: (voie: 1 | 2) => void;
    onCompare?: () => void;
    onDelete: () => void;
}

function HeaderActionsComponent({ nombreVoies, onAddEtalonnage, onCompare, onDelete }: HeaderActionsProps) {
    const [etalMenuAnchor, setEtalMenuAnchor] = useState<HTMLElement | null>(null);

    const handleAddClick = useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            if (nombreVoies === 2) {
                setEtalMenuAnchor(event.currentTarget);
            } else {
                onAddEtalonnage?.(1);
            }
        },
        [nombreVoies, onAddEtalonnage],
    );

    const handleCloseMenu = useCallback(() => setEtalMenuAnchor(null), []);

    const handleEtalMenuSelect = useCallback(
        (voie: 1 | 2) => {
            setEtalMenuAnchor(null);
            onAddEtalonnage?.(voie);
        },
        [onAddEtalonnage],
    );

    return (
        <Stack direction="row" spacing={1} alignItems="center">
            <ActionButton
                tooltip="Ajouter un etalonnage"
                ariaLabel="Ajouter un etalonnage"
                onClick={handleAddClick}
                hoverSx={addHoverSx}
            >
                <AddCircleOutlineIcon sx={{ fontSize: 20 }} />
            </ActionButton>
            {nombreVoies === 2 && (
                <Menu anchorEl={etalMenuAnchor} open={Boolean(etalMenuAnchor)} onClose={handleCloseMenu}>
                    <MenuItem onClick={() => handleEtalMenuSelect(1)}>
                        <ListItemText>Voie V1</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => handleEtalMenuSelect(2)}>
                        <ListItemText>Voie V2</ListItemText>
                    </MenuItem>
                </Menu>
            )}
            {onCompare && (
                <ActionButton
                    tooltip="Comparaison V1 / V2"
                    ariaLabel="Comparaison V1/V2"
                    onClick={onCompare}
                    hoverSx={compareHoverSx}
                >
                    <CompareArrowsIcon sx={{ fontSize: 20 }} />
                </ActionButton>
            )}
            <ActionButton
                tooltip="Supprimer l'embase"
                ariaLabel="Supprimer l'embase"
                onClick={onDelete}
                hoverSx={deleteHoverSx}
            >
                <DeleteOutlineIcon sx={{ fontSize: 20 }} />
            </ActionButton>
        </Stack>
    );
}

export const HeaderActions = memo(HeaderActionsComponent);
