/**
 * Ligne du tableau Catalogue (formalisme aligné sur pages/campaigns).
 */

import { memo, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { IconButton, Link, Stack, TableCell, TableRow, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
    formatLocation,
    isElement,
    QuantityBadge,
    RubricBadge,
    StatusBadge,
    StructurationTypeBadge,
    type StockCatalogItem,
} from '@entities/stock-item';
import { paths } from '@shared/config';
import { motion } from '@shared/ui/motion';
import { getCatalogFsecAssignment } from '../lib/catalog.helpers';

interface CatalogTableRowProps {
    item: StockCatalogItem;
    onClick?: (item: StockCatalogItem) => void;
    /** Duplication (R06) : ouvre le formulaire de création pré-rempli. */
    onDuplicate?: (item: StockCatalogItem) => void;
}

/** Cellule « Campagne / FSEC » (R01). */
function FsecAssignmentCell({ item }: { item: StockCatalogItem }) {
    const assignment = getCatalogFsecAssignment(item);

    if (assignment.kind === 'none') {
        return <Typography color="text.secondary">—</Typography>;
    }

    if (assignment.kind === 'declared') {
        // Destination saisie à la création : purement déclarative (aucune réservation).
        return (
            <Tooltip title="Destination déclarée à la création (non réservée)">
                <Typography color="text.secondary" noWrap>
                    destination : {assignment.fsecName}
                </Typography>
            </Tooltip>
        );
    }

    return (
        <Stack spacing={0}>
            {assignment.fsecSlug ? (
                <Link
                    component={RouterLink}
                    to={paths.fsec.root(assignment.fsecSlug)}
                    underline="hover"
                    fontWeight={500}
                    noWrap
                    onClick={(e) => e.stopPropagation()}
                >
                    {assignment.fsecName}
                </Link>
            ) : (
                <Typography fontWeight={500} noWrap>
                    {assignment.fsecName}
                </Typography>
            )}
            {assignment.campaignName && (
                <Typography variant="caption" color="text.secondary" noWrap>
                    {assignment.campaignName}
                </Typography>
            )}
        </Stack>
    );
}

export const CatalogTableRow = memo(function CatalogTableRow({ item, onClick, onDuplicate }: CatalogTableRowProps) {
    const theme = useTheme();

    const handleDoubleClick = useCallback(() => {
        if (onClick) onClick(item);
    }, [item, onClick]);

    const handleButtonClick = useCallback(() => {
        if (onClick) onClick(item);
    }, [item, onClick]);

    const handleDuplicateClick = useCallback(() => {
        if (onDuplicate) onDuplicate(item);
    }, [item, onDuplicate]);

    return (
        <TableRow
            hover
            sx={{
                cursor: onClick ? 'pointer' : 'default',
                transition: `background-color ${motion.fast}`,
                '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
            }}
            onDoubleClick={handleDoubleClick}
        >
            <TableCell>
                <Typography fontWeight={500}>{item.name}</Typography>
            </TableCell>
            <TableCell>
                <Typography
                    component="span"
                    sx={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                        fontSize: '0.78rem',
                        color: 'text.secondary',
                    }}
                >
                    {item.reference ?? '—'}
                </Typography>
            </TableCell>
            <TableCell>
                <RubricBadge category={item.category} />
            </TableCell>
            <TableCell>
                {item.structurationType ? (
                    <StructurationTypeBadge type={item.structurationType} />
                ) : (
                    <Typography color="text.secondary">—</Typography>
                )}
            </TableCell>
            <TableCell>
                <Typography color={item.fournisseur ? 'text.primary' : 'text.secondary'}>
                    {item.fournisseur ?? '—'}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography color="text.secondary">{formatLocation(item)}</Typography>
            </TableCell>
            <TableCell>
                <FsecAssignmentCell item={item} />
            </TableCell>
            <TableCell>
                {isElement(item) ? (
                    item.status ? (
                        <StatusBadge status={item.status} />
                    ) : (
                        <Typography color="text.secondary">—</Typography>
                    )
                ) : (
                    <QuantityBadge item={item} />
                )}
            </TableCell>
            <TableCell align="center">
                <Stack direction="row" spacing={0.5} justifyContent="center">
                    {onDuplicate && (
                        <Tooltip title="Dupliquer">
                            <IconButton
                                size="small"
                                onClick={handleDuplicateClick}
                                aria-label={`Dupliquer ${item.name}`}
                            >
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {onClick && (
                        <Tooltip title="Voir le détail">
                            <IconButton
                                size="small"
                                onClick={handleButtonClick}
                                aria-label={`Voir le détail de ${item.name}`}
                            >
                                <ArrowForwardIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            </TableCell>
        </TableRow>
    );
});
