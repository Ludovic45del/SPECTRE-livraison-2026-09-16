/**
 * Sidebar Navigation Component
 * @module widgets/sidebar
 */

import { memo, useCallback, useMemo, useState, useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Avatar,
    Badge,
    Box,
    Chip,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Typography,
    Tooltip,
    type SxProps,
    type Theme,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import LocalCafeRoundedIcon from '@mui/icons-material/LocalCafeRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { useSidebarStore } from './sidebar.store';
import { useThemeStore } from '@shared/lib/theme.store';
import { useAuthStore } from '@features/auth';
import { useStockAlerts } from '@entities/stock-item';
import { useUnreadCount } from '@entities/messaging';
import { queryClient } from '@shared/lib/query-client';
import { motion } from '@shared/ui/motion';
import CEALogo from '@shared/assets/images/CEALogo.png';

// ============================================================================
// Constants
// ============================================================================

const SIDEBAR_WIDTH_OPEN = 240;
const SIDEBAR_WIDTH_CLOSED = 64;
const ICON_SIZE = 28;
const NAV_ITEM_HEIGHT = 44;
const NAV_ITEM_GAP = 4; // mb: 0.5 = 4px

// Aliases vers les tokens motion. `TRANSITION` = micro-interactions (hover,
// color), `TRANSITION_SPRING` = indicateur coulissant (overshoot doux).
const TRANSITION = motion.base;
const TRANSITION_SPRING = motion.spring;

const COLORS = {
    brand: '#E31837',
    iconInactive: 'primary.light',
    iconActive: 'primary.main',
    glowActive: 'rgba(25, 118, 210, 0.4)',
} as const;

// ============================================================================
// Utilities
// ============================================================================

const getIconColor = (isActive?: boolean) => (isActive ? COLORS.iconActive : COLORS.iconInactive);

const circleIconStyles: SxProps<Theme> = {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

// ============================================================================
// Icon Components
// ============================================================================

interface CircleIconProps {
    isActive?: boolean;
    children: ReactNode;
}

const CircleIcon = memo(function CircleIcon({ isActive, children }: CircleIconProps) {
    return (
        <Box
            sx={{
                ...circleIconStyles,
                borderColor: getIconColor(isActive),
                transition: `all ${TRANSITION_SPRING}`,
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                boxShadow: isActive ? `0 0 20px ${COLORS.glowActive}` : 'none',
            }}
        >
            {children}
        </Box>
    );
});

interface TextCircleIconProps {
    isActive?: boolean;
    label: string;
    fontSize?: string;
    letterSpacing?: string;
}

const TextCircleIcon = memo(function TextCircleIcon({
    isActive,
    label,
    fontSize = '0.9rem',
    letterSpacing,
}: TextCircleIconProps) {
    return (
        <CircleIcon isActive={isActive}>
            <Typography
                sx={{
                    color: getIconColor(isActive),
                    fontSize,
                    fontWeight: 700,
                    letterSpacing,
                    transition: `color ${TRANSITION}`,
                }}
            >
                {label}
            </Typography>
        </CircleIcon>
    );
});

const HomeCircleIcon = memo(function HomeCircleIcon({ isActive }: { isActive?: boolean }) {
    return (
        <CircleIcon isActive={isActive}>
            <HomeIcon
                sx={{
                    color: getIconColor(isActive),
                    fontSize: '1rem',
                    transition: `color ${TRANSITION}`,
                }}
            />
        </CircleIcon>
    );
});

const StockCircleIcon = memo(function StockCircleIcon({ isActive }: { isActive?: boolean }) {
    return (
        <CircleIcon isActive={isActive}>
            <Inventory2Icon
                sx={{
                    color: getIconColor(isActive),
                    fontSize: '0.95rem',
                    transition: `color ${TRANSITION}`,
                }}
            />
        </CircleIcon>
    );
});

const MaterielCircleIcon = memo(function MaterielCircleIcon({ isActive }: { isActive?: boolean }) {
    return (
        <CircleIcon isActive={isActive}>
            <PrecisionManufacturingIcon
                sx={{
                    color: getIconColor(isActive),
                    fontSize: '0.95rem',
                    transition: `color ${TRANSITION}`,
                }}
            />
        </CircleIcon>
    );
});

const TeamCircleIcon = memo(function TeamCircleIcon({ isActive }: { isActive?: boolean }) {
    return (
        <CircleIcon isActive={isActive}>
            <GroupsRoundedIcon
                sx={{
                    color: getIconColor(isActive),
                    fontSize: '1rem',
                    transition: `color ${TRANSITION}`,
                }}
            />
        </CircleIcon>
    );
});

const MessagingCircleIcon = memo(function MessagingCircleIcon({ isActive }: { isActive?: boolean }) {
    return (
        <CircleIcon isActive={isActive}>
            <ForumRoundedIcon
                sx={{
                    color: getIconColor(isActive),
                    fontSize: '0.95rem',
                    transition: `color ${TRANSITION}`,
                }}
            />
        </CircleIcon>
    );
});

// ============================================================================
// Navigation Configuration
// ============================================================================

interface NavSubItem {
    path: string;
    label: string;
    /** Badge de notification (compteur affiché à droite). 0 ou undefined → pas de badge. */
    badgeCount?: number;
}

interface NavItem {
    path: string;
    label: string;
    icon: (isActive: boolean) => ReactNode;
    /** Sous-items affichés en dépliant l'entrée quand sa section est active. */
    children?: NavSubItem[];
    /**
     * Badge de notification de la rubrique (ex. messages non lus). 0 ou
     * undefined → pas de badge. Sidebar ouverte : chip à droite du libellé ;
     * repliée : pastille sur l'icône.
     */
    badgeCount?: number;
}

/** Élément aplati pour le rendu (parent OU enfant), 1 ligne = 1 entrée. */
type FlatNavItem = ({ kind: 'parent' } & NavItem) | ({ kind: 'child' } & NavSubItem);

const BASE_NAV_ITEMS: NavItem[] = [
    { path: '/', label: 'Accueil', icon: (isActive) => <HomeCircleIcon isActive={isActive} /> },
    { path: '/campagnes', label: 'Campagnes', icon: (isActive) => <TextCircleIcon isActive={isActive} label="C" /> },
    {
        path: '/fsecs',
        label: 'FSEC',
        icon: (isActive) => (
            <TextCircleIcon isActive={isActive} label="Fsec" fontSize="0.55rem" letterSpacing="-0.3px" />
        ),
    },
    {
        path: '/fas',
        label: "Fiches d'Anomalie",
        icon: (isActive) => <TextCircleIcon isActive={isActive} label="FA" fontSize="0.7rem" />,
    },
    { path: '/embases', label: 'Embases', icon: (isActive) => <TextCircleIcon isActive={isActive} label="E" /> },
    {
        path: '/equipe',
        label: 'Équipe et Carte',
        icon: (isActive) => <TeamCircleIcon isActive={isActive} />,
        children: [
            { path: '/equipe/annuaire', label: 'Équipe' },
            { path: '/equipe/carte', label: 'Carte' },
            { path: '/equipe/laboratoires', label: 'Annuaire des labos' },
        ],
    },
    {
        path: '/messagerie',
        label: 'Messagerie',
        icon: (isActive) => <MessagingCircleIcon isActive={isActive} />,
    },
    { path: '/planning', label: 'Planning', icon: (isActive) => <TextCircleIcon isActive={isActive} label="P" /> },
    {
        path: '/indicateurs',
        label: 'Indicateurs',
        icon: (isActive) => (
            <TextCircleIcon isActive={isActive} label="KPI" fontSize="0.55rem" letterSpacing="-0.3px" />
        ),
        children: [
            { path: '/indicateurs/fa', label: 'FA' },
            { path: '/indicateurs/fsec', label: 'FSEC' },
            { path: '/indicateurs/campagne', label: 'Campagne' },
        ],
    },
    {
        path: '/materiel',
        label: 'Matériel',
        icon: (isActive) => <MaterielCircleIcon isActive={isActive} />,
    },
    {
        path: '/stock',
        label: 'Stock',
        icon: (isActive) => <StockCircleIcon isActive={isActive} />,
        children: [
            { path: '/stock/catalogue', label: 'Catalogue' },
            { path: '/stock/mouvements', label: 'Mouvements' },
            { path: '/stock/alertes', label: 'Alertes' },
        ],
    },
];

// ============================================================================
// Sliding Indicator Component
// ============================================================================

interface SlidingIndicatorProps {
    activeIndex: number;
    isOpen: boolean;
}

const SlidingIndicator = memo(function SlidingIndicator({ activeIndex, isOpen }: SlidingIndicatorProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    if (activeIndex < 0) return null;

    return (
        <Box
            component="li"
            aria-hidden="true"
            sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: NAV_ITEM_HEIGHT,
                transform: `translateY(${activeIndex * (NAV_ITEM_HEIGHT + NAV_ITEM_GAP)}px)`,
                borderRadius: 24,
                bgcolor: 'primary.50',
                transition: mounted ? `transform ${TRANSITION_SPRING}` : 'none',
                zIndex: 0,
                pointerEvents: 'none',
                // Left accent bar
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 4,
                    height: isOpen ? 24 : 20,
                    borderRadius: '0 4px 4px 0',
                    bgcolor: 'primary.main',
                    transition: `all ${TRANSITION_SPRING}`,
                    boxShadow: `0 0 12px ${COLORS.glowActive}`,
                },
                // Gradient overlay
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 24,
                    background: 'linear-gradient(90deg, rgba(25, 118, 210, 0.12) 0%, rgba(25, 118, 210, 0.04) 100%)',
                },
            }}
        />
    );
});

