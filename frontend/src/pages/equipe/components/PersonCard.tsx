/**
 * PersonCard — carte portrait d'un membre du laboratoire.
 * @module pages/equipe
 *
 * Bandeau d'accent coloré par rôle, avatar (photo ou initiales) chevauchant le
 * bandeau, puis identité (nom, matricule, rôle) et coordonnées pratiques. Les
 * icônes reprennent le vocabulaire de l'accueil (Badge / Business / MeetingRoom).
 *
 * Si `adminActions` est fourni (chef de labo), un menu d'actions (modifier,
 * réinitialiser le mot de passe, (dés)activer) apparaît, et les comptes inactifs
 * sont grisés + marqués « Désactivé ». Sinon, la carte est en lecture seule.
 */

import { memo, useCallback, useState, type ComponentType } from 'react';
import {
    alpha,
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Stack,
    Typography,
    type SvgIconProps,
} from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import BusinessIcon from '@mui/icons-material/Business';
import ScienceIcon from '@mui/icons-material/Science';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PhoneIcon from '@mui/icons-material/Phone';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import { ROLE_LABELS, formatUserDisplayName, type SpectreRole } from '@entities/user';
import { softChipSx } from '@shared/lib';
import { motion } from '@shared/ui';
import { ROLE_COLORS } from '../constants';

const AVATAR_SIZE = 52;
const BANNER_HEIGHT = 36;

/**
 * Données minimales nécessaires à la carte. Compatible avec `User` (admin) ET
 * `UserLookup` (annuaire public), qui contiennent tous deux ces champs.
 */
export interface PersonCardData {
    uuid: string;
    username: string;
    firstName: string;
    lastName: string;
    /** Rôles métier cumulables, ordonnés par hiérarchie (roles[0] = principal). */
    roles: SpectreRole[];
    /** Rôle principal dérivé — pilote la couleur d'accent de la carte. */
    role: SpectreRole;
    isActive: boolean;
    laboratoire: string;
    service: string;
    numero: string;
    bureau: string;
    avatarUrl: string | null;
}

/** Actions réservées au chef de labo, déclenchées depuis le menu de la carte. */
export interface PersonCardAdminActions {
    onEdit: () => void;
    onResetPassword: () => void;
    onToggleActive: () => void;
}

/** Initiales (Prénom + Nom), repli sur les 2 premières lettres du matricule. */
function getInitials(person: PersonCardData): string {
    const fromName = `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`.toUpperCase();
    return fromName || person.username.slice(0, 2).toUpperCase();
}

interface ContactRow {
    Icon: ComponentType<SvgIconProps>;
    label: string;
    value: string;
    href?: string;
}

/** Construit les lignes de coordonnées en ne gardant que les champs renseignés. */
function buildContactRows(person: PersonCardData): ContactRow[] {
    const rows: ContactRow[] = [];
    if (person.service) rows.push({ Icon: BusinessIcon, label: 'Service', value: person.service });
    if (person.laboratoire) rows.push({ Icon: ScienceIcon, label: 'Laboratoire', value: person.laboratoire });
    if (person.bureau) rows.push({ Icon: MeetingRoomIcon, label: 'Bureau', value: person.bureau });
    if (person.numero) {
        rows.push({
            Icon: PhoneIcon,
            label: 'Numéro',
            value: person.numero,
            href: `tel:${person.numero.replace(/\s+/g, '')}`,
        });
    }
    return rows;
}

const ContactLine = memo(function ContactLine({ Icon, label, value, href }: ContactRow) {
    return (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Icon aria-hidden sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
            <Typography
                variant="caption"
                component={href ? 'a' : 'span'}
                href={href}
                title={`${label} : ${value}`}
                sx={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'text.secondary',
                    textDecoration: 'none',
                    transition: motion.transition('color', 'fast'),
                    ...(href ? { '&:hover': { color: 'primary.main', textDecoration: 'underline' } } : null),
                }}
            >
                {value}
            </Typography>
        </Stack>
    );
});

export interface PersonCardProps {
    person: PersonCardData;
    adminActions?: PersonCardAdminActions;
}

