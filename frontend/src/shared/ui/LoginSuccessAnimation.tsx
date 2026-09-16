/**
 * LoginSuccessAnimation — séquence d'accueil post-login « Lockup de marque ».
 * @module shared/ui/LoginSuccessAnimation
 *
 * Direction artistique : sobriété institutionnelle. Aucun effet spectaculaire
 * (pas d'arc-en-ciel, pas de flash, pas de viseur) : une scène calme, un
 * lockup de marque (logo CEA · filet · wordmark SPECTRE) qui se révèle avec
 * une profondeur douce, une salutation personnalisée et une fine ligne de
 * progression qui donne un sens à l'attente. La mise en scène repose sur
 * l'espace, la typographie et un seul accent de couleur : le rouge de marque.
 *
 * Chorégraphie (≈ 2,6 s visibles, puis fondu de sortie) :
 *   1. Le fond (couleur du thème) s'installe, un halo rouge très diffus
 *      apparaît lentement derrière le lockup — jamais saturé.
 *   2. Le logo CEA se révèle par un léger défloutage + zoom depuis 0,96.
 *   3. Un filet vertical se déploie depuis son centre.
 *   4. Le wordmark s'écrit lettre par lettre, en rouge uni, chaque glyphe
 *      montant de quelques pixels tout en se défloutant (cadence serrée).
 *   5. « Bonjour, {prénom} » puis une ligne d'état discrète.
 *   6. Une ligne de progression de 1,5 px se remplit jusqu'à la fin de la
 *      séquence, puis l'ensemble s'efface avec un zoom de sortie minime.
 *
 * Technique : 100 % CSS/Emotion, propriétés GPU uniquement (transform,
 * opacity, filter). Aucune animation de layout, aucun canvas.
 *
 * Enchaînement avec l'écran précédent : `backdropDurationMs` règle la vitesse du
 * fondu du fond et `enterDelayMs` décale la chorégraphie, ce qui permet à la
 * page de login de faire glisser sa carte PENDANT que cet écran se fond
 * par-dessus (fondu enchaîné continu, sans temps mort).
 *
 * Mécanique de fin : onAnimationEnd filtré sur `fadeOut.name` + verrou
 * `completedRef` + filet de sécurité `setTimeout` → `onComplete()` est garanti
 * one-shot.
 *
 * Respecte `prefers-reduced-motion` : toute la chorégraphie est sautée et
 * l'état final est affiché directement, fondu de sortie conservé.
 */

import { useEffect, useRef, type CSSProperties } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { keyframes } from '@emotion/react';
import CEALogo from '@shared/assets/images/CEALogo.png';

// ============================================================================
// Identité
// ============================================================================

const WORDMARK = 'SPECTRE';

// ============================================================================
// Keyframes (Emotion → noms uniques, aucune collision globale)
// ============================================================================

const backdropIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const fadeOut = keyframes`
    from { opacity: 1; }
    to   { opacity: 0; }
`;

// Zoom de sortie minime : la scène « avance » vers l'application.
const exitZoom = keyframes`
    from { transform: scale(1); }
    to   { transform: scale(1.015); }
`;

// Halo diffus derrière le lockup : apparaît lentement, sans jamais saturer.
const haloIn = keyframes`
    from { opacity: 0; transform: scale(0.85); }
    to   { opacity: 1; transform: scale(1); }
`;

// Révélation « profondeur » : défloutage + micro-zoom depuis 0,96.
const revealDepth = keyframes`
    from { opacity: 0; transform: scale(0.96); filter: blur(10px); }
    to   { opacity: 1; transform: scale(1); filter: blur(0); }
`;

// Filet vertical déployé depuis son centre (scaleY, pas de height).
const ruleGrow = keyframes`
    from { opacity: 0; transform: scaleY(0); }
    to   { opacity: 1; transform: scaleY(1); }
`;

// Écriture d'un glyphe : montée de 8 px + défloutage, en rouge uni.
const letterIn = keyframes`
    from { opacity: 0; transform: translateY(8px); filter: blur(4px); }
    to   { opacity: 1; transform: translateY(0); filter: blur(0); }
`;

// Entrée par le bas des lignes de texte.
const riseIn = keyframes`
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
`;

// Ligne de progression : remplissage de gauche à droite (scaleX).
const progressFill = keyframes`
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
`;

// Nom du fade-out de sortie : sert à filtrer l'event onAnimationEnd.
const FADE_OUT_NAME = fadeOut.name;

// ============================================================================
// Props (contrat inchangé)
// ============================================================================

