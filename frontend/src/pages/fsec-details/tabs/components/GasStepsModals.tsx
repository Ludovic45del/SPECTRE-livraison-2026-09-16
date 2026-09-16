/**
 * All modal dialogs used in the Gas Steps Tab.
 * @module pages/fsec-details/tabs/components
 *
 * Extracted from GasStepsTab to keep file size under 250 lines (R-STYLE-03).
 */

import { useMemo } from 'react';
import {
    type AirtightnessStep,
    type GasFillingBpStep,
    type GasFillingHpStep,
    type PermeationStep,
    type DepressurizationStep,
    type RepressurizationStep,
    type CommonGasData,
} from '@entities/fsec/steps';
import { AirtightnessStepModal } from '@features/fsec/edit-airtightness';
import { GasFillingBpStepModal } from '@features/fsec/edit-gas-filling-bp';
import { GasFillingHpStepModal } from '@features/fsec/edit-gas-filling-hp';
import { PermeationStepModal } from '@features/fsec/edit-permeation';
import { DepressurizationStepModal } from '@features/fsec/edit-depressurization';
import { RepressurizationStepModal } from '@features/fsec/edit-repressurization';
import { CommonGasDataModal } from '@features/fsec/edit-common-gas-data';
import { type CommonDataPhase, type ModalType } from '../hooks/useGasStepsModals';

interface GasStepsModalsProps {
    openModal: ModalType;
    onClose: () => void;
    fsecVersionId: string;
    computedCommonData: CommonGasData;
    computedCommonDataBp: CommonGasData;
    computedCommonDataHp: CommonGasData;
    commonDataPhase: CommonDataPhase | null;
    airtightnessPhase: CommonDataPhase;
    selectedAirtightness?: AirtightnessStep;
    selectedGasFillingBp?: GasFillingBpStep;
    selectedGasFillingHp?: GasFillingHpStep;
    selectedPermeation?: PermeationStep;
    selectedDepressurization?: DepressurizationStep;
    selectedRepressurization?: RepressurizationStep;
    airtightnessBpSteps?: AirtightnessStep[];
    airtightnessHpSteps?: AirtightnessStep[];
    gasFillingBpSteps?: GasFillingBpStep[];
    gasFillingHpSteps?: GasFillingHpStep[];
}

export function GasStepsModals({
    openModal,
    onClose,
    fsecVersionId,
    computedCommonData,
    computedCommonDataBp,
    computedCommonDataHp,
    commonDataPhase,
    airtightnessPhase,
    selectedAirtightness,
    selectedGasFillingBp,
    selectedGasFillingHp,
    selectedPermeation,
    selectedDepressurization,
    selectedRepressurization,
    airtightnessBpSteps,
    airtightnessHpSteps,
    gasFillingBpSteps,
    gasFillingHpSteps,
}: GasStepsModalsProps) {
    // Quand on ouvre le modal "Données communes", on n'applique l'update qu'aux
    // steps de la phase sélectionnée (BP ou HP).
    const isHpPhase = commonDataPhase === 'HP';
    const commonDataModalSteps = useMemo(
        () => ({
            data: isHpPhase ? computedCommonDataHp : computedCommonDataBp,
            airtightnessSteps: isHpPhase ? airtightnessHpSteps : airtightnessBpSteps,
            gasFillingBpSteps: isHpPhase ? undefined : gasFillingBpSteps,
            gasFillingHpSteps: isHpPhase ? gasFillingHpSteps : undefined,
        }),
        [
            isHpPhase,
            computedCommonDataBp,
            computedCommonDataHp,
            airtightnessBpSteps,
            airtightnessHpSteps,
            gasFillingBpSteps,
            gasFillingHpSteps,
        ],
    );
    // Données communes utilisées pour pré-remplir le modal Airtightness selon la phase ouverte.
    const airtightnessSourceData = airtightnessPhase === 'HP' ? computedCommonDataHp : computedCommonDataBp;
    const airtightnessCommonData = useMemo(
        () => ({
            gasType: airtightnessSourceData.gasType,
            leakRateDtri: airtightnessSourceData.leakRateDtri,
            experimentPressure: airtightnessSourceData.experimentPressure,
            airtightnessTestDuration: airtightnessSourceData.testDuration,
        }),
        [
            airtightnessSourceData.gasType,
            airtightnessSourceData.leakRateDtri,
            airtightnessSourceData.experimentPressure,
            airtightnessSourceData.testDuration,
        ],
    );

    const fillingBpCommonData = useMemo(
        () => ({
            gasType: computedCommonData.gasType,
            leakRateDtri: computedCommonData.leakRateDtri,
            experimentPressure: computedCommonData.experimentPressure,
            leakTestDuration: computedCommonData.testDuration,
        }),
        [
            computedCommonData.gasType,
            computedCommonData.leakRateDtri,
            computedCommonData.experimentPressure,
            computedCommonData.testDuration,
        ],
    );

    return (
        <>
            {openModal === 'airtightness' && (
                <AirtightnessStepModal
                    open={true}
                    onClose={onClose}
                    fsecVersionId={fsecVersionId}
                    step={selectedAirtightness}
                    commonData={airtightnessCommonData}
                    phase={airtightnessPhase}
                />
            )}
            {openModal === 'gasFillingBp' && (
                <GasFillingBpStepModal
                    open={true}
                    onClose={onClose}
                    fsecVersionId={fsecVersionId}
                    step={selectedGasFillingBp}
                    commonData={fillingBpCommonData}
                />
            )}
            {openModal === 'gasFillingHp' && (
                <GasFillingHpStepModal
                    open={true}
                    onClose={onClose}
                    fsecVersionId={fsecVersionId}
                    step={selectedGasFillingHp}
                />
            )}
            {openModal === 'permeation' && (
                <PermeationStepModal
                    open={true}
                    onClose={onClose}
                    fsecVersionId={fsecVersionId}
                    step={selectedPermeation}
                    commonData={{
                        gasType: computedCommonDataHp.gasType,
                        leakRateDtri: computedCommonDataHp.leakRateDtri,
                        experimentPressure: computedCommonDataHp.experimentPressure,
                    }}
                />
            )}
            {openModal === 'depressurization' && (
                <DepressurizationStepModal
                    open={true}
                    onClose={onClose}
                    fsecVersionId={fsecVersionId}
                    step={selectedDepressurization}
                />
            )}
            {openModal === 'repressurization' && (
                <RepressurizationStepModal
                    open={true}
                    onClose={onClose}
                    fsecVersionId={fsecVersionId}
                    step={selectedRepressurization}
                />
            )}
            {openModal === 'commonData' && (
                <CommonGasDataModal
                    open={true}
                    onClose={onClose}
                    fsecVersionId={fsecVersionId}
                    commonData={commonDataModalSteps.data}
                    airtightnessSteps={commonDataModalSteps.airtightnessSteps}
                    gasFillingBpSteps={commonDataModalSteps.gasFillingBpSteps}
                    gasFillingHpSteps={commonDataModalSteps.gasFillingHpSteps}
                    phase={isHpPhase ? 'HP' : 'BP'}
                />
            )}
        </>
    );
}
