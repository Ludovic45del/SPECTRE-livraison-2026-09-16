import { memo, useState, useCallback } from 'react';
import {
    Grid,
    TextField,
    Typography,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    type SelectChangeEvent,
} from '@mui/material';
import { EditableSection, Field, parseNum, type EditableTabProps } from '@features/embase/shared';
import { DataChip } from '@widgets/data-chip';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

type OperationnelleType = '' | 'aimant' | 'broche';

interface OperationnelleFieldProps {
    isEditing: boolean;
    value: OperationnelleType;
    onChange: (e: SelectChangeEvent) => void;
    operationnelleAimant?: boolean;
    operationnelleBroche?: boolean;
}

const OperationnelleField = memo(function OperationnelleField({
    isEditing,
    value,
    onChange,
    operationnelleAimant,
    operationnelleBroche,
}: OperationnelleFieldProps) {
    if (isEditing) {
        return (
            <FormControl fullWidth size="small">
                <InputLabel>Opérationnelle</InputLabel>
                <Select value={value} label="Opérationnelle" onChange={onChange}>
                    <MenuItem value="">
                        <em>Aucun</em>
                    </MenuItem>
                    <MenuItem value="aimant">Aimant</MenuItem>
                    <MenuItem value="broche">Broche</MenuItem>
                </Select>
            </FormControl>
        );
    }
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Opérationnelle
            </Typography>
            {operationnelleAimant ? (
                <DataChip label="Aimant" color="#1976d2" />
            ) : operationnelleBroche ? (
                <DataChip label="Broche" color="#7b1fa2" />
            ) : (
                <Typography color="text.secondary">-</Typography>
            )}
        </Box>
    );
});

interface TextFieldCellProps {
    isEditing: boolean;
    label: string;
    value: string;
    displayValue?: string | number | null;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
}

const TextFieldCell = memo(function TextFieldCell({
    isEditing,
    label,
    value,
    displayValue,
    onChange,
    type,
}: TextFieldCellProps) {
    if (isEditing) {
        return <TextField fullWidth size="small" label={label} type={type} value={value} onChange={onChange} />;
    }
    return <Field label={label} value={displayValue} />;
});

interface ChargementMccFieldProps {
    isEditing: boolean;
    value: string;
    onChange: (e: SelectChangeEvent) => void;
    displayValue?: string | null;
}

const ChargementMccField = memo(function ChargementMccField({
    isEditing,
    value,
    onChange,
    displayValue,
}: ChargementMccFieldProps) {
    if (isEditing) {
        return (
            <FormControl fullWidth size="small">
                <InputLabel>Chargement MCC</InputLabel>
                <Select
                    value={value}
                    label="Chargement MCC"
                    onChange={onChange}
                    renderValue={(v) => {
                        if (!v) return '-';
                        const color = v === 'OK' ? '#4caf50' : '#f44336';
                        return <DataChip label={v} color={color} />;
                    }}
                >
                    <MenuItem value="">-</MenuItem>
                    <MenuItem value="OK">
                        <DataChip label="OK" color="#4caf50" />
                    </MenuItem>
                    <MenuItem value="KO">
                        <DataChip label="KO" color="#f44336" />
                    </MenuItem>
                </Select>
            </FormControl>
        );
    }
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Chargement MCC
            </Typography>
            {displayValue ? (
                <DataChip label={displayValue} color={displayValue.toUpperCase() === 'OK' ? '#4caf50' : '#f44336'} />
            ) : (
                <Typography color="text.secondary">-</Typography>
            )}
        </Box>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const MecaniqueTab = memo(function MecaniqueTab({ embase, onSave, isPending }: EditableTabProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({
        typeOperationnelle: '' as OperationnelleType,
        localisationActuelle: '',
        coteVe: '',
        decalageAngulaire: '',
        chargementMcc: '',
    });

    const handleEdit = useCallback(() => {
        setForm({
            typeOperationnelle: embase.operationnelleAimant ? 'aimant' : embase.operationnelleBroche ? 'broche' : '',
            localisationActuelle: embase.localisationActuelle ?? '',
            coteVe: embase.coteVe?.toString() ?? '',
            decalageAngulaire: embase.decalageAngulaire ?? '',
            chargementMcc: embase.chargementMcc ?? '',
        });
        setIsEditing(true);
    }, [embase]);

    const handleCancel = useCallback(() => setIsEditing(false), []);

    const handleSave = useCallback(async () => {
        await onSave({
            operationnelleAimant: form.typeOperationnelle === 'aimant',
            operationnelleBroche: form.typeOperationnelle === 'broche',
            localisationActuelle: form.localisationActuelle,
            coteVe: parseNum(form.coteVe),
            decalageAngulaire: form.decalageAngulaire,
            chargementMcc: form.chargementMcc,
        });
        setIsEditing(false);
    }, [form, onSave]);

    const updateText = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    return (
        <EditableSection
            title="Mécanique"
            isEditing={isEditing}
            isPending={isPending}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
        >
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                    <OperationnelleField
                        isEditing={isEditing}
                        value={form.typeOperationnelle}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, typeOperationnelle: e.target.value as OperationnelleType }))
                        }
                        operationnelleAimant={embase.operationnelleAimant}
                        operationnelleBroche={embase.operationnelleBroche}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <TextFieldCell
                        isEditing={isEditing}
                        label="Localisation actuelle"
                        value={form.localisationActuelle}
                        displayValue={embase.localisationActuelle}
                        onChange={updateText('localisationActuelle')}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <TextFieldCell
                        isEditing={isEditing}
                        label="Cote VE entre actionneur/embase"
                        value={form.coteVe}
                        displayValue={embase.coteVe}
                        onChange={updateText('coteVe')}
                        type="number"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <TextFieldCell
                        isEditing={isEditing}
                        label="Décalage angulaire du pion"
                        value={form.decalageAngulaire}
                        displayValue={embase.decalageAngulaire}
                        onChange={updateText('decalageAngulaire')}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <ChargementMccField
                        isEditing={isEditing}
                        value={form.chargementMcc}
                        onChange={(e) => setForm((prev) => ({ ...prev, chargementMcc: e.target.value }))}
                        displayValue={embase.chargementMcc}
                    />
                </Grid>
            </Grid>
        </EditableSection>
    );
});
