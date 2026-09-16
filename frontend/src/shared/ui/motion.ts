/**
 * Motion design tokens — source unique pour toutes les animations.
 * @module shared/ui/motion
 *
 * Pourquoi ce module :
 *  - Avant : 4 fichiers définissaient leur propre `TRANSITION` avec des
 *    valeurs incohérentes (0.2s vs 0.3s, easings différents).
 *  - Maintenant : un seul jeu de durées + easings inspirés Material 3
 *    "emphasized" et de la sensibilité Apple. Cohérence visuelle garantie.
 *
 * Comment l'utiliser :
 *
 *   import { motion } from '@shared/ui/motion';
 *
 *   sx={{
 *     transition: motion.transition('background-color', 'fast'),
 *   }}
 *
 * ou pour les cas simples (port à l'identique des anciens `${TRANSITION}`) :
 *
 *   sx={{ transition: `all ${motion.fast}` }}  // = "0.15s cubic-bezier(...)"
 *
 * Performance :
 *  - Toujours préférer `transform`/`opacity` (GPU only) à `width`, `height`,
 *    `top`, `left`. Le helper `motion.transition()` n'enforce pas ça mais
 *    invite à lister explicitement les props plutôt que d'utiliser `all`.
 */

// ============================================================================
// Durées (ms)
// ============================================================================
//
// Calées sur Apple HIG / Material 3 :
//   - instant : feedback immédiat (toggle, ripple amorti)
//   - fast    : micro-interactions (hover row, focus, color)
//   - base    : la plupart des transitions UI (boutons, chips, accordions)
//   - medium  : conteneurs (cards, paper hover avec lift)
//   - slow    : modales/drawers (apparition de surfaces)
//   - dramatic: page transitions, splash, hero
//

export const motionDuration = {
    instant: 100,
    fast: 150,
    base: 200,
    medium: 300,
    slow: 400,
    dramatic: 500,
} as const;

export type MotionDurationKey = keyof typeof motionDuration;

// ============================================================================
// Easings
// ============================================================================
//
// `standard` est la courbe Material 3 "emphasized" : entrée rapide puis
// décélération douce — perçue comme plus "haut de gamme" que la M2 standard
// (`cubic-bezier(0.4, 0, 0.2, 1)`) qui est plus mécanique.
//
// `decelerate` / `accelerate` : pour les éléments qui entrent / sortent
// (Material Motion 101).
//
// `spring` : overshoot doux pour les indicateurs (sliding tab, sidebar pill).
//
// `apple` : courbe utilisée historiquement par Apple pour les hero —
// préservée pour cohérence avec l'existant.
//

export const motionEasing = {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    apple: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export type MotionEasingKey = keyof typeof motionEasing;

// ============================================================================
// Strings prêtes à l'emploi (durée + easing)
// ============================================================================
//
// Pour les usages les plus courants — évite de retaper `${duration} ${easing}`
// à chaque fois.
//

const compose = (durationMs: number, easing: string) => `${durationMs}ms ${easing}`;

export const motion = {
    // raw values (si on a besoin du nombre pur)
    duration: motionDuration,
    easing: motionEasing,

    // strings pré-composées : durée + easing standard (M3 emphasized)
    instant: compose(motionDuration.instant, motionEasing.standard),
    fast: compose(motionDuration.fast, motionEasing.standard),
    base: compose(motionDuration.base, motionEasing.standard),
    medium: compose(motionDuration.medium, motionEasing.standard),
    slow: compose(motionDuration.slow, motionEasing.standard),
    dramatic: compose(motionDuration.dramatic, motionEasing.standard),

    // variantes spring (overshoot doux) pour les indicateurs animés.
    // 500ms = durée historique des indicateurs (sidebar pill, tab underline) :
    // on la préserve pour ne pas changer le ressenti existant.
    spring: compose(motionDuration.dramatic, motionEasing.spring),
    springFast: compose(motionDuration.medium, motionEasing.spring),

    /**
     * Génère une chaîne `transition` propre en listant chaque propriété
     * explicitement (vs `all` qui fait observer toutes les props par le
     * compositor — coûteux sur les éléments à fort taux de repaint).
     *
     * @example
     *   motion.transition(['background-color', 'color'], 'fast')
     *   // => "background-color 150ms cubic-bezier(0.2, 0, 0, 1), color 150ms cubic-bezier(0.2, 0, 0, 1)"
     */
    transition(
        properties: string | readonly string[],
        duration: MotionDurationKey = 'base',
        easing: MotionEasingKey = 'standard',
    ): string {
        const props = typeof properties === 'string' ? [properties] : properties;
        const ms = motionDuration[duration];
        const ease = motionEasing[easing];
        return props.map((p) => `${p} ${ms}ms ${ease}`).join(', ');
    },
} as const;

// ============================================================================
// Reduced motion
// ============================================================================
//
// À spreader dans tout `sx` qui anime quelque chose pour respecter la
// préférence système. Évite la duplication du media query partout.
//
// Usage :
//   sx={{
//     transition: motion.base,
//     ...prefersReducedMotion,
//   }}
//

export const prefersReducedMotion = {
    '@media (prefers-reduced-motion: reduce)': {
        transition: 'none !important',
        animation: 'none !important',
    },
} as const;
