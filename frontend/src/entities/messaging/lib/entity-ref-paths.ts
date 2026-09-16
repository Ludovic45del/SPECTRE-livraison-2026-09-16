/**
 * Entity Ref Paths — chemin de la fiche visée par une référence de message.
 * @module entities/messaging/lib
 *
 * Les fiches sont adressées par slug (cf. `@shared/config/paths`) ; le slug
 * est recalculé par le backend à chaque lecture et vaut null quand l'entité
 * n'existe plus (`exists = false`) : la chip est alors non cliquable.
 */

import { paths } from '@shared/config';
import type { EntityRef, EntityRefType } from '../model';

/** Constructeur de chemin racine par type d'entité référençable. */
const ROOT_PATH_BY_TYPE: Record<EntityRefType, (slug: string) => string> = {
    fsec: paths.fsec.root,
    campaign: paths.campaign.root,
    fa: paths.fa.root,
};

/** Chemin de la fiche référencée, ou null si l'entité a été supprimée / n'a pas de slug. */
export function getEntityRefPath(ref: EntityRef): string | null {
    if (!ref.exists || !ref.slug) return null;
    return ROOT_PATH_BY_TYPE[ref.entityType](ref.slug);
}