// ============================================================================
// NavItem Component
// ============================================================================

interface NavItemComponentProps {
    item: NavItem;
    isOpen: boolean;
    isActive: boolean;
    /**
     * Sidebar repliée : chemin du sous-item courant (s'il y en a un) pour le
     * surligner dans le flyout. `undefined` pour les rubriques non actives →
     * la mémoïsation reste efficace (la valeur ne change que pour la rubrique
     * active lors d'une navigation).
     */
    activeChildPath?: string;
    onNavigate: (path: string) => void;
    onPrefetch?: (path: string) => void;
}

const NavSubItemComponent = memo(function NavSubItemComponent({
    item,
    isActive,
    onNavigate,
    onPrefetch,
}: {
    item: NavSubItem;
    isActive: boolean;
    onNavigate: (path: string) => void;
    onPrefetch?: (path: string) => void;
}) {
    const handleClick = useCallback(() => onNavigate(item.path), [onNavigate, item.path]);
    // Prefetch d'intention : au survol/focus, on précharge le chunk de la page
    // ciblée pour qu'il soit déjà en cache au moment du clic.
    const handlePrefetch = useCallback(() => onPrefetch?.(item.path), [onPrefetch, item.path]);

    return (
        <ListItem
            disablePadding
            sx={{ height: NAV_ITEM_HEIGHT, mb: `${NAV_ITEM_GAP}px`, position: 'relative', zIndex: 1 }}
        >
            <ListItemButton
                onClick={handleClick}
                onMouseEnter={handlePrefetch}
                onFocus={handlePrefetch}
                sx={{
                    borderRadius: 2,
                    py: 0.75,
                    pl: 4.5, // indent : aligné après l'icône cercle parent
                    pr: 1.5,
                    height: '100%',
                    bgcolor: 'transparent',
                    transition: `all ${TRANSITION}`,
                    '&:hover': {
                        bgcolor: isActive ? 'transparent' : 'grey.100',
                    },
                    gap: 1,
                }}
            >
                <ListItemText
                    primary={item.label}
                    slotProps={{
                        primary: {
                            sx: {
                                fontWeight: isActive ? 600 : 400,
                                fontSize: '0.82rem',
                                color: isActive ? 'primary.main' : 'text.secondary',
                                whiteSpace: 'nowrap',
                                transition: `all ${TRANSITION}`,
                            },
                        },
                    }}
                />
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <Chip
                        label={item.badgeCount}
                        color="error"
                        sx={{
                            // Badge dense : on conserve une hauteur réduite par rapport à
                            // la chip standard du thème (22px) pour l'intégrer dans la rangée.
                            height: 18,
                            minWidth: 22,
                            fontSize: '0.68rem',
                        }}
                    />
                )}
            </ListItemButton>
        </ListItem>
    );
});

