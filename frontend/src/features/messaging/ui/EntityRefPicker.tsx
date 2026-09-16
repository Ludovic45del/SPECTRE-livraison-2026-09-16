/**
 * EntityRefPicker — sélecteur de référence (campagne / FSEC / FA) du composer,
 * en deux étapes.
 * @module features/messaging/ui
 *
 * `Popper` + `Paper` ancré sur le composer (pas de fond modal : le champ de
 * saisie garde le focus à l'étape 1, le texte tapé après `@` sert de filtre
 * via `query`). Les trois listes (`useCampaigns`, `useActiveFsecs`, `useFas`)
 * sont chargées par un sous-composant monté à l'ouverture seulement — d'où la
 * remise à l'étape 1 (filtres internes vidés) à chaque réouverture.
 *
 * - **Étape 1 « Campagnes »** : champ « Filtrer les campagnes » (pré-rempli et
 *   resynchronisé avec `query` à chaque frappe après `@` ; utilisable seul
 *   quand le sélecteur est ouvert par le bouton), tri « Récentes » (année et
 *   semestre décroissants, puis nom — bandes d'année entre les groupes) ou
 *   « A → Z » (nom, collation française numérique), mémorisé pour la session
 *   (`CAMPAIGN_SORT_STORAGE_KEY`). Filtre sur nom, slug et année ;
 *   `MAX_CAMPAIGN_RESULTS` au plus, avec le nombre de campagnes masquées.
 *   Chaque ligne : nom, puis « S1 · LMJ » (ou « 2025 · S1 » sans installation).
 *   Choisir une campagne passe à l'étape 2 (aucun `onSelect`).
 * - **Étape 2** : bouton retour « Toutes les campagnes », nom de la campagne,
 *   champ « Filtrer les références » (focus automatique, `query` ignoré),
 *   puis trois groupes : la campagne elle-même (« Référencer la campagne »),
 *   ses FSEC actives (`campaignId`), ses FA (`campaignSlug`) — références déjà
 *   attachées retirées, `MAX_RESULTS_PER_GROUP` affichées par groupe, le
 *   nombre total apparaissant dans la bande (« FSEC · 12 »).
 *
 * Différenciation par type : pastille et liseré gauche aux couleurs
 * `ENTITY_REF_TYPE_COLORS` (campagne violet, FSEC bleu, FA orange), bandes
 * d'en-tête teintées et collantes pendant le défilement.
 *
 * Clavier : `MenuList` ↑/↓/Entrée ; ↓ ou Entrée dans un champ de filtre
 * rejoignent / sélectionnent le premier résultat ; Échap ferme partout ;
 * Tab depuis la liste ferme (rien ne suit), Maj+Tab remonte aux contrôles du
 * haut. `autoFocusItem` (composer : ↑/↓/Entrée) donne le focus au premier
 * résultat de l'étape 1. `onResultsChange` reporte le nombre d'éléments
 * sélectionnables de l'étape courante (les bandes n'en font pas partie).
 */

