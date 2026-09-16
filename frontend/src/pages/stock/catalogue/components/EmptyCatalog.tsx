/**
 * État vide du Catalogue (aucun item ou aucun match avec les filtres).
 */

import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Inventory2Icon from '@mui/icons-material/Inventory2';

interface EmptyCatalogProps {
    /** True si la base est vide tout court ; false si c'est juste un filtrage qui ne renvoie rien. */
    isInitialEmpty: boolean;
    onAdd?: () => void;
}

export function EmptyCatalog({ isInitialEmpty, onAdd }: EmptyCatalogProps) {
    return (
        <Stack alignItems="center" spacing={2.5} sx={{ py: 8 }}>
            <Box
                sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'primary.50',
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Inventory2Icon sx={{ fontSize: 36 }} />
            </Box>
            <Stack alignItems="center" spacing={0.5} sx={{ maxWidth: 420, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {isInitialEmpty ? 'Aucun élément dans le catalogue' : 'Aucun résultat'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {isInitialEmpty
                        ? 'Commencez par ajouter votre premier élément ou consommable.'
                        : 'Aucun élément ne correspond aux filtres actuels. Essayez de réinitialiser ou élargir les critères.'}
                </Typography>
            </Stack>
            {isInitialEmpty && onAdd && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
                    Ajouter un élément
                </Button>
            )}
        </Stack>
    );
}
