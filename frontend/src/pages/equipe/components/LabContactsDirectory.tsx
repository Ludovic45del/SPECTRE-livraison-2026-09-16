/**
 * LabContactsDirectory — annuaire des laboratoires (numéros utiles), éditable.
 * @module pages/equipe
 *
 * Liste partagée par toute l'équipe (retour R07 : téléphones du 426 / 215 /
 * numéros utiles). Cartes compactes avec recherche plein-texte, bouton
 * « Ajouter », actions Modifier / Supprimer (avec confirmation) par carte.
 * Aucun seed : la page part vide et invite à saisir les premiers contacts.
 */

import { memo, useCallback, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Paper,
    Skeleton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PhoneIcon from '@mui/icons-material/Phone';
import ContactPhoneOutlinedIcon from '@mui/icons-material/ContactPhoneOutlined';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import { useDeleteLabContact, useLabContacts, type LabContact } from '@entities/lab-contact';
import { getErrorMessage } from '@shared/lib';
import { motion, useNotification } from '@shared/ui';
import { LabContactFormDialog } from './LabContactFormDialog';

// Grille fluide de petites cartes (même principe que EquipeDirectory), min 260px.
const GRID_SX = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 2,
} as const;

// Box blanche (surface) entourant la barre d'outils — adaptée aux 3 thèmes.
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

// Carte : arrondi/bordure hérités du thème (comme PersonCard, KpiCard…) et
// même survol « lift » que les autres cartes de l'appli.
const CARD_SX = {
    height: '100%',
    transition: motion.transition(['transform', 'box-shadow', 'border-color'], 'medium'),
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 4,
        borderColor: 'primary.light',
    },
    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
} as const;

/** Tri alphabétique FR, numérique : « Labo 215 » < « Labo 426 » < « Labo 1000 ». */
const NAME_COLLATOR = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });

/** Vrai si `contact` matche la recherche (insensible à la casse). */
function matchesSearch(contact: LabContact, needle: string): boolean {
    if (!needle) return true;
    return [contact.name, contact.phone, contact.comment].some((field) => field.toLowerCase().includes(needle));
}

/* ------------------------------------------------------------------ */
/*  Carte                                                              */
/* ------------------------------------------------------------------ */

interface LabContactCardProps {
    readonly contact: LabContact;
    readonly onEdit: (contact: LabContact) => void;
    readonly onDelete: (contact: LabContact) => void;
}

const LabContactCard = memo(function LabContactCard({ contact, onEdit, onDelete }: LabContactCardProps) {
    const handleEdit = useCallback(() => onEdit(contact), [onEdit, contact]);
    const handleDelete = useCallback(() => onDelete(contact), [onDelete, contact]);

    return (
        <Card sx={CARD_SX}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Typography
                        variant="subtitle1"
                        component="h2"
                        sx={{ fontWeight: 600, flex: 1, minWidth: 0, lineHeight: 1.3, wordBreak: 'break-word' }}
                    >
                        {contact.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0, mt: -0.5, mr: -0.5 }}>
                        <Tooltip title="Modifier" arrow>
                            <IconButton size="small" aria-label={`Modifier ${contact.name}`} onClick={handleEdit}>
                                <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer" arrow>
                            <IconButton
                                size="small"
                                aria-label={`Supprimer ${contact.name}`}
                                onClick={handleDelete}
                                sx={{ '&:hover': { color: 'error.main' } }}
                            >
                                <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                    <PhoneIcon fontSize="small" color={contact.phone ? 'primary' : 'disabled'} />
                    {contact.phone ? (
                        <Typography
                            sx={{
                                fontWeight: 600,
                                fontSize: '1.05rem',
                                letterSpacing: '0.02em',
                                fontVariantNumeric: 'tabular-nums',
                                // Sélectionnable d'un double-clic pour copier le numéro.
                                userSelect: 'all',
                            }}
                        >
                            {contact.phone}
                        </Typography>
                    ) : (
                        <Typography variant="body2" color="text.disabled">
                            Numéro non renseigné
                        </Typography>
                    )}
                </Stack>

                {contact.comment && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}
                    >
                        {contact.comment}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
});

/* ------------------------------------------------------------------ */
/*  Annuaire                                                           */
/* ------------------------------------------------------------------ */

