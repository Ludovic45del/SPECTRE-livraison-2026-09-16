/**
 * Material — Schémas Zod (API ↔ domain camelCase) pour Room, MachineLink,
 * Machine et MachineMaintenance.
 * @module entities/material/model
 *
 * Source : backend/app/mapper/material/*_api_mapper.py
 */

import { z } from 'zod';
import { MACHINE_STATUS, type MachineStatus, MAINTENANCE_TYPE, type MaintenanceType } from './material.constants';

const MACHINE_STATUS_VALUES = [
    MACHINE_STATUS.IN_SERVICE,
    MACHINE_STATUS.OUT_OF_SERVICE,
    MACHINE_STATUS.UNDER_MAINTENANCE,
] as const;

const MAINTENANCE_TYPE_VALUES = [MAINTENANCE_TYPE.PREVENTIVE, MAINTENANCE_TYPE.CURATIVE] as const;

// ---------------------------------------------------------------------------
// MachineRoom
// ---------------------------------------------------------------------------

export const MachineRoomApiSchema = z.object({
    id: z.number().int(),
    code: z.string(),
    label: z.string(),
    color: z.string(),
    sort_order: z.number().int(),
});

export const MachineRoomSchema = MachineRoomApiSchema.transform((api) => ({
    id: api.id,
    code: api.code,
    label: api.label,
    color: api.color,
    sortOrder: api.sort_order,
}));

export type MachineRoom = z.infer<typeof MachineRoomSchema>;
export const MachineRoomListSchema = z.array(MachineRoomSchema);

// ---------------------------------------------------------------------------
// MachineLink
// ---------------------------------------------------------------------------

export const MachineLinkApiSchema = z.object({
    uuid: z.string().uuid(),
    machine_uuid: z.string().uuid(),
    label: z.string(),
    url: z.string(),
    position: z.number().int(),
});

export const MachineLinkSchema = MachineLinkApiSchema.transform((api) => ({
    uuid: api.uuid,
    machineUuid: api.machine_uuid,
    label: api.label,
    url: api.url,
    position: api.position,
}));

export type MachineLink = z.infer<typeof MachineLinkSchema>;

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const MachineApiSchema = z.object({
    uuid: z.string().uuid(),
    name: z.string(),
    room_id: z.number().int(),
    reference: z.string(),
    manufacturer: z.string(),
    model: z.string(),
    commissioning_date: z.string().nullable(),
    status: z.enum(MACHINE_STATUS_VALUES),
    responsible_user_uuid: z.string().uuid().nullable(),
    description: z.string(),
    links: z.array(MachineLinkApiSchema),
    next_maintenance_date: z.string().nullable(),
    last_maintenance_date: z.string().nullable(),
});

export const MachineSchema = MachineApiSchema.transform((api) => ({
    uuid: api.uuid,
    name: api.name,
    roomId: api.room_id,
    reference: api.reference,
    manufacturer: api.manufacturer,
    model: api.model,
    commissioningDate: api.commissioning_date,
    status: api.status as MachineStatus,
    responsibleUserUuid: api.responsible_user_uuid,
    description: api.description,
    links: api.links.map((link) => ({
        uuid: link.uuid,
        machineUuid: link.machine_uuid,
        label: link.label,
        url: link.url,
        position: link.position,
    })),
    nextMaintenanceDate: api.next_maintenance_date,
    lastMaintenanceDate: api.last_maintenance_date,
}));

export type Machine = z.infer<typeof MachineSchema>;
export const MachineListSchema = z.array(MachineSchema);

// ---------------------------------------------------------------------------
// MachineMaintenance
// ---------------------------------------------------------------------------

export const MachineMaintenanceApiSchema = z.object({
    uuid: z.string().uuid(),
    machine_uuid: z.string().uuid(),
    date: z.string(),
    type: z.enum(MAINTENANCE_TYPE_VALUES),
    performed_by_user_uuid: z.string().uuid().nullable(),
    performed_by_name: z.string(),
    description: z.string(),
    next_maintenance_date: z.string().nullable(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
});

export const MachineMaintenanceSchema = MachineMaintenanceApiSchema.transform((api) => ({
    uuid: api.uuid,
    machineUuid: api.machine_uuid,
    date: api.date,
    type: api.type as MaintenanceType,
    performedByUserUuid: api.performed_by_user_uuid,
    performedByName: api.performed_by_name,
    description: api.description,
    nextMaintenanceDate: api.next_maintenance_date,
}));

export type MachineMaintenance = z.infer<typeof MachineMaintenanceSchema>;
export const MachineMaintenanceListSchema = z.array(MachineMaintenanceSchema);

// ---------------------------------------------------------------------------
// Payloads d'écriture (camelCase domain → snake_case API)
// ---------------------------------------------------------------------------

export interface MachineLinkInput {
    label: string;
    url: string;
    position?: number;
}

export interface MachineInput {
    name: string;
    roomId: number;
    reference?: string;
    manufacturer?: string;
    model?: string;
    commissioningDate?: string | null;
    status?: MachineStatus;
    responsibleUserUuid?: string | null;
    description?: string;
    links: MachineLinkInput[];
}

export interface MachineMaintenanceInput {
    machineUuid: string;
    date: string;
    type: MaintenanceType;
    performedByUserUuid?: string | null;
    performedByName?: string;
    description?: string;
    nextMaintenanceDate?: string | null;
}

export function machineInputToApi(input: MachineInput) {
    return {
        name: input.name,
        room_id: input.roomId,
        reference: input.reference ?? '',
        manufacturer: input.manufacturer ?? '',
        model: input.model ?? '',
        commissioning_date: input.commissioningDate ?? null,
        status: input.status ?? MACHINE_STATUS.IN_SERVICE,
        responsible_user_uuid: input.responsibleUserUuid ?? null,
        description: input.description ?? '',
        links: input.links.map((link, idx) => ({
            label: link.label,
            url: link.url,
            position: link.position ?? idx,
        })),
    };
}

export function maintenanceInputToApi(input: MachineMaintenanceInput) {
    return {
        machine_uuid: input.machineUuid,
        date: input.date,
        type: input.type,
        performed_by_user_uuid: input.performedByUserUuid ?? null,
        performed_by_name: input.performedByName ?? '',
        description: input.description ?? '',
        next_maintenance_date: input.nextMaintenanceDate ?? null,
    };
}