export interface LoginSuccessAnimationProps {
    /** Personnalise la ligne d'accueil : "Bonjour, {firstName}". */
    firstName?: string;
    /** Texte d'accueil de repli si `firstName` absent. Défaut: "Bienvenue". */
    greeting?: string;
    /** Couleur de marque (wordmark, filet, halo, ligne de progression). */
    accentColor?: string;
    /**
     * Durée visible avant le fade-out (ms), mesurée à partir du début de la
     * chorégraphie (donc après `enterDelayMs`). Défaut 2600.
     * Le fade-out (~480ms) s'ajoute par-dessus → durée totale ≈ +480ms.
     * Le filet de sécurité onComplete se déclenche à enterDelayMs + totalDurationMs + 680ms.
     */
    totalDurationMs?: number;
    /**
     * Durée du fondu d'entrée du fond (ms). Défaut 260. La page de login le cale
     * sur la sortie de sa carte pour obtenir un fondu enchaîné continu.
     */
    backdropDurationMs?: number;
    /**
     * Décalage (ms) appliqué à toute la chorégraphie (halo, lockup, textes,
     * progression, fondu de sortie), mais PAS au fondu d'entrée du fond.
     * Permet de commencer à révéler l'écran pendant que l'écran précédent
     * s'efface encore. Défaut 0.
     */
    enterDelayMs?: number;
    /** Appelé une fois le fade-out terminé. */
    onComplete: () => void;
}

// ============================================================================
// Séquencement (ms)
// ============================================================================

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'; // = motionEasing.apple
const EASE_PROGRESS = 'cubic-bezier(0.4, 0, 0.2, 1)'; // régulier, sans à-coup

const D_EXIT = 480;
const D_BACKDROP_DEFAULT = 260;

const DELAY_HALO = 120;
const D_HALO = 1400;

const DELAY_LOGO = 160;
const D_LOGO = 760;

const DELAY_RULE = 380;
const D_RULE = 560;

const DELAY_LETTERS = 460;
const D_LETTER = 620;
const LETTER_STAGGER = 45;

const DELAY_NAME = 1120;
const DELAY_STATUS = 1300;
const D_RISE = 560;

const DELAY_PROGRESS = 1300;
const D_PROGRESS_MIN = 600;

// ============================================================================
// Composant principal
// ============================================================================

