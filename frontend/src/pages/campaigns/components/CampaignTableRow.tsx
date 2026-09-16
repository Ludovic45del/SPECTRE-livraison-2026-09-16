/**
 * Campaign Table Row Component
 * @module pages/campaigns/components
 */

import { useCallback, memo } from 'react';
import { TableRow, TableCell, Typography, IconButton, Tooltip, alpha, useTheme } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { CampaignWithRelations, usePrefetchCampaign } from '@entities/campaign';
import { DataChip } from '@widgets/data-chip';
import { useHoverPrefetch } from '@shared/lib';
import { motion } from '@shared/ui/motion';

interface CampaignTableRowProps {
    campaign: CampaignWithRelations;
    onNavigate: (uuid: string) => void;
}

export const CampaignTableRow = memo(function CampaignTableRow({ campaign, onNavigate }: CampaignTableRowProps) {
    const theme = useTheme();

    const handleDoubleClick = useCallback(() => {
        onNavigate(campaign.slug);
    }, [campaign.slug, onNavigate]);

    const handleButtonClick = useCallback(() => {
        onNavigate(campaign.slug);
    }, [campaign.slug, onNavigate]);

    const prefetchCampaign = usePrefetchCampaign();
    const hoverPrefetch = useHoverPrefetch(
        useCallback(() => prefetchCampaign(campaign.uuid), [prefetchCampaign, campaign.uuid]),
    );

    return (
        <TableRow
            hover
            sx={{
                cursor: 'pointer',
                transition: `background-color ${motion.fast}`,
                '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
            }}
            onDoubleClick={handleDoubleClick}
            {...hoverPrefetch}
        >
            <TableCell>
                <Typography fontWeight={500}>{campaign.year}</Typography>
            </TableCell>
            <TableCell>
                <DataChip label={campaign.semester} color="#6B7280" />
            </TableCell>
            <TableCell>
                <Typography fontWeight={500}>{campaign.name}</Typography>
            </TableCell>
            <TableCell>
                {campaign.installation ? (
                    <DataChip label={campaign.installation.label} color={campaign.installation.color} />
                ) : (
                    <Typography color="text.secondary">-</Typography>
                )}
            </TableCell>
            <TableCell>
                {campaign.type ? (
                    <DataChip label={campaign.type.label} color={campaign.type.color} />
                ) : (
                    <Typography color="text.secondary">-</Typography>
                )}
            </TableCell>
            <TableCell>
                {campaign.status ? (
                    <DataChip label={campaign.status.label} color={campaign.status.color} />
                ) : (
                    <Typography color="text.secondary">-</Typography>
                )}
            </TableCell>
            <TableCell align="center">
                <Tooltip title="Voir les détails">
                    <IconButton
                        size="small"
                        onClick={handleButtonClick}
                        aria-label={`Voir les détails de ${campaign.name}`}
                    >
                        <ArrowForwardIcon />
                    </IconButton>
                </Tooltip>
            </TableCell>
        </TableRow>
    );
});
