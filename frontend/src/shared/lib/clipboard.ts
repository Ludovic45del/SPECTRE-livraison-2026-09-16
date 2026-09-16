/**
 * Copie de texte dans le presse-papiers, avec repli hors contexte sécurisé.
 * @module shared/lib
 *
 * `navigator.clipboard` n'existe qu'en contexte sécurisé (https ou localhost).
 * Sur le réseau fermé, l'application est servie en http : l'API moderne est
 * alors absente et la copie échouerait silencieusement. On retombe dans ce cas
 * sur un textarea hors écran + `document.execCommand('copy')` (déprécié mais
 * seul repli fiable en http) — encapsulé ici pour ne jamais fuiter ailleurs.
 */

/** Repli : textarea hors écran + execCommand('copy'). Retourne le succès. */
function copyViaTextarea(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // Hors écran et non éditable, sans perturber le scroll de la page.
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    try {
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        return document.execCommand('copy');
    } catch {
        return false;
    } finally {
        document.body.removeChild(textarea);
        // Restaure le focus pour ne pas casser la navigation clavier.
        previouslyFocused?.focus();
    }
}

/**
 * Copie `text` dans le presse-papiers.
 *
 * Essaie d'abord l'API moderne `navigator.clipboard.writeText`, puis retombe
 * sur le repli textarea + execCommand si l'API est absente (contexte non
 * sécurisé) ou si elle échoue (permissions refusées).
 *
 * Ne rejette jamais : retourne `true` si la copie a réussi, `false` sinon —
 * l'appelant est responsable de notifier l'utilisateur du résultat.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Refus (permissions, contexte) → tentative de repli ci-dessous.
        }
    }
    return copyViaTextarea(text);
}
