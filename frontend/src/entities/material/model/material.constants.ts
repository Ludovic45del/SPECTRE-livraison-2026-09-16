/**
 * Material — Constantes partagées (statuts, types) miroir du backend.
 * @module entities/material/model
 *
 * Source de vérité : backend/app/domain/material/models/constants.py
 */

export const MACHINE_STATUS = {
    IN_SERVICE: 'in_service',
    OUT_OF_SERVICE: 'out_of_service',
    UNDER_MAINTENANCE: 'under_maintenance',
} as const;

export type MachineStatus = (typeof MACHINE_STATUS)[keyof typeof MACHINE_STATUS];

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
    [MACHINE_STATUS.IN_SERVICE]: 'En service',
    [MACHINE_STATUS.OUT_OF_SERVICE]: 'Hors service',
    [MACHINE_STATUS.UNDER_MAINTENANCE]: 'En maintenance',
};

export const MACHINE_STATUS_COLORS: Record<MachineStatus, string> = {
    [MACHINE_STATUS.IN_SERVICE]: '#2E7D32',
    [MACHINE_STATUS.OUT_OF_SERVICE]: '#9E9E9E',
    [MACHINE_STATUS.UNDER_MAINTENANCE]: '#ED6C02',
};

export const MAINTENANCE_TYPE = {
    PREVENTIVE: 'preventive',
    CURATIVE: 'curative',
} as const;

export type MaintenanceType = (typeof MAINTENANCE_TYPE)[keyof typeof MAINTENANCE_TYPE];

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
    [MAINTENANCE_TYPE.PREVENTIVE]: 'Préventive',
    [MAINTENANCE_TYPE.CURATIVE]: 'Curative',
};

/** Nombre de jours sous lequel on considère qu'une échéance de maintenance est proche. */
export const MAINTENANCE_WARNING_DAYS = 30;
