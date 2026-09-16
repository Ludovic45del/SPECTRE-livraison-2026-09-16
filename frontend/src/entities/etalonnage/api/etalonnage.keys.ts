/**
 * Etalonnage Query Keys - TanStack Query Key Factory
 * @module entities/etalonnage/api
 */

export const etalonnageKeys = {
    all: ['etalonnages'] as const,
    byEmbase: (embaseUuid: string) => [...etalonnageKeys.all, 'embase', embaseUuid] as const,
    byEmbaseVoie: (embaseUuid: string, voie: number) =>
        [...etalonnageKeys.all, 'embase', embaseUuid, 'voie', voie] as const,
};
