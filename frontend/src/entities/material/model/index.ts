export {
    MachineRoomSchema,
    MachineRoomListSchema,
    MachineLinkSchema,
    MachineSchema,
    MachineListSchema,
    MachineMaintenanceSchema,
    MachineMaintenanceListSchema,
    machineInputToApi,
    maintenanceInputToApi,
} from './material.schema';
export type {
    MachineRoom,
    MachineLink,
    Machine,
    MachineMaintenance,
    MachineInput,
    MachineLinkInput,
    MachineMaintenanceInput,
} from './material.schema';
export {
    MACHINE_STATUS,
    MACHINE_STATUS_LABELS,
    MACHINE_STATUS_COLORS,
    MAINTENANCE_TYPE,
    MAINTENANCE_TYPE_LABELS,
    MAINTENANCE_WARNING_DAYS,
} from './material.constants';
export type { MachineStatus, MaintenanceType } from './material.constants';
