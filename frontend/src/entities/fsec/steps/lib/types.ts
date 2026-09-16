/**
 * Shared types for gas steps
 * @module entities/fsec/steps/lib/types
 */

/**
 * Common data shared between gas-related steps
 * (Airtightness Test LP, Gas Filling BP)
 */
export interface CommonGasData {
    /** Type de gaz utilisé */
    gasType: string | null;
    /** Taux de fuite DTRI */
    leakRateDtri: string | null;
    /** Durée du test (en minutes) - utilisé par les deux steps */
    testDuration: number | null;
    /** Pression d'expérience (en bar) */
    experimentPressure: number | null;
}

/**
 * Optional version of CommonGasData for modal props
 * where fields can be undefined
 */
export interface CommonGasDataOptional {
    gasType?: string | null;
    leakRateDtri?: string | null;
    /** Durée du test d'étanchéité (Airtightness) */
    airtightnessTestDuration?: number | null;
    /** Durée du test de fuite (Gas Filling BP) */
    leakTestDuration?: number | null;
    experimentPressure?: number | null;
}
