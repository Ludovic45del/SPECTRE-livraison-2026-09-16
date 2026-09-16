/**
 * Éditeur d'annotations du plan d'assemblage.
 * @module features/fsec/edit-assembly-plan/ui
 *
 * Un calque SVG superposé à l'image du plan. Outils : flèche, texte, cadre.
 * Sélection / déplacement / suppression. Sauvegarde explicite du calque entier
 * (remplacement total côté serveur ; calque partagé, last-write-wins).
 *
 * Géométrie stockée en coordonnées NORMALISÉES (0–100). Le rendu convertit en
 * pixels à partir de la taille réelle de l'image (mesurée par ResizeObserver),
 * pour que les traits / têtes de flèche / textes ne soient pas déformés par un
 * ratio non carré (contrairement à un viewBox `preserveAspectRatio="none"`).
 */

import {
    KeyboardEvent as ReactKeyboardEvent,
    MouseEvent as ReactMouseEvent,
    PointerEvent as ReactPointerEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    Paper,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import RectangleOutlinedIcon from '@mui/icons-material/RectangleOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { AnnotationType, PlanAnnotation, useUpdateFsecAssemblyPlanAnnotations } from '@entities/fsec';
import { useNotification } from '@shared/ui';
import { usePlanAnnotations } from '../lib/usePlanAnnotations';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

type Tool = 'select' | AnnotationType;

// Couleurs proposées (trait des annotations).
const COLORS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#212121', '#fafafa'];
const DEFAULT_COLOR = COLORS[0];

// En-dessous de ce déplacement (en % du plan), un tracé est considéré comme un
// clic et n'est pas créé — évite les flèches/cadres dégénérés.
const MIN_DRAW_PCT = 1.5;

// Tête de flèche (px, espace écran).
const ARROW_HEAD_LEN = 13;
const ARROW_HEAD_WIDTH = 9;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers géométrie (purs)
// ─────────────────────────────────────────────────────────────────────────────

const clampPct = (n: number) => Math.min(100, Math.max(0, n));

function newId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `ann-${Date.now()}-${Math.round(performance.now() * 1000)}`;
}

/** Bornes [min,max] d'une annotation sur un axe (1 ou 2 points). */
function axisBounds(a: PlanAnnotation, axis: 'x' | 'y'): [number, number] {
    const p1 = axis === 'x' ? a.x1 : a.y1;
    const p2 = axis === 'x' ? a.x2 : a.y2;
    if (p2 == null) return [p1, p1];
    return [Math.min(p1, p2), Math.max(p1, p2)];
}

/** Déplace une annotation en bornant le delta pour rester dans [0,100]. */
function clampedShift(a: PlanAnnotation, dx: number, dy: number): Partial<PlanAnnotation> {
    const [minX, maxX] = axisBounds(a, 'x');
    const [minY, maxY] = axisBounds(a, 'y');
    const cdx = Math.min(100 - maxX, Math.max(-minX, dx));
    const cdy = Math.min(100 - maxY, Math.max(-minY, dy));
    const patch: Partial<PlanAnnotation> = { x1: a.x1 + cdx, y1: a.y1 + cdy };
    if (a.x2 != null) patch.x2 = a.x2 + cdx;
    if (a.y2 != null) patch.y2 = a.y2 + cdy;
    return patch;
}

