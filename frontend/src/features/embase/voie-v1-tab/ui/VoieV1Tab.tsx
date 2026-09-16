import { memo } from 'react';
import { VoieTab, type VoieConfig } from '@features/embase/shared/ui/VoieTab';
import type { EditableTabProps } from '@features/embase/shared';

const MESURES_V1_FIELDS: VoieConfig['mesuresFields'] = [
    { label: 'Soufflet V1', embaseField: 'souffletV1', formField: 'souffletV1' },
    { label: 'N° Capteur V1', embaseField: 'capteurV1', formField: 'capteurV1' },
    {
        label: 'Étendue (mbar)',
        displayLabel: 'Étendue',
        embaseField: 'etendueV1Mbar',
        formField: 'etendueV1Mbar',
        type: 'number',
        unit: 'mbar',
    },
    {
        label: 'Offset (b) à 0 barA (mV)',
        displayLabel: 'Offset (b) à 0 barA',
        embaseField: 'offsetV1Mv',
        formField: 'offsetV1Mv',
        type: 'number',
        unit: 'mV',
    },
    {
        label: 'Mesurande à 0 barA au LIE (mV)',
        displayLabel: 'Mesurande à 0 barA au LIE',
        embaseField: 'mesurandeLieV1Mv',
        formField: 'mesurandeLieV1Mv',
        type: 'number',
        unit: 'mV',
    },
    {
        label: 'Sensibilité (a) (mV)',
        displayLabel: 'Sensibilité (a)',
        embaseField: 'sensibiliteV1Mv',
        formField: 'sensibiliteV1Mv',
        type: 'number',
        unit: 'mV',
    },
    {
        label: 'Signal météociel (mV)',
        displayLabel: 'Signal météociel',
        embaseField: 'signalMeteocielV1Mv',
        formField: 'signalMeteocielV1Mv',
        type: 'number',
        unit: 'mV',
    },
    {
        label: 'Capteur cible PFEIFFER (mbar)',
        displayLabel: 'Capteur cible PFEIFFER',
        embaseField: 'capteurCiblePfeifferMbar',
        formField: 'capteurCiblePfeifferMbar',
        type: 'number',
        unit: 'mbar',
    },
];

const TESTS_V1_FIELDS: VoieConfig['testsFields'] = [
    { label: 'Test étanchéité He', embaseField: 'testEtancheiteHe', formField: 'testEtancheiteHe' },
    { label: 'Test capteur MRG au LIE', embaseField: 'testCapteurMrg', formField: 'testCapteurMrg' },
];

const V1_CONFIG: VoieConfig = {
    stringFields: {
        souffletV1: 'souffletV1',
        capteurV1: 'capteurV1',
        testEtancheiteHe: 'testEtancheiteHe',
        testCapteurMrg: 'testCapteurMrg',
    },
    numericFields: {
        etendueV1Mbar: 'etendueV1Mbar',
        offsetV1Mv: 'offsetV1Mv',
        mesurandeLieV1Mv: 'mesurandeLieV1Mv',
        sensibiliteV1Mv: 'sensibiliteV1Mv',
        signalMeteocielV1Mv: 'signalMeteocielV1Mv',
        capteurCiblePfeifferMbar: 'capteurCiblePfeifferMbar',
    },
    observationsField: 'observationsV1',
    observationsFormField: 'observationsV1',
    mesuresFields: MESURES_V1_FIELDS,
    testsFields: TESTS_V1_FIELDS,
    titles: { mesures: 'Mesures', tests: 'Tests', observations: 'Observations' },
};

export const VoieV1Tab = memo(function VoieV1Tab(props: EditableTabProps) {
    return <VoieTab {...props} config={V1_CONFIG} />;
});
