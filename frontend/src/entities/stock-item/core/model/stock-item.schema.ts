/**
 * Stock Catalog Item — Zod schemas (validation + transformation).
 *
 * - `StockCatalogItemApiSchema` : payload brut backend (snake_case).
 * - `StockCatalogItemSchema`   : transformation → domaine (camelCase).
 * - `StockCatalogItemFormSchemas` : schémas par kind pour les formulaires
 *   de création/édition (champs requis adaptés selon kind).
 *
 * Source de vérité : `backend/app/domain/stock/models/stock_catalog_bean.py`
 * et `serializers.py`.
 */

import { z } from 'zod';

import { formatDateToIso } from '@shared/lib';

import {
    CATEGORIES_BY_KIND,
    CATEGORY,
    CATEGORY_VALUES,
    ELEMENT_STATUS_VALUES,
    ITEM_KIND,
    ITEM_KIND_VALUES,
    INSTALLATION_VALUES,
    STRUCTURATION_BATCH_MAX,
    STRUCTURATION_TYPE_VALUES,
    type CategoryCode,
    type ElementStatus,
    type Installation,
    type ItemKind,
    type StructurationType,
} from './stock.constants';

// ─────────────────────────────────────────────────────────────────────────────
// API schema (snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

export const StockCatalogItemApiSchema = z.object({
    uuid: z.string().uuid(),
    kind: z.enum(ITEM_KIND_VALUES as [ItemKind, ...ItemKind[]]),
    category: z.enum(CATEGORY_VALUES as [CategoryCode, ...CategoryCode[]]),
    structuration_type: z.enum(STRUCTURATION_TYPE_VALUES as [StructurationType, ...StructurationType[]]).nullable(),
    name: z.string(),
    reference: z.string().nullable(),
    caracteristique: z.string().nullable(),
    type_de_colle: z.string().nullable(),
    fournisseur: z.string().nullable(),
    remarques: z.string().nullable(),
    unite: z.string().nullable(),
    quantite: z.number().int().nullable(),
    seuil_alerte: z.number().int().nullable(),
    date_peremption: z.string().nullable(),
    type_d_achat: z.string().nullable(),
    fsec_name: z.string().nullable(),
    installation: z.enum(INSTALLATION_VALUES as [Installation, ...Installation[]]).nullable(),
    status: z.enum(ELEMENT_STATUS_VALUES as [ElementStatus, ...ElementStatus[]]).nullable(),
    materiaux_mat: z.string().nullable(),
    // Matière / masse (R03). `.optional()` : rétro-compatibilité des payloads
    // sérialisés avant l'ajout des champs (caches, snapshots de tests).
    matiere: z.string().nullable().optional(),
    masse_mg: z.number().nullable().optional(),
    // Champs calculés lecture seule (R01) : FSEC réellement réservée via
    // FSEC_ASSEMBLY_ITEM + campagne parente formatée « {year}-{installation}_{name} ».
    // Jamais renvoyés au backend (ignorés par api_to_bean côté serveur).
    assigned_fsec_name: z.string().nullable().optional(),
    assigned_campaign_name: z.string().nullable().optional(),
    assigned_fsec_slug: z.string().nullable().optional(),
    boite: z.string().nullable(),
    emplacement: z.string().nullable(),
    is_active: z.boolean(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
});

export const StockCatalogItemSchema = StockCatalogItemApiSchema.transform((api) => ({
    uuid: api.uuid,
    kind: api.kind,
    category: api.category,
    structurationType: api.structuration_type,
    name: api.name,
    reference: api.reference,
    caracteristique: api.caracteristique,
    typeDeColle: api.type_de_colle,
    fournisseur: api.fournisseur,
    remarques: api.remarques,
    unite: api.unite,
    quantite: api.quantite,
    seuilAlerte: api.seuil_alerte,
    datePeremption: api.date_peremption ? new Date(api.date_peremption) : null,
    typeDAchat: api.type_d_achat,
    fsecName: api.fsec_name,
    installation: api.installation,
    status: api.status,
    materiauxMat: api.materiaux_mat,
    matiere: api.matiere ?? null,
    masseMg: api.masse_mg ?? null,
    assignedFsecName: api.assigned_fsec_name ?? null,
    assignedCampaignName: api.assigned_campaign_name ?? null,
    assignedFsecSlug: api.assigned_fsec_slug ?? null,
    boite: api.boite,
    emplacement: api.emplacement,
    isActive: api.is_active,
    createdAt: api.created_at ? new Date(api.created_at) : null,
    updatedAt: api.updated_at ? new Date(api.updated_at) : null,
}));

export type StockCatalogItem = z.infer<typeof StockCatalogItemSchema>;
export type StockCatalogItemApi = z.input<typeof StockCatalogItemSchema>;

export const StockCatalogItemListSchema = z.array(StockCatalogItemSchema);

// ─────────────────────────────────────────────────────────────────────────────
// Form schemas par kind (validation côté formulaire RHF + zodResolver)
// ─────────────────────────────────────────────────────────────────────────────

const ELEMENT_CATEGORY_VALUES = CATEGORIES_BY_KIND[ITEM_KIND.ELEMENT];
const CONSUMABLE_CATEGORY_VALUES = CATEGORIES_BY_KIND[ITEM_KIND.CONSUMABLE];

/**
 * Objet de base du formulaire élément (kind=element).
 *
 * `name` reste une clé requise (chaîne, '' autorisé) ; la contrainte « non vide »
 * est appliquée par le superRefine **selon le mode** : en mode paquet (création
 * de structuration), c'est `batchQuantity` qui est requis et `name` (le numéro
 * de série, seul identifiant) est attribué automatiquement côté backend.
 */
const elementFormObject = z.object({
    kind: z.literal(ITEM_KIND.ELEMENT),
    // `.optional().default('')` : en mode paquet, le champ Nom est démonté du
    // formulaire (remplacé par Quantité) et react-hook-form retire sa valeur au
    // submit → `undefined`. Un `z.string()` strict rejetterait alors avec une
    // erreur invisible (champ non rendu) qui bloque silencieusement la création.
    // La contrainte « non vide » hors mode paquet reste portée par le superRefine.
    name: z.string().max(200).optional().default(''),
    // Nombre de pièces à créer en mode paquet (structuration uniquement).
    batchQuantity: z
        .number({ invalid_type_error: 'La quantité doit être un entier' })
        .int('La quantité doit être un entier')
        .min(1, 'La quantité doit être au moins 1')
        .max(STRUCTURATION_BATCH_MAX, `Maximum ${STRUCTURATION_BATCH_MAX} pièces par paquet`)
        .optional()
        .nullable(),
    reference: z.string().max(200).optional().nullable(),
    fsecName: z.string().max(200).optional().nullable(),
    category: z.enum(ELEMENT_CATEGORY_VALUES as [CategoryCode, ...CategoryCode[]], {
        required_error: 'La rubrique est requise',
    }),
    structurationType: z
        .enum(STRUCTURATION_TYPE_VALUES as [StructurationType, ...StructurationType[]])
        .optional()
        .nullable(),
    installation: z.enum(INSTALLATION_VALUES as [Installation, ...Installation[]], {
        required_error: "L'installation est requise",
    }),
    caracteristique: z.string().max(200).optional().nullable(),
    typeDeColle: z.string().max(100).optional().nullable(),
    materiauxMat: z.string().max(200).optional().nullable(),
    // Matière générique (à ne pas confondre avec `materiauxMat`, spécifique à la
    // structuration spéciale) et masse en milligrammes (R03).
    matiere: z.string().max(200, 'La matière ne peut dépasser 200 caractères').optional().nullable(),
    masseMg: z
        .number({ invalid_type_error: 'La masse doit être un nombre' })
        .nonnegative('La masse ne peut pas être négative')
        .optional()
        .nullable(),
    fournisseur: z.string().max(100).optional().nullable(),
    boite: z.string().max(200).optional().nullable(),
    emplacement: z.string().max(200).optional().nullable(),
    remarques: z.string().max(4000).optional().nullable(),
});

/** Construit le superRefine du formulaire élément selon le mode (paquet ou non). */
function refineElementForm(batchMode: boolean) {
    return (values: z.infer<typeof elementFormObject>, ctx: z.RefinementCtx) => {
        const isStructuration = values.category === CATEGORY.STRUCTURATION;

        if (isStructuration) {
            if (!values.structurationType) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['structurationType'],
                    message: 'Le type de structuration est requis',
                });
            }
            if (batchMode) {
                // Mode paquet (création) : seule la quantité est requise ;
                // `name` (numéro de série) est attribué automatiquement.
                if (values.batchQuantity == null || values.batchQuantity < 1) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['batchQuantity'],
                        message: 'La quantité doit être au moins 1',
                    });
                }
                return;
            }
        }

        // Hors mode paquet (édition, ou rubrique non-structuration) : nom requis.
        if (!values.name || !values.name.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['name'],
                message: 'Le nom est requis',
            });
        }
    };
}

