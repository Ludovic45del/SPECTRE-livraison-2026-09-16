/**
 * MessageComposer — zone de saisie d'un message.
 * @module features/messaging/ui
 *
 * Entrée envoie, Maj+Entrée insère un retour à la ligne. Validation
 * `MessageBodySchema` avant envoi (erreur en `helperText`). Le champ est vidé
 * après un envoi réussi ; si `onSend` lève, le texte est conservé et l'erreur
 * est notifiée. Compteur affiché à partir de `COUNTER_THRESHOLD` caractères.
 *
 * Références (vague M3) : taper `@` (en début de texte ou après un blanc)
 * ouvre `EntityRefPicker` (deux étapes : campagne, puis campagne elle-même /
 * FSEC / FA de cette campagne), le texte tapé après `@` filtre les campagnes
 * (`MENTION_TRIGGER_RE` sur la valeur jusqu'au curseur). Le bouton « Insérer
 * une référence » insère un `@` au curseur et suit le même chemin. À la
 * sélection, `@query` est retiré du corps, la référence est attachée (chip
 * supprimable au-dessus du champ, dédoublonnée, plafond
 * `MAX_ENTITY_REFS_PER_MESSAGE` avec notification), le sélecteur se ferme et le
 * champ reprend le focus. Échap ferme sans rien retirer ; ↑ / ↓ / Entrée
 * déplacent le focus sur le premier résultat.
 *
 * Pièces jointes (vague M4) : bouton « Joindre des fichiers » (input fichier
 * masqué, `accept` limité aux extensions autorisées) et collage d'images
 * (`onPaste` avec `clipboardData.files`). Les fichiers passent par
 * `validateAttachmentFiles` (nombre, taille, extension) : chaque refus est
 * notifié, les fichiers acceptés sont listés en chips « nom · taille »
 * (croix « Retirer la pièce jointe <nom> ») à côté des références. Un message
 * peut partir **sans corps** s'il porte au moins un fichier (`canSend` = corps
 * non vide OU fichiers). L'envoi réussi vide corps, références et fichiers.
 */

