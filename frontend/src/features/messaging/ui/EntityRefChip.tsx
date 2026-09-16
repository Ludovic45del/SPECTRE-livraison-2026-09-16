/**
 * EntityRefChip — chip d'une référence d'entité (FSEC / campagne / FA).
 * @module features/messaging/ui
 *
 * Pastille de type (« C » / « Fsec » / « FA », même vocabulaire que la barre
 * latérale et le sélecteur) puis nom de l'entité. Le type n'est pas répété en
 * texte : il reste dans le nom accessible (`aria-label` « FSEC · FSEC-12 »).
 * Lien vers la fiche (`getEntityRefPath`) quand l'entité existe et a un slug ;
 * sinon chip inerte, et si l'entité a été supprimée (`exists = false`) : grisée,
 * suffixe « (supprimée) », `title` explicatif. `onDelete` (composer) ajoute la croix.
 *
 * La prop s'appelle `entityRef` (et non `ref`) : `ref` est réservé par React.
 */

import { memo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Chip } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';

import { getEntityRefPath, type EntityRef } from '@entities/messaging';
import { softChipSx } from '@shared/lib';
import { TextCircleIcon } from '@shared/ui';
import {
    DELETED_REF_TITLE,
    ENTITY_REF_TYPE_COLORS,
    ENTITY_REF_TYPE_ICON_LABELS,
    formatEntityRefChipText,
    formatEntityRefLabel,
} from '../lib/entity-refs';

/** Diamètre de la pastille selon la taille de chip (hauteur 24 / 32 px). */
const ICON_SIZE: Record<'small' | 'medium', number> = { small: 18, medium: 22 };

export interface EntityRefChipProps {
    readonly entityRef: EntityRef;
    readonly size?: 'small' | 'medium';
    /** Composer : retire la référence du message en préparation. */
    readonly onDelete?: () => void;
}

export const EntityRefChip = memo(function EntityRefChip({ entityRef, size = 'medium', onDelete }: EntityRefChipProps) {
    const color = ENTITY_REF_TYPE_COLORS[entityRef.entityType];
    const path = getEntityRefPath(entityRef);
    const deleted = !entityRef.exists;

    const common = {
        // Texte visible : nom de l'entité seul ; le type est porté par la pastille.
        label: formatEntityRefChipText(entityRef),
        // Nom accessible complet (« FSEC · FSEC-12 ») : la pastille est décorative.
        'aria-label': formatEntityRefLabel(entityRef),
        size,
        icon: (
            <TextCircleIcon
                label={ENTITY_REF_TYPE_ICON_LABELS[entityRef.entityType]}
                size={ICON_SIZE[size]}
                color={color}
                decorative
            />
        ),
        onDelete,
        // L'icône de suppression EST le contrôle cliquable de la Chip : on la rend
        // accessible (nom + rôle), MUI la masquant aux lecteurs d'écran par défaut.
        deleteIcon: (
            <CancelIcon role="button" aria-hidden={false} aria-label={`Retirer la référence ${entityRef.label}`} />
        ),
        title: deleted ? DELETED_REF_TITLE : undefined,
        disabled: deleted,
        sx: [softChipSx(color), { maxWidth: '100%', fontWeight: 600 }],
    };

    if (path) {
        return <Chip {...common} component={RouterLink} to={path} role="link" clickable />;
    }
    return <Chip {...common} />;
});
