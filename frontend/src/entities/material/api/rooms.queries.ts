/**
 * Material — Queries pour les salles (référentiel en lecture seule).
 * @module entities/material/api
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import { MachineRoomListSchema, type MachineRoom } from '../model';
import { materialKeys } from './material.keys';

export function useMachineRooms() {
    return useQuery({
        queryKey: materialKeys.rooms(),
        queryFn: async ({ signal }): Promise<MachineRoom[]> => {
            return api.get('/material/rooms/', MachineRoomListSchema, signal);
        },
        ...QUERY_CACHE_CONFIG,
        // Référentiel quasi statique : on cache long.
        staleTime: 5 * 60 * 1000,
    });
}