const NavItemComponent = memo(function NavItemComponent({
    item,
    isOpen,
    isActive,
    activeChildPath,
    onNavigate,
    onPrefetch,
}: NavItemComponentProps) {
    // Sidebar repliée + rubrique à sous-items → le clic n'effectue plus de
    // navigation directe mais ouvre un flyout pour choisir le sous-item
    // (cf. demande UX : « faire un choix puis être redirigé »).
    const isCollapsedWithChildren = !isOpen && !!item.children?.length;
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const menuOpen = Boolean(anchorEl);

    const handleClick = useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            if (isCollapsedWithChildren) {
                setAnchorEl(event.currentTarget);
            } else {
                onNavigate(item.path);
            }
        },
        [isCollapsedWithChildren, onNavigate, item.path],
    );

    const handleCloseMenu = useCallback(() => setAnchorEl(null), []);

    const handleSelectChild = useCallback(
        (path: string) => {
            setAnchorEl(null);
            onNavigate(path);
        },
        [onNavigate],
    );

    const handlePrefetch = useCallback(() => onPrefetch?.(item.path), [onPrefetch, item.path]);
    const hasBadge = item.badgeCount !== undefined && item.badgeCount > 0;

    return (
        <ListItem
            disablePadding
            sx={{ height: NAV_ITEM_HEIGHT, mb: `${NAV_ITEM_GAP}px`, position: 'relative', zIndex: 1 }}
        >
            <Tooltip title={isOpen || menuOpen ? '' : item.label} placement="right" arrow>
                <ListItemButton
                    onClick={handleClick}
                    onMouseEnter={handlePrefetch}
                    onFocus={handlePrefetch}
                    aria-label={isOpen ? undefined : item.label}
                    aria-haspopup={isCollapsedWithChildren ? 'menu' : undefined}
                    aria-expanded={isCollapsedWithChildren ? menuOpen : undefined}
                    sx={{
                        borderRadius: 2,
                        py: 1.25,
                        px: 1.5,
                        height: '100%',
                        justifyContent: isOpen ? 'flex-start' : 'center',
                        bgcolor: 'transparent',
                        transition: `all ${TRANSITION}`,
                        '&:hover': {
                            bgcolor: isActive ? 'transparent' : 'grey.100',
                            transform: isActive ? 'none' : 'translateX(4px)',
                        },
                    }}
                >
                    <ListItemIcon
                        sx={{
                            minWidth: isOpen ? 36 : 'auto',
                            justifyContent: 'center',
                            transition: `all ${TRANSITION_SPRING}`,
                        }}
                    >
                        {/* Repliée : le compteur se pose en pastille sur l'icône (le libellé est masqué). */}
                        <Badge
                            badgeContent={hasBadge && !isOpen ? item.badgeCount : 0}
                            color="error"
                            overlap="circular"
                            slotProps={{
                                badge: {
                                    role: 'status',
                                    'aria-label': hasBadge && !isOpen ? `${item.badgeCount} non lus` : undefined,
                                },
                            }}
                            sx={{ '& .MuiBadge-badge': { fontSize: '0.62rem', height: 16, minWidth: 16, px: 0.5 } }}
                        >
                            {item.icon(isActive)}
                        </Badge>
                    </ListItemIcon>
                    {isOpen && (
                        <ListItemText
                            primary={item.label}
                            slotProps={{
                                primary: {
                                    sx: {
                                        fontWeight: isActive ? 600 : 500,
                                        fontSize: '0.9rem',
                                        color: isActive ? 'primary.main' : 'text.primary',
                                        whiteSpace: 'nowrap',
                                        transition: `all ${TRANSITION}`,
                                        transform: isActive ? 'translateX(2px)' : 'none',
                                    },
                                },
                            }}
                        />
                    )}
                    {isOpen && hasBadge && (
                        <Chip
                            label={item.badgeCount}
                            color="error"
                            role="status"
                            aria-label={`${item.badgeCount} non lus`}
                            sx={{ height: 18, minWidth: 22, fontSize: '0.68rem' }}
                        />
                    )}
                </ListItemButton>
            </Tooltip>

            {isCollapsedWithChildren && (
                <Menu
                    anchorEl={anchorEl}
                    open={menuOpen}
                    onClose={handleCloseMenu}
                    anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'center', horizontal: 'left' }}
                    slotProps={{
                        paper: { sx: { ml: 1, minWidth: 184, borderRadius: 2 } },
                        list: { dense: true, 'aria-label': item.label, sx: { py: 0.5 } },
                    }}
                >
                    {item.children?.map((child) => {
                        const childActive = child.path === activeChildPath;
                        return (
                            <MenuItem
                                key={child.path}
                                selected={childActive}
                                onClick={() => handleSelectChild(child.path)}
                                onMouseEnter={() => onPrefetch?.(child.path)}
                                sx={{ mx: 0.5, borderRadius: 1.5, gap: 1 }}
                            >
                                <ListItemText
                                    primary={child.label}
                                    slotProps={{
                                        primary: {
                                            sx: {
                                                fontSize: '0.85rem',
                                                fontWeight: childActive ? 600 : 400,
                                                color: childActive ? 'primary.main' : 'text.primary',
                                            },
                                        },
                                    }}
                                />
                                {child.badgeCount !== undefined && child.badgeCount > 0 && (
                                    <Chip
                                        label={child.badgeCount}
                                        color="error"
                                        sx={{ height: 18, minWidth: 22, fontSize: '0.68rem' }}
                                    />
                                )}
                            </MenuItem>
                        );
                    })}
                </Menu>
            )}
        </ListItem>
    );
});