/** Schéma single / édition (nom requis, pas de numérotation auto). */
export const ElementFormSchema = elementFormObject.superRefine(refineElementForm(false));

/** Schéma création (mode paquet pour structuration : libellé + quantité requis). */
export const ElementBatchFormSchema = elementFormObject.superRefine(refineElementForm(true));

export type ElementFormValues = z.infer<typeof ElementFormSchema>;

/** Schéma du formulaire consommable (kind=consumable). */
export const ConsumableFormSchema = z.object({
    kind: z.literal(ITEM_KIND.CONSUMABLE),
    name: z.string().min(1, 'Le nom est requis').max(200),
    reference: z.string().max(200).optional().nullable(),
    category: z.enum(CONSUMABLE_CATEGORY_VALUES as [CategoryCode, ...CategoryCode[]], {
        required_error: 'La rubrique est requise',
    }),
    caracteristique: z.string().max(200).optional().nullable(),
    typeDeColle: z.string().max(100).optional().nullable(),
    quantite: z
        .number({ invalid_type_error: 'La quantité doit être un entier' })
        .int('La quantité doit être un entier')
        .min(0, 'La quantité ne peut pas être négative')
        .max(1_000_000_000),
    unite: z.string().min(1, "L'unité est requise").max(50),
    seuilAlerte: z
        .number()
        .int('Le seuil doit être un entier')
        .min(0, 'Le seuil ne peut pas être négatif')
        .max(1_000_000_000)
        .optional()
        .nullable(),
    typeDAchat: z.string().max(100).optional().nullable(),
    fournisseur: z.string().max(100).optional().nullable(),
    datePeremption: z.date().nullable().optional(),
    boite: z.string().max(200).optional().nullable(),
    emplacement: z.string().max(200).optional().nullable(),
    remarques: z.string().max(4000).optional().nullable(),
});

