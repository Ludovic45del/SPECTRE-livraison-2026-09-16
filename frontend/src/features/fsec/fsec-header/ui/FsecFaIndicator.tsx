/**
 * FsecFaIndicator — remontée des Fiches d'Anomalie d'une cible dans le header
 * FSEC (retour R17).
 *
 * - Aucune FA → ne rend rien.
 * - Sinon, Chip d'alerte « N FA » : `error` si au moins une FA n'est pas close,
 *   `warning` si toutes sont closes.
 * - Clic : une seule FA → navigation directe vers sa fiche ; plusieurs → menu
 *   listant chaque FA (identifiant + pastille de statut).
 * - Échec de chargement (sans donnée en cache) → Chip neutre « FA : erreur »
 *   avec relance au clic. L'état d'erreur est volontairement DISTINCT de
 *   « aucune FA » : un indicateur absent laisserait croire à tort qu'aucune
 *   anomalie n'existe sur la cible (information de sécurité métier).
 *
 * Les FA sont liées à une VERSION de FSEC (`fsec_version_id`) : on interroge
 * `useFasByFsec(versionUuid)`, déjà invalidé à la création/mise à jour d'une FA.
 */

import { memo, useCallback, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { useFasByFsec, getFaStatusInfo, type Fa } from '@entities/fa';
import { paths } from '@shared/config';

/** Id du statut FA « Clos » (cf. FA_STATUSES[2] dans fa.constants). */
const FA_STATUS_ID_CLOS = 2;

const isFaClosed = (fa: Fa): boolean => fa.statusId === FA_STATUS_ID_CLOS;

/** Chemin de la fiche FA (slug calculé, repli UUID pour les anciens payloads). */
const faPath = (fa: Fa): string => paths.fa.root(fa.slug || fa.uuid);

interface FsecFaIndicatorProps {
    /** version_uuid de la FSEC affichée (les FA sont rattachées à une version). */
    fsecVersionUuid: string;
}

function StatusDot({ color, label }: { color: string; label: string }) {
    return (
        <Box
            component="span"
            role="img"
            aria-label={label}
            sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: color,
                display: 'inline-block',
                flexShrink: 0,
            }}
        />
    );
}

function FsecFaIndicatorComponent({ fsecVersionUuid }: FsecFaIndicatorProps) {
    const navigate = useNavigate();
    const { data: fas, isError, refetch } = useFasByFsec(fsecVersionUuid);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    // Id stable du menu (cible de `aria-controls` sur la chip déclencheur).
    const menuId = useId();

    const openCount = useMemo(() => (fas ?? []).filter((fa) => !isFaClosed(fa)).length, [fas]);

    const handleChipClick = useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            if (!fas || fas.length === 0) return;
            if (fas.length === 1) {
                navigate(faPath(fas[0]));
                return;
            }
            setAnchorEl(event.currentTarget);
        },
        [fas, navigate],
    );

    const handleCloseMenu = useCallback(() => setAnchorEl(null), []);

    const handleSelectFa = useCallback(
        (fa: Fa) => {
            setAnchorEl(null);
            navigate(faPath(fa));
        },
        [navigate],
    );

    const handleRetry = useCallback(() => {
        void refetch();
    }, [refetch]);

    // Erreur SANS donnée en cache : état explicite. Si un rafraîchissement en
    // arrière-plan échoue alors qu'une liste est déjà connue, on continue
    // d'afficher cette liste (plus informative qu'un état d'erreur).
    if (isError && fas === undefined) {
        return (
            <Tooltip title="Impossible de charger les fiches d'anomalie de cette cible — cliquer pour réessayer">
                <Chip
                    icon={<ReportProblemOutlinedIcon />}
                    label="FA : erreur"
                    color="default"
                    variant="outlined"
                    size="small"
                    clickable
                    onClick={handleRetry}
                    aria-label="Fiches d'anomalie : erreur de chargement, cliquer pour réessayer"
                    data-testid="fsec-fa-indicator-error"
                    sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600, borderStyle: 'dashed' }}
                />
            </Tooltip>
        );
    }

    if (!fas || fas.length === 0) return null;

    const count = fas.length;
    const hasMenu = count > 1;
    const isMenuOpen = Boolean(anchorEl);
    const label = `${count} FA`;
    const tooltip =
        openCount > 0
            ? `${openCount} fiche${openCount > 1 ? 's' : ''} d'anomalie non close${openCount > 1 ? 's' : ''} sur cette cible`
            : `${count} fiche${count > 1 ? 's' : ''} d'anomalie close${count > 1 ? 's' : ''} sur cette cible`;

    return (
        <>
            <Tooltip title={tooltip}>
                <Chip
                    icon={<ReportProblemOutlinedIcon />}
                    label={label}
                    color={openCount > 0 ? 'error' : 'warning'}
                    size="small"
                    clickable
                    onClick={handleChipClick}
                    aria-haspopup={hasMenu ? 'menu' : undefined}
                    // État d'ouverture du menu exposé aux technologies d'assistance ;
                    // `aria-controls` ne référence le menu que lorsqu'il est monté.
                    aria-expanded={hasMenu ? isMenuOpen : undefined}
                    aria-controls={hasMenu && isMenuOpen ? menuId : undefined}
                    aria-label={`${label} sur cette cible`}
                    data-testid="fsec-fa-indicator"
                    sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }}
                />
            </Tooltip>
            {hasMenu && (
                <Menu
                    anchorEl={anchorEl}
                    open={isMenuOpen}
                    onClose={handleCloseMenu}
                    MenuListProps={{ id: menuId, 'aria-label': "Fiches d'anomalie de la cible", dense: true }}
                >
                    {fas.map((fa) => {
                        const status = getFaStatusInfo(fa.statusId);
                        return (
                            <MenuItem key={fa.uuid} onClick={() => handleSelectFa(fa)}>
                                <ListItemIcon sx={{ minWidth: 24 }}>
                                    <StatusDot color={status.color} label={status.label} />
                                </ListItemIcon>
                                <ListItemText primary={fa.identifier} secondary={status.label} />
                            </MenuItem>
                        );
                    })}
                </Menu>
            )}
        </>
    );
}

export const FsecFaIndicator = memo(FsecFaIndicatorComponent);
