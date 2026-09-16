/**
 * Helper de chemins d'URL typé — source unique des routes de détail.
 * @module shared/config/paths
 *
 * Les pages de détail sont adressées par le `slug` lisible de l'entité (calculé
 * et exposé par le backend), plus par l'UUID. Centraliser la construction des
 * URLs ici évite les chaînes magiques éparpillées et fiabilise tout changement
 * de schéma d'URL. Les slugs sont passés par `encodeURIComponent` (double
 * sécurité ; le backend émet déjà de l'ASCII minuscule-tirets).
 */

const enc = (slug: string): string => encodeURIComponent(slug);

export type CampaignTab = 'overview' | 'documents' | 'fsec' | 'fa';
export type FsecTab = 'overview' | 'assemblage' | 'controle' | 'photos' | 'gaz' | 'resultats';
export type FaTab = 'phase1' | 'phase23';
export type EmbaseTab = 'voie-v1' | 'mecanique' | 'voie-v2' | 'etalonnage' | 'historique-fsec';

export const paths = {
    campaigns: '/campagnes',
    campaign: {
        root: (slug: string) => `/campagne-details/${enc(slug)}`,
        tab: (slug: string, tab: CampaignTab = 'overview') => `/campagne-details/${enc(slug)}/${tab}`,
    },
    fsecs: '/fsecs',
    fsec: {
        root: (slug: string) => `/fsec-details/${enc(slug)}`,
        tab: (slug: string, tab: FsecTab = 'overview') => `/fsec-details/${enc(slug)}/${tab}`,
    },
    fas: '/fas',
    fa: {
        root: (slug: string) => `/fa-details/${enc(slug)}`,
        tab: (slug: string, tab: FaTab) => `/fa-details/${enc(slug)}/${tab}`,
    },
    messagerie: {
        root: '/messagerie',
        conversation: (uuid: string) => `/messagerie/${enc(uuid)}`,
    },
    embases: '/embases',
    embase: {
        root: (slug: string) => `/embase-details/${enc(slug)}`,
        tab: (slug: string, tab: EmbaseTab = 'voie-v1') => `/embase-details/${enc(slug)}/${tab}`,
    },
} as const;
