/**
 * Steps Query Keys - TanStack Query Key Factory
 * @module entities/steps/api
 *
 * Pattern from Front_Implementation.md section 2.3
 * All 10 step types follow the same pattern
 */

function createStepKeys(stepType: string) {
    const base = [`${stepType}-steps`] as const;
    return {
        all: base,
        lists: () => [...base, 'list'] as const,
        details: () => [...base, 'detail'] as const,
        detail: (uuid: string) => [...base, 'detail', uuid] as const,
        byFsec: (fsecVersionUuid: string) => [...base, 'fsec', fsecVersionUuid] as const,
        byMetrology: (metrologyStepUuid: string) => [...base, 'metrology', metrologyStepUuid] as const,
        byPicturesStep: (picturesStepUuid: string) => [...base, 'pictures-step', picturesStepUuid] as const,
    };
}

export const stepKeys = {
    assembly: createStepKeys('assembly'),
    metrology: createStepKeys('metrology'),
    sealing: createStepKeys('sealing'),
    pictures: createStepKeys('pictures'),
    photoView: createStepKeys('photo-view'),
    airtightnessTestLp: createStepKeys('airtightness-test-lp'),
    gasFillingBp: createStepKeys('gas-filling-bp'),
    gasFillingHp: createStepKeys('gas-filling-hp'),
    permeation: createStepKeys('permeation'),
    depressurization: createStepKeys('depressurization'),
    repressurization: createStepKeys('repressurization'),
    // Aggregated endpoint for all gas steps (performance optimization)
    allGasSteps: {
        all: ['all-gas-steps'] as const,
        byFsec: (fsecVersionUuid: string) => ['all-gas-steps', 'fsec', fsecVersionUuid] as const,
    },
};
