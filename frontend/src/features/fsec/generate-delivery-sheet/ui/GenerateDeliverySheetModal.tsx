/**
 * Generate Delivery Sheet Modal — workflow 2 phases.
 *
 * Phase 1 (équipe livraison) : N° Interface I0 + date livraison.
 * Phase 2 (TCI) : validation OK/KO + remarques + signature implicite (utilisateur courant).
 *
 * Les saisies sont persistées côté serveur via PATCH dédiés ; le PDF est
 * généré depuis l'état stocké (plus aucune saisie dans la requête POST).
 */

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    MenuItem,
    Typography,
    Box,
    Chip,
    Divider,
    CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import {
    Fsec,
    useFsecDeliveryInfo,
    useUpdateFsecDeliveryInfo,
    useUpdateFsecDeliveryValidation,
    useGenerateFsecDeliverySheet,
} from '@entities/fsec';
import { UserSelect } from '@entities/user';
import { useNotification } from '@shared/ui';
import { getErrorMessage } from '@shared/lib';

interface GenerateDeliverySheetModalProps {
    open: boolean;
    onClose: () => void;
    fsec: Fsec;
}

const VALIDATION_OPTIONS = ['', 'OK', 'KO'];

function formatStatus(snapshot: { deliveryDate: string | null; deliveryValidation: string | null }): {
    label: string;
    color: 'default' | 'warning' | 'info' | 'success' | 'error';
} {
    if (snapshot.deliveryValidation === 'OK') return { label: 'Validée OK', color: 'success' };
    if (snapshot.deliveryValidation === 'KO') return { label: 'Validée KO', color: 'error' };
    if (snapshot.deliveryDate) return { label: 'Phase 1 complétée', color: 'info' };
    return { label: 'À renseigner', color: 'warning' };
}

