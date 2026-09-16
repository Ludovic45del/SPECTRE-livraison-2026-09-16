/**
 * Generate Campaign Recap Delivery Sheet Modal
 *
 * Une carte éditable par cible (FSEC) au lieu d'un tableau qui déborde en
 * largeur. Chaque carte regroupe les saisies en deux blocs « Livraison » et
 * « Réception » et reprend le formalisme de la modal FSEC mono-cible.
 *
 * 2 boutons :
 * - « Enregistrer » : PATCH batch (interface, date, OK/KO, remarques…)
 * - « Générer le PDF » : POST (lit depuis la base, plus de body)
 *
 * La signature TCI reste un acte par cible : cette modal n'appose pas de
 * signataire, elle persiste juste les valeurs. La phase 2 (signature) se
 * fait depuis le header FSEC ; on affiche ici l'état signé en lecture seule.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Typography,
    Box,
    Stack,
    Chip,
    Paper,
    Divider,
    CircularProgress,
    Tooltip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined';
import AssignmentTurnedInOutlined from '@mui/icons-material/AssignmentTurnedInOutlined';
import VerifiedOutlined from '@mui/icons-material/VerifiedOutlined';
import dayjs, { Dayjs } from 'dayjs';
import {
    CampaignWithRelations,
    CampaignRecapTargetPayload,
    DeliveryRecapRow,
    useCampaignDeliveryRecap,
    useSaveCampaignDeliveryRecap,
    useGenerateCampaignDeliverySheet,
} from '@entities/campaign';
import { UserSelect } from '@entities/user';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';

interface GenerateRecapSheetModalProps {
    open: boolean;
    onClose: () => void;
    campaign: CampaignWithRelations;
}

interface RowState {
    versionUuid: string;
    name: string;
    numInterfaceIo: string;
    deliveryDate: string; // YYYY-MM-DD
    deliveryValidation: string;
    deliveryRemarques: string;
    hasSealingStep: boolean;
    deliveryValidatedByUsername: string | null;
    deliveryValidatedAt: string | null;
    /** uuid UserProfile sélectionné dans le dropdown accepteur. */
    deliveryAcceptorUserUuid: string | null;
    deliveryAcceptorUsername: string | null;
    deliveryReceiverName: string;
    deliveryReceiverDate: string; // YYYY-MM-DD
}

const VALIDATION_OPTIONS = ['', 'OK', 'KO'];

type StatusColor = 'default' | 'warning' | 'info' | 'success' | 'error';

/** Statut synthétique d'une cible, dérivé de ses saisies. */
function rowStatus(row: RowState): { label: string; color: StatusColor } {
    if (row.deliveryValidation === 'OK') return { label: 'Validée OK', color: 'success' };
    if (row.deliveryValidation === 'KO') return { label: 'Validée KO', color: 'error' };
    if (row.deliveryDate) return { label: 'Livrée', color: 'info' };
    return { label: 'À renseigner', color: 'warning' };
}

const toDayjs = (s: string): Dayjs | null => (s ? dayjs(s) : null);
const fromDayjs = (d: Dayjs | null): string => (d && d.isValid() ? d.format('YYYY-MM-DD') : '');

function fromRecapRow(row: DeliveryRecapRow): RowState {
    return {
        versionUuid: row.versionUuid,
        name: row.displayName,
        numInterfaceIo: row.numInterfaceIo ?? '',
        deliveryDate: row.deliveryDate ? dayjs(row.deliveryDate).format('YYYY-MM-DD') : '',
        deliveryValidation: row.deliveryValidation ?? '',
        deliveryRemarques: row.deliveryRemarques ?? '',
        hasSealingStep: row.hasSealingStep,
        deliveryValidatedByUsername: row.deliveryValidatedByUsername,
        deliveryValidatedAt: row.deliveryValidatedAt,
        deliveryAcceptorUserUuid: row.deliveryAcceptorUserUuid,
        deliveryAcceptorUsername: row.deliveryAcceptorUsername,
        deliveryReceiverName: row.deliveryReceiverName ?? '',
        deliveryReceiverDate: row.deliveryReceiverDate ? dayjs(row.deliveryReceiverDate).format('YYYY-MM-DD') : '',
    };
}

/** Libellé de section avec icône (formalisme « overline » de la modal FSEC). */
function SectionLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
    return (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.25 }}>
            <Box sx={{ color: 'text.secondary', display: 'flex', '& svg': { fontSize: 16 } }}>{icon}</Box>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
                {children}
            </Typography>
        </Stack>
    );
}