// ============================================================================
// Sidebar Component
// ============================================================================

export interface SidebarUserInfo {
    username: string;
    firstName?: string;
    lastName?: string;
    /** Rôles métier cumulables, ordonnés par hiérarchie. */
    roles: string[];
    /** URL de la photo de profil (sous /media/). Absent → initiales. */
    avatarUrl?: string | null;
}

export interface SidebarProps {
    /** Current user info for the footer card. Undefined while loading. */
    user?: SidebarUserInfo;
    /** Map of role keys to human-readable labels */
    roleLabels: Record<string, string>;
    /** Callback déclenché au clic sur la carte profil du footer. */
    onProfileClick?: () => void;
    /** Prefetch d'intention : appelé au survol/focus d'une entrée (chemin ciblé). */
    onPrefetch?: (path: string) => void;
}

/**
 * Métadonnées du PROCHAIN thème pour chaque mode courant (libellé + icône).
 * Suit le cycle clair → sombre → crème → clair (cf. THEME_CYCLE). L'icône et le
 * libellé décrivent la cible de la bascule, comme l'ancienne logique binaire.
 */
const NEXT_THEME = {
    light: { label: 'Mode sombre', Icon: DarkModeRoundedIcon },
    dark: { label: 'Mode crème', Icon: LocalCafeRoundedIcon },
    cream: { label: 'Mode clair', Icon: LightModeRoundedIcon },
} as const;

