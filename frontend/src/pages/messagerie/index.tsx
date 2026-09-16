/**
 * Messagerie interne — liste des conversations + fil de discussion.
 * @module pages/messagerie
 *
 * Route `/messagerie/:conversationUuid?` : la conversation sélectionnée vit
 * dans l'URL (lien profond, navigation arrière naturelle), aucun store client.
 * La page est la seule à instancier le polling de la liste (`useConversations`,
 * 5 s) ; le fil polle ses nouveaux messages de son côté (`ConversationThread`).
 *
 * Mise en page : deux colonnes (liste 340 px | fil) au-dessus de `md`, une seule
 * colonne en dessous (liste sans sélection, fil avec bouton retour sinon).
 */

import { memo, useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Paper,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';

import { useConversation, useConversations, type Conversation } from '@entities/messaging';
import { useMe } from '@entities/user';
import { ConversationList, ConversationThread, MessageSearchDialog, NewConversationDialog } from '@features/messaging';
import { ApiError } from '@shared/api';
import { paths } from '@shared/config';

/** Largeur de la colonne des conversations (deux colonnes). */
const LIST_WIDTH = 340;

/** Titre de page réservé aux lecteurs d'écran (l'en-tête visible est celui de la liste). */
const VISUALLY_HIDDEN = {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
} as const;

/** Colonne de droite sans sélection : invitation à choisir ou créer une conversation. */
const EmptyThreadPlaceholder = memo(function EmptyThreadPlaceholder() {
    return (
        <Box
            sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                p: 4,
                color: 'text.secondary',
                textAlign: 'center',
            }}
        >
            <ForumOutlinedIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
            <Typography variant="body1">Sélectionnez une conversation ou créez-en une nouvelle</Typography>
        </Box>
    );
});

/** Conversation absente (uuid inconnu ou dont l'utilisateur n'est pas membre) : retour à la liste. */
const ConversationNotFound = memo(function ConversationNotFound({ onBack }: { readonly onBack: () => void }) {
    return (
        <Box sx={{ flex: 1, p: 3 }}>
            <Alert
                severity="warning"
                action={
                    <Button color="inherit" size="small" onClick={onBack}>
                        Retour à la liste
                    </Button>
                }
            >
                Conversation introuvable
            </Alert>
        </Box>
    );
});

export default function MessageriePage() {
    const { conversationUuid } = useParams<{ conversationUuid?: string }>();
    const selectedUuid = conversationUuid ?? null;
    const navigate = useNavigate();
    const theme = useTheme();
    const isNarrow = useMediaQuery(theme.breakpoints.down('md'));

    const { data: me } = useMe();
    const meUuid = me?.uuid ?? null;
    const conversations = useConversations();
    // Existence de la conversation sélectionnée : le détail (404 si invisible) fait
    // foi, pas la liste — celle-ci peut être en cours de rafraîchissement juste
    // après une création (le détail, lui, est déjà en cache).
    const selectedConversation = useConversation(selectedUuid);

    const [createOpen, setCreateOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    const handleSelect = useCallback((uuid: string) => navigate(paths.messagerie.conversation(uuid)), [navigate]);
    const handleBack = useCallback(() => navigate(paths.messagerie.root), [navigate]);
    const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
    const handleCloseCreate = useCallback(() => setCreateOpen(false), []);
    const handleCreated = useCallback(
        (conversation: Conversation) => navigate(paths.messagerie.conversation(conversation.uuid)),
        [navigate],
    );
    const handleOpenSearch = useCallback(() => setSearchOpen(true), []);
    const handleCloseSearch = useCallback(() => setSearchOpen(false), []);
    // Résultat de recherche choisi : le dialogue s'est déjà fermé (onClose), le fil s'ouvre.
    const handleOpenFromSearch = useCallback(
        (uuid: string) => navigate(paths.messagerie.conversation(uuid)),
        [navigate],
    );

    // Une seule colonne sous `md` : la liste disparaît dès qu'un fil est ouvert.
    const showList = !isNarrow || selectedUuid === null;
    // Introuvable = 404 uniquement (inconnue ou dont je ne suis pas/plus membre) ;
    // une autre erreur du détail est rendue par le fil lui-même.
    const isNotFound = selectedConversation.error instanceof ApiError && selectedConversation.error.status === 404;

    return (
        <Container maxWidth={false} sx={{ py: 3 }}>
            <Typography variant="h4" component="h1" sx={VISUALLY_HIDDEN}>
                Messagerie
            </Typography>

            {meUuid === null ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }} aria-busy="true">
                    <CircularProgress aria-label="Chargement de la messagerie" />
                </Box>
            ) : (
                <Paper
                    variant="outlined"
                    sx={{
                        display: 'flex',
                        height: 'calc(100vh - 96px)',
                        minHeight: 480,
                        // Même arrondi que les conteneurs `Paper` des autres pages (Matériel…).
                        borderRadius: 1,
                        overflow: 'hidden',
                    }}
                >
                    {showList && (
                        <Box
                            component="aside"
                            aria-label="Volet des conversations"
                            sx={{
                                width: isNarrow ? '100%' : LIST_WIDTH,
                                flexShrink: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                borderRight: isNarrow ? 0 : '1px solid',
                                borderColor: 'divider',
                                minHeight: 0,
                            }}
                        >
                            <ConversationList
                                conversations={conversations.data ?? []}
                                selectedUuid={selectedUuid}
                                onSelect={handleSelect}
                                onCreate={handleOpenCreate}
                                onSearch={handleOpenSearch}
                                isLoading={conversations.isPending}
                                // Une erreur de polling ne doit pas effacer une liste déjà chargée.
                                isError={conversations.isError && !conversations.data}
                                meUuid={meUuid}
                            />
                        </Box>
                    )}

                    {selectedUuid !== null ? (
                        isNotFound ? (
                            <ConversationNotFound onBack={handleBack} />
                        ) : (
                            <Box
                                component="section"
                                aria-label="Fil de discussion"
                                // Colonne : le fil (enfant unique) occupe toute la largeur restante.
                                sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
                            >
                                <ConversationThread
                                    key={selectedUuid}
                                    conversationUuid={selectedUuid}
                                    meUuid={meUuid}
                                    onBack={isNarrow ? handleBack : undefined}
                                    onLeft={handleBack}
                                />
                            </Box>
                        )
                    ) : (
                        !isNarrow && <EmptyThreadPlaceholder />
                    )}
                </Paper>
            )}

            <NewConversationDialog open={createOpen} onClose={handleCloseCreate} onCreated={handleCreated} />
            <MessageSearchDialog
                open={searchOpen}
                onClose={handleCloseSearch}
                onOpenConversation={handleOpenFromSearch}
            />
        </Container>
    );
}