export function GenerateRecapSheetModal({ open, onClose, campaign }: GenerateRecapSheetModalProps) {
    const { showNotification } = useNotification();
    const { data: rowsFromApi, isLoading } = useCampaignDeliveryRecap(open ? campaign.uuid : '');
    const saveMutation = useSaveCampaignDeliveryRecap();
    const generateMutation = useGenerateCampaignDeliverySheet();
    const [rows, setRows] = useState<RowState[]>([]);

    const campaignCode = useMemo(() => {
        const installationLabel = campaign.installation?.label ?? 'UNK';
        return `${campaign.year}-${installationLabel}_${campaign.name}`;
    }, [campaign.year, campaign.installation?.label, campaign.name]);

    useEffect(() => {
        if (!open || !rowsFromApi) return;
        setRows(rowsFromApi.map(fromRecapRow));
    }, [open, rowsFromApi]);

    const validatedCount = useMemo(() => rows.filter((r) => r.deliveryValidation === 'OK').length, [rows]);

    const updateRow = (idx: number, patch: Partial<RowState>) => {
        setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
    };

    const handleSave = async () => {
        try {
            const payload: CampaignRecapTargetPayload[] = rows.map((r) => ({
                versionUuid: r.versionUuid,
                numInterfaceIo: r.hasSealingStep ? r.numInterfaceIo : null,
                deliveryDate: r.deliveryDate || null,
                deliveryValidation: r.deliveryValidation,
                deliveryRemarques: r.deliveryRemarques,
                deliveryAcceptorUserUuid: r.deliveryAcceptorUserUuid,
                deliveryReceiverName: r.deliveryReceiverName.trim() || null,
                deliveryReceiverDate: r.deliveryReceiverDate || null,
            }));
            const saved = await saveMutation.mutateAsync({ campaignUuid: campaign.uuid, targets: payload });
            setRows(saved.map(fromRecapRow));
            showNotification('Saisies enregistrées', 'success');
        } catch (err) {
            showNotification(getErrorMessage(err, 'Erreur lors de la sauvegarde'), 'error');
        }
    };

    const handleGenerate = async () => {
        try {
            const blob = await generateMutation.mutateAsync(campaign.uuid);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fiche-livraison-recap-${campaignCode}.pdf`.replace(/\s+/g, '_');
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            showNotification('Fiche récapitulative générée', 'success');
        } catch (err) {
            showNotification(getErrorMessage(err, 'Erreur lors de la génération'), 'error');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                <Stack direction="row" spacing={1.5} alignItems="center" useFlexGap flexWrap="wrap">
                    <span>Fiche de livraison récapitulative — {campaignCode}</span>
                    {rows.length > 0 && (
                        <Chip
                            size="small"
                            color={validatedCount === rows.length ? 'success' : 'default'}
                            label={`${validatedCount}/${rows.length} validée${rows.length > 1 ? 's' : ''}`}
                        />
                    )}
                </Stack>
            </DialogTitle>
            <DialogContent sx={{ bgcolor: 'background.default' }}>
                {isLoading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress size={32} />
                    </Box>
                ) : rows.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                        Aucune cible (FSEC) rattachée à cette campagne.
                    </Typography>
                ) : (
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        {rows.map((row, idx) => {
                            const status = rowStatus(row);
                            const signedTooltip =
                                row.deliveryValidatedByUsername && row.deliveryValidatedAt
                                    ? `Signée le ${dayjs(row.deliveryValidatedAt).format('DD/MM/YYYY HH:mm')}`
                                    : '';
                            return (
                                <Paper
                                    key={row.versionUuid}
                                    variant="outlined"
                                    sx={{
                                        p: { xs: 2, sm: 2.5 },
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                        transition: (t) => t.transitions.create('border-color', { duration: 150 }),
                                        '&:hover': { borderColor: 'primary.main' },
                                    }}
                                >
                                    {/* En-tête de carte : cible + statut + signature */}
                                    <Stack
                                        direction="row"
                                        spacing={1.5}
                                        alignItems="center"
                                        useFlexGap
                                        flexWrap="wrap"
                                        sx={{ mb: 2 }}
                                    >
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            {row.name}
                                        </Typography>
                                        <Chip size="small" color={status.color} label={status.label} />
                                        <Box sx={{ flexGrow: 1 }} />
                                        {row.deliveryValidatedByUsername ? (
                                            <Tooltip title={signedTooltip}>
                                                <Chip
                                                    size="small"
                                                    color="success"
                                                    variant="outlined"
                                                    icon={<VerifiedOutlined />}
                                                    label={`Signée · ${row.deliveryValidatedByUsername}`}
                                                />
                                            </Tooltip>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">
                                                Non signée TCI
                                            </Typography>
                                        )}
                                    </Stack>

                                    {/* Bloc Livraison */}
                                    <SectionLabel icon={<LocalShippingOutlined />}>Livraison</SectionLabel>
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gap: 2,
                                            gridTemplateColumns: {
                                                xs: '1fr',
                                                sm: 'repeat(2, 1fr)',
                                                lg: 'repeat(4, 1fr)',
                                            },
                                        }}
                                    >
                                        <Tooltip
                                            title={
                                                row.hasSealingStep ? '' : "Modifiable une fois l'étape Scellement créée"
                                            }
                                        >
                                            <TextField
                                                label="N° Interface I0"
                                                value={row.numInterfaceIo}
                                                onChange={(e) => updateRow(idx, { numInterfaceIo: e.target.value })}
                                                size="small"
                                                fullWidth
                                                disabled={!row.hasSealingStep}
                                                inputProps={{
                                                    maxLength: 50,
                                                    'aria-label': `N° Interface ${row.name}`,
                                                }}
                                            />
                                        </Tooltip>
                                        <DatePicker
                                            label="Date de livraison"
                                            value={toDayjs(row.deliveryDate)}
                                            onChange={(d) => updateRow(idx, { deliveryDate: fromDayjs(d) })}
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    size: 'small',
                                                    inputProps: { 'aria-label': `Date livraison ${row.name}` },
                                                },
                                            }}
                                        />
                                        <UserSelect
                                            label="Accepteur (phase 1)"
                                            value={row.deliveryAcceptorUserUuid}
                                            onChange={(uuid) => updateRow(idx, { deliveryAcceptorUserUuid: uuid })}
                                            size="small"
                                            ariaLabel={`Accepteur ${row.name}`}
                                        />
                                        <TextField
                                            select
                                            label="Validation"
                                            value={row.deliveryValidation}
                                            onChange={(e) => updateRow(idx, { deliveryValidation: e.target.value })}
                                            size="small"
                                            fullWidth
                                            inputProps={{ 'aria-label': `Validation ${row.name}` }}
                                        >
                                            {VALIDATION_OPTIONS.map((opt) => (
                                                <MenuItem key={opt} value={opt}>
                                                    {opt || '—'}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                        <TextField
                                            label="Remarques"
                                            value={row.deliveryRemarques}
                                            onChange={(e) => updateRow(idx, { deliveryRemarques: e.target.value })}
                                            size="small"
                                            fullWidth
                                            multiline
                                            minRows={1}
                                            maxRows={4}
                                            sx={{ gridColumn: '1 / -1' }}
                                            inputProps={{
                                                maxLength: 500,
                                                'aria-label': `Remarques ${row.name}`,
                                            }}
                                        />
                                    </Box>

                                    <Divider sx={{ my: 2.5 }} />

                                    {/* Bloc Réception */}
                                    <SectionLabel icon={<AssignmentTurnedInOutlined />}>Réception</SectionLabel>
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gap: 2,
                                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                                        }}
                                    >
                                        <TextField
                                            label="Réceptionnaire"
                                            value={row.deliveryReceiverName}
                                            onChange={(e) => updateRow(idx, { deliveryReceiverName: e.target.value })}
                                            size="small"
                                            fullWidth
                                            inputProps={{
                                                maxLength: 100,
                                                'aria-label': `Réceptionnaire ${row.name}`,
                                            }}
                                        />
                                        <DatePicker
                                            label="Date de réception"
                                            value={toDayjs(row.deliveryReceiverDate)}
                                            onChange={(d) => updateRow(idx, { deliveryReceiverDate: fromDayjs(d) })}
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    size: 'small',
                                                    inputProps: { 'aria-label': `Date réception ${row.name}` },
                                                },
                                            }}
                                        />
                                    </Box>
                                </Paper>
                            );
                        })}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Fermer
                </Button>
                <Button
                    onClick={handleSave}
                    variant="outlined"
                    disabled={saveMutation.isPending || isLoading || rows.length === 0}
                >
                    {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
                <Button onClick={handleGenerate} variant="contained" disabled={generateMutation.isPending || isLoading}>
                    {generateMutation.isPending ? 'Génération…' : 'Générer le PDF'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