/** Points du triangle de tête de flèche (px). */
function arrowHead(x1: number, y1: number, x2: number, y2: number): string {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const back = {
        x: x2 - ARROW_HEAD_LEN * Math.cos(angle),
        y: y2 - ARROW_HEAD_LEN * Math.sin(angle),
    };
    const perp = { x: -Math.sin(angle), y: Math.cos(angle) };
    const w = ARROW_HEAD_WIDTH / 2;
    const p1 = `${back.x + perp.x * w},${back.y + perp.y * w}`;
    const p2 = `${back.x - perp.x * w},${back.y - perp.y * w}`;
    return `${x2},${y2} ${p1} ${p2}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface PlanAnnotatorProps {
    versionUuid: string;
    imageUrl: string;
    /** Calque serveur (source de vérité). */
    annotations: PlanAnnotation[];
    /** Désactive l'édition (lecture seule). */
    readOnly?: boolean;
}

interface TextEditorState {
    id: string;
    x: number;
    y: number;
    value: string;
    isNew: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

export function PlanAnnotator({ versionUuid, imageUrl, annotations, readOnly = false }: PlanAnnotatorProps) {
    const theme = useTheme();
    const { showNotification } = useNotification();
    const saveMutation = useUpdateFsecAssemblyPlanAnnotations();
    const { annotations: layer, isDirty, add, update, remove, revert } = usePlanAnnotations(annotations);

    const [tool, setTool] = useState<Tool>('select');
    const [color, setColor] = useState<string>(DEFAULT_COLOR);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draft, setDraft] = useState<PlanAnnotation | null>(null);
    const [textEditor, setTextEditor] = useState<TextEditorState | null>(null);
    const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

    const wrapRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const dragRef = useRef<{ id: string; startX: number; startY: number; orig: PlanAnnotation } | null>(null);

    const isPending = saveMutation.isPending;
    const interactive = !readOnly;

    // Mesure la taille réelle de l'image affichée (px) pour la conversion ↔ %.
    useEffect(() => {
        const el = wrapRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver((entries) => {
            const r = entries[0]?.contentRect;
            if (r) setSize({ w: r.width, h: r.height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const toPx = useCallback(
        (nx: number, ny: number) => ({ x: (nx / 100) * size.w, y: (ny / 100) * size.h }),
        [size.w, size.h],
    );

    const pointerNorm = useCallback((e: ReactPointerEvent): { nx: number; ny: number } => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) return { nx: 0, ny: 0 };
        return {
            nx: clampPct(((e.clientX - rect.left) / rect.width) * 100),
            ny: clampPct(((e.clientY - rect.top) / rect.height) * 100),
        };
    }, []);

    const selected = useMemo(() => layer.find((a) => a.id === selectedId) ?? null, [layer, selectedId]);

    // ── Édition texte ────────────────────────────────────────────────────────

    const openTextEditor = useCallback((state: TextEditorState) => setTextEditor(state), []);

    const commitTextEditor = useCallback(() => {
        if (!textEditor) return;
        const value = textEditor.value.trim();
        if (!value) {
            // Texte vide : on n'ajoute rien (création) ou on supprime (édition).
            if (!textEditor.isNew) remove(textEditor.id);
        } else if (textEditor.isNew) {
            add({ id: textEditor.id, type: 'text', x1: textEditor.x, y1: textEditor.y, text: value, color });
            setSelectedId(textEditor.id);
        } else {
            update(textEditor.id, { text: value });
        }
        setTextEditor(null);
    }, [textEditor, add, update, remove, color]);

    const cancelTextEditor = useCallback(() => setTextEditor(null), []);

    // ── Sélection / suppression ──────────────────────────────────────────────

    const deleteSelected = useCallback(() => {
        if (selectedId) {
            remove(selectedId);
            setSelectedId(null);
        }
    }, [selectedId, remove]);

    const handleColorChange = useCallback(
        (c: string) => {
            setColor(c);
            if (selectedId) update(selectedId, { color: c });
        },
        [selectedId, update],
    );

    // ── Pointer ──────────────────────────────────────────────────────────────

    const onPointerDown = useCallback(
        (e: ReactPointerEvent) => {
            if (!interactive || textEditor) return;
            const { nx, ny } = pointerNorm(e);

            if (tool === 'select') {
                const target = (e.target as Element).closest('[data-ann]');
                const id = target?.getAttribute('data-ann') ?? null;
                setSelectedId(id);
                if (id) {
                    const orig = layer.find((a) => a.id === id);
                    if (orig) {
                        dragRef.current = { id, startX: nx, startY: ny, orig };
                        svgRef.current?.setPointerCapture(e.pointerId);
                    }
                }
                return;
            }

            if (tool === 'text') {
                openTextEditor({ id: newId(), x: nx, y: ny, value: '', isNew: true });
                return;
            }

            // arrow | rect
            setSelectedId(null);
            setDraft({ id: newId(), type: tool, x1: nx, y1: ny, x2: nx, y2: ny, color });
            svgRef.current?.setPointerCapture(e.pointerId);
        },
        [interactive, textEditor, tool, pointerNorm, layer, openTextEditor, color],
    );

    const onPointerMove = useCallback(
        (e: ReactPointerEvent) => {
            if (draft) {
                const { nx, ny } = pointerNorm(e);
                setDraft((d) => (d ? { ...d, x2: nx, y2: ny } : d));
                return;
            }
            const drag = dragRef.current;
            if (drag) {
                const { nx, ny } = pointerNorm(e);
                update(drag.id, clampedShift(drag.orig, nx - drag.startX, ny - drag.startY));
            }
        },
        [draft, pointerNorm, update],
    );

    const onPointerUp = useCallback(
        (e: ReactPointerEvent) => {
            if (draft) {
                const span = Math.hypot((draft.x2 ?? draft.x1) - draft.x1, (draft.y2 ?? draft.y1) - draft.y1);
                if (span >= MIN_DRAW_PCT) {
                    add(draft);
                    setSelectedId(draft.id);
                }
                setDraft(null);
            }
            dragRef.current = null;
            try {
                svgRef.current?.releasePointerCapture(e.pointerId);
            } catch {
                /* pointer déjà relâché */
            }
        },
        [draft, add],
    );

    const onDoubleClick = useCallback(
        (e: ReactMouseEvent) => {
            if (!interactive) return;
            const target = (e.target as Element).closest('[data-ann]');
            const id = target?.getAttribute('data-ann');
            if (!id) return;
            const a = layer.find((x) => x.id === id);
            if (a?.type === 'text') {
                openTextEditor({ id: a.id, x: a.x1, y: a.y1, value: a.text ?? '', isNew: false });
            }
        },
        [interactive, layer, openTextEditor],
    );

    const onKeyDown = useCallback(
        (e: ReactKeyboardEvent) => {
            if (textEditor) return;
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
                e.preventDefault();
                deleteSelected();
            } else if (e.key === 'Escape') {
                setSelectedId(null);
                setDraft(null);
            }
        },
        [textEditor, selectedId, deleteSelected],
    );

    // ── Sauvegarde ───────────────────────────────────────────────────────────

    const handleSave = useCallback(async () => {
        try {
            await saveMutation.mutateAsync({ versionUuid, annotations: layer });
            showNotification('Annotations enregistrées.', 'success');
        } catch {
            showNotification("Échec de l'enregistrement des annotations.", 'error');
        }
    }, [saveMutation, versionUuid, layer, showNotification]);

    // ── Rendu d'une annotation ───────────────────────────────────────────────

    const renderAnnotation = useCallback(
        (a: PlanAnnotation, isDraft = false) => {
            const stroke = a.color ?? DEFAULT_COLOR;
            const selectable = interactive && !isDraft;
            const isSel = !isDraft && a.id === selectedId;
            const p1 = toPx(a.x1, a.y1);

            if (a.type === 'arrow' && a.x2 != null && a.y2 != null) {
                const p2 = toPx(a.x2, a.y2);
                return (
                    <g key={a.id} data-ann={selectable ? a.id : undefined}>
                        {/* zone de clic élargie invisible */}
                        {selectable && (
                            <line
                                x1={p1.x}
                                y1={p1.y}
                                x2={p2.x}
                                y2={p2.y}
                                stroke="transparent"
                                strokeWidth={16}
                                style={{ cursor: 'move' }}
                            />
                        )}
                        <line
                            x1={p1.x}
                            y1={p1.y}
                            x2={p2.x}
                            y2={p2.y}
                            stroke={stroke}
                            strokeWidth={2.5}
                            strokeLinecap="round"
                        />
                        <polygon points={arrowHead(p1.x, p1.y, p2.x, p2.y)} fill={stroke} />
                        {isSel && (
                            <SelectionBox
                                minX={Math.min(p1.x, p2.x)}
                                minY={Math.min(p1.y, p2.y)}
                                w={Math.abs(p2.x - p1.x)}
                                h={Math.abs(p2.y - p1.y)}
                                color={theme.palette.primary.main}
                            />
                        )}
                    </g>
                );
            }

            if (a.type === 'rect' && a.x2 != null && a.y2 != null) {
                const p2 = toPx(a.x2, a.y2);
                const x = Math.min(p1.x, p2.x);
                const y = Math.min(p1.y, p2.y);
                const w = Math.abs(p2.x - p1.x);
                const h = Math.abs(p2.y - p1.y);
                return (
                    <g key={a.id} data-ann={selectable ? a.id : undefined}>
                        <rect
                            x={x}
                            y={y}
                            width={w}
                            height={h}
                            fill={alpha(stroke, 0.08)}
                            stroke={stroke}
                            strokeWidth={2}
                            style={{ cursor: selectable ? 'move' : 'default' }}
                        />
                        {isSel && <SelectionBox minX={x} minY={y} w={w} h={h} color={theme.palette.primary.main} />}
                    </g>
                );
            }

            if (a.type === 'text') {
                return (
                    <g key={a.id} data-ann={selectable ? a.id : undefined}>
                        <text
                            x={p1.x}
                            y={p1.y}
                            fill={stroke}
                            fontSize={16}
                            fontWeight={600}
                            dominantBaseline="hanging"
                            style={{
                                cursor: selectable ? 'move' : 'default',
                                paintOrder: 'stroke',
                                stroke: stroke === '#fafafa' ? '#212121' : '#ffffff',
                                strokeWidth: 3,
                                strokeLinejoin: 'round',
                                userSelect: 'none',
                            }}
                        >
                            {a.text}
                        </text>
                    </g>
                );
            }

            return null;
        },
        [interactive, selectedId, toPx, theme.palette.primary.main],
    );

    // ── UI ────────────────────────────────────────────────────────────────────

    const cursor = tool === 'select' ? 'default' : 'crosshair';

    return (
        <Stack spacing={1.5}>
            {interactive && (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ rowGap: 1 }}>
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={tool}
                        onChange={(_, next) => next && setTool(next)}
                        aria-label="Outil de dessin"
                    >
                        <ToggleButton value="select" aria-label="Sélectionner">
                            <Tooltip title="Sélectionner / déplacer">
                                <NearMeOutlinedIcon fontSize="small" />
                            </Tooltip>
                        </ToggleButton>
                        <ToggleButton value="arrow" aria-label="Flèche">
                            <Tooltip title="Flèche">
                                <NorthEastIcon fontSize="small" />
                            </Tooltip>
                        </ToggleButton>
                        <ToggleButton value="text" aria-label="Texte">
                            <Tooltip title="Texte">
                                <TextFieldsIcon fontSize="small" />
                            </Tooltip>
                        </ToggleButton>
                        <ToggleButton value="rect" aria-label="Cadre">
                            <Tooltip title="Cadre">
                                <RectangleOutlinedIcon fontSize="small" />
                            </Tooltip>
                        </ToggleButton>
                    </ToggleButtonGroup>

                    <Stack direction="row" spacing={0.5} alignItems="center">
                        {COLORS.map((c) => (
                            <Box
                                key={c}
                                role="button"
                                aria-label={`Couleur ${c}`}
                                aria-pressed={color === c}
                                onClick={() => handleColorChange(c)}
                                sx={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    backgroundColor: c,
                                    cursor: 'pointer',
                                    border: '2px solid',
                                    borderColor: color === c ? 'primary.main' : alpha(theme.palette.divider, 0.6),
                                    boxShadow:
                                        color === c ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.3)}` : 'none',
                                }}
                            />
                        ))}
                    </Stack>

                    <Box sx={{ flexGrow: 1 }} />

                    <Tooltip title="Supprimer l'annotation sélectionnée">
                        <span>
                            <IconButton size="small" color="error" onClick={deleteSelected} disabled={!selected}>
                                <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Button
                        size="small"
                        variant="text"
                        startIcon={<UndoIcon />}
                        onClick={revert}
                        disabled={!isDirty || isPending}
                    >
                        Annuler
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
                        onClick={handleSave}
                        disabled={!isDirty || isPending}
                    >
                        Enregistrer
                    </Button>
                </Stack>
            )}

            <Box
                ref={wrapRef}
                tabIndex={interactive ? 0 : -1}
                onKeyDown={onKeyDown}
                sx={{
                    position: 'relative',
                    width: '100%',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    backgroundColor: 'background.default',
                    outline: 'none',
                    '&:focus-visible': { boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.4)}` },
                }}
            >
                <Box
                    component="img"
                    src={imageUrl}
                    alt="Plan d'assemblage"
                    draggable={false}
                    sx={{ display: 'block', width: '100%', height: 'auto', userSelect: 'none' }}
                />

                <svg
                    ref={svgRef}
                    width={size.w}
                    height={size.h}
                    viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onDoubleClick={onDoubleClick}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        cursor: interactive ? cursor : 'default',
                        touchAction: 'none',
                    }}
                >
                    {layer.map((a) => renderAnnotation(a))}
                    {draft && renderAnnotation(draft, true)}
                </svg>

                {/* Éditeur de texte positionné sur le plan. */}
                {textEditor && (
                    <Paper
                        elevation={6}
                        sx={{
                            position: 'absolute',
                            left: `${textEditor.x}%`,
                            top: `${textEditor.y}%`,
                            transform: 'translate(4px, 4px)',
                            p: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            zIndex: 2,
                        }}
                    >
                        <TextField
                            value={textEditor.value}
                            onChange={(e) => setTextEditor((s) => (s ? { ...s, value: e.target.value } : s))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitTextEditor();
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    cancelTextEditor();
                                }
                            }}
                            size="small"
                            autoFocus
                            placeholder="Annotation…"
                            variant="standard"
                            sx={{ minWidth: 140 }}
                        />
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={commitTextEditor}
                            aria-label="Valider le texte"
                        >
                            <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={cancelTextEditor} aria-label="Annuler le texte">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Paper>
                )}
            </Box>

            {interactive && (
                <Typography variant="caption" color="text.secondary">
                    {tool === 'select'
                        ? 'Cliquez une annotation pour la déplacer · double-clic sur un texte pour le modifier · Suppr pour effacer.'
                        : 'Tracez sur le plan. Pensez à enregistrer.'}
                    {isDirty && ' · Modifications non enregistrées.'}
                </Typography>
            )}
        </Stack>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cadre de sélection (pointillés)
// ─────────────────────────────────────────────────────────────────────────────

function SelectionBox({
    minX,
    minY,
    w,
    h,
    color,
}: {
    minX: number;
    minY: number;
    w: number;
    h: number;
    color: string;
}) {
    const pad = 6;
    return (
        <rect
            x={minX - pad}
            y={minY - pad}
            width={w + pad * 2}
            height={h + pad * 2}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            pointerEvents="none"
        />
    );
}
