/**
 * Helpers d'affichage et de filtrage des références d'entités (M3) : libellés
 * des chips, filtre des options du sélecteur (étape 2) et tri (« Récentes »
 * / « A → Z », mémorisé en session), regroupement par année, sous-titre et
 * filtre des campagnes (étape 1).
 * @module features/messaging/lib
 */

import {
    ENTITY_REF_TYPE_LABELS,
    MAX_ENTITY_REFS_PER_MESSAGE,
    getConversationTitle,
    type EntityRef,
    type EntityRefInput,
    type EntityRefType,
    type Mention,
} from '@entities/messaging';
import { paths } from '@shared/config';

/** Teinte « soft » par type (bleu FSEC, violet campagne, orange FA). */
export const ENTITY_REF_TYPE_COLORS: Record<EntityRefType, string> = {
    fsec: '#007AFF',
    campaign: '#5856D6',
    fa: '#FF9500',
};

/** Libellé court des pastilles de type, identique à celui de la barre latérale. */
export const ENTITY_REF_TYPE_ICON_LABELS: Record<EntityRefType, string> = {
    campaign: 'C',
    fsec: 'Fsec',
    fa: 'FA',
};

/** Notification affichée quand le plafond de références est atteint. */
export const MAX_ENTITY_REFS_MESSAGE = `${MAX_ENTITY_REFS_PER_MESSAGE} références maximum`;

/** Suffixe et infobulle d'une référence dont l'entité a été supprimée. */
export const DELETED_REF_SUFFIX = ' (supprimée)';
export const DELETED_REF_TITLE = "Cette référence n'existe plus";

/**
 * Nom accessible complet : « FSEC · FSEC-12 » (+ « (supprimée) »). Sert d'`aria-label`
 * aux chips, dont le texte visible se limite au nom de l'entité (le type est
 * porté par la pastille).
 */
export function formatEntityRefLabel(entityRef: EntityRef): string {
    const base = `${ENTITY_REF_TYPE_LABELS[entityRef.entityType]} · ${entityRef.label}`;
    return entityRef.exists ? base : `${base}${DELETED_REF_SUFFIX}`;
}

/** Texte visible d'une chip : nom de l'entité seul (+ « (supprimée) »). */
export function formatEntityRefChipText(entityRef: EntityRef): string {
    return entityRef.exists ? entityRef.label : `${entityRef.label}${DELETED_REF_SUFFIX}`;
}

/** Suffixe « · 1 référence » / « · N références » (vide si aucune). */
export function formatEntityRefCountSuffix(count: number): string {
    if (count <= 0) return '';
    return ` · ${count} ${count > 1 ? 'références' : 'référence'}`;
}

/** Vrai si les deux références visent la même entité. */
export const isSameEntityRef = (a: EntityRefInput, b: EntityRefInput): boolean =>
    a.entityType === b.entityType && a.entityUuid === b.entityUuid;

/** Référence choisie dans le sélecteur : entrée d'envoi + libellé pour la chip. */
export type EntityRefSelection = EntityRefInput & { readonly label: string };

/** Option du sélecteur : référence + libellé secondaire + slug (cible du filtre). */
export interface EntityRefOption extends EntityRefSelection {
    readonly secondary?: string;
    readonly slug: string;
    /** Libellé + slug normalisés (`buildEntityRefSearchText`), calculés une fois par option. */
    readonly searchText?: string;
}

/** Nombre maximal de résultats affichés par groupe du sélecteur. */
export const MAX_RESULTS_PER_GROUP = 8;

