/**
 * AssemblyItemsSection — orchestrateur de la section éléments/consommables
 * dans l'onglet Assemblage d'une FSEC (CDC §5.3).
 *
 *  - Bandeau "FSEC verrouillée" si la FSEC est tirée
 *  - Bouton "Ajouter un élément" (caché si verrouillée)
 *  - Tableau récap (lecture seule si verrouillée)
 */

import { useState } from 'react';
import { Box, Button, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import { AddAssemblyItemModal } from './AddAssemblyItemModal';
import { AssemblyItemsTable } from './AssemblyItemsTable';
import { FsecLockedBanner } from './FsecLockedBanner';

interface AssemblyItemsSectionProps {
    fsecUuid: string;
    /** True si le statut FSEC = Tirée (id=7) → tout est en lecture seule. */
    isLocked: boolean;
}

export function AssemblyItemsSection({ fsecUuid, isLocked }: AssemblyItemsSectionProps) {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <Paper variant="outlined" sx={{ p: 3, borderColor: 'divider', borderRadius: 1 }}>
            {!isLocked && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
                        Ajouter un élément
                    </Button>
                </Box>
            )}

            {isLocked && <FsecLockedBanner />}

            <AssemblyItemsTable fsecUuid={fsecUuid} disabled={isLocked} />

            {!isLocked && (
                <AddAssemblyItemModal open={modalOpen} fsecUuid={fsecUuid} onClose={() => setModalOpen(false)} />
            )}
        </Paper>
    );
}