export function GenerateDeliverySheetModal({ open, onClose, fsec }: GenerateDeliverySheetModalProps) {
    const { showNotification } = useNotification();
    const { data: snapshot, isLoading } = useFsecDeliveryInfo(fsec.versionUuid, open);
    const updateInfo = useUpdateFsecDeliveryInfo();
    const updateValidation = useUpdateFsecDeliveryValidation();
    const generatePdf = useGenerateFsecDeliverySheet();

    const [numInterfaceIo, setNumInterfaceIo] = useState('');
    const [deliveryDate, setDeliveryDate] = useState<Dayjs | null>(null);
    const [acceptorUserUuid, setAcceptorUserUuid] = useState<string | null>(null);
    const [validation, setValidation] = useState('');
    const [remarques, setRemarques] = useState('');
    const [receiverName, setReceiverName] = useState('');
    const [receiverDate, setReceiverDate] = useState<Dayjs | null>(null);

    useEffect(() => {
        if (!open || !snapshot) return;
        setNumInterfaceIo(snapshot.numInterfaceIo ?? '');
        setDeliveryDate(snapshot.deliveryDate ? dayjs(snapshot.deliveryDate) : null);
        setAcceptorUserUuid(snapshot.deliveryAcceptorUserUuid ?? null);
        setValidation(snapshot.deliveryValidation ?? '');
        setRemarques(snapshot.deliveryRemarques ?? '');
        setReceiverName(snapshot.deliveryReceiverName ?? '');
        setReceiverDate(snapshot.deliveryReceiverDate ? dayjs(snapshot.deliveryReceiverDate) : null);
    }, [open, snapshot]);

    const handleSavePhase1 = async () => {
        try {
            await updateInfo.mutateAsync({
                versionUuid: fsec.versionUuid,
                payload: {
                    numInterfaceIo: snapshot?.hasSealingStep ? numInterfaceIo : null,
                    deliveryDate: deliveryDate ? deliveryDate.format('YYYY-MM-DD') : null,
                    deliveryAcceptorUserUuid: acceptorUserUuid,
                },
            });
            showNotification('Phase 1 enregistrée', 'success');
        } catch (err) {
            showNotification(getErrorMessage(err, 'Erreur lors de la sauvegarde'), 'error');
        }
    };

    const handleSavePhase2 = async () => {
        try {
            await updateValidation.mutateAsync({
                versionUuid: fsec.versionUuid,
                payload: {
                    deliveryValidation: validation,
                    deliveryRemarques: remarques,
                    deliveryReceiverName: receiverName.trim() || null,
                    deliveryReceiverDate: receiverDate ? receiverDate.format('YYYY-MM-DD') : null,
                },
            });
            showNotification(validation ? `Fiche validée (${validation}) et signée` : 'Phase 2 enregistrée', 'success');
        } catch (err) {
            showNotification(getErrorMessage(err, 'Erreur lors de la validation'), 'error');
        }
    };

    const handleGeneratePdf = async () => {
        try {
            const blob = await generatePdf.mutateAsync(fsec.versionUuid);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fiche-livraison-${fsec.displayName}.pdf`.replace(/\s+/g, '_');
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            showNotification('PDF généré', 'success');
        } catch (err) {
            showNotification(getErrorMessage(err, 'Erreur lors de la génération'), 'error');
        }
    };

    const status = snapshot ? formatStatus(snapshot) : null;
    // Phase 1 « signée » = un accepteur est enregistré (sa signature de profil est
    // alors figée côté serveur, obligatoire dès qu'un accepteur est désigné).
    const phase1Signed = Boolean(snapshot?.deliveryAcceptorUsername);
    const phase2Locked = Boolean(snapshot?.deliveryValidatedByUsername);

    const phase1ButtonLabel = updateInfo.isPending
        ? 'Enregistrement…'
        : acceptorUserUuid
          ? phase1Signed
              ? 'Mettre à jour la signature'
              : 'Signer et enregistrer'
          : 'Enregistrer phase 1';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                    <span>Fiche de livraison — {fsec.displayName}</span>
                    {status && <Chip label={status.label} color={status.color} size="small" />}
                </Stack>
            </DialogTitle>
            <DialogContent>
                {isLoading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress size={32} />
                    </Box>
                ) : (
                    <Stack spacing={3} sx={{ pt: 1 }}>
                        {/* Phase 1 */}
                        <Box>
                            <Typography variant="overline" color="text.secondary">
                                Phase 1 — Livraison
                            </Typography>
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                <TextField
                                    label="N° Interface I0"
                                    value={numInterfaceIo}
                                    onChange={(e) => setNumInterfaceIo(e.target.value)}
                                    size="small"
                                    fullWidth
                                    disabled={!snapshot?.hasSealingStep}
                                    helperText={
                                        !snapshot?.hasSealingStep
                                            ? "Modifiable une fois l'étape Scellement créée"
                                            : 'Synchronisé avec la rubrique Scellement'
                                    }
                                    inputProps={{ maxLength: 50, 'aria-label': 'N° Interface I0' }}
                                />
                                <DatePicker
                                    label="Date de livraison"
                                    value={deliveryDate}
                                    onChange={(d) => setDeliveryDate(d)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: 'small',
                                            inputProps: { 'aria-label': 'Date de livraison' },
                                        },
                                    }}
                                />
                                <UserSelect
                                    label="Nom de l'accepteur"
                                    value={acceptorUserUuid}
                                    onChange={setAcceptorUserUuid}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    L'accepteur signe avec la signature enregistrée dans son profil.
                                </Typography>
                                {phase1Signed && (
                                    <Typography variant="caption" color="text.secondary">
                                        Signée par <strong>{snapshot?.deliveryAcceptorUsername}</strong>
                                    </Typography>
                                )}
                                <Box display="flex" justifyContent="flex-end">
                                    <Button
                                        onClick={handleSavePhase1}
                                        variant="outlined"
                                        size="small"
                                        disabled={updateInfo.isPending}
                                    >
                                        {phase1ButtonLabel}
                                    </Button>
                                </Box>
                            </Stack>
                        </Box>

                        <Divider />

                        {/* Phase 2 */}
                        <Box>
                            <Typography variant="overline" color="text.secondary">
                                Phase 2 — Validation TCI
                            </Typography>
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                <TextField
                                    select
                                    label="Validation intégrité LIE + LCI"
                                    value={validation}
                                    onChange={(e) => setValidation(e.target.value)}
                                    size="small"
                                    fullWidth
                                    inputProps={{ 'aria-label': 'Validation intégrité LIE LCI' }}
                                >
                                    {VALIDATION_OPTIONS.map((opt) => (
                                        <MenuItem key={opt} value={opt}>
                                            {opt || '— (laisser vide)'}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    label="Remarques"
                                    value={remarques}
                                    onChange={(e) => setRemarques(e.target.value)}
                                    multiline
                                    minRows={2}
                                    maxRows={4}
                                    fullWidth
                                    size="small"
                                    inputProps={{ maxLength: 500, 'aria-label': 'Remarques' }}
                                />
                                <TextField
                                    label="Nom du réceptionnaire"
                                    value={receiverName}
                                    onChange={(e) => setReceiverName(e.target.value)}
                                    size="small"
                                    fullWidth
                                    inputProps={{ maxLength: 100, 'aria-label': 'Nom du réceptionnaire' }}
                                />
                                <DatePicker
                                    label="Date de réception"
                                    value={receiverDate}
                                    onChange={(d) => setReceiverDate(d)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            size: 'small',
                                            inputProps: { 'aria-label': 'Date de réception' },
                                        },
                                    }}
                                />
                                {phase2Locked && (
                                    <Typography variant="caption" color="text.secondary">
                                        Signée par <strong>{snapshot?.deliveryValidatedByUsername}</strong>
                                        {snapshot?.deliveryValidatedAt
                                            ? ` le ${dayjs(snapshot.deliveryValidatedAt).format('DD/MM/YYYY HH:mm')}`
                                            : ''}
                                    </Typography>
                                )}
                                <Box display="flex" justifyContent="flex-end">
                                    <Button
                                        onClick={handleSavePhase2}
                                        variant="outlined"
                                        size="small"
                                        disabled={updateValidation.isPending}
                                    >
                                        {updateValidation.isPending
                                            ? 'Enregistrement…'
                                            : phase2Locked
                                              ? 'Mettre à jour la signature'
                                              : 'Signer et valider'}
                                    </Button>
                                </Box>
                            </Stack>
                        </Box>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Fermer
                </Button>
                <Button onClick={handleGeneratePdf} variant="contained" disabled={generatePdf.isPending || isLoading}>
                    {generatePdf.isPending ? 'Génération…' : 'Générer le PDF'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
