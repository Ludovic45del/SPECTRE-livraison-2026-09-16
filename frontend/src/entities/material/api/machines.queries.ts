/**
 * Material — Queries CRUD pour les machines.
 * @module entities/material/api
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import { MachineListSchema, MachineSchema, machineInputToApi, type Machine, type MachineInput } from '../model';
import { materialKeys } from './material.keys';

export function useMachines(roomId: number | null = null) {
    return useQuery({
        queryKey: materialKeys.machinesByRoom(roomId),
        queryFn: async ({ signal }): Promise<Machine[]> => {
            const url = roomId ? `/material/machines/?room_id=${roomId}` : '/material/machines/';
            return api.get(url, MachineListSchema, signal);
        },
        ...QUERY_CACHE_CONFIG,
    });
}

export function useMachine(uuid: string) {
    return useQuery({
        queryKey: materialKeys.machineDetail(uuid),
        queryFn: async ({ signal }): Promise<Machine> => {
            return api.get(`/material/machines/${uuid}/`, MachineSchema, signal);
        },
        enabled: Boolean(uuid),
        ...QUERY_CACHE_CONFIG,
    });
}

export function useCreateMachine() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: MachineInput): Promise<Machine> => {
            return api.post('/material/machines/', machineInputToApi(input), MachineSchema);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: materialKeys.machines() });
        },
    });
}

export function useUpdateMachine() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ uuid, input }: { uuid: string; input: MachineInput }): Promise<Machine> => {
            return api.put(`/material/machines/${uuid}/`, machineInputToApi(input), MachineSchema);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: materialKeys.machines() });
            queryClient.invalidateQueries({
                queryKey: materialKeys.machineDetail(variables.uuid),
            });
        },
    });
}

export function useDeleteMachine() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (uuid: string): Promise<void> => {
            await api.delete(`/material/machines/${uuid}/`);
        },
        onSuccess: (_, uuid) => {
            queryClient.invalidateQueries({ queryKey: materialKeys.machines() });
            queryClient.removeQueries({ queryKey: materialKeys.machineDetail(uuid) });
        },
    });
}
