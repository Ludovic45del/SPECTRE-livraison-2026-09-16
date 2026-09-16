/**
 * Dashboard API response schema - Validation & Transformation
 * @module entities/dashboard/model
 *
 * API Format: snake_case -> Domain Format: camelCase
 */
import { z } from 'zod';

// ============================================================================
// Count schemas
// ============================================================================

const EntityCountsSchema = z.object({
    total: z.number().int(),
    by_status: z.record(z.string(), z.number().int()),
});

const EntityCountsTransformed = EntityCountsSchema.transform((api) => ({
    total: api.total,
    byStatus: api.by_status,
}));

const FaCountsSchema = EntityCountsSchema.extend({
    by_criticality: z.record(z.string(), z.number().int()),
});

const FaCountsTransformed = FaCountsSchema.transform((api) => ({
    total: api.total,
    byStatus: api.by_status,
    byCriticality: api.by_criticality,
}));

// ============================================================================
// Recent activity item schema
// ============================================================================

const ActivityItemApiSchema = z.object({
    id: z.string(),
    type: z.enum(['campaign', 'fsec', 'fa', 'embase', 'planning']),
    name: z.string(),
    // Slug d'URL calculé (null pour le type "planning" qui pointe vers /planning).
    slug: z.string().nullable().optional(),
    status_id: z.number().int().nullable(),
    last_updated: z.string().nullable(),
    // Campaign-specific
    type_id: z.number().int().nullable().optional(),
    installation_id: z.number().int().nullable().optional(),
    year: z.number().int().optional(),
    semester: z.string().optional(),
    // FSEC-specific
    campaign_name: z.string().nullable().optional(),
    localisation: z.string().nullable().optional(),
    // FA-specific
    criticality_id: z.number().int().nullable().optional(),
    // Embase-specific
    embase_type: z.string().nullable().optional(),
    localisation_actuelle: z.string().nullable().optional(),
    // Planning-specific
    step_label: z.string().nullable().optional(),
    fsec_name: z.string().nullable().optional(),
});

export type ActivityItemApi = z.infer<typeof ActivityItemApiSchema>;

const ActivityItemSchema = ActivityItemApiSchema.transform((api) => ({
    id: api.id,
    type: api.type,
    name: api.name,
    slug: api.slug ?? null,
    statusId: api.status_id,
    lastUpdated: api.last_updated,
    // Campaign-specific
    typeId: api.type_id ?? null,
    installationId: api.installation_id ?? null,
    year: api.year,
    semester: api.semester,
    // FSEC-specific
    campaignName: api.campaign_name ?? null,
    localisation: api.localisation ?? null,
    // FA-specific
    criticalityId: api.criticality_id ?? null,
    // Embase-specific
    embaseType: api.embase_type ?? null,
    localisationActuelle: api.localisation_actuelle ?? null,
    // Planning-specific
    stepLabel: api.step_label ?? null,
    fsecName: api.fsec_name ?? null,
}));

export type ActivityItem = z.infer<typeof ActivityItemSchema>;

// ============================================================================
// Full dashboard response (raw API schema)
// ============================================================================

export const DashboardApiSchema = z.object({
    counts: z.object({
        campaigns: EntityCountsSchema,
        fsecs: EntityCountsSchema,
        fas: FaCountsSchema,
    }),
    recent_activity: z.array(ActivityItemApiSchema),
});

export type DashboardApi = z.infer<typeof DashboardApiSchema>;

// ============================================================================
// Transformed dashboard schema (snake_case -> camelCase)
// ============================================================================

export const DashboardSchema = z
    .object({
        counts: z.object({
            campaigns: EntityCountsTransformed,
            fsecs: EntityCountsTransformed,
            fas: FaCountsTransformed,
        }),
        recent_activity: z.array(ActivityItemSchema),
    })
    .transform((api) => ({
        counts: api.counts,
        recentActivity: api.recent_activity,
    }));

export type Dashboard = z.infer<typeof DashboardSchema>;