export type ConsumableFormValues = z.infer<typeof ConsumableFormSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Mappers form → payload API (snake_case)
// ─────────────────────────────────────────────────────────────────────────────

export interface StockCatalogItemPayload {
    kind: ItemKind;
    category: CategoryCode;
    structuration_type?: StructurationType | null;
    name: string;
    reference?: string | null;
    caracteristique?: string | null;
    type_de_colle?: string | null;
    fournisseur?: string | null;
    remarques?: string | null;
    unite?: string | null;
    quantite?: number | null;
    seuil_alerte?: number | null;
    date_peremption?: string | null;
    type_d_achat?: string | null;
    fsec_name?: string | null;
    installation?: Installation | null;
    status?: ElementStatus | null;
    materiaux_mat?: string | null;
    matiere?: string | null;
    masse_mg?: number | null;
    boite?: string | null;
    emplacement?: string | null;
}

const emptyToNull = <T extends string | null | undefined>(v: T): string | null =>
    !v || (typeof v === 'string' && v.trim() === '') ? null : v;

export function elementFormToApi(values: ElementFormValues): StockCatalogItemPayload {
    const isStructuration = values.category === CATEGORY.STRUCTURATION;
    return {
        kind: ITEM_KIND.ELEMENT,
        category: values.category,
        structuration_type: isStructuration ? (values.structurationType ?? null) : null,
        name: (values.name ?? '').trim(),
        reference: emptyToNull(values.reference),
        fsec_name: emptyToNull(values.fsecName),
        caracteristique: emptyToNull(values.caracteristique),
        type_de_colle: emptyToNull(values.typeDeColle),
        materiaux_mat: emptyToNull(values.materiauxMat),
        matiere: emptyToNull(values.matiere),
        masse_mg: values.masseMg ?? null,
        fournisseur: emptyToNull(values.fournisseur),
        installation: values.installation,
        boite: emptyToNull(values.boite),
        emplacement: emptyToNull(values.emplacement),
        remarques: emptyToNull(values.remarques),
    };
}

