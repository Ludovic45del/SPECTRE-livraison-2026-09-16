/**
 * User avatar with greeting, date, and profile chips.
 * @module pages/home/components/UserAvatarSection
 */

import { memo } from 'react';
import { Avatar, Box, Chip, Skeleton, Typography } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BadgeIcon from '@mui/icons-material/Badge';
import BusinessIcon from '@mui/icons-material/Business';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';

interface UserAvatarSectionProps {
    userLoading: boolean;
    initials: string;
    greeting: string;
    displayName: string;
    today: string;
    roleLabel: string;
    avatarUrl?: string | null;
    user: { service?: string; bureau?: string } | null;
}

export default memo<UserAvatarSectionProps>(function UserAvatarSection({
    userLoading,
    initials,
    greeting,
    displayName,
    today,
    roleLabel,
    avatarUrl,
    user,
}) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            {userLoading ? (
                <Skeleton variant="circular" width={56} height={56} />
            ) : (
                <Avatar
                    src={avatarUrl ?? undefined}
                    alt={displayName}
                    sx={{
                        width: 56,
                        height: 56,
                        bgcolor: 'primary.main',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                    }}
                >
                    {initials}
                </Avatar>
            )}

            <Box>
                {userLoading ? (
                    <Skeleton width={260} height={32} />
                ) : (
                    <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {greeting}, {displayName}
                    </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                    <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: '0.85rem', textTransform: 'capitalize' }}
                    >
                        {today}
                    </Typography>
                </Box>

                {!userLoading && user && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        {roleLabel && <Chip icon={<BadgeIcon sx={{ fontSize: 14 }} />} label={roleLabel} />}
                        {user.service && <Chip icon={<BusinessIcon sx={{ fontSize: 14 }} />} label={user.service} />}
                        {user.bureau && (
                            <Chip icon={<MeetingRoomIcon sx={{ fontSize: 14 }} />} label={`Bureau ${user.bureau}`} />
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
});
