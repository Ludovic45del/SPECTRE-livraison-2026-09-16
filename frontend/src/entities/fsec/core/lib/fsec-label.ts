/**
 * Libellés d'affichage des FSEC et préfixe campagne.
 * @module entities/fsec/lib
 *
 * Le nom complet d'une FSEC (« {year}-{installation}_{campagne}_{name} », ex.
 * `2026-LMJ_gorfou_2`) est calculé par le backend et exposé dans
 * `fsec.displayName` : le frontend ne le recompose jamais. Ce module conserve
 * uniquement le préfixe campagne (utilisé pour libeller les campagnes) et un
 * accesseur `formatFsecOptionLabel` pour les sélecteurs.
 *
 * Le libellé sert UNIQUEMENT à l'affichage : les formulaires persistent
 * `fsec.name` (stock : `fsec_name` en texte) ou `versionUuid` (FA), jamais le
 * libellé complet, afin de rester rétro-compatibles avec les données existantes.
 */

import type { Fsec } from '../model/fsec.schema';

/**
 * Sous-ensemble structurel d'une campagne nécessaire au libellé. Typé de façon
 * structurelle (et non via `CampaignWithRelations`) pour éviter un couplage
 * entre entités : toute campagne hydratée est compatible.
 */
export interface FsecCampaignContext {
    uuid: string;
    year: number;
    name: string;
    installation?: { label: string } | null;
}

/** Libellé installation de repli quand la campagne n'en a pas (aligné backend). */
const UNKNOWN_INSTALLATION_LABEL = 'UNK';

/**
 * Préfixe campagne « {year}-{installation}_{name} » (nom complet d'une campagne).
 */
export function formatFsecCampaignPrefix(campaign: FsecCampaignContext): string {
    const installationLabel = campaign.installation?.label ?? UNKNOWN_INSTALLATION_LABEL;
    return `${campaign.year}-${installationLabel}_${campaign.name}`;
}

/**
 * Libellé d'une option FSEC dans un sélecteur : le nom complet calculé par le
 * backend (`displayName`), avec repli sur le nom court.
 */
export function formatFsecOptionLabel(fsec: Pick<Fsec, 'name' | 'displayName'>): string {
    return fsec.displayName || fsec.name;
}
