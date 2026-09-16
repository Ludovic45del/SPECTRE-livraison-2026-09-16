/**
 * EquipeDirectory — annuaire du personnel en cartes (présentationnel).
 * @module pages/equipe
 *
 * Cartes portraits groupées par rôle métier (pas de tableau), avec recherche
 * plein-texte. Les données sont fournies en props (par EquipeMemberView via le
 * lookup public, ou EquipeAdminView via l'API admin).
 *
 * Si `admin` est fourni (chef de labo) : barre d'outils enrichie (filtre
 * Actifs/Tous, réinitialiser, ajouter) et menu d'actions par carte. Sinon,
 * annuaire en lecture seule (actifs uniquement).
 */

import { useCallback, useMemo, useState } from 'react';
import { Alert, Box, Button, InputAdornment, Paper, Skeleton, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PersonOffRoundedIcon from '@mui/icons-material/PersonOffRounded';
import { formatRoles, formatUserDisplayName } from '@entities/user';
import { PersonCard, type PersonCardData } from './PersonCard';

// Grille fluide de petites cartes : autant que la largeur le permet, min 190px.
// Liste à plat (pas de regroupement par rôle), triée par nom.
const GRID_SX = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
    gap: 2,
} as const;

const FILTER_BTN_SX = { borderRadius: 1, px: 2, height: 40, fontWeight: 600 } as const;

// Box blanche (surface) entourant la barre d'outils admin — adaptée aux 3 thèmes.
const TOOLBAR_BOX_SX = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 1.5,
    p: 1.5,
    mb: 3,
    borderRadius: 1,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: 'background.paper',
} as const;

/** Actions admin exposées par le conteneur (chef de labo). */
export interface EquipeDirectoryAdmin {
    onAdd: () => void;
    onAction: (uuid: string, action: 'edit' | 'reset' | 'toggle') => void;
}

export interface EquipeDirectoryProps {
    people: PersonCardData[] | undefined;
    isLoading: boolean;
    error: Error | null;
    /** Présent uniquement pour le chef de labo. */
    admin?: EquipeDirectoryAdmin;
}

/** Vrai si `person` matche la recherche (insensible à la casse). */
function matchesSearch(person: PersonCardData, needle: string): boolean {
    if (!needle) return true;
    const haystack = [
        person.firstName,
        person.lastName,
        person.username,
        person.service,
        person.bureau,
        person.numero,
        person.laboratoire,
        formatRoles(person.roles),
    ];
    return haystack.some((field) => field?.toLowerCase().includes(needle));
}

export function EquipeDirectory({ people, isLoading, error, admin }: EquipeDirectoryProps) {
    const isAdmin = Boolean(admin);
    const [search, setSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const needle = search.trim().toLowerCase();

    const handleReset = useCallback(() => {
        setSearch('');
        setShowInactive(false);
    }, []);

    // Personnel filtré (recherche + statut), trié par nom — liste à plat.
    const members = useMemo<PersonCardData[]>(() => {
        if (!people) return [];
        return people
            .filter((p) => (p.isActive || (isAdmin && showInactive)) && matchesSearch(p, needle))
            .sort((a, b) => formatUserDisplayName(a).localeCompare(formatUserDisplayName(b), 'fr'));
    }, [people, needle, isAdmin, showInactive]);

    const searchField = (
        <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un collègue, un service…"
            size="small"
            sx={{ width: { xs: '100%', sm: 320 } }}
            slotProps={{
                input: {
                    'aria-label': 'Rechercher un membre du personnel',
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                        </InputAdornment>
                    ),
                },
            }}
        />
    );

    return (
        <>
            {/* Barre d'outils — encadrée (box) en mode admin, recherche seule sinon */}
            {admin ? (
                <Paper elevation={0} sx={TOOLBAR_BOX_SX}>
                    <Button
                        variant={!showInactive ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setShowInactive(false)}
                        sx={FILTER_BTN_SX}
                    >
                        Actifs
                    </Button>
                    <Button
                        variant={showInactive ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setShowInactive(true)}
                        sx={FILTER_BTN_SX}
                    >
                        Tous
                    </Button>

                    {searchField}

                    <Box sx={{ display: 'flex', gap: 1, ml: { sm: 'auto' } }}>
                        <Button variant="text" size="small" startIcon={<RestartAltIcon />} onClick={handleReset}>
                            Réinitialiser
                        </Button>
                        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={admin.onAdd}>
                            Ajouter
                        </Button>
                    </Box>
                </Paper>
            ) : (
                <Box sx={{ mb: 3 }}>{searchField}</Box>
            )}

            {/* États : erreur / chargement / vide / contenu */}
            {error ? (
                <Alert severity="error">Impossible de charger le personnel : {error.message}</Alert>
            ) : isLoading ? (
                <Box sx={GRID_SX}>
                    {Array.from({ length: 12 }).map((_, i) => (
                        <Skeleton key={i} variant="rounded" height={208} sx={{ borderRadius: 1 }} />
                    ))}
                </Box>
            ) : members.length === 0 ? (
                <Stack alignItems="center" spacing={1.5} sx={{ py: 8, color: 'text.secondary' }}>
                    <PersonOffRoundedIcon sx={{ fontSize: 48, opacity: 0.4 }} />
                    <Typography>Aucun membre ne correspond à votre recherche.</Typography>
                </Stack>
            ) : (
                <Box sx={GRID_SX}>
                    {members.map((person) => (
                        <PersonCard
                            key={person.uuid}
                            person={person}
                            adminActions={
                                admin
                                    ? {
                                          onEdit: () => admin.onAction(person.uuid, 'edit'),
                                          onResetPassword: () => admin.onAction(person.uuid, 'reset'),
                                          onToggleActive: () => admin.onAction(person.uuid, 'toggle'),
                                      }
                                    : undefined
                            }
                        />
                    ))}
                </Box>
            )}
        </>
    );
}
