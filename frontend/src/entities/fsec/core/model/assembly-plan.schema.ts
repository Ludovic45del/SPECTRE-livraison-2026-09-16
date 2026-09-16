/**
 * Plan d'assemblage annotable — modèle du calque d'annotations.
 * @module entities/fsec/core/model
 *
 * Contrat « format maison » rendu en SVG côté front (cf.
 * cible/repository/fsec/models/fsec_entity.py → assembly_plan_annotations).
 * Le backend ne valide que `id` + `type` (chaînes non vides) ; toute la
 * géométrie est portée ici, le front est seul propriétaire du rendu.
 *
 * Coordonnées NORMALISÉES en pourcentage (0–100) de la taille du plan, pour
 * rester indépendantes de la résolution d'affichage :
 *  - `x1/y1` : point d'origine (toutes formes) ;
 *  - `x2/y2` : extrémité (flèche) ou coin opposé (cadre) ;
 *  - `text`  : libellé (annotation texte) ;
 *  - `color` : couleur du trait (#rrggbb).
 */

import { z } from 'zod';

/** Outils de dessin disponibles sur le plan. */
export const ANNOTATION_TYPES = ['arrow', 'text', 'rect'] as const;
export type AnnotationType = (typeof ANNOTATION_TYPES)[number];

/** Pourcentage 0–100 borné (coordonnée normalisée). */
const pct = z.number().min(0).max(100);

/**
 * Une annotation du calque. `.passthrough()` pour tolérer des champs ajoutés par
 * de futurs outils sans casser le parsing des plans existants.
 */
export const PlanAnnotationSchema = z
    .object({
        id: z.string().min(1),
        type: z.enum(ANNOTATION_TYPES),
        x1: pct,
        y1: pct,
        x2: pct.optional(),
        y2: pct.optional(),
        text: z.string().optional(),
        color: z.string().optional(),
    })
    .passthrough();

export type PlanAnnotation = z.infer<typeof PlanAnnotationSchema>;

/**
 * Parse défensif d'un calque brut (API) : ignore silencieusement les
 * annotations malformées plutôt que de faire échouer tout le FSEC. Une
 * annotation corrompue ne doit jamais casser la page de détail.
 */
export function parsePlanAnnotations(raw: unknown): PlanAnnotation[] {
    if (!Array.isArray(raw)) return [];
    const out: PlanAnnotation[] = [];
    for (const item of raw) {
        const parsed = PlanAnnotationSchema.safeParse(item);
        if (parsed.success) out.push(parsed.data);
    }
    return out;
}
