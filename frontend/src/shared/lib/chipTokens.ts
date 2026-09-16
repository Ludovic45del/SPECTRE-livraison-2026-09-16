/**
 * Chip tokens & helpers — source unique pour le formalisme des chips.
 * @module shared/lib/chipTokens
 *
 * Pourquoi ce module :
 *  - L'override `MuiChip` du thème (shared/ui/theme.ts) prend en charge le rendu
 *    par défaut des chips qui utilisent la palette MUI sémantique
 *    (`color="success|error|warning|info|primary|secondary|default"`).
 *  - Mais beaucoup de chips affichent des données métier dont la couleur est un
 *    hex hors palette (CAMPAIGN_INSTALLATIONS, ETAPES, FSEC_STATUSES, ...).
 *    `softChipSx(hex)` produit le même rendu "soft" (bg pâle + texte foncé) que
 *    le thème, à partir d'une couleur hex arbitraire.
 *
 * Formalisme cible (validé) :
 *  - Background  : alpha(hex, 0.12) en light, 0.20 en dark.
 *  - Couleur du texte : darken(hex, 0.25) en light, hex en dark.
 *  - Hauteur, fontSize, fontWeight, borderRadius : gérés par le thème.
 *
 * Si une couleur très claire (ex. jaune `#ecce18`) donne un texte boueux après
 * `darken`, l'ajuster dans `HEX_DARKEN_OVERRIDE` ci-dessous plutôt que d'écrire
 * un sx custom dans le composant appelant.
 */

import { alpha, darken, type Theme } from '@mui/material';
import type { SystemStyleObject } from '@mui/system';

const SOFT_BG_ALPHA_LIGHT = 0.16;
const SOFT_BG_ALPHA_DARK = 0.24;
const SOFT_TEXT_DARKEN = 0.55;

/**
 * Override ponctuel : si la couleur de référence est trop claire pour donner
 * un texte lisible après `darken(hex, 0.25)`, mapper ici une couleur de texte
 * définie à la main. Garder ce mapping aussi vide que possible.
 */
const HEX_DARKEN_OVERRIDE: Record<string, string> = {
    // ex: '#ecce18': '#7a6a00',
};

const resolveTextColor = (hex: string, isDark: boolean): string => {
    if (isDark) return hex;
    const override = HEX_DARKEN_OVERRIDE[hex.toLowerCase()];
    return override ?? darken(hex, SOFT_TEXT_DARKEN);
};

/**
 * Soft chip styling pour une couleur métier (hex hors palette MUI).
 *
 * Le type de retour est volontairement `(theme) => SystemStyleObject` (et non
 * `SxProps`) pour permettre la composition dans un tableau `sx={[softChipSx(c),
 * { height: 18 }]}`.
 *
 * @example
 *   <Chip label="LMJ" sx={softChipSx('#7ac7f5')} />
 *   <Chip label="X" sx={[softChipSx(hex), { height: 18, fontSize: '0.6rem' }]} />
 */
export const softChipSx =
    (hex: string) =>
    (theme: Theme): SystemStyleObject<Theme> => {
        const isDark = theme.palette.mode === 'dark';
        return {
            bgcolor: alpha(hex, isDark ? SOFT_BG_ALPHA_DARK : SOFT_BG_ALPHA_LIGHT),
            color: resolveTextColor(hex, isDark),
            '& .MuiChip-deleteIcon': {
                color: 'inherit',
                opacity: 0.6,
                '&:hover': { opacity: 1, color: 'inherit' },
            },
        };
    };
