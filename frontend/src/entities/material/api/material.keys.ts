/**
 * Material — TanStack Query key factory.
 * @module entities/material/api
 */

export const materialKeys = {
    all: ['material'] as const,

    rooms: () => [...materialKeys.all, 'rooms'] as const,

    machines: () => [...materialKeys.all, 'machines'] as const,
    machinesByRoom: (roomId: number | null) => [...materialKeys.machines(), { roomId }] as const,
    machineDetail: (uuid: string) => [...materialKeys.machines(), uuid] as const,

    maintenancesByMachine: (machineUuid: string) => [...materialKeys.all, 'maintenances', machineUuid] as const,
};
