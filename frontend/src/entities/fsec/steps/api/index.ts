export { stepKeys } from './steps.keys';

// Assembly
export {
    useAssemblyStepsByFsec,
    useAssemblyStep,
    useCreateAssemblyStep,
    useUpdateAssemblyStep,
    useDeleteAssemblyStep,
} from './assembly.queries';

// Metrology
export {
    useMetrologyStepsByFsec,
    useMetrologyStep,
    useCreateMetrologyStep,
    useUpdateMetrologyStep,
    useDeleteMetrologyStep,
} from './metrology.queries';

// Sealing (linked to MetrologyStep)
export {
    useSealingStepByMetrology,
    useSealingStep,
    useCreateSealingStep,
    useUpdateSealingStep,
    useDeleteSealingStep,
} from './sealing.queries';

// Pictures (full CRUD)
export {
    usePicturesStepsByFsec,
    usePicturesStep,
    useCreatePicturesStep,
    useUpdatePicturesStep,
    useDeletePicturesStep,
} from './pictures.queries';

// Photo Views (linked to PicturesStep)
export {
    usePhotoViewsByPicturesStep,
    usePhotoView,
    useCreatePhotoView,
    useUpdatePhotoView,
    useDeletePhotoView,
} from './photo-view.queries';

// Airtightness Test LP Steps
export {
    useAirtightnessStepsByFsec,
    useAirtightnessStep,
    useCreateAirtightnessStep,
    useUpdateAirtightnessStep,
    useDeleteAirtightnessStep,
} from './airtightness.queries';

// Gas Filling BP (Low Pressure) Steps
export {
    useGasFillingBpStepsByFsec,
    useGasFillingBpStep,
    useCreateGasFillingBpStep,
    useUpdateGasFillingBpStep,
    useDeleteGasFillingBpStep,
} from './gas-filling-bp.queries';

// Gas Filling HP (High Pressure) Steps
export {
    useGasFillingHpStepsByFsec,
    useGasFillingHpStep,
    useCreateGasFillingHpStep,
    useUpdateGasFillingHpStep,
    useDeleteGasFillingHpStep,
} from './gas-filling-hp.queries';

// Permeation Steps
export {
    usePermeationStepsByFsec,
    usePermeationStep,
    useCreatePermeationStep,
    useUpdatePermeationStep,
    useDeletePermeationStep,
} from './permeation.queries';

// Depressurization Steps
export {
    useDepressurizationStepsByFsec,
    useDepressurizationStep,
    useCreateDepressurizationStep,
    useUpdateDepressurizationStep,
    useDeleteDepressurizationStep,
} from './depressurization.queries';

// Repressurization Steps
export {
    useRepressurizationStepsByFsec,
    useRepressurizationStep,
    useCreateRepressurizationStep,
    useUpdateRepressurizationStep,
    useDeleteRepressurizationStep,
} from './repressurization.queries';

// All Gas Steps (Aggregated - Performance optimization: 6 requests → 1)
export { useAllGasStepsByFsec, type AllGasStepsResponse } from './all-gas-steps.queries';