import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type KeyboardEvent,
    type MouseEvent,
    type ReactElement,
    type ReactNode,
    type RefObject,
} from 'react';
import {
    Alert,
    Box,
    CircularProgress,
    ClickAwayListener,
    IconButton,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    MenuItem,
    MenuList,
    Paper,
    Popper,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    alpha,
    type SxProps,
    type Theme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { type Campaign, useCampaigns } from '@entities/campaign';
import { useFas } from '@entities/fa';
import { useActiveFsecs } from '@entities/fsec';
import { type EntityRefInput, type EntityRefType } from '@entities/messaging';
import { TextCircleIcon } from '@shared/ui';
import {
    ENTITY_REF_TYPE_COLORS,
    ENTITY_REF_TYPE_ICON_LABELS,
    MAX_CAMPAIGN_RESULTS,
    MAX_RESULTS_PER_GROUP,
    buildEntityRefSearchText,
    filterCampaigns,
    filterEntityRefOptions,
    formatCampaignSubtitle,
    formatHiddenCampaignsHint,
    groupCampaignsByYear,
    readCampaignSortOrder,
    sortCampaigns,
    writeCampaignSortOrder,
    type CampaignSortOrder,
    type EntityRefOption,
    type EntityRefSelection,
} from '../lib/entity-refs';

export type { EntityRefSelection } from '../lib/entity-refs';

export interface EntityRefPickerProps {
    readonly open: boolean;
    /** Élément d'ancrage (composer). Sans ancrage, le panneau est rendu en place. */
    readonly anchorEl?: HTMLElement | null;
    /** Filtre des campagnes (texte tapé après `@`) — étape 1 seulement, prioritaire sur le champ interne. */
    readonly query: string;
    /** Références déjà attachées : retirées des résultats de l'étape 2. */
    readonly excluded: readonly EntityRefInput[];
    readonly onSelect: (ref: EntityRefSelection) => void;
    readonly onClose: () => void;
    /** Focus initial sur le premier résultat de l'étape 1 (navigation clavier depuis le composer). */
    readonly autoFocusItem?: boolean;
    /** Nombre d'éléments sélectionnables de l'étape courante (le composer n'intercepte Entrée/↑/↓ que s'il y en a). */
    readonly onResultsChange?: (count: number) => void;
}

/** Identifiant de la liste de résultats (`aria-controls` du bouton d'insertion). */
export const ENTITY_REF_PICKER_LIST_ID = 'entity-ref-picker-list';

/** Identifiant du panneau (le composer rend le focus au champ quand la fermeture vient de l'intérieur). */
export const ENTITY_REF_PICKER_ID = 'entity-ref-picker';

/**
 * Champs d'une campagne utilisés par le sélecteur. `useCampaigns` renvoie les
 * campagnes hydratées (`installation` résolue) ; le champ reste facultatif pour
 * les appelants qui n'en disposent pas.
 */
type PickerCampaign = Pick<Campaign, 'uuid' | 'slug' | 'name' | 'year' | 'semester'> & {
    readonly installation?: { readonly label: string } | null;
};

/** Pastille de type : libellé de l'icône (même iconographie que la barre latérale). */
/** Libellés des bandes d'en-tête, en capitales (étape 2 et en-tête de l'étape 1). */
const TYPE_BAND_LABELS: Record<EntityRefType, string> = {
    campaign: 'CAMPAGNE',
    fsec: 'FSEC',
    fa: 'FA',
};

/** Groupes de l'étape 2, dans l'ordre d'affichage. */
const STEP2_GROUP_TYPES: readonly EntityRefType[] = ['campaign', 'fsec', 'fa'];

/** Libellé de l'élément « campagne elle-même » de l'étape 2. */
const SELF_CAMPAIGN_LABEL = 'Référencer la campagne';

/** Options du tri de l'étape 1, dans l'ordre d'affichage. */
const SORT_OPTIONS: readonly { readonly value: CampaignSortOrder; readonly label: string }[] = [
    { value: 'recent', label: 'Récentes' },
    { value: 'alpha', label: 'A → Z' },
];

const HEADER_ICON_SIZE = 28;
const ITEM_ICON_SIZE = 26;

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

/**
 * Bande d'en-tête teintée par type : fond à 12 % de la couleur du type posé
 * sur le fond du papier (opaque, la bande reste lisible quand elle est collée
 * au-dessus des lignes qui défilent), texte de la couleur du type.
 */
const typeBandSx =
    (type: EntityRefType): SxProps<Theme> =>
    (theme) => {
        const color = ENTITY_REF_TYPE_COLORS[type];
        const tint = alpha(color, 0.12);
        return {
            lineHeight: '36px',
            px: 2,
            color,
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: `linear-gradient(${tint}, ${tint}), ${theme.palette.background.paper}`,
        };
    };

/** Bande d'année (étape 1, tri « Récentes ») : grise, collante. */
const yearBandSx: SxProps<Theme> = (theme) => ({
    lineHeight: '28px',
    px: 2,
    fontWeight: 700,
    fontSize: '0.75rem',
    letterSpacing: '0.06em',
    color: 'text.secondary',
    bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
});

/** Ligne sélectionnable : liseré gauche de la couleur du type. */
const itemSx = (type: EntityRefType): SxProps<Theme> => ({
    py: 0.75,
    borderLeft: '3px solid',
    borderLeftColor: ENTITY_REF_TYPE_COLORS[type],
});

/* ------------------------------------------------------------------ */
/*  Sous-composants                                                    */
/* ------------------------------------------------------------------ */

/**
 * Bande d'en-tête de groupe : pastille de type + libellé (+ « · N »). Élément
 * `ListSubheader` rendu directement (pas de composant intermédiaire) :
 * `MenuList` s'appuie sur `ListSubheader.muiSkipListHighlight` pour l'ignorer
 * dans la navigation clavier et ne pas lui attribuer le `tabIndex` de
 * l'élément actif. Collante (`disableSticky={false}`) : la bande reste visible
 * pendant le défilement de son groupe.
 */
const renderGroupHeader = (type: EntityRefType, count?: number): ReactElement => (
    <ListSubheader key={`header-${type}`} disableSticky={false} sx={typeBandSx(type)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextCircleIcon
                label={ENTITY_REF_TYPE_ICON_LABELS[type]}
                size={HEADER_ICON_SIZE}
                color={ENTITY_REF_TYPE_COLORS[type]}
            />
            <span>{count === undefined ? TYPE_BAND_LABELS[type] : `${TYPE_BAND_LABELS[type]} · ${count}`}</span>
        </Box>
    </ListSubheader>
);

/** Bande d'année de l'étape 1 (mêmes contraintes de rendu direct que les en-têtes de groupe). */
const renderYearHeader = (year: number): ReactElement => (
    <ListSubheader key={`year-${year}`} disableSticky={false} sx={yearBandSx}>
        {year}
    </ListSubheader>
);

/** Ligne commune : pastille de type + libellé principal / secondaire. */
const ItemContent = memo(function ItemContent({
    type,
    primary,
    secondary,
}: {
    readonly type: EntityRefType;
    readonly primary: string;
    readonly secondary?: string;
}) {
    return (
        <>
            <ListItemIcon sx={{ minWidth: 40 }}>
                <TextCircleIcon
                    label={ENTITY_REF_TYPE_ICON_LABELS[type]}
                    size={ITEM_ICON_SIZE}
                    color={ENTITY_REF_TYPE_COLORS[type]}
                />
            </ListItemIcon>
            <ListItemText
                primary={primary}
                secondary={secondary}
                primaryTypographyProps={{ noWrap: true, variant: 'body1' }}
                secondaryTypographyProps={{ noWrap: true, variant: 'body2' }}
            />
        </>
    );
});

/**
 * Campagne de l'étape 1. `autoFocus` / `tabIndex` sont injectés par `MenuList`
 * (`cloneElement` sur l'élément actif) et doivent être transmis au `MenuItem`.
 */
const CampaignItem = memo(function CampaignItem({
    campaign,
    onPick,
    autoFocus,
    tabIndex,
}: {
    readonly campaign: PickerCampaign;
    readonly onPick: (campaign: PickerCampaign) => void;
    readonly autoFocus?: boolean;
    readonly tabIndex?: number;
}) {
    const handleClick = useCallback(() => onPick(campaign), [onPick, campaign]);
    return (
        <MenuItem onClick={handleClick} autoFocus={autoFocus} tabIndex={tabIndex} sx={itemSx('campaign')}>
            <ItemContent type="campaign" primary={campaign.name} secondary={formatCampaignSubtitle(campaign)} />
        </MenuItem>
    );
});

/** Référence sélectionnable de l'étape 2 (mêmes props injectées par `MenuList`). */
const PickerItem = memo(function PickerItem({
    option,
    onSelect,
    autoFocus,
    tabIndex,
}: {
    readonly option: EntityRefOption;
    readonly onSelect: (ref: EntityRefSelection) => void;
    readonly autoFocus?: boolean;
    readonly tabIndex?: number;
}) {
    const handleClick = useCallback(
        () => onSelect({ entityType: option.entityType, entityUuid: option.entityUuid, label: option.label }),
        [onSelect, option.entityType, option.entityUuid, option.label],
    );
    const primary = option.entityType === 'campaign' ? SELF_CAMPAIGN_LABEL : option.label;
    return (
        <MenuItem onClick={handleClick} autoFocus={autoFocus} tabIndex={tabIndex} sx={itemSx(option.entityType)}>
            <ItemContent type={option.entityType} primary={primary} secondary={option.secondary} />
        </MenuItem>
    );
});

/** Chargement en cours (même rendu aux deux étapes). */
const LoadingRow = memo(function LoadingRow() {
    return (
        <Box
            role="status"
            aria-label="Chargement des références"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1 }}
        >
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
                Chargement…
            </Typography>
        </Box>
    );
});

