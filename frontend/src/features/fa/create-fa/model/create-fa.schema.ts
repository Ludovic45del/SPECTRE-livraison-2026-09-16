/**
 * Create FA Form Schema
 * @module features/fa/create-fa/model
 *
 * UI-specific schema using Dayjs for date fields (not reusable as API schema)
 */

import { z } from 'zod';
import dayjs, { type Dayjs } from 'dayjs';
import { FSEC_STEP_ID } from '@entities/fa';

export const CreateFaFormSchema = z
    .object({
        campaignId: z.string().uuid('La campagne est requise'),
        fsecVersionId: z.string().uuid('La FSEC est requise'),
        fsecStepId: z.number().int().nullable(),
        fsecStepOther: z.string().nullable().optional(),
        discovererUserUuid: z.string().uuid('Le découvreur est requis'),
        eventDate: z.custom<Dayjs>((val) => dayjs.isDayjs(val), { message: 'La date est requise' }),
        observation: z.string().min(1, 'Le constat est requis'),
        locationEquipment: z.string().nullable().optional(),
        quickAnalysis: z.string().min(1, "L'analyse rapide est requise"),
        immediateMeasures: z.string().nullable().optional(),
    })
    .refine((data) => data.fsecStepId !== FSEC_STEP_ID.AUTRE || (data.fsecStepOther?.trim().length ?? 0) > 0, {
        message: "Précisez l'étape FSEC",
        path: ['fsecStepOther'],
    });

export type CreateFaForm = z.infer<typeof CreateFaFormSchema>;
