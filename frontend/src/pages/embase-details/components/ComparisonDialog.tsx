import { Suspense, lazy, memo } from 'react';
import { Dialog, DialogTitle, DialogContent, Skeleton, Stack, Typography, IconButton } from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CloseIcon from '@mui/icons-material/Close';
import { type Embase } from '@entities/embase';
// recharts → lazy : le chunk charts ne se charge qu'à l'ouverture du dialogue.
const ComparaisonTab = lazy(() =>
    import('@features/embase/comparaison-tab').then((m) => ({ default: m.ComparaisonTab })),
);

interface ComparisonDialogProps {
    open: boolean;
    onClose: () => void;
    embase: Embase;
}

export const ComparisonDialog = memo(function ComparisonDialog({ open, onClose, embase }: ComparisonDialogProps) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <CompareArrowsIcon sx={{ color: '#9c27b0' }} />
                    <Typography variant="h6" fontWeight={600}>
                        Comparaison V1 / V2 — {embase.identifier}
                    </Typography>
                </Stack>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 3 }}>
                {open && (
                    <Suspense fallback={<Skeleton variant="rounded" height={320} />}>
                        <ComparaisonTab embase={embase} />
                    </Suspense>
                )}
            </DialogContent>
        </Dialog>
    );
});
