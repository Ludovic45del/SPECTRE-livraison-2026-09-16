/**
 * Material — Queries CRUD pour l'historique des maintenances.
 * @module entities/material/api
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import {
    MachineMaintenanceListSchema,
    MachineMaintenanceSchema,
    maintenanceInputToApi,
    type MachineMaintenance,
    type MachineMaintenanceInput,
} from '../model';
import { materialKeys } from './material.keys';

export function useMaintenances(machineUuid: string) {
    return useQuery({
        queryKey: materialKeys.maintenancesByMachine(machineUuid),
        queryFn: async ({ signal }): Promise<MachineMaintenance[]> => {
            return api.get(`/material/maintenances/?machine_uuid=${machineUuid}`, MachineMaintenanceListSchema, signal);
        },
        enabled: Boolean(machineUuid),
        ...QUERY_CACHE_CONFIG,
    });
}

// Toute mutation sur une maintenance impacte la machine (next_maintenance_date,
// last_maintenance_date sont des agrégats côté serveur) → invalidation conjointe.
function invalidateMachineAggregates(queryClient: ReturnType<typeof useQueryClient>, machineUuid: string) {
    queryClient.invalidateQueries({
        queryKey: materialKeys.maintenancesByMachine(machineUuid),
    });
    queryClient.invalidateQueries({ queryKey: materialKeys.machines() });
    queryClient.invalidateQueries({
        queryKey: materialKeys.machineDetail(machineUuid),
    });
}

export function useCreateMaintenance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: MachineMaintenanceInput): Promise<MachineMaintenance> => {
            return api.post('/material/maintenances/', maintenanceInputToApi(input), MachineMaintenanceSchema);
        },
        onSuccess: (result) => {
            invalidateMachineAggregates(queryClient, result.machineUuid);
        },
    });
}

export function useUpdateMaintenance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            uuid,
            input,
        }: {
            uuid: string;
            input: MachineMaintenanceInput;
        }): Promise<MachineMaintenance> => {
            return api.put(`/material/maintenances/${uuid}/`, maintenanceInputToApi(input), MachineMaintenanceSchema);
        },
        onSuccess: (result) => {
            invalidateMachineAggregates(queryClient, result.machineUuid);
        },
    });
}

export function useDeleteMaintenance(machineUuid: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (uuid: string): Promise<void> => {
            await api.delete(`/material/maintenances/${uuid}/`);
        },
        onSuccess: () => {
            invalidateMachineAggregates(queryClient, machineUuid);
        },
    });
}
