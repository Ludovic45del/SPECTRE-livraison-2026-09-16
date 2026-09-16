/**
 * TextCircleIcon — pastille ronde à libellé court (« C », « Fsec », « FA »).
 * @module shared/ui
 *
 * Reprend l'iconographie des rubriques de la barre latérale (cercle bordé,
 * libellé en gras) pour identifier un type d'entité ailleurs dans l'application
 * (sélecteur de références de la messagerie, en-têtes de groupes…). Sans état
 * actif ni animation : la version animée reste propre à la barre latérale.
 */

import { memo } from 'react';
import { Box, Typography, type SxProps, type Theme } from '@mui/material';

export interface TextCircleIconProps {
    /** Libellé court affiché au centre (« C », « Fsec », « FA »). */
    readonly label: string;
    /** Diamètre en pixels (28 dans la barre latérale). */
    readonly size?: number;
    /** Taille de police du libellé (réduite pour les libellés longs). */
    readonly fontSize?: string;
    readonly letterSpacing?: string;
    /** Couleur du cercle et du texte (token du thème ou couleur CSS). */
    readonly color?: string;
    /**
     * Pastille purement décorative : masquée aux lecteurs d'écran. À utiliser
     * quand le type est déjà porté par le texte ou le nom accessible du parent
     * (chip de référence, par exemple).
     */
    readonly decorative?: boolean;
    /** Classe injectée par le parent (MUI clone l'icône d'une `Chip` pour l'espacer). */
    readonly className?: string;
    readonly sx?: SxProps<Theme>;
}

/** Réglages typographiques par libellé, identiques à ceux de la barre latérale. */
const TEXT_CIRCLE_PRESETS: Record<string, { fontSize: string; letterSpacing?: string }> = {
    C: { fontSize: '0.9rem' },
    Fsec: { fontSize: '0.55rem', letterSpacing: '-0.3px' },
    FA: { fontSize: '0.7rem' },
};

export const TextCircleIcon = memo(function TextCircleIcon({
    label,
    size = 28,
    fontSize,
    letterSpacing,
    color = 'primary.main',
    decorative = false,
    className,
    sx,
}: TextCircleIconProps) {
    const preset = TEXT_CIRCLE_PRESETS[label];
    // Le ratio police / diamètre suit celui de la barre latérale (diamètre 28).
    const scale = size / 28;
    const resolvedFontSize = fontSize ?? preset?.fontSize ?? '0.9rem';
    return (
        <Box
            className={className}
            role={decorative ? undefined : 'img'}
            aria-label={decorative ? undefined : label}
            aria-hidden={decorative || undefined}
            sx={[
                {
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ]}
        >
            <Typography
                component="span"
                sx={{
                    color,
                    fontSize: `calc(${resolvedFontSize} * ${scale})`,
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: letterSpacing ?? preset?.letterSpacing,
                }}
            >
                {label}
            </Typography>
        </Box>
    );
});