/** Ligne d'information (état vide, liste tronquée). */
const HintRow = memo(function HintRow({ children }: { readonly children: string }) {
    return (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1, fontStyle: 'italic' }}>
            {children}
        </Typography>
    );
});

/** Zone défilante d'une étape (les bandes collantes s'y accrochent ; l'en-tête et les filtres restent fixes). */
const ScrollArea = memo(function ScrollArea({ children }: { readonly children: ReactNode }) {
    return <Box sx={{ overflowY: 'auto', minHeight: 0 }}>{children}</Box>;
});

/** ↓ depuis un champ de filtre rejoint le premier résultat de la liste ; Entrée le sélectionne directement. */
function useFilterKeyDown(listRef: RefObject<HTMLUListElement>) {
    return useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== 'ArrowDown' && event.key !== 'Enter') return;
            const first = listRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
            if (!first) return;
            event.preventDefault();
            if (event.key === 'ArrowDown') first.focus();
            else first.click();
        },
        [listRef],
    );
}

/* ------------------------------------------------------------------ */
/*  Étape 1 : campagnes                                                */
/* ------------------------------------------------------------------ */

interface CampaignStepProps {
    readonly campaigns: readonly PickerCampaign[] | undefined;
    readonly isLoading: boolean;
    readonly isError: boolean;
    readonly query: string;
    readonly autoFocusItem: boolean;
    readonly onPick: (campaign: PickerCampaign) => void;
    readonly onResultsChange?: (count: number) => void;
}

