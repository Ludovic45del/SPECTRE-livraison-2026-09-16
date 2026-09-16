/**
 * MUI Theme - Apple-like Design System
 * @module shared/ui
 *
 * Based on Technical_Architecture_Reference.md:
 * - Font: Inter / System
 * - Spacing: 8px grid
 * - Glassmorphism support
 * - Soft shadows
 * - Light / Dark mode
 */

import { createTheme, alpha } from '@mui/material/styles';
import { motion, motionDuration, motionEasing } from './motion';

// ============================================================================
// Shared palette (mode-independent)
// ============================================================================

const sharedColors = {
    primary: {
        main: '#007AFF',
        light: '#5AC8FA',
        dark: '#0051D4',
        contrastText: '#FFFFFF',
    },
    secondary: {
        main: '#5856D6',
        light: '#AF52DE',
        dark: '#3634A3',
        contrastText: '#FFFFFF',
    },
    success: {
        main: '#34C759',
        light: '#30D158',
        dark: '#248A3D',
    },
    warning: {
        main: '#FF9500',
        light: '#FFCC00',
        dark: '#C93400',
    },
    error: {
        main: '#FF3B30',
        light: '#FF6961',
        dark: '#D70015',
    },
};

// ============================================================================
// Mode-specific palettes
// ============================================================================

const lightGrey = {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
};

const darkGrey = {
    50: '#1A1D27',
    100: '#1F2334',
    200: '#282D3E',
    300: '#353B4F',
    400: '#4B5468',
    500: '#6B7280',
    600: '#9CA3AF',
    700: '#D1D5DB',
    800: '#E5E7EB',
    900: '#F3F4F6',
};

const lightPalette = {
    ...sharedColors,
    grey: lightGrey,
    background: {
        default: '#F9FAFB',
        paper: '#FFFFFF',
    },
    text: {
        primary: '#111827',
        secondary: '#6B7280',
        disabled: '#9CA3AF',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
    action: {
        hover: 'rgba(0, 0, 0, 0.04)',
        selected: 'rgba(0, 0, 0, 0.08)',
    },
};

const darkPalette = {
    ...sharedColors,
    grey: darkGrey,
    background: {
        default: '#0F1117',
        paper: '#1A1D27',
    },
    text: {
        primary: '#E8EAED',
        secondary: '#9AA0A6',
        disabled: '#5F6368',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
    action: {
        hover: 'rgba(255, 255, 255, 0.06)',
        selected: 'rgba(255, 255, 255, 0.10)',
    },
};

// Crème : variante CLAIRE chaude (parchemin). Surfaces FRANCHEMENT crème — le
// `paper` (#F6EDD8) habille la sidebar, les tableaux (Paper), cartes et dialogs,
// donc il doit être nettement parchemin et non quasi-blanc. La page (#ECE0C4)
// est un cran plus profonde pour que les surfaces ressortent (hiérarchie type
// carte-blanche-sur-page-grise du mode clair, mais en chaud). Échelle de gris
// teintée jaune-beige (R>=G>=B), contrastes validés AAA (texte primaire
// 13.45:1 / 11.96:1, secondaire 5.78:1 / 5.14:1 sur paper / page).
const creamGrey = {
    50: '#F0E6CE',
    100: '#EADFC6',
    200: '#DCCDA9',
    300: '#CBB892',
    400: '#AC9A75',
    500: '#7B6E54',
    600: '#5B523F',
    700: '#443D2F',
    800: '#312C22',
    900: '#252119',
};

const creamPalette = {
    ...sharedColors,
    grey: creamGrey,
    background: {
        default: '#ECE0C4',
        paper: '#F6EDD8',
    },
    text: {
        primary: '#2A2218',
        secondary: '#675A43',
        disabled: '#A7997F',
    },
    divider: 'rgba(74, 58, 30, 0.15)',
    action: {
        hover: 'rgba(74, 58, 30, 0.05)',
        selected: 'rgba(74, 58, 30, 0.10)',
    },
};

// ============================================================================
// Shadows
// ============================================================================

const lightShadows = [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    ...Array(18).fill('none'),
] as const;

const darkShadows = [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
    ...Array(18).fill('none'),
] as const;

// ============================================================================
// Typography (shared)
// ============================================================================

const typography = {
    fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Inter"',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
    ].join(','),

    h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
    h2: { fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.3 },
    h3: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.4 },
    h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
    h5: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },
    h6: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5 },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { fontWeight: 500, textTransform: 'none' as const },
};