import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type ClipboardEvent,
    type KeyboardEvent,
    type MouseEvent,
} from 'react';
import { Box, Chip, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import CancelIcon from '@mui/icons-material/Cancel';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import SendIcon from '@mui/icons-material/Send';

import {
    ATTACHMENT_INPUT_ACCEPT,
    MAX_ATTACHMENTS_PER_MESSAGE,
    MAX_ENTITY_REFS_PER_MESSAGE,
    MAX_MESSAGE_LENGTH,
    MessageBodySchema,
    formatFileSize,
    isImageFile,
    validateAttachmentFiles,
    type EntityRef,
    type EntityRefInput,
} from '@entities/messaging';
import { getErrorMessage } from '@shared/lib';
import { useNotification } from '@shared/ui';
import { isSameEntityRef, type EntityRefSelection } from '../lib/entity-refs';
import {
    MAX_ENTITY_REFS_MESSAGE,
    detectMentionTrigger,
    removeMentionTrigger,
    type MentionTrigger,
} from '../lib/mention-trigger';
import { EntityRefChip } from './EntityRefChip';
import { ENTITY_REF_PICKER_ID, ENTITY_REF_PICKER_LIST_ID, EntityRefPicker } from './EntityRefPicker';

export interface MessageComposerProps {
    /**
     * Envoi du corps validé (strippé, vide autorisé avec des fichiers), des
     * références et des fichiers attachés. Lever en cas d'échec pour conserver la saisie.
     */
    readonly onSend: (body: string, entityRefs: EntityRefInput[], attachments: File[]) => Promise<void> | void;
    readonly isSending: boolean;
    readonly disabled?: boolean;
}

/** Nombre de caractères à partir duquel le compteur est affiché. */
const COUNTER_THRESHOLD = 3500;

/** Message d'erreur quand ni corps ni fichier n'est fourni. */
const EMPTY_MESSAGE_ERROR = 'Le message ne peut pas être vide';

/** Le bouton d'insertion ne prend pas le focus au clic (le champ le garde, le sélecteur ne se referme pas). */
const preventDefaultMouseDown = (event: MouseEvent<HTMLButtonElement>) => event.preventDefault();

/** Fichier en attente : le `File` + une clé stable (un même fichier peut être joint deux fois). */
interface PendingFile {
    readonly key: number;
    readonly file: File;
}

/** Chip d'une référence en préparation (pas de slug : jamais un lien). */
const AttachedRefChip = memo(function AttachedRefChip({
    entityRef,
    onRemove,
}: {
    readonly entityRef: EntityRefSelection;
    readonly onRemove: (ref: EntityRefInput) => void;
}) {
    const handleDelete = useCallback(() => onRemove(entityRef), [onRemove, entityRef]);
    const chipRef = useMemo<EntityRef>(() => ({ ...entityRef, slug: null, exists: true }), [entityRef]);
    return <EntityRefChip entityRef={chipRef} size="small" onDelete={handleDelete} />;
});

/** Chip d'un fichier en attente « nom · taille », croix « Retirer la pièce jointe <nom> ». */
const PendingFileChip = memo(function PendingFileChip({
    pending,
    onRemove,
}: {
    readonly pending: PendingFile;
    readonly onRemove: (key: number) => void;
}) {
    const { file, key } = pending;
    const handleDelete = useCallback(() => onRemove(key), [onRemove, key]);
    const Icon = isImageFile(file) ? ImageOutlinedIcon : InsertDriveFileOutlinedIcon;
    return (
        <Chip
            label={`${file.name} · ${formatFileSize(file.size)}`}
            size="small"
            variant="outlined"
            icon={<Icon fontSize="small" />}
            onDelete={handleDelete}
            // L'icône de suppression EST le contrôle cliquable de la Chip : on la rend
            // accessible (nom + rôle), MUI la masquant aux lecteurs d'écran par défaut.
            deleteIcon={
                <CancelIcon role="button" aria-hidden={false} aria-label={`Retirer la pièce jointe ${file.name}`} />
            }
            sx={{ maxWidth: '100%', fontWeight: 500 }}
        />
    );
});

export const MessageComposer = memo(function MessageComposer({
    onSend,
    isSending,
    disabled = false,
}: MessageComposerProps) {
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [attachedRefs, setAttachedRefs] = useState<EntityRefSelection[]>([]);
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [trigger, setTrigger] = useState<MentionTrigger | null>(null);
    const [pickerListFocused, setPickerListFocused] = useState(false);
    const [pickerResultCount, setPickerResultCount] = useState(0);
    const { showNotification } = useNotification();

    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    /** Position du curseur à restaurer après la prochaine mise à jour de `value`. */
    const pendingCaretRef = useRef<number | null>(null);
    /** Clé du prochain fichier en attente. */
    const nextFileKeyRef = useRef(0);

    useEffect(() => {
        const caret = pendingCaretRef.current;
        const input = inputRef.current;
        if (caret === null || !input) return;
        pendingCaretRef.current = null;
        input.focus();
        input.setSelectionRange(caret, caret);
    }, [value]);

    const hasFiles = pendingFiles.length > 0;
    const canSend = (value.trim().length > 0 || hasFiles) && !isSending && !disabled;
    const pickerOpen = trigger !== null;

    const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
        const next = event.target.value;
        const caret = event.target.selectionEnd ?? next.length;
        setValue(next);
        setError(null);
        setTrigger(detectMentionTrigger(next, caret));
        setPickerListFocused(false);
    }, []);

    const closePicker = useCallback(() => {
        setTrigger(null);
        setPickerListFocused(false);
    }, []);

    /**
     * Fermeture demandée par le sélecteur (Échap / Tab / clic à l'extérieur) :
     * rien n'est retiré. Si le focus était dans le sélecteur (liste, filtre ou
     * bouton retour de l'étape 2), il revient au champ — sinon il serait perdu
     * avec le panneau ; un clic à l'extérieur garde sa cible.
     */
    const handlePickerClose = useCallback(() => {
        closePicker();
        const focusInPicker = document.activeElement?.closest(`#${ENTITY_REF_PICKER_ID}`) !== null;
        if (pickerListFocused || focusInPicker) inputRef.current?.focus();
    }, [closePicker, pickerListFocused]);

    const handleInsertReference = useCallback(() => {
        // Sélecteur déjà ouvert : le bouton referme (bascule) au lieu d'insérer un second `@`.
        if (trigger !== null) {
            closePicker();
            inputRef.current?.focus();
            return;
        }
        const caret = inputRef.current?.selectionEnd ?? value.length;
        const before = value.slice(0, caret);
        const needsSpace = before.length > 0 && !/\s$/.test(before);
        const inserted = needsSpace ? ' @' : '@';
        const next = `${before}${inserted}${value.slice(caret)}`;
        const end = before.length + inserted.length;
        pendingCaretRef.current = end;
        setValue(next);
        setError(null);
        setTrigger({ start: end - 1, end, query: '' });
        setPickerListFocused(false);
    }, [value, trigger, closePicker]);

    const handleSelectReference = useCallback(
        (ref: EntityRefSelection) => {
            if (trigger) {
                pendingCaretRef.current = trigger.start;
                setValue(removeMentionTrigger(value, trigger));
            }
            closePicker();
            inputRef.current?.focus();
            if (attachedRefs.some((existing) => isSameEntityRef(existing, ref))) return;
            if (attachedRefs.length >= MAX_ENTITY_REFS_PER_MESSAGE) {
                showNotification(MAX_ENTITY_REFS_MESSAGE, 'warning');
                return;
            }
            setAttachedRefs([...attachedRefs, ref]);
        },
        [trigger, value, closePicker, attachedRefs, showNotification],
    );

    const handleRemoveReference = useCallback((ref: EntityRefInput) => {
        setAttachedRefs((prev) => prev.filter((existing) => !isSameEntityRef(existing, ref)));
    }, []);

    /* ---------- Pièces jointes ---------- */

    /** Valide puis ajoute des fichiers (input ou collage) ; chaque refus est notifié. */
    const addFiles = useCallback(
        (files: File[]) => {
            if (files.length === 0) return;
            // Mise à jour fonctionnelle : deux ajouts dans le même lot (collage + input)
            // se cumulent correctement et le plafond est évalué sur l'état réel.
            let errorsToNotify: string[] = [];
            setPendingFiles((previous) => {
                const { accepted, errors } = validateAttachmentFiles(files, previous.length);
                errorsToNotify = errors;
                if (accepted.length === 0) return previous;
                const added = accepted.map((file) => ({ key: nextFileKeyRef.current++, file }));
                return [...previous, ...added];
            });
            for (const message of errorsToNotify) showNotification(message, 'warning');
            setError(null);
        },
        [showNotification],
    );

    const handleOpenFilePicker = useCallback(() => fileInputRef.current?.click(), []);

    const handleFileInputChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files ?? []);
            // Réinitialise l'input : un même fichier peut être re-sélectionné après retrait.
            event.target.value = '';
            addFiles(files);
        },
        [addFiles],
    );

    const handlePaste = useCallback(
        (event: ClipboardEvent<HTMLDivElement>) => {
            const files = Array.from(event.clipboardData?.files ?? []);
            if (files.length === 0) return;
            event.preventDefault();
            addFiles(files);
        },
        [addFiles],
    );

    const handleRemoveFile = useCallback((key: number) => {
        setPendingFiles((prev) => prev.filter((pending) => pending.key !== key));
    }, []);

    /* ---------- Envoi ---------- */

    const handleSend = useCallback(async () => {
        if (isSending || disabled) return;
        const trimmed = value.trim();
        let body = '';
        if (trimmed.length > 0) {
            const parsed = MessageBodySchema.safeParse(value);
            if (!parsed.success) {
                setError(parsed.error.issues[0]?.message ?? 'Message invalide');
                return;
            }
            body = parsed.data;
        } else if (pendingFiles.length === 0) {
            setError(EMPTY_MESSAGE_ERROR);
            return;
        }
        try {
            await onSend(
                body,
                attachedRefs.map(({ entityType, entityUuid }) => ({ entityType, entityUuid })),
                pendingFiles.map((pending) => pending.file),
            );
            setValue('');
            setError(null);
            setAttachedRefs([]);
            setPendingFiles([]);
            closePicker();
        } catch (err: unknown) {
            showNotification(getErrorMessage(err, "Erreur lors de l'envoi du message"), 'error');
        }
    }, [isSending, disabled, value, onSend, attachedRefs, pendingFiles, closePicker, showNotification]);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.nativeEvent.isComposing) return;
            if (pickerOpen) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closePicker();
                    return;
                }
                // Sans résultat (chargement, « Aucun résultat »), Entrée garde son rôle d'envoi.
                if (
                    pickerResultCount > 0 &&
                    (event.key === 'ArrowDown' || event.key === 'ArrowUp' || (event.key === 'Enter' && !event.shiftKey))
                ) {
                    event.preventDefault();
                    setPickerListFocused(true);
                    return;
                }
            }
            if (event.key !== 'Enter' || event.shiftKey) return;
            event.preventDefault();
            if (canSend) void handleSend();
        },
        [pickerOpen, pickerResultCount, closePicker, canSend, handleSend],
    );

    const showCounter = value.length >= COUNTER_THRESHOLD;
    const buttonOffset = error || showCounter ? 2.75 : 0;
    const hasRefs = attachedRefs.length > 0;
    const attachDisabled = disabled || pendingFiles.length >= MAX_ATTACHMENTS_PER_MESSAGE;

    return (
        <Box
            ref={rootRef}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            {(hasRefs || hasFiles) && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, px: 2, pt: 1.25 }}>
                    {hasRefs && (
                        <Box
                            role="group"
                            aria-label="Références attachées"
                            sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}
                        >
                            {attachedRefs.map((ref) => (
                                <AttachedRefChip
                                    key={`${ref.entityType}-${ref.entityUuid}`}
                                    entityRef={ref}
                                    onRemove={handleRemoveReference}
                                />
                            ))}
                        </Box>
                    )}
                    {hasFiles && (
                        <Box
                            role="group"
                            aria-label="Pièces jointes en attente"
                            sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}
                        >
                            {pendingFiles.map((pending) => (
                                <PendingFileChip key={pending.key} pending={pending} onRemove={handleRemoveFile} />
                            ))}
                        </Box>
                    )}
                </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, px: 2, py: 1.5 }}>
                <Tooltip title="Insérer une référence (@)" arrow>
                    <span>
                        <IconButton
                            onClick={handleInsertReference}
                            // Empêche le ClickAwayListener du sélecteur de le refermer avant le clic (bascule propre).
                            onMouseDown={preventDefaultMouseDown}
                            disabled={disabled}
                            aria-label="Insérer une référence"
                            aria-haspopup="menu"
                            aria-expanded={pickerOpen}
                            aria-controls={pickerOpen ? ENTITY_REF_PICKER_LIST_ID : undefined}
                            sx={{ mb: buttonOffset }}
                        >
                            <LinkOutlinedIcon />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title={`Joindre des fichiers (${MAX_ATTACHMENTS_PER_MESSAGE} max, 10 Mo chacun)`} arrow>
                    <span>
                        <IconButton
                            onClick={handleOpenFilePicker}
                            disabled={attachDisabled}
                            aria-label="Joindre des fichiers"
                            sx={{ mb: buttonOffset }}
                        >
                            <AttachFileOutlinedIcon />
                        </IconButton>
                    </span>
                </Tooltip>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    accept={ATTACHMENT_INPUT_ACCEPT}
                    onChange={handleFileInputChange}
                    disabled={disabled}
                    data-testid="attachment-input"
                    aria-label="Fichiers à joindre"
                    tabIndex={-1}
                />
                <TextField
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    inputRef={inputRef}
                    multiline
                    minRows={1}
                    maxRows={6}
                    fullWidth
                    size="small"
                    placeholder="Écrire un message… (@ pour référencer)"
                    disabled={disabled}
                    error={Boolean(error)}
                    helperText={
                        error ??
                        (showCounter ? (
                            <Typography component="span" variant="caption" color="text.secondary">
                                {value.length} / {MAX_MESSAGE_LENGTH}
                            </Typography>
                        ) : undefined)
                    }
                    inputProps={{ maxLength: MAX_MESSAGE_LENGTH, 'aria-label': 'Nouveau message' }}
                />
                <Tooltip title="Envoyer (Entrée)" arrow>
                    <span>
                        <IconButton
                            color="primary"
                            onClick={handleSend}
                            disabled={!canSend}
                            aria-label="Envoyer"
                            sx={{ mb: buttonOffset }}
                        >
                            <SendIcon />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
            <EntityRefPicker
                open={pickerOpen}
                onResultsChange={setPickerResultCount}
                anchorEl={rootRef.current}
                query={trigger?.query ?? ''}
                excluded={attachedRefs}
                onSelect={handleSelectReference}
                onClose={handlePickerClose}
                autoFocusItem={pickerListFocused}
            />
        </Box>
    );
});