const CampaignStep = memo(function CampaignStep({
    campaigns,
    isLoading,
    isError,
    query,
    autoFocusItem,
    onPick,
    onResultsChange,
}: CampaignStepProps) {
    // Le filtre interne part de `query` et se réaligne à chaque changement (la saisie après `@` prime).
    const [filter, setFilter] = useState(query);
    useEffect(() => {
        setFilter(query);
    }, [query]);
    const [order, setOrder] = useState<CampaignSortOrder>(readCampaignSortOrder);
    const listRef = useRef<HTMLUListElement>(null);

    const sorted = useMemo(() => sortCampaigns(campaigns ?? [], order), [campaigns, order]);
    const matching = useMemo(() => filterCampaigns(sorted, filter), [sorted, filter]);
    const shown = useMemo(() => matching.slice(0, MAX_CAMPAIGN_RESULTS), [matching]);
    const hidden = matching.length - shown.length;

    useEffect(() => {
        onResultsChange?.(shown.length);
    }, [shown.length, onResultsChange]);

    const handleFilterChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setFilter(event.target.value);
    }, []);
    const handleFilterKeyDown = useFilterKeyDown(listRef);

    const handleOrderChange = useCallback((_event: MouseEvent<HTMLElement>, next: CampaignSortOrder | null) => {
        // Groupe exclusif : re-cliquer l'option active renvoie `null`, le tri courant est conservé.
        if (next === null) return;
        setOrder(next);
        writeCampaignSortOrder(next);
    }, []);

    // Liste plate : `MenuList` ne parcourt que ses enfants directs (pas de Fragment).
    const items = useMemo(() => {
        const renderItem = (campaign: PickerCampaign) => (
            <CampaignItem key={campaign.uuid} campaign={campaign} onPick={onPick} />
        );
        if (order === 'alpha') return shown.map(renderItem);
        return groupCampaignsByYear(shown).flatMap((group) => [
            renderYearHeader(group.year),
            ...group.campaigns.map(renderItem),
        ]);
    }, [shown, order, onPick]);

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, pt: 1.25, pb: 0.75 }}>
                <TextCircleIcon label="C" size={HEADER_ICON_SIZE} color={ENTITY_REF_TYPE_COLORS.campaign} />
                <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
                    Campagnes
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, pb: 1 }}>
                <TextField
                    value={filter}
                    onChange={handleFilterChange}
                    onKeyDown={handleFilterKeyDown}
                    size="small"
                    fullWidth
                    placeholder="Nom, année…"
                    inputProps={{ 'aria-label': 'Filtrer les campagnes', autoComplete: 'off' }}
                />
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={order}
                    onChange={handleOrderChange}
                    aria-label="Trier les campagnes"
                    sx={{ flexShrink: 0 }}
                >
                    {SORT_OPTIONS.map((option) => (
                        <ToggleButton key={option.value} value={option.value} sx={{ px: 1.25, whiteSpace: 'nowrap' }}>
                            {option.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>
            <ScrollArea>
                {isError && (
                    <Alert severity="error" sx={{ m: 1, py: 0 }}>
                        Impossible de charger les campagnes
                    </Alert>
                )}
                {isLoading && <LoadingRow />}
                {!isLoading && !isError && sorted.length === 0 && <HintRow>Aucune campagne</HintRow>}
                {!isLoading && sorted.length > 0 && shown.length === 0 && <HintRow>Aucun résultat</HintRow>}
                {shown.length > 0 && (
                    <MenuList
                        ref={listRef}
                        id={ENTITY_REF_PICKER_LIST_ID}
                        autoFocusItem={autoFocusItem}
                        aria-label="Campagnes disponibles"
                        sx={{ py: 0 }}
                    >
                        {items}
                    </MenuList>
                )}
                {hidden > 0 && <HintRow>{formatHiddenCampaignsHint(hidden)}</HintRow>}
            </ScrollArea>
        </>
    );
});

/* ------------------------------------------------------------------ */
/*  Étape 2 : références de la campagne                                */
/* ------------------------------------------------------------------ */

interface EntityStepProps {
    readonly campaign: PickerCampaign;
    readonly fsecsQuery: ReturnType<typeof useActiveFsecs>;
    readonly fasQuery: ReturnType<typeof useFas>;
    readonly excluded: readonly EntityRefInput[];
    readonly onSelect: (ref: EntityRefSelection) => void;
    readonly onBack: () => void;
    readonly onResultsChange?: (count: number) => void;
}

const EntityStep = memo(function EntityStep({
    campaign,
    fsecsQuery,
    fasQuery,
    excluded,
    onSelect,
    onBack,
    onResultsChange,
}: EntityStepProps) {
    const [filter, setFilter] = useState('');
    const listRef = useRef<HTMLUListElement>(null);

    const candidates = useMemo<Record<EntityRefType, EntityRefOption[]>>(
        () => ({
            // Le texte de recherche normalisé est calculé une fois par option, pas à chaque frappe.
            campaign: [
                {
                    entityType: 'campaign',
                    entityUuid: campaign.uuid,
                    label: campaign.name,
                    secondary: campaign.name,
                    slug: campaign.slug,
                    searchText: buildEntityRefSearchText(campaign.name, campaign.slug),
                },
            ],
            fsec: (fsecsQuery.data ?? [])
                .filter((fsec) => fsec.isActive && fsec.campaignId === campaign.uuid)
                .map((fsec) => ({
                    entityType: 'fsec',
                    entityUuid: fsec.fsecUuid,
                    label: fsec.displayName,
                    secondary: fsec.slug,
                    slug: fsec.slug,
                    searchText: buildEntityRefSearchText(fsec.displayName, fsec.slug),
                })),
            fa: (fasQuery.data ?? [])
                .filter((fa) => fa.campaignSlug === campaign.slug)
                .map((fa) => ({
                    entityType: 'fa',
                    entityUuid: fa.uuid,
                    label: fa.identifier,
                    secondary: fa.slug,
                    slug: fa.slug,
                    searchText: buildEntityRefSearchText(fa.identifier, fa.slug),
                })),
        }),
        [campaign, fsecsQuery.data, fasQuery.data],
    );

    /** Groupes non vides : options affichées (plafonnées) et total correspondant (bande « FSEC · 12 »). */
    const groups = useMemo(
        () =>
            STEP2_GROUP_TYPES.map((type) => {
                const all = filterEntityRefOptions(candidates[type], filter, excluded, Infinity);
                return { type, total: all.length, options: all.slice(0, MAX_RESULTS_PER_GROUP) };
            }).filter((group) => group.options.length > 0),
        [candidates, filter, excluded],
    );

    const resultCount = useMemo(() => groups.reduce((total, group) => total + group.options.length, 0), [groups]);
    useEffect(() => {
        onResultsChange?.(resultCount);
    }, [resultCount, onResultsChange]);

    const isLoading = fsecsQuery.isLoading || fasQuery.isLoading;
    const isError = fsecsQuery.isError || fasQuery.isError;
    const hasEntities = candidates.fsec.length + candidates.fa.length > 0;

    const handleFilterChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setFilter(event.target.value);
    }, []);
    const handleFilterKeyDown = useFilterKeyDown(listRef);

    // Liste plate : `MenuList` ne parcourt que ses enfants directs (pas de Fragment).
    const items: ReactElement[] = [];
    groups.forEach((group) => {
        items.push(renderGroupHeader(group.type, group.type === 'campaign' ? undefined : group.total));
        group.options.forEach((option) => {
            items.push(
                <PickerItem key={`${option.entityType}-${option.entityUuid}`} option={option} onSelect={onSelect} />,
            );
        });
    });

    return (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 0.5, pr: 2, pt: 0.75 }}>
                <IconButton size="small" onClick={onBack} aria-label="Toutes les campagnes">
                    <ArrowBackIcon fontSize="small" />
                </IconButton>
                <Typography variant="subtitle1" component="h2" noWrap sx={{ fontWeight: 700, minWidth: 0 }}>
                    {campaign.name}
                </Typography>
            </Box>
            <Box sx={{ px: 1.5, py: 1 }}>
                <TextField
                    value={filter}
                    onChange={handleFilterChange}
                    onKeyDown={handleFilterKeyDown}
                    size="small"
                    fullWidth
                    autoFocus
                    placeholder="Filtrer FSEC / FA…"
                    inputProps={{ 'aria-label': 'Filtrer les références', autoComplete: 'off' }}
                />
            </Box>
            <ScrollArea>
                {isError && (
                    <Alert severity="error" sx={{ m: 1, py: 0 }}>
                        Impossible de charger les références
                    </Alert>
                )}
                {isLoading && <LoadingRow />}
                {items.length > 0 && (
                    <MenuList
                        ref={listRef}
                        id={ENTITY_REF_PICKER_LIST_ID}
                        aria-label="Références disponibles"
                        sx={{ py: 0 }}
                    >
                        {items}
                    </MenuList>
                )}
                {!isLoading && !hasEntities && <HintRow>Aucun FSEC ni FA dans cette campagne</HintRow>}
                {!isLoading && hasEntities && items.length === 0 && <HintRow>Aucun résultat pour ce filtre</HintRow>}
            </ScrollArea>
        </>
    );
});