/** Payload de création par lot de structurations (POST /stock/catalog/batch-structuration/). */
export interface StructurationBatchPayload {
    structuration_type: StructurationType;
    installation: Installation;
    quantity: number;
    fsec_name?: string | null;
    caracteristique?: string | null;
    fournisseur?: string | null;
    materiaux_mat?: string | null;
    matiere?: string | null;
    masse_mg?: number | null;
    boite?: string | null;
    emplacement?: string | null;
    remarques?: string | null;
}

/**
 * Convertit les valeurs du formulaire élément (mode paquet, rubrique structuration)
 * en payload de création par lot. La numérotation (`name`) est gérée côté backend.
 */
export function structurationBatchFormToApi(values: ElementFormValues): StructurationBatchPayload {
    return {
        structuration_type: values.structurationType as StructurationType,
        installation: values.installation,
        quantity: values.batchQuantity ?? 1,
        fsec_name: emptyToNull(values.fsecName),
        caracteristique: emptyToNull(values.caracteristique),
        fournisseur: emptyToNull(values.fournisseur),
        materiaux_mat: emptyToNull(values.materiauxMat),
        matiere: emptyToNull(values.matiere),
        masse_mg: values.masseMg ?? null,
        boite: emptyToNull(values.boite),
        emplacement: emptyToNull(values.emplacement),
        remarques: emptyToNull(values.remarques),
    };
}

