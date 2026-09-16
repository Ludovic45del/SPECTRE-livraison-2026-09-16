/**
 * Helpers de chemins réseau (partages UNC / file://).
 * @module shared/lib
 *
 * Mutualise la logique d'ouverture de dossiers réseau, utilisée à la fois par
 * les raccourcis du dashboard et par le lien « dossier photo » des FSEC.
 */

/**
 * Vrai si l'URL pointe vers un partage réseau / fichier local :
 * file:, smb:, UNC (\\serveur\...) ou lecteur mappé (P:\..., d:/...).
 * La lettre de lecteur exige un séparateur après le deux-points, ce qui évite
 * tout faux positif sur un schéma d'URL (mailto:, tel:, …).
 */
export const isNetworkPath = (url: string): boolean => /^(file:|smb:|\\\\|[a-z]:[\\/])/i.test(url);

/**
 * Convertit une saisie utilisateur en href ouvrable dans un nouvel onglet :
 * - http(s) / file: / smb: : laissé tel quel
 * - chemin UNC (\\serveur\dossier) : converti en `file:` avec des slashes
 * - lecteur mappé (P:\dossier) : converti en `file:///P:/dossier`
 * - sinon : préfixé en `https://`
 */
export const normalizeHref = (url: string): string => {
    if (/^(https?:|file:|smb:)/i.test(url)) return url;
    if (url.startsWith('\\\\')) return `file:${url.replace(/\\/g, '/')}`;
    if (/^[a-z]:[\\/]/i.test(url)) return `file:///${url.replace(/\\/g, '/')}`;
    return `https://${url}`;
};
