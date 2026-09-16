import { memo } from 'react';
import { Paper, Stack, Typography, IconButton, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';

interface EditableSectionProps {
    title: string;
    isEditing: boolean;
    isPending: boolean;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    children: React.ReactNode;
}

export const EditableSection = memo(function EditableSection({
    title,
    isEditing,
    isPending,
    onEdit,
    onSave,
    onCancel,
    children,
}: EditableSectionProps) {
    return (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 1, position: 'relative' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                    {title}
                </Typography>
                {!isEditing ? (
                    <IconButton size="small" onClick={onEdit} sx={{ color: 'primary.main' }}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                ) : (
                    <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={onCancel} startIcon={<CloseIcon />} disabled={isPending}>
                            Annuler
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            onClick={onSave}
                            startIcon={<SaveIcon />}
                            disabled={isPending}
                        >
                            {isPending ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                    </Stack>
                )}
            </Stack>
            {children}
        </Paper>
    );
});
