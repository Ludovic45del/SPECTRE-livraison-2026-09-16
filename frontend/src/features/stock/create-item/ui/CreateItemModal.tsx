/**
 * CreateItemModal — modale de création en 2 étapes (CDC §8.1).
 *
 * Étape 1 : choix du kind (élément sérialisé / consommable).
 * Étape 2 : formulaire adaptatif (ElementFormShell ou ConsumableFormShell).
 *
 * Duplication (R06) : ouverte via `openWithPrefill(item)`, la modale saute
 * directement à l'étape 2 avec le formulaire pré-rempli et un titre dédié.
 */

import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ITEM_KIND, ITEM_KIND_COLORS } from '@entities/stock-item';
import { softChipSx } from '@shared/lib';
import { useCreateItemStore } from '../model';
import { KindChoiceStep } from './KindChoiceStep';
import { ElementFormShell } from './ElementFormShell';
import { ConsumableFormShell } from './ConsumableFormShell';

export function CreateItemModal() {
    const isOpen = useCreateItemStore((s) => s.isOpen);
    const step = useCreateItemStore((s) => s.step);
    const selectedKind = useCreateItemStore((s) => s.selectedKind);
    const prefill = useCreateItemStore((s) => s.prefill);
    const close = useCreateItemStore((s) => s.close);
    const reset = useCreateItemStore((s) => s.reset);
    const selectKind = useCreateItemStore((s) => s.selectKind);
    const goToKindStep = useCreateItemStore((s) => s.goToKindStep);
    const goToFormStep = useCreateItemStore((s) => s.goToFormStep);

    const handleClose = () => {
        // Reset pour repartir propre la prochaine fois (vide aussi `prefill`).
        reset();
    };

    const titleByStep = (() => {
        if (prefill) return `Dupliquer — ${prefill.name}`;
        if (step === 'kind') return 'Nouvel élément au catalogue';
        return selectedKind === ITEM_KIND.ELEMENT ? 'Nouvel élément sérialisé' : 'Nouveau consommable';
    })();

    return (
        <Dialog
            open={isOpen}
            onClose={handleClose}
            maxWidth={step === 'form' ? 'md' : 'sm'}
            fullWidth
            aria-labelledby="create-stock-item-title"
        >
            <DialogTitle
                id="create-stock-item-title"
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}
            >
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <span>{titleByStep}</span>
                    {step === 'form' && (
                        <Chip
                            label={ITEM_KIND_COLORS[selectedKind].label}
                            sx={softChipSx(ITEM_KIND_COLORS[selectedKind].color)}
                        />
                    )}
                </Stack>
                <IconButton aria-label="Fermer" onClick={handleClose} size="small">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            {step === 'kind' && (
                <>
                    <DialogContent dividers>
                        <KindChoiceStep selectedKind={selectedKind} onSelect={selectKind} />
                    </DialogContent>
                    <DialogActions sx={{ px: 3, py: 2 }}>
                        <Button onClick={close} color="inherit">
                            Annuler
                        </Button>
                        <Button onClick={goToFormStep} variant="contained">
                            Continuer
                        </Button>
                    </DialogActions>
                </>
            )}

            {step === 'form' && (
                <DialogContent dividers>
                    {selectedKind === ITEM_KIND.ELEMENT ? (
                        <ElementFormShell onBack={goToKindStep} onCancel={close} onSuccess={reset} prefill={prefill} />
                    ) : (
                        <ConsumableFormShell
                            onBack={goToKindStep}
                            onCancel={close}
                            onSuccess={reset}
                            prefill={prefill}
                        />
                    )}
                </DialogContent>
            )}
        </Dialog>
    );
}
