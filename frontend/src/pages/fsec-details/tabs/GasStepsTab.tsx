/**
 * FSEC Gas Steps Tab
 * @module pages/fsec-details/tabs
 *
 * Displays gas-related steps based on FSEC category using ONE unified workflow card per category.
 * Each category has a single collapsible card with all relevant steps:
 * - Category 0 (Sans Gaz): Empty state
 * - Category 1 (Gaz BP): Common data card + one CategoryBpWorkflowCard per rubrique (Test étanchéité → Remplissage BP)
 * - Category 2 (Gaz HP): Common data card + one CategoryHpWorkflowCard per rubrique (Test étanchéité → Remplissage HP)
 * - Category 3 (Gaz BP + HP): CategoryBpHpWorkflowCard split en Phase BP (rubriques BP, données communes BP) et Phase HP (rubriques HP, données communes HP)
 * - Category 4 (Perméation + HP): CategoryPermeationHpWorkflowCard 100% HP — Test étanchéité HP → Perméation → Dépressurisation → Remplissage HP
 *
 * Le test d'étanchéité est toujours un AirtightnessTestLp (test à basse pression physiquement).
 * Le champ `phase` ('BP'/'HP') discrimine à quelle rubrique le test est rattaché.
 * La Repressurisation a été retirée de l'UI (le statut FSEC 14 reste exploitable ailleurs).
 */