function SidebarComponent({ user: me, roleLabels, onProfileClick, onPrefetch }: SidebarProps) {
    // Un membre peut cumuler plusieurs rôles : on les concatène sur une ligne.
    const roleLine = me ? me.roles.map((role) => roleLabels[role] ?? role).join(' · ') : '';
    const location = useLocation();
    const pathname = location.pathname;
    const navigate = useNavigate();
    const { isOpen, toggle } = useSidebarStore();
    const { mode, toggleMode } = useThemeStore();
    const logout = useAuthStore((s) => s.logout);

    // Toutes les entrées sont visibles par tous : la gestion des utilisateurs
    // (réservée au chef de labo) vit désormais dans la section « Équipe et Carte ».
    const NAV_ITEMS = BASE_NAV_ITEMS;

    // Compteur d'alertes Stock (cf. CDC §5.4) — affiché en badge sur le sous-item Alertes.
    const { data: stockAlerts } = useStockAlerts();
    const stockAlertsCount = stockAlerts
        ? stockAlerts.lowStock.length + stockAlerts.expired.length + stockAlerts.expiringSoon.length
        : 0;

    // Compteur de messages non lus (messagerie interne) — badge sur la rubrique
    // Messagerie. Le hook polle le backend (scope `messaging_poll`) toutes les 5 s.
    const { data: unreadCount } = useUnreadCount();
    const unreadMessagesCount = unreadCount?.totalUnread ?? 0;

    /**
     * Items enrichis des badges dynamiques (compteur d'alertes Stock, messages
     * non lus) — partagés par le rendu inline (sidebar ouverte) ET le flyout
     * (sidebar repliée).
     */
    const ENRICHED_NAV_ITEMS = useMemo<NavItem[]>(
        () =>
            NAV_ITEMS.map((item) => {
                if (item.path === '/messagerie') {
                    return { ...item, badgeCount: unreadMessagesCount };
                }
                return item.children
                    ? {
                          ...item,
                          children: item.children.map((child) =>
                              child.path === '/stock/alertes' ? { ...child, badgeCount: stockAlertsCount } : child,
                          ),
                      }
                    : item;
            }),
        [NAV_ITEMS, stockAlertsCount, unreadMessagesCount],
    );

    /**
     * Liste linéaire pour le rendu : 1 entrée = 1 ligne (NAV_ITEM_HEIGHT).
     * Les sous-items d'un parent ne sont insérés que si la sidebar est ouverte
     * ET que la section parent est active (chemin commence par /parent). Repliée,
     * les sous-items vivent dans le flyout du parent (cf. NavItemComponent).
     */
    const FLAT_NAV_ITEMS = useMemo<FlatNavItem[]>(() => {
        const flat: FlatNavItem[] = [];
        for (const item of ENRICHED_NAV_ITEMS) {
            flat.push({ kind: 'parent', ...item });
            if (isOpen && pathname.startsWith(item.path) && item.children) {
                for (const child of item.children) {
                    flat.push({ kind: 'child', ...child });
                }
            }
        }
        return flat;
    }, [ENRICHED_NAV_ITEMS, isOpen, pathname]);

    const handleLogout = useCallback(async () => {
        await logout();
        queryClient.clear();
        navigate('/login');
    }, [logout, navigate]);

    /**
     * Index de l'item actif : on prend le chemin le plus spécifique qui matche
     * (sinon le parent éclipserait son enfant déplié).
     */
    const activeIndex = useMemo(() => {
        let bestIdx = -1;
        let bestLen = -1;
        FLAT_NAV_ITEMS.forEach((item, idx) => {
            const matches = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
            if (matches && item.path.length > bestLen) {
                bestIdx = idx;
                bestLen = item.path.length;
            }
        });
        return bestIdx;
    }, [pathname, FLAT_NAV_ITEMS]);

    const checkIsActive = useCallback((idx: number) => idx === activeIndex, [activeIndex]);

    const sidebarStyles = useMemo<SxProps<Theme>>(
        () => ({
            width: isOpen ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED,
            height: '100vh',
            position: 'fixed',
            inset: '0 auto 0 0',
            bgcolor: 'background.paper',
            borderRight: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1200,
            transition: `width ${TRANSITION}`,
            contain: 'layout style',
            overflow: 'hidden',
        }),
        [isOpen],
    );

    return (
        <Box component="nav" role="navigation" aria-label="Navigation principale" sx={sidebarStyles}>
            {/* Header — clic sur le logo pour basculer le menu */}
            <Box
                sx={{
                    px: 1.5,
                    py: 1.5,
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isOpen ? 'flex-start' : 'center',
                    minHeight: 56,
                }}
            >
                <Tooltip title={isOpen ? 'Réduire le menu' : 'Étendre le menu'} placement="right" arrow>
                    <Box
                        component="button"
                        type="button"
                        onClick={toggle}
                        aria-label={isOpen ? 'Réduire le menu' : 'Étendre le menu'}
                        aria-expanded={isOpen}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            cursor: 'pointer',
                            borderRadius: 1.5,
                            p: 0.5,
                            transition: `background-color ${TRANSITION}`,
                            border: 'none',
                            bgcolor: 'transparent',
                            font: 'inherit',
                            color: 'inherit',
                            textAlign: 'left',
                            '&:hover': {
                                bgcolor: 'action.hover',
                                '& img': { transform: 'scale(1.05)' },
                            },
                            '&:active img': { transform: 'scale(0.96)' },
                            '&:focus-visible': {
                                outline: '2px solid',
                                outlineColor: 'primary.main',
                                outlineOffset: 2,
                            },
                        }}
                    >
                        <Box
                            component="img"
                            src={CEALogo}
                            alt="CEA"
                            sx={{
                                width: isOpen ? 36 : 32,
                                height: 'auto',
                                borderRadius: 1,
                                transition: `all ${TRANSITION_SPRING}`,
                                flexShrink: 0,
                            }}
                        />
                        {isOpen && (
                            <Typography
                                variant="h6"
                                component="span"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: '1.35rem',
                                    letterSpacing: '0.15em',
                                    textTransform: 'uppercase',
                                    color: COLORS.brand,
                                    lineHeight: 1,
                                }}
                            >
                                Spectre
                            </Typography>
                        )}
                    </Box>
                </Tooltip>
            </Box>

            {/* Navigation */}
            <List
                sx={{
                    position: 'relative',
                    px: 1,
                    py: 1.5,
                    flex: 1,
                }}
            >
                <SlidingIndicator activeIndex={activeIndex} isOpen={isOpen} />
                {FLAT_NAV_ITEMS.map((item, idx) =>
                    item.kind === 'parent' ? (
                        <NavItemComponent
                            key={item.path}
                            item={item}
                            isOpen={isOpen}
                            isActive={checkIsActive(idx)}
                            activeChildPath={
                                !isOpen && item.children
                                    ? item.children.find((c) => pathname.startsWith(c.path))?.path
                                    : undefined
                            }
                            onNavigate={navigate}
                            onPrefetch={onPrefetch}
                        />
                    ) : (
                        <NavSubItemComponent
                            key={item.path}
                            item={item}
                            isActive={checkIsActive(idx)}
                            onNavigate={navigate}
                            onPrefetch={onPrefetch}
                        />
                    ),
                )}
            </List>

            {/* Footer — User card */}
            <Box
                sx={{
                    borderTop: 1,
                    borderColor: 'divider',
                    p: 1.5,
                }}
            >
                {/* User avatar + info — clic ouvre la modale profil */}
                <Tooltip
                    title={
                        isOpen
                            ? me
                                ? 'Voir / modifier mon profil'
                                : ''
                            : me
                              ? `${me.firstName && me.lastName ? `${me.firstName} ${me.lastName}` : me.username} — ${roleLine}`
                              : ''
                    }
                    placement="right"
                    arrow
                >
                    <Box
                        component="button"
                        type="button"
                        onClick={onProfileClick}
                        disabled={!me || !onProfileClick}
                        aria-label="Ouvrir mon profil"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.25,
                            p: isOpen ? 1 : 0.5,
                            borderRadius: 2,
                            bgcolor: 'action.hover',
                            mb: 1,
                            justifyContent: isOpen ? 'flex-start' : 'center',
                            transition: `all ${TRANSITION}`,
                            border: 'none',
                            font: 'inherit',
                            color: 'inherit',
                            textAlign: 'left',
                            width: '100%',
                            cursor: me && onProfileClick ? 'pointer' : 'default',
                            '&:hover': me && onProfileClick ? { bgcolor: 'action.selected' } : undefined,
                            '&:focus-visible': {
                                outline: '2px solid',
                                outlineColor: 'primary.main',
                                outlineOffset: 2,
                            },
                            '&:disabled': {
                                cursor: 'default',
                            },
                        }}
                    >
                        {/* Avatar : photo de profil si présente, sinon initiales. */}
                        <Avatar
                            src={me?.avatarUrl ?? undefined}
                            alt={me ? `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim() || me.username : ''}
                            sx={{
                                width: 32,
                                height: 32,
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                flexShrink: 0,
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                letterSpacing: '-0.5px',
                                transition: `all ${TRANSITION_SPRING}`,
                            }}
                        >
                            {me?.firstName && me?.lastName ? (
                                `${me.firstName[0]}${me.lastName[0]}`.toUpperCase()
                            ) : me?.username ? (
                                me.username.slice(0, 2).toUpperCase()
                            ) : (
                                <PersonRoundedIcon sx={{ fontSize: 18 }} />
                            )}
                        </Avatar>
                        {isOpen && me && (
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        fontSize: '0.82rem',
                                        lineHeight: 1.3,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {me.firstName && me.lastName ? `${me.firstName} ${me.lastName}` : me.username}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                        fontSize: '0.7rem',
                                        lineHeight: 1.2,
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {roleLine}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Tooltip>

                {/* Actions row */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isOpen ? 'space-between' : 'center',
                        gap: 0.5,
                    }}
                >
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title={NEXT_THEME[mode].label} placement="top" arrow>
                            <IconButton
                                onClick={toggleMode}
                                aria-label={`Activer le ${NEXT_THEME[mode].label.toLowerCase()}`}
                                size="small"
                                sx={{
                                    color: 'text.secondary',
                                    transition: `all ${TRANSITION}`,
                                    '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                                }}
                            >
                                {(() => {
                                    const NextIcon = NEXT_THEME[mode].Icon;
                                    return <NextIcon sx={{ fontSize: 18 }} />;
                                })()}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Se deconnecter" placement="top" arrow>
                            <IconButton
                                onClick={handleLogout}
                                aria-label="Se deconnecter"
                                size="small"
                                sx={{
                                    color: 'text.secondary',
                                    transition: `all ${TRANSITION}`,
                                    '&:hover': { color: 'error.main', bgcolor: 'action.hover' },
                                }}
                            >
                                <LogoutRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    {isOpen && (
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                            v1.0.0
                        </Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
}

export const Sidebar = memo(SidebarComponent);
export { SIDEBAR_WIDTH_OPEN, SIDEBAR_WIDTH_CLOSED };
