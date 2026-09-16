/**
 * BP + HP Gas Workflow Card Component
 * @module pages/fsec-details/tabs/components
 *
 * Catégorie 3 (Gaz BP + HP) :
 * - Section "Phase BP" : carte "Données communes BP" + rubriques BP (Test étanchéité + Remplissage BP).
 * - Section "Phase HP" : carte "Données communes HP" + rubriques HP (Test étanchéité + Remplissage HP).
 *
 * Les deux phases ont leurs propres données communes éditables séparément, car les valeurs
 * physiques (taux DTRI, durée, pression) peuvent différer entre BP et HP.
 *
 * Les AirtightnessTestLp sont discriminés par leur champ `phase` ('BP' ou 'HP').
 */

import { Box, Button, Divider, Paper, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { AirtightnessStep, CommonGasData, GasFillingBpStep, GasFillingHpStep } from '@entities/fsec/steps';
import { CategoryBpWorkflowCard } from './CategoryBpWorkflowCard';
import { CategoryHpWorkflowCard } from './CategoryHpWorkflowCard';
import { CommonDataSection } from './gas-workflow-components';

interface CategoryBpHpWorkflowCardProps {
    airtightnessBpSteps?: AirtightnessStep[];
    airtightnessHpSteps?: AirtightnessStep[];
    gasFillingBpSteps?: GasFillingBpStep[];
    gasFillingHpSteps?: GasFillingHpStep[];
    commonDataBp: CommonGasData;
    commonDataHp: CommonGasData;
    onEditCommonDataBp: () => void;
    onEditCommonDataHp: () => void;
    onEditAirtightnessBp: (step?: AirtightnessStep) => void;
    onEditAirtightnessHp: (step?: AirtightnessStep) => void;
    onEditFillingBp: (step?: GasFillingBpStep) => void;
    onEditFillingHp: (step?: GasFillingHpStep) => void;
    onDeleteBpRubrique: (airtightnessStep?: AirtightnessStep, fillingStep?: GasFillingBpStep) => void;
    onDeleteHpRubrique: (airtightnessStep?: AirtightnessStep, fillingStep?: GasFillingHpStep) => void;
    onAddBpRubrique: () => void;
    onAddHpRubrique: () => void;
    isCreatingBp?: boolean;
    isCreatingHp?: boolean;
    isDeletingBp?: boolean;
    isDeletingHp?: boolean;
}

export function CategoryBpHpWorkflowCard({
    airtightnessBpSteps,
    airtightnessHpSteps,
    gasFillingBpSteps,
    gasFillingHpSteps,
    commonDataBp,
    commonDataHp,
    onEditCommonDataBp,
    onEditCommonDataHp,
    onEditAirtightnessBp,
    onEditAirtightnessHp,
    onEditFillingBp,
    onEditFillingHp,
    onDeleteBpRubrique,
    onDeleteHpRubrique,
    onAddBpRubrique,
    onAddHpRubrique,
    isCreatingBp = false,
    isCreatingHp = false,
    isDeletingBp = false,
    isDeletingHp = false,
}: CategoryBpHpWorkflowCardProps) {
    const numBpRubriques = Math.max(airtightnessBpSteps?.length || 0, gasFillingBpSteps?.length || 0);
    const numHpRubriques = Math.max(airtightnessHpSteps?.length || 0, gasFillingHpSteps?.length || 0);
    const hasBpRubriques = numBpRubriques > 0;
    const hasHpRubriques = numHpRubriques > 0;

    return (
        <Stack spacing={4}>
            {/* ─── Phase BP ─── */}
            <Box>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 1 }}>
                    Phase BP
                </Typography>
                <Divider sx={{ mb: 2, mt: 0.5 }} />

                <Stack spacing={3}>
                    {hasBpRubriques && (
                        <Paper variant="outlined" sx={{ borderRadius: 1, p: 2 }}>
                            <CommonDataSection commonData={commonDataBp} onEdit={onEditCommonDataBp} labelSuffix="BP" />
                        </Paper>
                    )}

                    {Array.from({ length: numBpRubriques }, (_, index) => (
                        <CategoryBpWorkflowCard
                            key={`bp-rubrique-${index}`}
                            index={index}
                            numRubriques={numBpRubriques}
                            airtightnessStep={airtightnessBpSteps?.[index]}
                            fillingStep={gasFillingBpSteps?.[index]}
                            onEditAirtightness={onEditAirtightnessBp}
                            onEditFilling={onEditFillingBp}
                            onDelete={
                                numBpRubriques > 1
                                    ? () => onDeleteBpRubrique(airtightnessBpSteps?.[index], gasFillingBpSteps?.[index])
                                    : undefined
                            }
                            isDeleting={isDeletingBp}
                        />
                    ))}
                    <Box>
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={onAddBpRubrique}
                            disabled={isCreatingBp}
                        >
                            {isCreatingBp ? 'Création...' : `Ajouter une rubrique BP (n°${numBpRubriques + 1})`}
                        </Button>
                    </Box>
                </Stack>
            </Box>

            {/* ─── Phase HP ─── */}
            <Box>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 1 }}>
                    Phase HP
                </Typography>
                <Divider sx={{ mb: 2, mt: 0.5 }} />

                <Stack spacing={3}>
                    {hasHpRubriques && (
                        <Paper variant="outlined" sx={{ borderRadius: 1, p: 2 }}>
                            <CommonDataSection commonData={commonDataHp} onEdit={onEditCommonDataHp} labelSuffix="HP" />
                        </Paper>
                    )}

                    {Array.from({ length: numHpRubriques }, (_, index) => (
                        <CategoryHpWorkflowCard
                            key={`hp-rubrique-${index}`}
                            index={index}
                            numRubriques={numHpRubriques}
                            airtightnessStep={airtightnessHpSteps?.[index]}
                            fillingStep={gasFillingHpSteps?.[index]}
                            onEditAirtightness={onEditAirtightnessHp}
                            onEditFilling={onEditFillingHp}
                            onDelete={
                                numHpRubriques > 1
                                    ? () => onDeleteHpRubrique(airtightnessHpSteps?.[index], gasFillingHpSteps?.[index])
                                    : undefined
                            }
                            isDeleting={isDeletingHp}
                        />
                    ))}
                    <Box>
                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={onAddHpRubrique}
                            disabled={isCreatingHp}
                        >
                            {isCreatingHp ? 'Création...' : `Ajouter une rubrique HP (n°${numHpRubriques + 1})`}
                        </Button>
                    </Box>
                </Stack>
            </Box>
        </Stack>
    );
}
