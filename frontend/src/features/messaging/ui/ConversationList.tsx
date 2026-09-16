/**
 * ConversationList — colonne de gauche de la messagerie.
 * @module features/messaging/ui
 *
 * En-tête (titre, bouton « Nouvelle conversation », recherche) + liste dense
 * des conversations (ConversationListItem). Le filtrage est synchrone et
 * client (titre + aperçu, insensible à la casse). La liste elle-même est
 * fournie par la page (seule instance du polling `useConversations`) : ce
 * composant est purement présentationnel.
 */

import { memo, useCallback, useMemo, useState, type ChangeEvent } from 'react';
import {
    Alert,
    Box,
    IconButton,
    InputAdornment,
    List,
    Skeleton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';

import { getConversationTitle, type Conversation } from '@entities/messaging';
import { ConversationListItem } from './ConversationListItem';

export interface ConversationListProps {
    readonly conversations: Conversation[];
    readonly selectedUuid: string | null;
    readonly onSelect: (uuid: string) => void;
    readonly onCreate: () => void;
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly meUuid: string | null;
    /** Ouvre la recherche plein texte dans les messages (M4) ; bouton absent si non fourni. */
    readonly onSearch?: () => void;
}

/** Nombre de lignes fantômes pendant le chargement. */
const SKELETON_ROWS = 4;

/** Vrai si le titre ou l'aperçu du dernier message contient `needle` (déjà en minuscules). */
function matchesSearch(conversation: Conversation, meUuid: string, needle: string): boolean {
    if (!needle) return true;
    const title = getConversationTitle(conversation, meUuid).toLowerCase();
    const preview = conversation.lastMessage?.body.toLowerCase() ?? '';
    return title.includes(needle) || preview.includes(needle);
}

/** Ligne fantôme (avatar + deux lignes) reproduisant la géométrie d'un item. */
const SkeletonRow = memo(function SkeletonRow() {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 1 }}>
            <Skeleton variant="circular" width={38} height={38} />
            <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="85%" />
            </Box>
        </Box>
    );
});

export const ConversationList = memo(function ConversationList({
    conversations,
    selectedUuid,
    onSelect,
    onCreate,
    isLoading,
    isError,
    meUuid,
    onSearch,
}: ConversationListProps) {
    const [search, setSearch] = useState('');
    const needle = search.trim().toLowerCase();
    const me = meUuid ?? '';

    const visibleConversations = useMemo<Conversation[]>(
        () => conversations.filter((conversation) => matchesSearch(conversation, me, needle)),
        [conversations, me, needle],
    );

    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value);
    }, []);

    const hasConversations = conversations.length > 0;

    return (
        <Box
            component="section"
            aria-label="Conversations"
            sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, bgcolor: 'background.paper' }}
        >
            {/* En-tête : titre + nouvelle conversation + recherche */}
            <Box sx={{ px: 1.5, pt: 1.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6" component="h2" sx={{ flex: 1, fontWeight: 700, fontSize: '1.05rem' }}>
                        Messagerie
                    </Typography>
                    {onSearch && (
                        <Tooltip title="Rechercher dans les messages" arrow>
                            <IconButton
                                size="small"
                                onClick={onSearch}
                                aria-label="Rechercher dans les messages"
                                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                            >
                                <ManageSearchOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title="Nouvelle conversation" arrow>
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={onCreate}
                            aria-label="Nouvelle conversation"
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                        >
                            <AddCommentOutlinedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
                <TextField
                    value={search}
                    onChange={handleSearchChange}
                    placeholder="Rechercher…"
                    size="small"
                    fullWidth
                    slotProps={{
                        // aria-label porté par l'<input> lui-même (ciblable comme champ éditable).
                        htmlInput: { 'aria-label': 'Rechercher une conversation' },
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
            </Box>

            {/* Corps : erreur / chargement / vide / recherche sans résultat / liste */}
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {isError ? (
                    <Alert severity="error" sx={{ m: 1.5 }}>
                        Impossible de charger les conversations
                    </Alert>
                ) : isLoading ? (
                    <Box role="status" aria-label="Chargement des conversations" aria-busy="true">
                        {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                            <SkeletonRow key={index} />
                        ))}
                    </Box>
                ) : !hasConversations ? (
                    <Stack
                        alignItems="center"
                        spacing={1}
                        sx={{ px: 2, py: 6, color: 'text.secondary', textAlign: 'center' }}
                    >
                        <ForumOutlinedIcon sx={{ fontSize: 40, opacity: 0.4 }} />
                        <Typography variant="body2">Aucune conversation. Démarrez-en une avec le bouton +</Typography>
                    </Stack>
                ) : visibleConversations.length === 0 ? (
                    <Stack
                        alignItems="center"
                        spacing={1}
                        sx={{ px: 2, py: 6, color: 'text.secondary', textAlign: 'center' }}
                    >
                        <SearchOffRoundedIcon sx={{ fontSize: 40, opacity: 0.4 }} />
                        <Typography variant="body2">Aucune conversation ne correspond</Typography>
                    </Stack>
                ) : (
                    <List dense disablePadding aria-label="Liste des conversations">
                        {visibleConversations.map((conversation) => (
                            <ConversationListItem
                                key={conversation.uuid}
                                conversation={conversation}
                                meUuid={meUuid}
                                selected={conversation.uuid === selectedUuid}
                                onSelect={onSelect}
                            />
                        ))}
                    </List>
                )}
            </Box>
        </Box>
    );
});
