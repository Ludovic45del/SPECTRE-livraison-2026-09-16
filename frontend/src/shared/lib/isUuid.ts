/**
 * Détection d'UUID v4 canonique.
 * @module shared/lib/isUuid
 *
 * Sert à la rétro-compatibilité des URLs : une page de détail peut recevoir soit
 * un slug, soit (anciens liens/bookmarks) un UUID. Les hooks `use*BySlug`
 * basculent sur l'endpoint UUID quand le paramètre est un UUID.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string): boolean => UUID_RE.test(value);