/** Minuscules sans accents (comparaison de filtre). */
export function normalizeForSearch(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

/** Texte de recherche d'une option : libellé et slug normalisés, séparés par un espace. */
export function buildEntityRefSearchText(label: string, slug: string): string {
    return normalizeForSearch(`${label} ${slug}`);
}

/** Vrai si l'option correspond au filtre (libellé ou slug). */
function matchesQuery(option: EntityRefOption, normalizedQuery: string): boolean {
    if (!normalizedQuery) return true;
    const haystack = option.searchText ?? buildEntityRefSearchText(option.label, option.slug);
    return haystack.includes(normalizedQuery);
}

/**
 * Filtre + exclusion + plafond par groupe (`limit`, `MAX_RESULTS_PER_GROUP`
 * par défaut ; `Infinity` pour compter le total), dans l'ordre d'origine des listes.
 */
export function filterEntityRefOptions(
    options: readonly EntityRefOption[],
    query: string,
    excluded: readonly EntityRefInput[],
    limit: number = MAX_RESULTS_PER_GROUP,
): EntityRefOption[] {
    const normalizedQuery = normalizeForSearch(query.trim());
    return options
        .filter(
            (option) => !excluded.some((ref) => isSameEntityRef(ref, option)) && matchesQuery(option, normalizedQuery),
        )
        .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/*  Étape 1 du sélecteur : campagnes                                   */
/* ------------------------------------------------------------------ */

/** Nombre maximal de campagnes affichées à l'étape 1 du sélecteur. */
export const MAX_CAMPAIGN_RESULTS = 50;

/** Champs d'une campagne utilisés pour le tri et le filtre du sélecteur. */
export interface CampaignPickerFields {
    readonly name: string;
    readonly slug: string;
    readonly year: number;
    readonly semester: string;
    /** Installation hydratée (`useCampaigns`) — facultative pour les appelants qui n'en disposent pas. */
    readonly installation?: { readonly label: string } | null;
}

/** Ordre de tri des campagnes : « Récentes » (année, semestre décroissants) ou « A → Z » (nom). */
export type CampaignSortOrder = 'recent' | 'alpha';

/** Clé `sessionStorage` mémorisant le tri choisi pour la session. */
export const CAMPAIGN_SORT_STORAGE_KEY = 'spectre:messaging:campaign-sort';

const DEFAULT_CAMPAIGN_SORT: CampaignSortOrder = 'recent';

const isCampaignSortOrder = (value: unknown): value is CampaignSortOrder => value === 'recent' || value === 'alpha';

/** Tri mémorisé pour la session (« Récentes » par défaut, ou si le stockage est indisponible). */
export function readCampaignSortOrder(): CampaignSortOrder {
    try {
        const stored = sessionStorage.getItem(CAMPAIGN_SORT_STORAGE_KEY);
        return isCampaignSortOrder(stored) ? stored : DEFAULT_CAMPAIGN_SORT;
    } catch {
        return DEFAULT_CAMPAIGN_SORT;
    }
}

/** Mémorise le tri pour la session (silencieux si le stockage est indisponible : navigation privée, quota…). */
export function writeCampaignSortOrder(order: CampaignSortOrder): void {
    try {
        sessionStorage.setItem(CAMPAIGN_SORT_STORAGE_KEY, order);
    } catch {
        // Stockage indisponible : le tri reste valable pour le panneau ouvert.
    }
}

const frCollator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

const compareRecent = (a: CampaignPickerFields, b: CampaignPickerFields): number =>
    b.year - a.year || b.semester.localeCompare(a.semester) || frCollator.compare(a.name, b.name);

const compareAlpha = (a: CampaignPickerFields, b: CampaignPickerFields): number =>
    frCollator.compare(a.name, b.name) || b.year - a.year || b.semester.localeCompare(a.semester);

/**
 * Tri des campagnes. « Récentes » : année décroissante, puis semestre
 * décroissant (S2 avant S1), puis nom ; « A → Z » : nom (collation française,
 * numérique : « Tir 2 » avant « Tir 10 »), puis année décroissante.
 */
export function sortCampaigns<T extends CampaignPickerFields>(
    campaigns: readonly T[],
    order: CampaignSortOrder = DEFAULT_CAMPAIGN_SORT,
): T[] {
    return [...campaigns].sort(order === 'alpha' ? compareAlpha : compareRecent);
}

/** Groupe une liste (déjà triée) de campagnes par année, dans l'ordre de la liste. */
export function groupCampaignsByYear<T extends CampaignPickerFields>(
    campaigns: readonly T[],
): { readonly year: number; readonly campaigns: T[] }[] {
    const groups: { year: number; campaigns: T[] }[] = [];
    for (const campaign of campaigns) {
        const last = groups[groups.length - 1];
        if (last && last.year === campaign.year) last.campaigns.push(campaign);
        else groups.push({ year: campaign.year, campaigns: [campaign] });
    }
    return groups;
}

/** Sous-titre d'une campagne : « S1 · LMJ » (installation connue), sinon « 2025 · S1 ». */
export function formatCampaignSubtitle(campaign: CampaignPickerFields): string {
    const installation = campaign.installation?.label;
    return installation ? `${campaign.semester} · ${installation}` : `${campaign.year} · ${campaign.semester}`;
}

/** Rappel sous la liste tronquée : « 12 campagnes supplémentaires — affinez la recherche ». */
export function formatHiddenCampaignsHint(hidden: number): string {
    const noun = hidden > 1 ? 'campagnes supplémentaires' : 'campagne supplémentaire';
    return `${hidden} ${noun} — affinez la recherche`;
}

/** Texte de recherche d'une campagne : nom, slug et année normalisés. */
export function buildCampaignSearchText(campaign: CampaignPickerFields): string {
    return normalizeForSearch(`${campaign.name} ${campaign.slug} ${campaign.year}`);
}

/** Filtre (nom, slug, année ; casse et accents ignorés), sans plafond : l'appelant tronque et signale la coupure. */
export function filterCampaigns<T extends CampaignPickerFields>(campaigns: readonly T[], query: string): T[] {
    const normalizedQuery = normalizeForSearch(query.trim());
    if (!normalizedQuery) return [...campaigns];
    return campaigns.filter((campaign) => buildCampaignSearchText(campaign).includes(normalizedQuery));
}

/**
 * Titre d'une conversation de mention : nom du groupe, ou nom de l'autre
 * membre (privée) — même règle que la page Messagerie (`getConversationTitle`
 * accepte le contexte minimal porté par une mention).
 */
export function getMentionConversationTitle(conversation: Mention['conversation'], meUuid: string): string {
    return getConversationTitle(conversation, meUuid);
}

/** Chemin du fil d'une conversation dans la page Messagerie. */
export const conversationPath = (uuid: string): string => paths.messagerie.conversation(uuid);
