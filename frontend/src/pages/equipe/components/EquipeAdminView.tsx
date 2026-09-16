/**
 * EquipeAdminView — annuaire + gestion des utilisateurs (chef de labo).
 * @module pages/equipe
 *
 * Reprend les fonctions de l'ancienne page Administration : liste complète
 * (actifs + inactifs) via l'API admin `/users/`, création, modification,
 * réinitialisation de mot de passe et (dés)activation — orchestrées via les
 * modales existantes de `@features/admin`, déclenchées depuis les cartes.
 */

import { useCallback, useState } from 'react';
import { useUsers, type User } from '@entities/user';
import {
    CreateUserModal,
    EditUserModal,
    ResetPasswordDialog,
    ToggleUserDialog,
    useCreateUserStore,
} from '@features/admin';
import { EquipeDirectory } from './EquipeDirectory';

type DialogType = 'edit' | 'reset' | 'toggle';

export function EquipeAdminView() {
    const { data: users, isLoading, error } = useUsers();
    const openCreate = useCreateUserStore((s) => s.open);

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [openDialog, setOpenDialog] = useState<DialogType | null>(null);

    const handleAction = useCallback(
        (uuid: string, action: DialogType) => {
            setSelectedUser(users?.find((u) => u.uuid === uuid) ?? null);
            setOpenDialog(action);
        },
        [users],
    );

    const handleClose = useCallback(() => {
        setSelectedUser(null);
        setOpenDialog(null);
    }, []);

    return (
        <>
            <EquipeDirectory
                people={users}
                isLoading={isLoading}
                error={error}
                admin={{ onAdd: openCreate, onAction: handleAction }}
            />

            <CreateUserModal />
            <EditUserModal user={selectedUser} open={openDialog === 'edit'} onClose={handleClose} />
            <ResetPasswordDialog user={selectedUser} open={openDialog === 'reset'} onClose={handleClose} />
            <ToggleUserDialog user={selectedUser} open={openDialog === 'toggle'} onClose={handleClose} />
        </>
    );
}