export function LabContactsDirectory() {
    const { data: contacts, isLoading, error } = useLabContacts();
    const deleteContact = useDeleteLabContact();
    const { showNotification } = useNotification();

    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<LabContact | null>(null);
    const [pendingDelete, setPendingDelete] = useState<LabContact | null>(null);
    const needle = search.trim().toLowerCase();

    const hasContacts = (contacts?.length ?? 0) > 0;

    // Contacts filtrés par la recherche, triés par nom (tri numérique FR).
    const visibleContacts = useMemo<LabContact[]>(() => {
        if (!contacts) return [];
        return contacts.filter((c) => matchesSearch(c, needle)).sort((a, b) => NAME_COLLATOR.compare(a.name, b.name));
    }, [contacts, needle]);

    const openCreate = useCallback(() => {
        setEditing(null);
        setFormOpen(true);
    }, []);

    const openEdit = useCallback((contact: LabContact) => {
        setEditing(contact);
        setFormOpen(true);
    }, []);

    const closeForm = useCallback(() => {
        setFormOpen(false);
        setEditing(null);
    }, []);

    const requestDelete = useCallback((contact: LabContact) => setPendingDelete(contact), []);

    const cancelDelete = useCallback(() => {
        if (deleteContact.isPending) return;
        setPendingDelete(null);
    }, [deleteContact.isPending]);

    const confirmDelete = useCallback(async () => {
        if (!pendingDelete) return;
        try {
            await deleteContact.mutateAsync(pendingDelete.uuid);
            showNotification('Contact supprimé', 'success');
            setPendingDelete(null);
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, 'Erreur lors de la suppression du contact'), 'error');
        }
    }, [pendingDelete, deleteContact, showNotification]);

    return (
        <>
            {/* Barre d'outils : recherche + ajout */}
            <Paper elevation={0} sx={TOOLBAR_BOX_SX}>
                <TextField
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un labo, un numéro…"
                    size="small"
                    sx={{ width: { xs: '100%', sm: 320 } }}
                    slotProps={{
                        // aria-label porté par l'<input> lui-même (pas la racine InputBase) :
                        // lisible par les lecteurs d'écran ET ciblable comme champ éditable.
                        htmlInput: { 'aria-label': 'Rechercher un contact de laboratoire' },
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
                <Box sx={{ ml: { sm: 'auto' } }}>
                    <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}>
                        Ajouter
                    </Button>
                </Box>
            </Paper>

            {/* États : erreur / chargement / vide (aucun contact) / vide (recherche) / contenu */}
            {error ? (
                <Alert severity="error">Impossible de charger l'annuaire des laboratoires : {error.message}</Alert>
            ) : isLoading ? (
                <Box sx={GRID_SX}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} variant="rounded" height={132} sx={{ borderRadius: 1 }} />
                    ))}
                </Box>
            ) : !hasContacts ? (
                <Stack alignItems="center" spacing={1.5} sx={{ py: 8, color: 'text.secondary', textAlign: 'center' }}>
                    <ContactPhoneOutlinedIcon sx={{ fontSize: 48, opacity: 0.4 }} />
                    <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Aucun contact pour l’instant
                    </Typography>
                    <Typography variant="body2" sx={{ maxWidth: 440 }}>
                        Ajoutez les numéros utiles de l’équipe (laboratoires, services, astreintes…) : ils seront
                        visibles et modifiables par tout le monde.
                    </Typography>
                    <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}>
                        Ajouter un contact
                    </Button>
                </Stack>
            ) : visibleContacts.length === 0 ? (
                <Stack alignItems="center" spacing={1.5} sx={{ py: 8, color: 'text.secondary' }}>
                    <SearchOffRoundedIcon sx={{ fontSize: 48, opacity: 0.4 }} />
                    <Typography>Aucun contact ne correspond à votre recherche.</Typography>
                </Stack>
            ) : (
                <Box sx={GRID_SX}>
                    {visibleContacts.map((contact) => (
                        <LabContactCard
                            key={contact.uuid}
                            contact={contact}
                            onEdit={openEdit}
                            onDelete={requestDelete}
                        />
                    ))}
                </Box>
            )}

            <LabContactFormDialog open={formOpen} onClose={closeForm} contact={editing ?? undefined} />

            {/* Confirmation de suppression — nommé (aria-labelledby) par son DialogTitle. */}
            <Dialog
                open={pendingDelete !== null}
                onClose={cancelDelete}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 2 } }}
            >
                <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem' }}>Supprimer le contact ?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        « {pendingDelete?.name} » sera retiré de l’annuaire pour toute l’équipe.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button
                        onClick={cancelDelete}
                        variant="text"
                        color="inherit"
                        disabled={deleteContact.isPending}
                        sx={{ fontWeight: 600 }}
                    >
                        Annuler
                    </Button>
                    <Button
                        onClick={confirmDelete}
                        variant="contained"
                        color="error"
                        size="small"
                        disabled={deleteContact.isPending}
                    >
                        {deleteContact.isPending ? 'Suppression...' : 'Supprimer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