// ============================================================================
// Theme factory
// ============================================================================

type ThemeMode = 'light' | 'dark' | 'cream';

export function createAppTheme(mode: ThemeMode) {
    const isDark = mode === 'dark';
    const isCream = mode === 'cream';
    // MUI ne connaît que 'light' | 'dark'. « crème » est une variante claire :
    // on la déclare 'light' auprès de MUI (toutes les branches
    // `palette.mode === 'dark'` des composants la traitent donc comme claire),
    // tout en lui injectant sa propre palette/échelle de gris chaude.
    const muiMode: 'light' | 'dark' = isDark ? 'dark' : 'light';
    const palette = isDark ? darkPalette : isCream ? creamPalette : lightPalette;
    const shadows = isDark ? darkShadows : lightShadows;
    const grey = isDark ? darkGrey : isCream ? creamGrey : lightGrey;

    return createTheme({
        palette: {
            mode: muiMode,
            ...palette,
        },
        shadows: shadows as unknown as typeof createTheme extends (options: { shadows: infer S }) => unknown
            ? S
            : never,
        typography,
        spacing: 8,
        shape: { borderRadius: 12 },

        // ----------------------------------------------------------------
        // Motion : aligne les valeurs MUI (transitions internes des
        // composants) sur nos tokens. Toutes les Fade/Grow/Slide/Collapse
        // ainsi que les Tabs/Menu/Tooltip/Snackbar utilisent ces durées
        // et cet easing par défaut.
        // ----------------------------------------------------------------
        transitions: {
            duration: {
                shortest: motionDuration.instant,
                shorter: motionDuration.fast,
                short: motionDuration.base,
                standard: motionDuration.medium,
                complex: motionDuration.slow,
                enteringScreen: motionDuration.medium,
                leavingScreen: motionDuration.base,
            },
            easing: {
                easeInOut: motionEasing.standard,
                easeOut: motionEasing.decelerate,
                easeIn: motionEasing.accelerate,
                sharp: motionEasing.standard,
            },
        },

        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        padding: '10px 20px',
                        boxShadow: 'none',
                        // NOTE : pas de `transform: scale()` au `:active` — réduire
                        // l'élément au mousedown peut faire sortir la souris de la
                        // zone cliquable et annuler l'événement `click` (constaté
                        // sur les petits boutons type IconButton). Le feedback
                        // tactile reste assuré par les transitions de bg/color/shadow.
                        transition: `background-color ${motionDuration.base}ms ${motionEasing.standard}, box-shadow ${motionDuration.base}ms ${motionEasing.standard}, color ${motionDuration.fast}ms ${motionEasing.standard}`,
                        '&:hover': {
                            boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                        },
                    },
                    containedPrimary: {
                        background: 'linear-gradient(135deg, #007AFF 0%, #0051D4 100%)',
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        // Idem MuiButton : pas de scale au `:active`.
                        transition: `background-color ${motionDuration.fast}ms ${motionEasing.standard}, color ${motionDuration.fast}ms ${motionEasing.standard}`,
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        boxShadow: 'none',
                        border: '1px solid',
                        borderColor: grey[200],
                        backgroundColor: isDark ? grey[50] : palette.background.paper,
                        transition: `border-color ${motionDuration.base}ms ${motionEasing.standard}, box-shadow ${motionDuration.medium}ms ${motionEasing.standard}, transform ${motionDuration.medium}ms ${motionEasing.standard}`,
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                    },
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        transition: `box-shadow ${motionDuration.fast}ms ${motionEasing.standard}`,
                        '& .MuiOutlinedInput-notchedOutline': {
                            transition: `border-color ${motionDuration.fast}ms ${motionEasing.standard}`,
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: grey[400],
                            borderWidth: 1,
                        },
                    },
                },
            },
            MuiTextField: {
                defaultProps: {
                    variant: 'outlined',
                    size: 'small',
                },
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 8,
                        },
                    },
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    head: {
                        fontWeight: 600,
                        backgroundColor: isDark ? grey[100] : grey[50],
                    },
                },
            },

            // ----------------------------------------------------------------
            // Surfaces flottantes : on accélère légèrement les sorties pour
            // que la fermeture ne traîne pas, et on garde une entrée souple.
            // ----------------------------------------------------------------
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: 16,
                    },
                },
            },
            MuiBackdrop: {
                styleOverrides: {
                    root: {
                        // Léger flou pour donner un sentiment de profondeur
                        // (équivalent du blur derrière les sheets iOS).
                        backdropFilter: 'blur(2px)',
                        WebkitBackdropFilter: 'blur(2px)',
                    },
                },
            },
            MuiTooltip: {
                styleOverrides: {
                    tooltip: {
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        padding: '6px 10px',
                    },
                },
            },
            MuiMenu: {
                styleOverrides: {
                    paper: {
                        borderRadius: 10,
                    },
                },
            },

            // ----------------------------------------------------------------
            // Chip : formalisme unifié "soft" (bg pâle de la couleur + texte
            // foncé de la même couleur). Source unique pour tous les chips
            // qui utilisent la palette MUI sémantique. Les chips qui passent
            // un `sx` custom (couleur métier hex) priment sur ces overrides
            // — utiliser `softChipSx(hex)` de @shared/lib pour garder le même
            // formalisme avec une couleur arbitraire.
            // ----------------------------------------------------------------
            MuiChip: {
                defaultProps: { size: 'small' },
                styleOverrides: {
                    root: ({ theme: t, ownerState }) => {
                        const dark = t.palette.mode === 'dark';
                        const variant = ownerState.variant ?? 'filled';
                        const c = ownerState.color;
                        const isSemantic =
                            variant === 'filled' &&
                            !!c &&
                            c !== 'default' &&
                            (c === 'primary' ||
                                c === 'secondary' ||
                                c === 'success' ||
                                c === 'warning' ||
                                c === 'error' ||
                                c === 'info');
                        const isDefault = variant === 'filled' && (c === 'default' || c === undefined);

                        const semanticStyles = isSemantic
                            ? {
                                  backgroundColor: alpha(t.palette[c].main, dark ? 0.2 : 0.12),
                                  color: dark ? t.palette[c].light : t.palette[c].dark,
                                  '&.MuiChip-clickable:hover': {
                                      backgroundColor: alpha(t.palette[c].main, dark ? 0.3 : 0.2),
                                  },
                              }
                            : {};

                        const defaultStyles = isDefault
                            ? {
                                  backgroundColor: alpha(t.palette.text.primary, dark ? 0.1 : 0.06),
                                  color: t.palette.text.secondary,
                              }
                            : {};

                        return {
                            borderRadius: 6,
                            height: 22,
                            fontWeight: 500,
                            fontSize: '0.75rem',
                            letterSpacing: 0,
                            transition: motion.transition(['background-color', 'color'], 'fast'),
                            '& .MuiChip-label': {
                                paddingLeft: 8,
                                paddingRight: 8,
                            },
                            '& .MuiChip-deleteIcon': {
                                color: 'inherit',
                                opacity: 0.6,
                                '&:hover': { opacity: 1, color: 'inherit' },
                            },
                            ...semanticStyles,
                            ...defaultStyles,
                        };
                    },
                },
            },

            MuiSnackbar: {
                styleOverrides: {
                    root: {
                        // Garde la surface visible pendant la transition de
                        // fermeture pour éviter un flash visuel.
                    },
                },
            },

            // ----------------------------------------------------------------
            // Reduced motion : désactive globalement les animations MUI
            // si l'utilisateur a activé la préférence système.
            // ----------------------------------------------------------------
            MuiCssBaseline: {
                styleOverrides: {
                    // Réserve la gouttière de scrollbar en permanence : passer
                    // d'une page courte (sans scrollbar) à une page longue ne
                    // décale plus le contenu de ~15px horizontalement.
                    html: {
                        scrollbarGutter: 'stable',
                    },
                    '@media (prefers-reduced-motion: reduce)': {
                        '*, *::before, *::after': {
                            animationDuration: '0.01ms !important',
                            animationIterationCount: '1 !important',
                            transitionDuration: '0.01ms !important',
                            scrollBehavior: 'auto !important',
                        },
                    },
                },
            },
        },
    });
}

// Default light theme (backward compat)
export const theme = createAppTheme('light');

// Glassmorphism utility
export function getGlassEffect(mode: ThemeMode = 'light') {
    const base = mode === 'dark' ? '#1A1D27' : mode === 'cream' ? '#F6EDD8' : '#FFFFFF';
    return {
        background: alpha(base, 0.8),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(base, 0.3)}`,
    };
}

/** @deprecated Use getGlassEffect() instead */
export const glassEffect = getGlassEffect('light');

export type Theme = ReturnType<typeof createAppTheme>;