import { useMemo } from 'react';
import { Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import AddIcon from '@mui/icons-material/Add';
import { useAllGasStepsByFsec, type AirtightnessStep, type CommonGasData } from '@entities/fsec/steps';
import { CategoryBpWorkflowCard } from './components/CategoryBpWorkflowCard';
import { CategoryHpWorkflowCard } from './components/CategoryHpWorkflowCard';
import { CategoryBpHpWorkflowCard } from './components/CategoryBpHpWorkflowCard';
import { CategoryPermeationHpWorkflowCard } from './components/CategoryPermeationHpWorkflowCard';
import {
    CommonDataSection,
    EmptyBpState,
    EmptyHpState,
    EmptyPermeationHpState,
} from './components/gas-workflow-components';
import { GasStepsModals } from './components/GasStepsModals';
import { useGasStepsModals } from './hooks/useGasStepsModals';
import { useGasStepsMutations } from './hooks/useGasStepsMutations';

interface GasStepsTabProps {
    fsecVersionId: string;
    categoryId: number | null;
}

export function GasStepsTab({ fsecVersionId, categoryId }: GasStepsTabProps) {
    // Fetch all gas steps in a single request (6→1 HTTP calls)
    const { data: allGasSteps, isLoading } = useAllGasStepsByFsec(fsecVersionId);
    const airtightnessSteps = allGasSteps?.airtightnessTestLp;
    const gasFillingBpSteps = allGasSteps?.gasFillingBp;
    const gasFillingHpSteps = allGasSteps?.gasFillingHp;
    const permeationSteps = allGasSteps?.permeation;
    const depressurizationSteps = allGasSteps?.depressurization;

    // Computed common data — séparées par phase pour permettre des valeurs distinctes
    // entre rubriques BP et HP (cat 3 surtout). Pour cat 1 (BP only) / cat 4, on utilise
    // les data BP ; pour cat 2 (HP only), on utilise les data HP.
    const airtightnessBpSteps = useMemo(() => airtightnessSteps?.filter((s) => s.phase === 'BP'), [airtightnessSteps]);
    const airtightnessHpSteps = useMemo(() => airtightnessSteps?.filter((s) => s.phase === 'HP'), [airtightnessSteps]);

    const firstAirtightnessBp = airtightnessBpSteps?.[0];
    const firstAirtightnessHp = airtightnessHpSteps?.[0];
    const firstFilling = gasFillingBpSteps?.[0];
    const firstFillingHp = gasFillingHpSteps?.[0];

    const computedCommonDataBp: CommonGasData = useMemo(
        () => ({
            gasType: firstAirtightnessBp?.gasType ?? firstFilling?.gasType ?? null,
            leakRateDtri: firstAirtightnessBp?.leakRateDtri ?? firstFilling?.leakRateDtri ?? null,
            testDuration: firstAirtightnessBp?.airtightnessTestDuration ?? firstFilling?.leakTestDuration ?? null,
            experimentPressure: firstAirtightnessBp?.experimentPressure ?? firstFilling?.experimentPressure ?? null,
        }),
        [firstAirtightnessBp, firstFilling],
    );

    const computedCommonDataHp: CommonGasData = useMemo(
        () => ({
            gasType: firstAirtightnessHp?.gasType ?? firstFillingHp?.gasType ?? null,
            leakRateDtri: firstAirtightnessHp?.leakRateDtri ?? firstFillingHp?.leakRateDtri ?? null,
            testDuration: firstAirtightnessHp?.airtightnessTestDuration ?? null,
            experimentPressure: firstAirtightnessHp?.experimentPressure ?? firstFillingHp?.experimentPressure ?? null,
        }),
        [firstAirtightnessHp, firstFillingHp],
    );

    // Modal state & handlers (extracted hook)
    const modals = useGasStepsModals();

    // Mutation handlers (extracted hook) — utilise computedCommonDataBp pour pré-remplir
    // les créations BP, et computedCommonDataHp pour les créations HP.
    const mutations = useGasStepsMutations(fsecVersionId, computedCommonDataBp, computedCommonDataHp);

    const hasGasSteps = categoryId !== null && categoryId !== 0;

    // Modals block (extracted component)
    const modalsBlock = (
        <GasStepsModals
            openModal={modals.openModal}
            onClose={modals.handleCloseModal}
            fsecVersionId={fsecVersionId}
            computedCommonData={computedCommonDataBp}
            computedCommonDataBp={computedCommonDataBp}
            computedCommonDataHp={computedCommonDataHp}
            commonDataPhase={modals.commonDataPhase}
            airtightnessPhase={modals.airtightnessPhase}
            selectedAirtightness={modals.selectedAirtightness}
            selectedGasFillingBp={modals.selectedGasFillingBp}
            selectedGasFillingHp={modals.selectedGasFillingHp}
            selectedPermeation={modals.selectedPermeation}
            selectedDepressurization={modals.selectedDepressurization}
            selectedRepressurization={modals.selectedRepressurization}
            airtightnessBpSteps={airtightnessBpSteps}
            airtightnessHpSteps={airtightnessHpSteps}
            gasFillingBpSteps={gasFillingBpSteps}
            gasFillingHpSteps={gasFillingHpSteps}
        />
    );

    // Wrappers spécifiques à chaque phase pour ouvrir le modal Airtightness avec le bon filtre embase.
    const handleOpenAirtightnessBp = (step?: AirtightnessStep) => modals.handleOpenAirtightnessModal(step, 'BP');
    const handleOpenAirtightnessHp = (step?: AirtightnessStep) => modals.handleOpenAirtightnessModal(step, 'HP');

    // No gas steps
    if (!hasGasSteps) {
        return (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 1 }}>
                <ScienceIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                    FSEC sans gaz
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Aucune intervention requise pour les gaz
                </Typography>
            </Paper>
        );
    }

    // Évite le flash "rubrique vide" pendant que les steps gaz chargent
    if (isLoading) {
        return <Skeleton variant="rounded" height={200} sx={{ borderRadius: 1 }} />;
    }

    // Category 1: Gaz BP
    if (categoryId === 1) {
        const numBpRubriques = Math.max(airtightnessBpSteps?.length || 0, gasFillingBpSteps?.length || 0);

        return (
            <>
                <Stack spacing={3}>
                    {numBpRubriques === 0 ? (
                        <EmptyBpState
                            onAdd={mutations.handleAddRubriqueDirectly}
                            isCreating={mutations.isCreatingRubrique}
                        />
                    ) : (
                        <>
                            <Paper variant="outlined" sx={{ borderRadius: 1, p: 2 }}>
                                <CommonDataSection
                                    commonData={computedCommonDataBp}
                                    onEdit={() => modals.handleOpenCommonDataModal('BP')}
                                />
                            </Paper>

                            {Array.from({ length: numBpRubriques }, (_, index) => (
                                <CategoryBpWorkflowCard
                                    key={`bp-rubrique-${index}`}
                                    index={index}
                                    numRubriques={numBpRubriques}
                                    airtightnessStep={airtightnessBpSteps?.[index]}
                                    fillingStep={gasFillingBpSteps?.[index]}
                                    onEditAirtightness={handleOpenAirtightnessBp}
                                    onEditFilling={modals.handleOpenGasFillingBpModal}
                                    onDelete={
                                        numBpRubriques > 1
                                            ? () =>
                                                  mutations.handleDeleteRubrique(
                                                      airtightnessBpSteps?.[index],
                                                      gasFillingBpSteps?.[index],
                                                  )
                                            : undefined
                                    }
                                    isDeleting={mutations.isDeletingRubrique}
                                />
                            ))}
                            <Box>
                                <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={mutations.handleAddRubriqueDirectly}
                                    disabled={mutations.isCreatingRubrique}
                                >
                                    {mutations.isCreatingRubrique
                                        ? 'Création...'
                                        : `Ajouter une rubrique BP (n°${numBpRubriques + 1})`}
                                </Button>
                            </Box>
                        </>
                    )}
                </Stack>
                {modalsBlock}
            </>
        );
    }

    // Category 2: Gaz HP
    if (categoryId === 2) {
        const numHpRubriques = Math.max(airtightnessHpSteps?.length || 0, gasFillingHpSteps?.length || 0);

        return (
            <>
                <Stack spacing={3}>
                    {numHpRubriques === 0 ? (
                        <EmptyHpState
                            onAdd={mutations.handleAddHpRubriqueDirectly}
                            isCreating={mutations.isCreatingHpRubrique}
                        />
                    ) : (
                        <>
                            <Paper variant="outlined" sx={{ borderRadius: 1, p: 2 }}>
                                <CommonDataSection
                                    commonData={computedCommonDataHp}
                                    onEdit={() => modals.handleOpenCommonDataModal('HP')}
                                />
                            </Paper>

                            {Array.from({ length: numHpRubriques }, (_, index) => (
                                <CategoryHpWorkflowCard
                                    key={`hp-rubrique-${index}`}
                                    index={index}
                                    numRubriques={numHpRubriques}
                                    airtightnessStep={airtightnessHpSteps?.[index]}
                                    fillingStep={gasFillingHpSteps?.[index]}
                                    onEditAirtightness={handleOpenAirtightnessHp}
                                    onEditFilling={modals.handleOpenGasFillingHpModal}
                                    onDelete={
                                        numHpRubriques > 1
                                            ? () =>
                                                  mutations.handleDeleteHpRubrique(
                                                      airtightnessHpSteps?.[index],
                                                      gasFillingHpSteps?.[index],
                                                  )
                                            : undefined
                                    }
                                    isDeleting={mutations.isDeletingHpRubrique}
                                />
                            ))}
                            <Box>
                                <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={mutations.handleAddHpRubriqueDirectly}
                                    disabled={mutations.isCreatingHpRubrique}
                                >
                                    {mutations.isCreatingHpRubrique
                                        ? 'Création...'
                                        : `Ajouter une rubrique HP (n°${numHpRubriques + 1})`}
                                </Button>
                            </Box>
                        </>
                    )}
                </Stack>
                {modalsBlock}
            </>
        );
    }

    // Category 3: Gaz BP + HP
    // Les AirtightnessTestLp sont discriminés par leur champ `phase` ('BP'/'HP').
    // Chaque phase a sa propre carte "Données communes" car les valeurs (type gaz,
    // taux DTRI, durée, pression) peuvent différer entre BP et HP.
    if (categoryId === 3) {
        return (
            <>
                <CategoryBpHpWorkflowCard
                    airtightnessBpSteps={airtightnessBpSteps}
                    airtightnessHpSteps={airtightnessHpSteps}
                    gasFillingBpSteps={gasFillingBpSteps}
                    gasFillingHpSteps={gasFillingHpSteps}
                    commonDataBp={computedCommonDataBp}
                    commonDataHp={computedCommonDataHp}
                    onEditCommonDataBp={() => modals.handleOpenCommonDataModal('BP')}
                    onEditCommonDataHp={() => modals.handleOpenCommonDataModal('HP')}
                    onEditAirtightnessBp={handleOpenAirtightnessBp}
                    onEditAirtightnessHp={handleOpenAirtightnessHp}
                    onEditFillingBp={modals.handleOpenGasFillingBpModal}
                    onEditFillingHp={modals.handleOpenGasFillingHpModal}
                    onDeleteBpRubrique={mutations.handleDeleteRubrique}
                    onDeleteHpRubrique={mutations.handleDeleteHpRubrique}
                    onAddBpRubrique={mutations.handleAddRubriqueDirectly}
                    onAddHpRubrique={mutations.handleAddHpRubriqueDirectly}
                    isCreatingBp={mutations.isCreatingRubrique}
                    isCreatingHp={mutations.isCreatingHpRubrique}
                    isDeletingBp={mutations.isDeletingRubrique}
                    isDeletingHp={mutations.isDeletingHpRubrique}
                />
                {modalsBlock}
            </>
        );
    }

    // Category 4: Perméation + HP — workflow 100% HP organisé en rubriques.
    // Une rubrique Perméation + HP = AirtightnessTestLp (phase=HP) + PermeationStep
    // + DepressurizationStep + GasFillingHpStep, tous liés par index.
    if (categoryId === 4) {
        const numPermHpRubriques = Math.max(
            airtightnessHpSteps?.length || 0,
            permeationSteps?.length || 0,
            depressurizationSteps?.length || 0,
            gasFillingHpSteps?.length || 0,
        );

        return (
            <>
                <Stack spacing={3}>
                    {numPermHpRubriques === 0 ? (
                        <EmptyPermeationHpState
                            onAdd={mutations.handleAddPermeationHpRubriqueDirectly}
                            isCreating={mutations.isCreatingPermeationHpRubrique}
                        />
                    ) : (
                        <>
                            <Paper variant="outlined" sx={{ borderRadius: 1, p: 2 }}>
                                <CommonDataSection
                                    commonData={computedCommonDataHp}
                                    onEdit={() => modals.handleOpenCommonDataModal('HP')}
                                />
                            </Paper>

                            {Array.from({ length: numPermHpRubriques }, (_, index) => (
                                <CategoryPermeationHpWorkflowCard
                                    key={`perm-hp-rubrique-${index}`}
                                    index={index}
                                    numRubriques={numPermHpRubriques}
                                    airtightnessStep={airtightnessHpSteps?.[index]}
                                    permeationStep={permeationSteps?.[index]}
                                    depressurizationStep={depressurizationSteps?.[index]}
                                    fillingStep={gasFillingHpSteps?.[index]}
                                    onEditAirtightness={handleOpenAirtightnessHp}
                                    onEditPermeation={modals.handleOpenPermeationModal}
                                    onEditDepressurization={modals.handleOpenDepressurizationModal}
                                    onEditFilling={modals.handleOpenGasFillingHpModal}
                                    onDelete={
                                        numPermHpRubriques > 1
                                            ? () =>
                                                  mutations.handleDeletePermeationHpRubrique(
                                                      airtightnessHpSteps?.[index],
                                                      permeationSteps?.[index],
                                                      depressurizationSteps?.[index],
                                                      gasFillingHpSteps?.[index],
                                                  )
                                            : undefined
                                    }
                                    isDeleting={mutations.isDeletingPermeationHpRubrique}
                                />
                            ))}

                            <Box>
                                <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={mutations.handleAddPermeationHpRubriqueDirectly}
                                    disabled={mutations.isCreatingPermeationHpRubrique}
                                >
                                    {mutations.isCreatingPermeationHpRubrique
                                        ? 'Création...'
                                        : `Ajouter une rubrique Perméation + HP (n°${numPermHpRubriques + 1})`}
                                </Button>
                            </Box>
                        </>
                    )}
                </Stack>
                {modalsBlock}
            </>
        );
    }

    // Fallback (should not happen)
    return (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
                Catégorie FSEC non supportée
            </Typography>
        </Paper>
    );
}