export const PersonCard = memo(function PersonCard({ person, adminActions }: PersonCardProps) {
    const color = ROLE_COLORS[person.role];
    const fullName = formatUserDisplayName(person);
    const contactRows = buildContactRows(person);

    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const openMenu = useCallback((e: React.MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget), []);
    const closeMenu = useCallback(() => setMenuAnchor(null), []);
    const runAction = useCallback(
        (action: () => void) => () => {
            closeMenu();
            action();
        },
        [closeMenu],
    );

    return (
        <Card
            sx={{
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                opacity: person.isActive ? 1 : 0.6,
                transition: motion.transition(['transform', 'box-shadow', 'border-color'], 'medium'),
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    borderColor: alpha(color, 0.5),
                },
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
        >
            {/* Bandeau d'accent coloré par rôle */}
            <Box
                aria-hidden
                sx={{
                    height: BANNER_HEIGHT,
                    background: `linear-gradient(135deg, ${alpha(color, 0.95)} 0%, ${alpha(color, 0.55)} 100%)`,
                }}
            />

            {/* Menu d'actions admin (chef de labo) */}
            {adminActions && (
                <>
                    <IconButton
                        size="small"
                        onClick={openMenu}
                        aria-label={`Actions pour ${fullName}`}
                        sx={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            zIndex: 2,
                            color: '#fff',
                            bgcolor: alpha('#000', 0.25),
                            '&:hover': { bgcolor: alpha('#000', 0.4) },
                        }}
                    >
                        <MoreVertIcon fontSize="small" />
                    </IconButton>
                    <Menu
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={closeMenu}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                        <MenuItem onClick={runAction(adminActions.onEdit)}>
                            <ListItemIcon>
                                <EditIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Modifier</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={runAction(adminActions.onResetPassword)}>
                            <ListItemIcon>
                                <LockResetIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Réinitialiser le mot de passe</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={runAction(adminActions.onToggleActive)}>
                            <ListItemIcon>
                                {person.isActive ? <PersonOffIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                            </ListItemIcon>
                            <ListItemText>{person.isActive ? 'Désactiver' : 'Réactiver'}</ListItemText>
                        </MenuItem>
                    </Menu>
                </>
            )}

            {/* Avatar chevauchant le bandeau (photo de profil ou initiales) */}
            <Avatar
                src={person.avatarUrl ?? undefined}
                alt={fullName}
                sx={{
                    width: AVATAR_SIZE,
                    height: AVATAR_SIZE,
                    mt: `-${AVATAR_SIZE / 2}px`,
                    mx: 'auto',
                    border: '3px solid',
                    borderColor: 'background.paper',
                    boxShadow: 2,
                    bgcolor: color,
                    color: '#fff',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                }}
            >
                {getInitials(person)}
            </Avatar>

            <CardContent
                sx={{
                    pt: 0.5,
                    px: 1.5,
                    textAlign: 'center',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    '&:last-child': { pb: 1.5 },
                }}
            >
                <Typography variant="subtitle2" fontWeight={700} noWrap title={fullName}>
                    {fullName}
                </Typography>

                <Typography variant="caption" color="text.disabled" noWrap sx={{ mb: 0.75 }}>
                    {person.username}
                </Typography>

                <Stack
                    direction="row"
                    spacing={0.5}
                    justifyContent="center"
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ mb: contactRows.length ? 1 : 0 }}
                >
                    {/* Une puce par rôle : un membre peut en cumuler plusieurs.
                        L'icône n'est portée que par la première pour ne pas
                        surcharger la carte. */}
                    {person.roles.map((role, index) => (
                        <Chip
                            key={role}
                            icon={index === 0 ? <BadgeIcon sx={{ fontSize: 14, color: 'inherit' }} /> : undefined}
                            label={ROLE_LABELS[role] ?? role}
                            size="small"
                            sx={softChipSx(ROLE_COLORS[role] ?? color)}
                        />
                    ))}
                    {!person.isActive && <Chip label="Désactivé" size="small" color="error" />}
                </Stack>

                {contactRows.length > 0 && (
                    <Box sx={{ mt: 'auto' }}>
                        <Divider sx={{ mb: 0.75 }} />
                        <Stack spacing={0.5} sx={{ textAlign: 'left' }}>
                            {contactRows.map((row) => (
                                <ContactLine key={row.label} {...row} />
                            ))}
                        </Stack>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
});