export function consumableFormToApi(values: ConsumableFormValues): StockCatalogItemPayload {
    return {
        kind: ITEM_KIND.CONSUMABLE,
        category: values.category,
        name: values.name.trim(),
        reference: emptyToNull(values.reference),
        caracteristique: emptyToNull(values.caracteristique),
        type_de_colle: emptyToNull(values.typeDeColle),
        unite: values.unite.trim(),
        quantite: values.quantite,
        seuil_alerte: values.seuilAlerte ?? null,
        type_d_achat: emptyToNull(values.typeDAchat),
        fournisseur: emptyToNull(values.fournisseur),
        // DateField backend : sérialisation en composantes locales (pas de J-1 UTC).
        date_peremption: formatDateToIso(values.datePeremption),
        boite: emptyToNull(values.boite),
        emplacement: emptyToNull(values.emplacement),
        remarques: emptyToNull(values.remarques),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reverse mappers : StockCatalogItem → form values (pour pré-remplir l'édition)
// ─────────────────────────────────────────────────────────────────────────────

/** Convertit un item du catalogue (kind=element) vers les valeurs du formulaire. */
export function itemToElementFormValues(item: {
    kind: ItemKind;
    name: string;
    reference: string | null;
    fsecName: string | null;
    category: CategoryCode;
    structurationType: StructurationType | null;
    installation: Installation | null;
    caracteristique: string | null;
    typeDeColle: string | null;
    materiauxMat: string | null;
    matiere: string | null;
    masseMg: number | null;
    fournisseur: string | null;
    boite: string | null;
    emplacement: string | null;
    remarques: string | null;
}): ElementFormValues {
    return {
        kind: ITEM_KIND.ELEMENT,
        name: item.name,
        // Pas de mode paquet à l'édition (on édite une pièce unique).
        batchQuantity: 1,
        reference: item.reference ?? '',
        // null (et non '') : valeur d'Autocomplete contrôlé freeSolo=false.
        fsecName: item.fsecName ?? null,
        category: item.category,
        structurationType: item.structurationType,
        installation: item.installation ?? INSTALLATION_VALUES[0],
        caracteristique: item.caracteristique ?? '',
        typeDeColle: item.typeDeColle ?? '',
        materiauxMat: item.materiauxMat ?? '',
        matiere: item.matiere ?? '',
        // null (et non 0) : champ numérique vide tant que la masse est inconnue.
        masseMg: item.masseMg ?? null,
        fournisseur: item.fournisseur ?? '',
        boite: item.boite ?? '',
        emplacement: item.emplacement ?? '',
        remarques: item.remarques ?? '',
    };
}

/** Convertit un item du catalogue (kind=consumable) vers les valeurs du formulaire. */
export function itemToConsumableFormValues(item: {
    kind: ItemKind;
    name: string;
    reference: string | null;
    category: CategoryCode;
    caracteristique: string | null;
    typeDeColle: string | null;
    quantite: number | null;
    unite: string | null;
    seuilAlerte: number | null;
    typeDAchat: string | null;
    fournisseur: string | null;
    datePeremption: Date | null;
    boite: string | null;
    emplacement: string | null;
    remarques: string | null;
}): ConsumableFormValues {
    return {
        kind: ITEM_KIND.CONSUMABLE,
        name: item.name,
        reference: item.reference ?? '',
        category: item.category,
        caracteristique: item.caracteristique ?? '',
        typeDeColle: item.typeDeColle ?? '',
        quantite: item.quantite ?? 0,
        unite: item.unite ?? '',
        seuilAlerte: item.seuilAlerte ?? null,
        typeDAchat: item.typeDAchat ?? '',
        fournisseur: item.fournisseur ?? '',
        datePeremption: item.datePeremption,
        boite: item.boite ?? '',
        emplacement: item.emplacement ?? '',
        remarques: item.remarques ?? '',
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Form schemas pour l'édition (PATCH partiel)
// ─────────────────────────────────────────────────────────────────────────────

/** Schéma PATCH partiel — tous les champs optionnels, kind exclu (immuable). */
export const StockCatalogItemPatchSchema = z
    .object({
        category: z.enum(CATEGORY_VALUES as [CategoryCode, ...CategoryCode[]]),
        structuration_type: z.enum(STRUCTURATION_TYPE_VALUES as [StructurationType, ...StructurationType[]]).nullable(),
        name: z.string().max(200),
        reference: z.string().max(200).nullable(),
        caracteristique: z.string().max(200).nullable(),
        type_de_colle: z.string().max(100).nullable(),
        fournisseur: z.string().max(100).nullable(),
        remarques: z.string().max(4000).nullable(),
        unite: z.string().max(50).nullable(),
        quantite: z.number().int().min(0).nullable(),
        seuil_alerte: z.number().int().min(0).nullable(),
        date_peremption: z.string().nullable(),
        type_d_achat: z.string().max(100).nullable(),
        fsec_name: z.string().max(200).nullable(),
        installation: z.enum(INSTALLATION_VALUES as [Installation, ...Installation[]]).nullable(),
        status: z.enum(ELEMENT_STATUS_VALUES as [ElementStatus, ...ElementStatus[]]).nullable(),
        materiaux_mat: z.string().max(200).nullable(),
        matiere: z.string().max(200).nullable(),
        masse_mg: z.number().min(0).nullable(),
        boite: z.string().max(200).nullable(),
        emplacement: z.string().max(200).nullable(),
        is_active: z.boolean(),
    })
    .partial();

export type StockCatalogItemPatchPayload = z.infer<typeof StockCatalogItemPatchSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Stock alerts (réponse de GET /stock/alerts/)
// ─────────────────────────────────────────────────────────────────────────────

export const StockAlertsApiSchema = z.object({
    low_stock: z.array(StockCatalogItemSchema),
    expired: z.array(StockCatalogItemSchema),
    expiring_soon: z.array(StockCatalogItemSchema),
});

export const StockAlertsSchema = StockAlertsApiSchema.transform((api) => ({
    lowStock: api.low_stock,
    expired: api.expired,
    expiringSoon: api.expiring_soon,
}));

export type StockAlerts = z.infer<typeof StockAlertsSchema>;
