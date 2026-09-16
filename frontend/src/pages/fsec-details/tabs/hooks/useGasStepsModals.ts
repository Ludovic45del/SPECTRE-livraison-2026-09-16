/**
 * Hook encapsulating all modal state and open/close handlers for the Gas Steps Tab.
 * @module pages/fsec-details/tabs/hooks
 */

import { useState, useCallback } from 'react';
import {
    type AirtightnessStep,
    type GasFillingBpStep,
    type GasFillingHpStep,
    type PermeationStep,
    type DepressurizationStep,
    type RepressurizationStep,
} from '@entities/fsec/steps';

export type ModalType =
    | 'airtightness'
    | 'gasFillingBp'
    | 'gasFillingHp'
    | 'permeation'
    | 'depressurization'
    | 'repressurization'
    | 'commonData'
    | null;

export type CommonDataPhase = 'BP' | 'HP';

export function useGasStepsModals() {
    const [openModal, setOpenModal] = useState<ModalType>(null);
    const [commonDataPhase, setCommonDataPhase] = useState<CommonDataPhase | null>(null);
    const [airtightnessPhase, setAirtightnessPhase] = useState<CommonDataPhase>('BP');
    const [selectedAirtightness, setSelectedAirtightness] = useState<AirtightnessStep | undefined>();
    const [selectedGasFillingBp, setSelectedGasFillingBp] = useState<GasFillingBpStep | undefined>();
    const [selectedGasFillingHp, setSelectedGasFillingHp] = useState<GasFillingHpStep | undefined>();
    const [selectedPermeation, setSelectedPermeation] = useState<PermeationStep | undefined>();
    const [selectedDepressurization, setSelectedDepressurization] = useState<DepressurizationStep | undefined>();
    const [selectedRepressurization, setSelectedRepressurization] = useState<RepressurizationStep | undefined>();

    const handleCloseModal = useCallback(() => {
        setOpenModal(null);
        setCommonDataPhase(null);
        setSelectedAirtightness(undefined);
        setSelectedGasFillingBp(undefined);
        setSelectedGasFillingHp(undefined);
        setSelectedPermeation(undefined);
        setSelectedDepressurization(undefined);
        setSelectedRepressurization(undefined);
    }, []);

    const handleOpenAirtightnessModal = useCallback((step?: AirtightnessStep, phase: CommonDataPhase = 'BP') => {
        setSelectedAirtightness(step);
        setAirtightnessPhase(phase);
        setOpenModal('airtightness');
    }, []);

    const handleOpenGasFillingBpModal = useCallback((step?: GasFillingBpStep) => {
        setSelectedGasFillingBp(step);
        setOpenModal('gasFillingBp');
    }, []);

    const handleOpenGasFillingHpModal = useCallback((step?: GasFillingHpStep) => {
        setSelectedGasFillingHp(step);
        setOpenModal('gasFillingHp');
    }, []);

    const handleOpenPermeationModal = useCallback((step?: PermeationStep) => {
        setSelectedPermeation(step);
        setOpenModal('permeation');
    }, []);

    const handleOpenDepressurizationModal = useCallback((step?: DepressurizationStep) => {
        setSelectedDepressurization(step);
        setOpenModal('depressurization');
    }, []);

    const handleOpenRepressurizationModal = useCallback((step?: RepressurizationStep) => {
        setSelectedRepressurization(step);
        setOpenModal('repressurization');
    }, []);

    const handleOpenCommonDataModal = useCallback((phase: CommonDataPhase = 'BP') => {
        setCommonDataPhase(phase);
        setOpenModal('commonData');
    }, []);

    return {
        openModal,
        commonDataPhase,
        airtightnessPhase,
        selectedAirtightness,
        selectedGasFillingBp,
        selectedGasFillingHp,
        selectedPermeation,
        selectedDepressurization,
        selectedRepressurization,
        handleCloseModal,
        handleOpenAirtightnessModal,
        handleOpenGasFillingBpModal,
        handleOpenGasFillingHpModal,
        handleOpenPermeationModal,
        handleOpenDepressurizationModal,
        handleOpenRepressurizationModal,
        handleOpenCommonDataModal,
    };
}
