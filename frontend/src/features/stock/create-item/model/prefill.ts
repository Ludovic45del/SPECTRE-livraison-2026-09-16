/**
 * Valeurs initiales des formulaires de création (vierges ou dupliquées — R06).
 *
 * Isolé des composants (react-refresh) et testable sans rendu.
 */

import {
    CATEGORY,
    INSTALLATION,
    ITEM_KIND,
    itemToConsumableFormValues,
    itemToElementFormValues,
    type ConsumableFormValues,
    type ElementFormValues,
    type StockCatalogItem,
} from '@entities/stock-item';

/** Valeurs par défaut d'une création vierge d'élément sérialisé. */
export const EMPTY_ELEMENT_DEFAULTS: ElementFormValues = {
    kind: ITEM_KIND.ELEMENT,
    name: '',
    batchQuantity: 1,
    reference: '',
    fsecName: null,
    category: CATEGORY.PIECES_ELEMENTAIRES,
    structurationType: null,
    installation: INSTALLATION.LMJ,
    caracteristique: '',
    typeDeColle: '',
    materiauxMat: '',
    matiere: '',
    masseMg: null,
    fournisseur: '',
    boite: '',
    emplacement: '',
    remarques: '',
};

/** Valeurs par défaut d'une création vierge de consommable. */
export const EMPTY_CONSUMABLE_DEFAULTS: ConsumableFormValues = {
    kind: ITEM_KIND.CONSUMABLE,
    name: '',
    reference: '',
    category: CATEGORY.COLLES,
    caracteristique: '',
    typeDeColle: '',
    quantite: 0,
    unite: '',
    seuilAlerte: null,
    typeDAchat: '',
    fournisseur: '',
    datePeremption: null,
    boite: '',
    emplacement: '',
    remarques: '',
};

/**
 * Valeurs initiales du formulaire élément : copie de l'item source (duplication)
 * avec la seule référence vidée, ou valeurs vierges.
 *
 * Le NOM est conservé (retour R06 : « 10 écrans identiques… juste modifier la
 * référence ») : l'unicité kind/name/reference autorise plusieurs éléments
 * homonymes tant que la référence diffère, et le backend répond 409 explicite
 * si l'utilisateur valide sans changer la référence. Le statut et la
 * réservation FSEC ne sont jamais copiés (le backend force `dispo`). Une
 * structuration dupliquée repasse en mode paquet (numérotation automatique,
 * quantité 1 — le nom copié y est ignoré au profit du libellé numéroté).
 */
export function buildElementDefaultValues(prefill: StockCatalogItem | null | undefined): ElementFormValues {
    if (!prefill) return EMPTY_ELEMENT_DEFAULTS;
    return {
        ...itemToElementFormValues(prefill),
        reference: '',
        batchQuantity: 1,
    };
}

/**
 * Valeurs initiales du formulaire consommable : copie de l'item source
 * (duplication) avec nom vidé et quantité remise à 0 (le stock réel se
 * constitue ensuite par mouvements), ou valeurs vierges.
 */
export function buildConsumableDefaultValues(prefill: StockCatalogItem | null | undefined): ConsumableFormValues {
    if (!prefill) return EMPTY_CONSUMABLE_DEFAULTS;
    return {
        ...itemToConsumableFormValues(prefill),
        name: '',
        quantite: 0,
    };
}
