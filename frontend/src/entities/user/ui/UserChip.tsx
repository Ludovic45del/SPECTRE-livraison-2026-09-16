/**
 * UserChip — affichage cliquable du nom d'un opérateur avec popover infos.
 * @module entities/user/ui
 *
 * - Si `userUuid` est fourni : résout le user via useUserLookup() et affiche
 *   "Prénom Nom" cliquable. Au clic, ouvre un Popover MUI avec les coordonnées
 *   pratiques (rôle, laboratoire, service, bureau, numéro).
 * - Si `userUuid` est vide mais `fallbackText` fourni (cas MOE/TCI) : affiche
 *   le texte en clair, sans popover (membre extérieur — pas d'infos en base).
 * - Si rien : affiche `emptyText` (défaut "-").
 *
 * Pas de fetch additionnel : useUserLookup() est cached par TanStack Query, le
 * même appel sert tous les chips d'une page.
 */

import { memo, useCallback, useState } from 'react';
import { Avatar, Box, Chip, CircularProgress, Divider, Link, Popover, Stack, Typography } from '@mui/material';
import { useUserLookup } from '../core/api/user.queries';
import { formatUserDisplayName } from '../core/lib/format-user-display-name';
import type { UserLookup } from '../core/model/user-lookup.schema';
import { ROLE_LABELS } from '../core/model/user.schema';

export interface UserChipProps {
    /** UUID UserProfile à résoudre. Si null/vide, fallbackText prend le relais. */
    userUuid?: string | null;
    /** Texte legacy ou MOE/TCI à afficher si userUuid absent. */
    fallbackText?: string | null;
    /** Texte affiché si ni userUuid ni fallbackText. Défaut "-". */
    emptyText?: string;
    /** Variante d'affichage : "link" (défaut, lien souligné) ou "text" (sans souligner). */
    variant?: 'link' | 'text';
}

const PopoverContent = memo(function PopoverContent({ user }: { user: UserLookup }) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username;
    const initials =
        `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() ||
        user.username.slice(0, 2).toUpperCase();

    const rows: ReadonlyArray<{ label: string; value: string }> = [
        { label: 'Matricule', value: user.username },
        { label: 'Laboratoire', value: user.laboratoire },
        { label: 'Service', value: user.service },
        { label: 'Bureau', value: user.bureau },
        { label: 'Numéro', value: user.numero },
    ];
    const visibleRows = rows.filter((r) => r.value);

    return (
        <Box sx={{ p: 2, minWidth: 240, maxWidth: 320 }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
                <Avatar
                    src={user.avatarUrl ?? undefined}
                    alt={fullName}
                    sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: '0.9rem', fontWeight: 700 }}
                >
                    {initials}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {fullName}
                    </Typography>
                    {/* Une puce par rôle : un membre peut en cumuler plusieurs. */}
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {user.roles.map((role) => (
                            <Chip key={role} label={ROLE_LABELS[role] ?? role} size="small" />
                        ))}
                    </Stack>
                </Box>
            </Stack>
            <Divider sx={{ mb: 1 }} />
            {visibleRows.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                    Aucune information complémentaire renseignée.
                </Typography>
            ) : (
                <Stack spacing={0.5}>
                    {visibleRows.map((row) => (
                        <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                                {row.label}
                            </Typography>
                            <Typography variant="caption" fontWeight={500}>
                                {row.value}
                            </Typography>
                        </Box>
                    ))}
                </Stack>
            )}
            {!user.isActive && (
                <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                    Utilisateur désactivé
                </Typography>
            )}
        </Box>
    );
});

export const UserChip = memo(function UserChip({
    userUuid,
    fallbackText,
    emptyText = '-',
    variant = 'link',
}: UserChipProps) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const handleOpen = useCallback((e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget), []);
    const handleClose = useCallback(() => setAnchor(null), []);

    const { data: users, isLoading } = useUserLookup();

    if (!userUuid) {
        const label = (fallbackText && fallbackText.trim()) || emptyText;
        return (
            <Typography component="span" variant="body2" fontWeight={500}>
                {label}
            </Typography>
        );
    }

    if (isLoading) {
        return <CircularProgress size={14} />;
    }

    const user = users?.find((u) => u.uuid === userUuid) ?? null;

    if (!user) {
        // FK pose mais user supprime/inconnu : on affiche le fallback ou l'uuid tronque.
        const label = (fallbackText && fallbackText.trim()) || `${userUuid.slice(0, 8)}…`;
        return (
            <Typography component="span" variant="body2" fontWeight={500}>
                {label}
            </Typography>
        );
    }

    const display = formatUserDisplayName(user);
    const open = Boolean(anchor);

    return (
        <>
            <Link
                component="button"
                type="button"
                variant="body2"
                onClick={handleOpen}
                underline={variant === 'link' ? 'hover' : 'none'}
                sx={{
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: variant === 'text' ? 'text.primary' : 'primary.main',
                }}
                aria-label={`Voir les informations de ${display}`}
            >
                {display}
            </Link>
            <Popover
                open={open}
                anchorEl={anchor}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                <PopoverContent user={user} />
            </Popover>
        </>
    );
});