export function LoginSuccessAnimation({
    firstName,
    greeting = 'Bienvenue',
    accentColor = '#E31837',
    totalDurationMs = 2600,
    backdropDurationMs = D_BACKDROP_DEFAULT,
    enterDelayMs = 0,
    onComplete,
}: LoginSuccessAnimationProps) {
    const completedRef = useRef(false);

    // Toute la chorégraphie est décalée de `enterDelayMs` (sauf le fond).
    const t = (delayMs: number) => delayMs + enterDelayMs;
    const exitDelayMs = enterDelayMs + totalDurationMs;

    // Filet de sécurité : si l'event animationend ne fire pas (onglet en arrière-
    // plan, reduced-motion, etc.), on déclenche onComplete par setTimeout.
    useEffect(() => {
        const safetyDelay = enterDelayMs + totalDurationMs + D_EXIT + 200;
        const id = window.setTimeout(() => {
            if (!completedRef.current) {
                completedRef.current = true;
                onComplete();
            }
        }, safetyDelay);
        return () => window.clearTimeout(id);
    }, [enterDelayMs, totalDurationMs, onComplete]);

    const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
        if (e.animationName !== FADE_OUT_NAME) return;
        if (completedRef.current) return;
        completedRef.current = true;
        onComplete();
    };

    const welcomeLine = firstName ? `Bonjour, ${firstName}` : greeting;

    // La ligne de progression se remplit exactement jusqu'au début du fondu.
    const progressDuration = Math.max(D_PROGRESS_MIN, totalDurationMs - DELAY_PROGRESS);

    // Fond et encres dérivés du thème courant (clair / sombre / crème).
    const theme = useTheme();
    const bg = theme.palette.background.default;
    const ink = theme.palette.text.primary;
    const inkSoft = theme.palette.text.secondary;
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box
            role="status"
            aria-live="polite"
            aria-label={`Connexion réussie. ${welcomeLine}.`}
            onAnimationEnd={handleAnimationEnd}
            style={
                {
                    '--lsa-accent': accentColor,
                    '--lsa-d-exit': `${D_EXIT}ms`,
                    '--lsa-delay-exit': `${exitDelayMs}ms`,
                } as CSSProperties
            }
            sx={{
                position: 'fixed',
                inset: 0,
                zIndex: (theme) => theme.zIndex.modal + 10,
                display: 'grid',
                gridTemplateColumns: '1fr',
                gridTemplateRows: '1fr',
                placeItems: 'center',
                isolation: 'isolate',
                overflow: 'hidden',
                background: bg,
                animation: `
                    ${backdropIn} ${backdropDurationMs}ms ${EASE} both,
                    ${fadeOut} var(--lsa-d-exit) ${EASE} var(--lsa-delay-exit) both
                `,
                // Reduced motion : on coupe la chorégraphie, on garde un fondu doux.
                '@media (prefers-reduced-motion: reduce)': {
                    animation: `
                        ${backdropIn} 1ms linear both,
                        ${fadeOut} 200ms linear var(--lsa-delay-exit) both
                    `,
                    '& *': {
                        animationDuration: '1ms !important',
                        animationDelay: '0ms !important',
                        animationIterationCount: '1 !important',
                    },
                },
            }}
        >
            {/* Halo diffus derrière le lockup — un seul accent, très dilué. */}
            <Box
                aria-hidden="true"
                sx={{
                    gridArea: '1 / 1',
                    width: { xs: 520, sm: 760 },
                    height: { xs: 520, sm: 760 },
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    background: `radial-gradient(circle at center, ${alpha(accentColor, isDark ? 0.16 : 0.1)} 0%, ${alpha(
                        accentColor,
                        0,
                    )} 62%)`,
                    opacity: 0,
                    animation: `${haloIn} ${D_HALO}ms ${EASE} ${t(DELAY_HALO)}ms both`,
                    willChange: 'transform, opacity',
                }}
            />

            {/* Colonne centrale (zoom de sortie minime). */}
            <Box
                sx={{
                    gridArea: '1 / 1',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    px: 4,
                    animation: `${exitZoom} ${D_EXIT}ms ${EASE} var(--lsa-delay-exit) both`,
                    willChange: 'transform',
                }}
            >
                {/* Lockup de marque : logo · filet · wordmark. */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: 'center',
                        gap: { xs: 2.5, sm: 3.5 },
                    }}
                >
                    <Box
                        component="img"
                        src={CEALogo}
                        alt="CEA"
                        sx={{
                            width: { xs: 64, sm: 76 },
                            height: 'auto',
                            borderRadius: 2,
                            boxShadow: isDark
                                ? `0 12px 40px ${alpha(accentColor, 0.28)}`
                                : `0 12px 32px ${alpha(accentColor, 0.22)}`,
                            opacity: 0,
                            animation: `${revealDepth} ${D_LOGO}ms ${EASE} ${t(DELAY_LOGO)}ms both`,
                            willChange: 'transform, opacity, filter',
                        }}
                    />

                    {/* Filet séparateur (vertical sur sm+, horizontal sur xs). */}
                    <Box
                        aria-hidden="true"
                        sx={{
                            width: { xs: 40, sm: '1px' },
                            height: { xs: '1px', sm: 56 },
                            background: alpha(ink, isDark ? 0.28 : 0.18),
                            transformOrigin: 'center',
                            opacity: 0,
                            animation: `${ruleGrow} ${D_RULE}ms ${EASE} ${t(DELAY_RULE)}ms both`,
                            willChange: 'transform, opacity',
                        }}
                    />

                    <Box aria-label={WORDMARK} role="img" sx={{ display: 'flex' }}>
                        {WORDMARK.split('').map((ch, i) => (
                            <Box
                                key={`${ch}-${i}`}
                                component="span"
                                aria-hidden="true"
                                style={{ '--lsa-delay': `${t(DELAY_LETTERS + i * LETTER_STAGGER)}ms` } as CSSProperties}
                                sx={{
                                    display: 'inline-block',
                                    fontSize: { xs: '2.1rem', sm: '2.75rem' },
                                    fontWeight: 700,
                                    lineHeight: 1,
                                    letterSpacing: '0.18em',
                                    // compense le letter-spacing du dernier glyphe
                                    '&:last-of-type': { marginRight: '-0.18em' },
                                    color: 'var(--lsa-accent)',
                                    opacity: 0,
                                    animation: `${letterIn} ${D_LETTER}ms ${EASE} var(--lsa-delay) both`,
                                    willChange: 'transform, opacity, filter',
                                }}
                            >
                                {ch}
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Salutation personnalisée. */}
                <Typography
                    component="div"
                    sx={{
                        mt: { xs: 4, sm: 5 },
                        fontSize: { xs: '1.05rem', sm: '1.2rem' },
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                        color: ink,
                        opacity: 0,
                        animation: `${riseIn} ${D_RISE}ms ${EASE} ${t(DELAY_NAME)}ms both`,
                        willChange: 'transform, opacity',
                    }}
                >
                    {welcomeLine}
                </Typography>

                {/* Ligne d'état discrète. */}
                <Typography
                    component="div"
                    sx={{
                        mt: 0.75,
                        fontSize: '0.82rem',
                        fontWeight: 400,
                        letterSpacing: '0.02em',
                        color: inkSoft,
                        opacity: 0,
                        animation: `${riseIn} ${D_RISE}ms ${EASE} ${t(DELAY_STATUS)}ms both`,
                        willChange: 'transform, opacity',
                    }}
                >
                    Ouverture de votre espace de travail
                </Typography>

                {/* Ligne de progression : piste + remplissage. */}
                <Box
                    aria-hidden="true"
                    sx={{
                        mt: 3,
                        width: 168,
                        height: 2,
                        borderRadius: 1,
                        overflow: 'hidden',
                        background: alpha(ink, isDark ? 0.14 : 0.08),
                        opacity: 0,
                        animation: `${riseIn} ${D_RISE}ms ${EASE} ${t(DELAY_STATUS)}ms both`,
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 1,
                            background: 'var(--lsa-accent)',
                            transformOrigin: 'left center',
                            transform: 'scaleX(0)',
                            animation: `${progressFill} ${progressDuration}ms ${EASE_PROGRESS} ${t(DELAY_PROGRESS)}ms both`,
                            willChange: 'transform',
                        }}
                    />
                </Box>
            </Box>
        </Box>
    );
}
