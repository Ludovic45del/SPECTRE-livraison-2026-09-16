/**
 * MessageSearchDialog — recherche plein texte dans mes messages (M4).
 * @module features/messaging/ui
 *
 * Champ « Rechercher dans les messages » (autoFocus, `useDebounce` 300 ms),
 * aide « Au moins 2 caractères » sous le seuil (`SEARCH_MIN_LENGTH`),
 * résultats via `useMessageSearch` rendus avec `MessageHitCard` ; états
 * chargement (`Skeleton`), vide (« Aucun message ne correspond ») et erreur.
 * « Ouvrir la conversation » ferme le dialogue puis appelle
 * `onOpenConversation(uuid)` (la page navigue). Le champ est vidé à la fermeture.
 */

import { memo, useCallback, useEffect, useState, type ChangeEvent } from 'react';
import {
    Alert,
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    LinearProgress,
    Skeleton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';

import { SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH, useMessageSearch } from '@entities/messaging';
import { useMe } from '@entities/user';
import { useDebounce } from '@shared/lib';
import { MessageHitCard } from './MessageHitCard';

export interface MessageSearchDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    /** Appelé après fermeture quand l'utilisateur ouvre un résultat (la page navigue). */
    readonly onOpenConversation: (conversationUuid: string) => void;
}

/** Délai d'attente après la dernière frappe avant d'interroger le backend. */
const SEARCH_DEBOUNCE_MS = 300;

/** Nombre de squelettes affichés pendant le chargement. */
const SKELETON_COUNT = 3;

const MIN_LENGTH_HINT = `Au moins ${SEARCH_MIN_LENGTH} caractères`;

export const MessageSearchDialog = memo(function MessageSearchDialog({
    open,
    onClose,
    onOpenConversation,
}: MessageSearchDialogProps) {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);
    const { data: results, isLoading, isError, isFetching } = useMessageSearch(debouncedQuery);
    const { data: me } = useMe();
    const meUuid = me?.uuid ?? '';

    // Champ vidé à la fermeture : une réouverture repart d'une recherche neuve.
    useEffect(() => {
        if (!open) setQuery('');
    }, [open]);

    const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value), []);
    const handleClear = useCallback(() => setQuery(''), []);
    const handleOpen = useCallback(
        (conversationUuid: string) => {
            onClose();
            onOpenConversation(conversationUuid);
        },
        [onClose, onOpenConversation],
    );

    const trimmedLength = query.trim().length;
    const belowThreshold = trimmedLength < SEARCH_MIN_LENGTH;
    // Entre la frappe et la fin du debounce, le seuil est évalué sur la saisie courante.
    const pendingDebounce = query.trim() !== debouncedQuery.trim();
    const showLoading = !belowThreshold && (isLoading || (pendingDebounce && !results));

    let content: JSX.Element | null;
    if (belowThreshold) {
        content = (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                {trimmedLength === 0 ? 'Saisissez un mot ou une expression à rechercher' : MIN_LENGTH_HINT}
            </Typography>
        );
    } else if (showLoading) {
        content = (
            <Stack spacing={1.5} role="status" aria-label="Recherche en cours">
                {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                    <Skeleton key={index} variant="rounded" height={96} />
                ))}
            </Stack>
        );
    } else if (isError) {
        content = <Alert severity="error">Impossible de rechercher dans les messages</Alert>;
    } else if (!results || results.length === 0) {
        content = (
            <Stack alignItems="center" spacing={1} sx={{ py: 4, color: 'text.secondary', textAlign: 'center' }}>
                <SearchOffRoundedIcon sx={{ fontSize: 40, opacity: 0.4 }} />
                <Typography variant="body2">Aucun message ne correspond</Typography>
            </Stack>
        );
    } else {
        content = (
            <Stack
                component="ul"
                spacing={1.5}
                aria-label="Résultats de la recherche"
                aria-busy={isFetching}
                sx={{ listStyle: 'none', p: 0, m: 0 }}
            >
                {/* Résultats précédents conservés pendant la nouvelle requête : barre visible. */}
                {isFetching && <LinearProgress aria-label="Actualisation des résultats" sx={{ mb: 0.5 }} />}
                {results.map((hit) => (
                    <MessageHitCard key={hit.message.uuid} mention={hit} meUuid={meUuid} onOpen={handleOpen} />
                ))}
            </Stack>
        );
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            aria-label="Rechercher dans les messages"
            PaperProps={{ sx: { borderRadius: 2, height: '70vh', maxHeight: 640 } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, fontSize: '1rem' }}>
                <ManageSearchOutlinedIcon fontSize="small" aria-hidden />
                <Box component="span" sx={{ flex: 1 }}>
                    Rechercher dans les messages
                </Box>
                <IconButton onClick={onClose} aria-label="Fermer" size="small" edge="end">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
                <TextField
                    value={query}
                    onChange={handleChange}
                    autoFocus
                    fullWidth
                    size="small"
                    placeholder="Mot ou expression…"
                    helperText={belowThreshold && trimmedLength > 0 ? MIN_LENGTH_HINT : ' '}
                    slotProps={{
                        htmlInput: { 'aria-label': 'Rechercher dans les messages', maxLength: SEARCH_MAX_LENGTH },
                        input: {
                            endAdornment: query ? (
                                <InputAdornment position="end">
                                    <IconButton onClick={handleClear} aria-label="Effacer la recherche" size="small">
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : undefined,
                        },
                    }}
                />
                <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{content}</Box>
            </DialogContent>
        </Dialog>
    );
});
