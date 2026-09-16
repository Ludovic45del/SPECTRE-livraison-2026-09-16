import { memo } from 'react';
import { Grid, FormControl, InputLabel, Select, MenuItem, Box, Typography } from '@mui/material';
import { VoieTab, type VoieConfig } from '@features/embase/shared/ui/VoieTab';
import { YesNoChip, type EditableTabProps } from '@features/embase/shared';
import type { Embase } from '@entities/embase';

// ─────────────────────────────────────────────────────────────────────────────
// Electrovanne sub-component
// ─────────────────────────────────────────────────────────────────────────────

interface ElectrovanneFieldProps {
    isEditing: boolean;
    formValue: boolean;
    embaseValue?: boolean;
    onChange: (value: boolean) => void;
}

const ElectrovanneField = memo(function ElectrovanneField({
    isEditing,
    formValue,
    embaseValue,
    onChange,
}: ElectrovanneFieldProps) {
    if (isEditing) {
        return (
            <FormControl fullWidth size="small">
                <InputLabel>Electrovanne</InputLabel>
                <Select
                    value={formValue ? 'Oui' : 'Non'}
                    label="Electrovanne"
                    onChange={(e) => onChange(e.target.value === 'Oui')}
                    renderValue={(val) => <YesNoChip value={val === 'Oui'} />}
                >
                    <MenuItem value="Oui">
                        <YesNoChip value={true} />
                    </MenuItem>
                    <MenuItem value="Non">
                        <YesNoChip value={false} />
                    </MenuItem>
                </Select>
            </FormControl>
        );
    }
    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                Electrovanne
            </Typography>
            <Box sx={{ mt: 0.5 }}>
                <YesNoChip value={embaseValue ?? false} />
            </Box>
        </Box>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// V2 Config
// ─────────────────────────────────────────────────────────────────────────────

const MESURES_V2_FIELDS: VoieConfig['mesuresFields'] = [
    { label: 'Soufflet V2', embaseField: 'souffletV2', formField: 'souffletV2' },
    { label: 'N° Capteur V2', embaseField: 'capteurV2', formField: 'capteurV2' },
    {
        label: 'Étendue (mbar)',
        displayLabel: 'Étendue',
        embaseField: 'etendueV2Mbar',
        formField: 'etendueV2Mbar',
        type: 'number',
        unit: 'mbar',
    },
    {
        label: 'Offset (b) à 0 barA (mV)',
        displayLabel: 'Offset (b) à 0 barA',
        embaseField: 'offsetV2Mv',
        formField: 'offsetV2Mv',
        type: 'number',
        unit: 'mV',
    },
    {
        label: 'Mesurande à 0 barA au LIE (mV)',
        displayLabel: 'Mesurande à 0 barA au LIE',
        embaseField: 'mesurandeLieV2Mv',
        formField: 'mesurandeLieV2Mv',
        type: 'number',
        unit: 'mV',
    },
    {
        label: 'Sensibilité (a) (mV)',
        displayLabel: 'Sensibilité (a)',
        embaseField: 'sensibiliteV2Mv',
        formField: 'sensibiliteV2Mv',
        type: 'number',
        unit: 'mV',
    },
    {
        label: 'Signal météociel (mV)',
        displayLabel: 'Signal météociel',
        embaseField: 'signalMeteocielV2Mv',
        formField: 'signalMeteocielV2Mv',
        type: 'number',
        unit: 'mV',
    },
    {
        label: 'Capteur cible PFEIFFER (mbar)',
        displayLabel: 'Capteur cible PFEIFFER',
        embaseField: 'capteurCiblePfeifferV2Mbar',
        formField: 'capteurCiblePfeifferV2Mbar',
        type: 'number',
        unit: 'mbar',
    },
];

const TESTS_V2_FIELDS: VoieConfig['testsFields'] = [
    { label: 'Test étanchéité He', embaseField: 'testEtancheiteHeV2', formField: 'testEtancheiteHeV2' },
    { label: 'Test capteur MRG au LIE', embaseField: 'testCapteurMrgV2', formField: 'testCapteurMrgV2' },
];

const V2_CONFIG: VoieConfig = {
    stringFields: {
        souffletV2: 'souffletV2',
        capteurV2: 'capteurV2',
        testEtancheiteHeV2: 'testEtancheiteHeV2',
        testCapteurMrgV2: 'testCapteurMrgV2',
    },
    numericFields: {
        etendueV2Mbar: 'etendueV2Mbar',
        offsetV2Mv: 'offsetV2Mv',
        mesurandeLieV2Mv: 'mesurandeLieV2Mv',
        sensibiliteV2Mv: 'sensibiliteV2Mv',
        signalMeteocielV2Mv: 'signalMeteocielV2Mv',
        capteurCiblePfeifferV2Mbar: 'capteurCiblePfeifferV2Mbar',
    },
    observationsField: 'observationsV2',
    observationsFormField: 'observationsV2',
    mesuresFields: MESURES_V2_FIELDS,
    testsFields: TESTS_V2_FIELDS,
    titles: { mesures: 'Mesures V2', tests: 'Tests V2', observations: 'Observations V2' },
    extraFormDefaults: { electrovanne: false },
    extraSaveFields: {
        electrovanne: (form) => Boolean(form.electrovanne),
    },
    renderExtra: ({
        isEditing,
        form,
        onFormChange,
        embase,
    }: {
        isEditing: boolean;
        form: Record<string, string | boolean>;
        onFormChange: (field: string, value: string | boolean) => void;
        embase: Embase;
    }) => (
        <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6} md={4}>
                <ElectrovanneField
                    isEditing={isEditing}
                    formValue={!!form.electrovanne}
                    embaseValue={embase.electrovanne}
                    onChange={(value) => onFormChange('electrovanne', value)}
                />
            </Grid>
        </Grid>
    ),
};

export const VoieV2Tab = memo(function VoieV2Tab(props: EditableTabProps) {
    return <VoieTab {...props} config={V2_CONFIG} />;
});
