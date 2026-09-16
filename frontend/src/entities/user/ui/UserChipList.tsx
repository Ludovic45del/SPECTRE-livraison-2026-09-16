/**
 * UserChipList — affichage en lecture seule de plusieurs opérateurs.
 * @module entities/user/ui
 *
 * Rend un UserChip (cliquable, avec popover infos) par uuid. Si la liste est
 * vide, retombe sur `fallbackText` (legacy / membre extérieur) puis `emptyText`.
 * Utilisé pour les étapes réalisées à plusieurs (assemblage, métrologie).
 */

import { memo } from 'react';
import { Box } from '@mui/material';
import { UserChip } from './UserChip';

export interface UserChipListProps {
    /** UUIDs des UserProfile à afficher. */
    uuids: string[];
    /** Texte legacy / MOE-TCI affiché si la liste est vide. */
    fallbackText?: string | null;
    /** Texte affiché si ni uuids ni fallbackText. Défaut "-". */
    emptyText?: string;
}

export const UserChipList = memo(function UserChipList({ uuids, fallbackText, emptyText = '-' }: UserChipListProps) {
    if (uuids.length === 0) {
        return <UserChip userUuid={null} fallbackText={fallbackText} emptyText={emptyText} />;
    }

    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
            {uuids.map((uuid) => (
                <UserChip key={uuid} userUuid={uuid} />
            ))}
        </Box>
    );
});