/* ------------------------------------------------------------------ */
/*  Contenu (hooks de données + étape courante)                        */
/* ------------------------------------------------------------------ */

/**
 * Appelle les hooks de données (monté à l'ouverture seulement : l'état de
 * l'étape et les filtres internes repartent de zéro à chaque réouverture) et
 * rend l'étape courante.
 */
const EntityRefPickerContent = memo(function EntityRefPickerContent({
    query,
    excluded,
    onSelect,
    onClose,
    autoFocusItem,
    onResultsChange,
}: Omit<EntityRefPickerProps, 'open' | 'anchorEl'>) {
    const campaignsQuery = useCampaigns();
    const fsecsQuery = useActiveFsecs();
    const fasQuery = useFas();

    const [selectedCampaign, setSelectedCampaign] = useState<PickerCampaign | null>(null);
    /** Retour à l'étape 1 : le focus revient sur la première campagne (le bouton retour a disparu). */
    const [focusAfterBack, setFocusAfterBack] = useState(false);

    const handlePickCampaign = useCallback((campaign: PickerCampaign) => {
        setSelectedCampaign(campaign);
        setFocusAfterBack(false);
    }, []);

    const handleBack = useCallback(() => {
        setSelectedCampaign(null);
        setFocusAfterBack(true);
    }, []);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }
            // Tab depuis la liste : rien ne suit dans le panneau, on ferme (Maj+Tab remonte aux filtres / au tri).
            const target = event.target as HTMLElement;
            const inList = target.getAttribute('role') === 'menuitem';
            if (event.key === 'Tab' && !event.shiftKey && inList) {
                event.preventDefault();
                onClose();
            }
        },
        [onClose],
    );

    return (
        <Box
            onKeyDown={handleKeyDown}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minWidth: 480,
                maxWidth: 600,
                maxHeight: 'min(520px, 70vh)',
            }}
        >
            {selectedCampaign === null ? (
                <CampaignStep
                    campaigns={campaignsQuery.data}
                    isLoading={campaignsQuery.isLoading}
                    isError={campaignsQuery.isError}
                    query={query}
                    autoFocusItem={Boolean(autoFocusItem) || focusAfterBack}
                    onPick={handlePickCampaign}
                    onResultsChange={onResultsChange}
                />
            ) : (
                <EntityStep
                    campaign={selectedCampaign}
                    fsecsQuery={fsecsQuery}
                    fasQuery={fasQuery}
                    excluded={excluded}
                    onSelect={onSelect}
                    onBack={handleBack}
                    onResultsChange={onResultsChange}
                />
            )}
        </Box>
    );
});

/* ------------------------------------------------------------------ */
/*  Composant principal                                                */
/* ------------------------------------------------------------------ */

export const EntityRefPicker = memo(function EntityRefPicker({
    open,
    anchorEl,
    query,
    excluded,
    onSelect,
    onClose,
    autoFocusItem = false,
    onResultsChange,
}: EntityRefPickerProps) {
    if (!open) return null;

    const content = (
        <ClickAwayListener onClickAway={onClose}>
            <Paper
                elevation={6}
                id={ENTITY_REF_PICKER_ID}
                data-testid="entity-ref-picker"
                sx={{ borderRadius: 2, overflow: 'hidden' }}
            >
                <EntityRefPickerContent
                    query={query}
                    excluded={excluded}
                    onSelect={onSelect}
                    onClose={onClose}
                    autoFocusItem={autoFocusItem}
                    onResultsChange={onResultsChange}
                />
            </Paper>
        </ClickAwayListener>
    );

    if (!anchorEl) return content;

    return (
        <Popper open anchorEl={anchorEl} placement="top-start" role="presentation" sx={{ zIndex: 'modal' }}>
            {content}
        </Popper>
    );
});
