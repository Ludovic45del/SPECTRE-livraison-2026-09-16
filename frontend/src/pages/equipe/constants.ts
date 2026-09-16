/**
 * Équipe — couleur d'accent par rôle métier.
 * @module pages/equipe
 *
 * Une couleur d'accent par rôle SPECTRE. Source unique pour le bandeau coloré et
 * l'anneau d'avatar des cartes (PersonCard), les en-têtes de groupe et les puces
 * de filtre (EquipePage). Déclinées en "soft" via `softChipSx` côté composants,
 * elles restent lisibles dans les 3 thèmes (clair / sombre / crème). Calées sur
 * les teintes système Apple du design system (cf. shared/ui/theme.ts).
 *
 * Les ICÔNES, elles, réutilisent volontairement le vocabulaire de l'accueil
 * (Badge / Business / MeetingRoom) pour rester cohérentes avec le reste de l'app.
 */

import type { SpectreRole } from '@entities/user';

/**
 * Mapping exhaustif rôle → couleur. Exhaustivité garantie par le type
 * `Record<SpectreRole, …>` : ajouter un rôle dans SPECTRE_ROLES sans l'ajouter
 * ici provoque une erreur de compilation.
 */
export const ROLE_COLORS: Record<SpectreRole, string> = {
    chef_labo: '#5856D6',
    iec: '#007AFF',
    rce: '#0AA1B5',
    assembleur: '#FF9500',
    metrologue: '#34C759',
    cryogenie: '#5AC8FA',
    stagiaire: '#8E8E93',
    alternant: '#AF52DE',
};

/**
 * Style "visuellement masqué" : le contenu reste dans l'arbre d'accessibilité
 * (lecteurs d'écran) mais n'est pas affiché. Utilisé pour le `h1` de chaque
 * sous-page (le libellé est déjà porté par la sidebar).
 */
export const VISUALLY_HIDDEN = {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
    border: 0,
} as const;
