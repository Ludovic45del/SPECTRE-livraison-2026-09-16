/**
 * Équipe — annuaire du personnel (sous-section « Équipe » de « Équipe et Carte »).
 * @module pages/equipe
 *
 * Visible par tout utilisateur authentifié. Le chef de labo dispose en plus de
 * la gestion des utilisateurs (ex-page Administration) : la vue admin remplace
 * la vue lecture seule selon le rôle.
 */

import { Container, Typography } from '@mui/material';
import { useAuthStore } from '@features/auth';
import { EquipeMemberView } from './components/EquipeMemberView';
import { EquipeAdminView } from './components/EquipeAdminView';
import { VISUALLY_HIDDEN } from './constants';

export default function EquipeAnnuairePage() {
    const roles = useAuthStore((s) => s.roles);
    const isChef = roles.includes('chef_labo');

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <Typography variant="h4" component="h1" sx={VISUALLY_HIDDEN}>
                Équipe
            </Typography>
            {isChef ? <EquipeAdminView /> : <EquipeMemberView />}
        </Container>
    );
}
