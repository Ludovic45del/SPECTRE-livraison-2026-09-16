/**
 * MSW Request Handlers
 *
 * Mock API handlers for testing. These handlers intercept API requests
 * and return mock responses during tests.
 */
import { http, HttpResponse } from 'msw';

import { stockHandlers } from './stock-handlers';
import { tasklistHandlers } from './tasklist-handlers';
import { messagingHandlers } from './messaging-handlers';

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

export const createMockCampaign = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    slug: '2025-s1-lmj-campagne-test',
    type_id: 0,
    status_id: 0,
    installation_id: 0,
    name: 'Campagne Test',
    year: 2025,
    semester: 'S1',
    last_updated: new Date().toISOString(),
    start_date: '2025-01-15',
    end_date: '2025-06-30',
    dtri_number: 12345,
    description: 'Campagne de test',
    ...overrides,
});

export const createMockFsec = (overrides: Record<string, unknown> = {}) => ({
    version_uuid: crypto.randomUUID(),
    fsec_uuid: crypto.randomUUID(),
    slug: '2025-s1-lmj-campagne-test-fsec-test',
    campaign_slug: '2025-s1-lmj-campagne-test',
    campaign_id: crypto.randomUUID(),
    status_id: 0,
    category_id: 0,
    rack_id: 0,
    name: 'FSEC Test',
    // Nom complet calculé côté backend : « {year}-{installation}_{campagne}_{name} ».
    // Dérivé du `name` surchargé pour que les tests qui cherchent le nom court à
    // l'écran (via un texte contenant le nom) restent valides.
    display_name: `2025-LMJ_Campagne Test_${(overrides as { name?: string }).name ?? 'FSEC Test'}`,
    comments: 'FSEC de test',
    is_active: true,
    delivery_date: '2025-03-01',
    shooting_date: null,
    preshooting_pressure: null,
    experience_srxx: null,
    localisation: null,
    depressurization_failed: null,
    // Vues / photos demandées (R08) — texte libre, null par défaut.
    requested_views: null,
    // Requis (nullable, non optionnel) par FsecApiSchema : sans ces clés, les FSEC
    // servies par le handler par défaut échouent au parse Zod.
    last_updated: null,
    created_at: null,
    ...overrides,
});

/**
 * Ligne du tableau récap FSEC (payload enrichi de GET /fsec-assembly-items/fsec/:uuid/).
 * `catalog_item` doit être un payload StockCatalogItemApiSchema complet
 * (cf. `createMockStockCatalogItem` dans stock-handlers).
 */
export const createMockFsecAssemblyItem = (overrides: Record<string, unknown> = {}) => ({
    uuid: crypto.randomUUID(),
    fsec_uuid: crypto.randomUUID(),
    catalog_item_uuid: crypto.randomUUID(),
    sort_order: 0,
    remarque: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
});

export const createMockFa = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    slug: 'fa-2025-0001',
    fsec_slug: '2025-s1-lmj-campagne-test-fsec-test',
    campaign_slug: '2025-s1-lmj-campagne-test',
    fsec_version_id: crypto.randomUUID(),
    status_id: 0,
    type_id: 0,
    criticality_id: 0,
    identifier: 'FA-2025-0001',
    fsec_step_id: null,
    fsec_step_other: null,
    discoverer: 'Test Discoverer',
    event_date: '2025-03-01',
    observation: 'Observation de test',
    location_equipment: 'Equipement A',
    quick_analysis: 'Analyse rapide de test',
    immediate_measures: null,
    iec_validation_open: false,
    iec_validation_open_date: null,
    iec_validation_open_name: null,
    cause: null,
    experience_impact: null,
    iec_validation_progress: false,
    iec_validation_progress_name: null,
    closure_validation: null,
    closure_date: null,
    closure_validator_name: null,
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    ...overrides,
});

export const createMockAssemblyStep = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    fsec_version_id: crypto.randomUUID(),
    operator: 'Assembleur Test',
    operator_user_uuid: null,
    operator_user_uuids: [],
    start_date: '2025-02-01',
    end_date: '2025-02-15',
    comments: 'Assemblage de test',
    machine_uuids: [],
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    ...overrides,
});

export const createMockGasStep = (_type: string, overrides = {}) => ({
    uuid: crypto.randomUUID(),
    fsec_version_id: crypto.randomUUID(),
    // Common fields
    operator: 'Test Operator',
    gas_type: 'Helium',
    date_of_fulfilment: '2025-03-05',
    // Airtightness fields
    leak_rate_dtri: '0.001',
    experiment_pressure: 1.5,
    airtightness_test_duration: null,
    // Gas filling BP/HP fields
    leak_test_duration: null,
    gas_base: null,
    gas_container: null,
    observations: null,
    embase_id: null,
    embase_identifier: null,
    // Permeation fields
    target_pressure: null,
    start_date: null,
    estimated_end_date: null,
    sensor_pressure: null,
    computed_shot_pressure: null,
    // Depressurization fields
    pressure_gauge: null,
    enclosure_pressure_measured: null,
    start_time: null,
    end_time: null,
    depressurization_time_before_firing: null,
    computed_pressure_before_firing: null,
    // Repressurization fields
    computed_pressure: null,
    ...overrides,
});

export const createMockCampaignTeamMember = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    campaign_uuid: crypto.randomUUID(),
    role_id: 0,
    name: 'Jean Dupont',
    ...overrides,
});

export const createMockCampaignDocument = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    campaign_uuid: crypto.randomUUID(),
    subtype_id: 0,
    name: 'Document Test',
    path: '/documents/test.pdf',
    date: '2025-03-01',
    ...overrides,
});

export const createMockFsecTeamMember = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    fsec_id: crypto.randomUUID(),
    role_id: 0,
    name: 'Marie Martin',
    ...overrides,
});

export const createMockFsecDocument = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    fsec_id: crypto.randomUUID(),
    subtype_id: 0,
    name: 'Document FSEC Test',
    path: '/documents/fsec-test.pdf',
    date: '2025-03-01',
    ...overrides,
});

export const createMockEmbase = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    slug: 'emb-001',
    identifier: 'EMB-001',
    type: 'jet_de_gaz' as const,
    nombre_voies: 1,
    soufflet_v1: '',
    capteur_v1: '',
    offset_v1_mv: null,
    mesurande_lie_v1_mv: null,
    sensibilite_v1_mv: null,
    signal_meteociel_v1_mv: null,
    capteur_cible_pfeiffer_mbar: null,
    etendue_v1_mbar: null,
    test_etancheite_he: '',
    test_capteur_mrg: '',
    etalonnage_date: null,
    observations_v1: '',
    operationnelle_aimant: false,
    operationnelle_broche: false,
    localisation_actuelle: '',
    cote_ve: null,
    decalage_angulaire: '',
    chargement_mcc: '',
    soufflet_v2: '',
    capteur_v2: '',
    offset_v2_mv: null,
    mesurande_lie_v2_mv: null,
    sensibilite_v2_mv: null,
    signal_meteociel_v2_mv: null,
    capteur_cible_pfeiffer_v2_mbar: null,
    etendue_v2_mbar: null,
    test_etancheite_he_v2: '',
    test_capteur_mrg_v2: '',
    observations_v2: '',
    electrovanne: false,
    fsec_history: '',
    last_etalonnage_date: null,
    last_etalonnage_date_v1: null,
    last_etalonnage_date_v2: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
});

export const createMockEtalonnage = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    embase_uuid: crypto.randomUUID(),
    voie: 1 as const,
    date: '2025-03-01',
    operateur: 'Opérateur Test',
    offset_0_bar_mv: 0.5,
    mesurande_0_bar_lie: 1.0,
    signal_etendue_mv: 2.0,
    signal_pa_meteociel: 1013.25,
    created_at: new Date().toISOString(),
    ...overrides,
});

export const createMockMetrologyStep = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    fsec_version_id: crypto.randomUUID(),
    rack_id: 0,
    metrologist_name: 'Métrologue Test',
    metrologist_user_uuid: null,
    metrologist_user_uuids: [],
    date: '2025-03-01',
    comments: 'Métrologie de test',
    machine_uuids: [],
    metro_file_link: null,
    visrad_link: null,
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    ...overrides,
});

export const createMockSealingStep = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    metrology_step_id: crypto.randomUUID(),
    date: '2025-03-02',
    metrologist_name: 'Métrologue Scellement',
    rack_id: 0,
    interface_io: 'IO-001',
    comments: 'Scellement de test',
    verification_status: null,
    verification_remark: null,
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    ...overrides,
});

export const createMockPicturesStep = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    fsec_version_id: crypto.randomUUID(),
    operator: 'Photographe Test',
    date: '2025-03-03',
    comments: 'Photos de test',
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    ...overrides,
});

export const createMockPhotoView = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    pictures_step_id: crypto.randomUUID(),
    name: 'Vue Test',
    link: '/photos/test.jpg',
    ...overrides,
});

export const createMockPermeationStep = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    fsec_version_id: crypto.randomUUID(),
    gas_type: 'Helium',
    target_pressure: 2.0,
    operator: 'Opérateur Perméation',
    start_date: '2025-03-01',
    estimated_end_date: '2025-03-15',
    sensor_pressure: 1.8,
    computed_shot_pressure: 1.5,
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    ...overrides,
});

export const createMockDepressurizationStep = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    fsec_version_id: crypto.randomUUID(),
    operator: 'Opérateur Dépressurisation',
    date_of_fulfilment: '2025-03-05',
    pressure_gauge: 1.0,
    enclosure_pressure_measured: 0.5,
    start_time: '2025-03-05T08:00:00Z',
    end_time: '2025-03-05T10:00:00Z',
    observations: 'Observations de test',
    depressurization_time_before_firing: 120,
    computed_pressure_before_firing: 0.3,
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    ...overrides,
});

export const createMockRepressurizationStep = (overrides = {}) => ({
    uuid: crypto.randomUUID(),
    fsec_version_id: crypto.randomUUID(),
    operator: 'Opérateur Repressurisation',
    gas_type: 'Argon',
    start_date: '2025-03-10',
    estimated_end_date: '2025-03-20',
    sensor_pressure: 2.5,
    computed_pressure: 2.0,
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    ...overrides,
});

export const createMockDashboardSummary = (overrides = {}) => ({
    counts: {
        campaigns: { total: 5, by_status: { 'En cours': 3, Terminée: 2 } },
        fsecs: { total: 12, by_status: { Ouvert: 5, 'En cours': 4, Clos: 3 } },
        fas: {
            total: 8,
            by_status: { Ouvert: 3, 'En cours': 3, Clos: 2 },
            by_criticality: { Faible: 2, Moyenne: 4, Haute: 2 },
        },
    },
    recent_activity: [
        {
            id: crypto.randomUUID(),
            type: 'campaign' as const,
            name: 'Campagne récente',
            status_id: 0,
            last_updated: new Date().toISOString(),
        },
        {
            id: crypto.randomUUID(),
            type: 'fsec' as const,
            name: 'FSEC récent',
            status_id: 0,
            last_updated: new Date().toISOString(),
            campaign_name: 'Campagne 1',
            localisation: null,
        },
    ],
    ...overrides,
});

/** Contact de l'annuaire des laboratoires (snake_case = format API brut, /lab-contacts/). */
export const createMockLabContact = (overrides: Record<string, unknown> = {}) => ({
    uuid: crypto.randomUUID(),
    name: 'Labo 426',
    phone: '426',
    comment: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
});

// ============================================================================
// DEFAULT MOCK DATA
// ============================================================================

const mockCampaigns = [createMockCampaign({ name: 'Campagne 1' }), createMockCampaign({ name: 'Campagne 2' })];

const mockFsecs = [createMockFsec({ name: 'FSEC 1' }), createMockFsec({ name: 'FSEC 2' })];

const mockFas = [createMockFa({ identifier: 'FA-2025-0001' }), createMockFa({ identifier: 'FA-2025-0002' })];

const mockCampaignTeamMembers = [
    createMockCampaignTeamMember({ name: 'Jean Dupont' }),
    createMockCampaignTeamMember({ name: 'Marie Martin' }),
];

const mockCampaignDocuments = [
    createMockCampaignDocument({ name: 'Doc 1' }),
    createMockCampaignDocument({ name: 'Doc 2' }),
];

const mockFsecTeamMembers = [
    createMockFsecTeamMember({ name: 'Pierre Durand' }),
    createMockFsecTeamMember({ name: 'Sophie Leroy' }),
];

const mockFsecDocuments = [
    createMockFsecDocument({ name: 'FSEC Doc 1' }),
    createMockFsecDocument({ name: 'FSEC Doc 2' }),
];

const mockEmbases = [createMockEmbase({ name: 'Embase 1' }), createMockEmbase({ name: 'Embase 2' })];

const mockEtalonnages = [createMockEtalonnage({ voie: 1 }), createMockEtalonnage({ voie: 2 })];

const mockDashboardSummary = createMockDashboardSummary();

// ============================================================================
// REFERENTIAL DATA
// ============================================================================

const mockCampaignTypes = [
    { id: 0, name: 'Type A' },
    { id: 1, name: 'Type B' },
];

const mockCampaignStatuses = [
    { id: 0, name: 'En cours' },
    { id: 1, name: 'Terminée' },
];

const mockCampaignInstallations = [
    { id: 0, name: 'Installation A' },
    { id: 1, name: 'Installation B' },
];

const mockFsecStatuses = [
    { id: 0, name: 'Ouvert' },
    { id: 1, name: 'En cours' },
    { id: 2, name: 'Clos' },
];

const mockFsecCategories = [
    { id: 0, name: 'Catégorie A' },
    { id: 1, name: 'Catégorie B' },
];

const mockFaStatuses = [
    { id: 0, name: 'Ouvert' },
    { id: 1, name: 'En cours' },
    { id: 2, name: 'Clos' },
];

const mockFaTypes = [
    { id: 0, name: 'Type 1' },
    { id: 1, name: 'Type 2' },
];

const mockFaCriticalities = [
    { id: 0, name: 'Faible' },
    { id: 1, name: 'Moyenne' },
    { id: 2, name: 'Haute' },
];

// ============================================================================
// USER LOOKUP MOCKS (dropdowns d'opérateurs)
// ============================================================================

export const mockUserLookup = [
    {
        uuid: '11111111-1111-1111-1111-111111111111',
        username: 'chef',
        first_name: 'Pierre',
        last_name: 'Dupont',
        roles: ['chef_labo'],
        role: 'chef_labo',
        is_active: true,
        laboratoire: 'LMJ',
        service: 'SEPI',
        numero: '01 23 45 67 01',
        bureau: 'B-101',
    },
    {
        uuid: '22222222-2222-2222-2222-222222222222',
        username: 'amartin',
        first_name: 'Alice',
        last_name: 'Martin',
        roles: ['metrologue'],
        role: 'metrologue',
        is_active: true,
        laboratoire: 'LMJ',
        service: 'Métrologie',
        numero: '01 23 45 67 02',
        bureau: 'B-202',
    },
    {
        uuid: '33333333-3333-3333-3333-333333333333',
        username: 'jbernard',
        first_name: 'Jean',
        last_name: 'Bernard',
        roles: ['iec'],
        role: 'iec',
        is_active: true,
        laboratoire: 'LMJ',
        service: 'IEC',
        numero: '',
        bureau: 'B-303',
    },
    {
        uuid: '44444444-4444-4444-4444-444444444444',
        username: 'lpetit',
        first_name: 'Lucie',
        last_name: 'Petit',
        roles: ['assembleur'],
        role: 'assembleur',
        is_active: true,
        laboratoire: 'LMJ',
        service: 'Assemblage',
        numero: '01 23 45 67 04',
        bureau: '',
    },
    {
        uuid: '55555555-5555-5555-5555-555555555555',
        username: 'mdurand',
        first_name: 'Marc',
        last_name: 'Durand',
        roles: ['rce'],
        role: 'rce',
        is_active: true,
        laboratoire: 'LMJ',
        service: 'RCE',
        numero: '01 23 45 67 05',
        bureau: 'B-505',
    },
    {
        uuid: '66666666-6666-6666-6666-666666666666',
        username: 'cgarcia',
        first_name: 'Camille',
        last_name: 'Garcia',
        roles: ['cryogenie'],
        role: 'cryogenie',
        is_active: true,
        laboratoire: 'LMJ',
        service: 'Cryogénie',
        numero: '01 23 45 67 06',
        bureau: 'B-606',
    },
    {
        uuid: '77777777-7777-7777-7777-777777777777',
        username: 'sstagiaire',
        first_name: 'Sophie',
        last_name: 'Lefevre',
        roles: ['stagiaire'],
        role: 'stagiaire',
        is_active: true,
        laboratoire: '',
        service: '',
        numero: '',
        bureau: '',
    },
];

// ============================================================================
// API HANDLERS
// ============================================================================

export const handlers = [
    // ========================================
    // USER LOOKUP HANDLER (dropdowns d'opérateurs)
    // ========================================

    http.get('/api/v1/users/lookup/', ({ request }) => {
        const url = new URL(request.url);
        const roles = url.searchParams.getAll('role');
        const isActiveParam = url.searchParams.get('is_active');
        const isActive = isActiveParam === null ? true : isActiveParam === 'true';

        const filtered = mockUserLookup.filter((u) => {
            if (u.is_active !== isActive) return false;
            // Multi-rôles : un membre matche dès qu'il porte UN des rôles demandés.
            if (roles.length > 0 && !u.roles.some((r) => roles.includes(r))) return false;
            return true;
        });
        return HttpResponse.json(filtered);
    }),

    // ========================================
    // CAMPAIGN HANDLERS
    // ========================================

    // List campaigns
    http.get('/api/v1/campaigns/', () => {
        return HttpResponse.json(mockCampaigns);
    }),

    // Get campaign by slug
    http.get('/api/v1/campaigns/by-slug/:slug/', ({ params }) => {
        const campaign = mockCampaigns.find((c) => c.slug === params.slug) ?? mockCampaigns[0];
        if (!campaign) {
            return new HttpResponse(null, { status: 404 });
        }
        return HttpResponse.json(campaign);
    }),

    // Get campaign by UUID
    http.get('/api/v1/campaigns/:uuid/', ({ params }) => {
        const campaign = mockCampaigns.find((c) => c.uuid === params.uuid);
        if (!campaign) {
            return new HttpResponse(null, { status: 404 });
        }
        return HttpResponse.json(campaign);
    }),

    // Create campaign
    http.post('/api/v1/campaigns/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const newCampaign = createMockCampaign(body);
        return HttpResponse.json(newCampaign, { status: 201 });
    }),

    // Update campaign
    http.put('/api/v1/campaigns/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const updatedCampaign = createMockCampaign({ uuid: params.uuid, ...body });
        return HttpResponse.json(updatedCampaign);
    }),

    // Patch campaign
    http.patch('/api/v1/campaigns/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const existingCampaign = mockCampaigns.find((c) => c.uuid === params.uuid);
        const updatedCampaign = { ...existingCampaign, ...body };
        return HttpResponse.json(updatedCampaign);
    }),

    // Delete campaign
    http.delete('/api/v1/campaigns/:uuid/', () => {
        return new HttpResponse(null, { status: 204 });
    }),

    // Campaign referential data
    http.get('/api/v1/campaign-types/', () => HttpResponse.json(mockCampaignTypes)),
    http.get('/api/v1/campaign-statuses/', () => HttpResponse.json(mockCampaignStatuses)),
    http.get('/api/v1/campaign-installations/', () => HttpResponse.json(mockCampaignInstallations)),

    // ========================================
    // FSEC HANDLERS
    // ========================================

    // List FSECs
    http.get('/api/v1/fsecs/', () => {
        return HttpResponse.json(mockFsecs);
    }),

    // Active FSEC versions only (sélecteurs)
    http.get('/api/v1/fsecs/active/', () => {
        return HttpResponse.json(mockFsecs.filter((f) => f.is_active));
    }),

    // Get FSEC by slug
    http.get('/api/v1/fsecs/by-slug/:slug/', ({ params }) => {
        const fsec = mockFsecs.find((f) => f.slug === params.slug) ?? mockFsecs[0];
        if (!fsec) {
            return new HttpResponse(null, { status: 404 });
        }
        return HttpResponse.json(fsec);
    }),

    // Get FSEC by UUID
    http.get('/api/v1/fsecs/:uuid/', ({ params }) => {
        const fsec = mockFsecs.find((f) => f.version_uuid === params.uuid);
        if (!fsec) {
            return new HttpResponse(null, { status: 404 });
        }
        return HttpResponse.json(fsec);
    }),

    // Create FSEC
    http.post('/api/v1/fsecs/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const newFsec = createMockFsec(body);
        return HttpResponse.json(newFsec, { status: 201 });
    }),

    // Update FSEC
    http.put('/api/v1/fsecs/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const updatedFsec = createMockFsec({ version_uuid: params.uuid, ...body });
        return HttpResponse.json(updatedFsec);
    }),

    // Delete FSEC
    http.delete('/api/v1/fsecs/:uuid/', () => {
        return new HttpResponse(null, { status: 204 });
    }),

    // Vues / photos demandées (R08) : action PATCH dédiée, renvoie le FSEC complet.
    http.patch('/api/v1/fsecs/:uuid/requested-views/', async ({ params, request }) => {
        const body = (await request.json()) as { requested_views?: string | null };
        const existing = mockFsecs.find((f) => f.version_uuid === params.uuid);
        const value = body.requested_views?.trim() || null;
        return HttpResponse.json({
            ...(existing ?? createMockFsec({ version_uuid: params.uuid })),
            requested_views: value,
        });
    }),

    // ========================================
    // FSEC ASSEMBLY ITEMS (tableau récap éléments/consommables)
    // ========================================

    http.get('/api/v1/fsec-assembly-items/fsec/:fsecUuid/', () => HttpResponse.json([])),
    http.get('/api/v1/stock/catalog/available-for-fsec/:fsecUuid/', () => HttpResponse.json([])),
    http.post('/api/v1/fsec-assembly-items/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockFsecAssemblyItem(body), { status: 201 });
    }),
    http.patch('/api/v1/fsec-assembly-items/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockFsecAssemblyItem({ uuid: params.uuid, ...body }));
    }),
    http.delete('/api/v1/fsec-assembly-items/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // FSEC referential data
    http.get('/api/v1/fsec-statuses/', () => HttpResponse.json(mockFsecStatuses)),
    http.get('/api/v1/fsec-categories/', () => HttpResponse.json(mockFsecCategories)),

    // ========================================
    // FA HANDLERS
    // ========================================

    // List FAs
    http.get('/api/v1/fas/', () => {
        return HttpResponse.json(mockFas);
    }),

    // Get FAs by FSEC version
    http.get('/api/v1/fas/fsec/:fsecVersionId/', ({ params }) => {
        const fas = mockFas.filter((fa) => fa.fsec_version_id === params.fsecVersionId);
        return HttpResponse.json(fas);
    }),

    // Get FA by slug
    http.get('/api/v1/fas/by-slug/:slug/', ({ params }) => {
        const fa = mockFas.find((f) => f.slug === params.slug) ?? mockFas[0];
        if (!fa) {
            return new HttpResponse(null, { status: 404 });
        }
        return HttpResponse.json(fa);
    }),

    // Get FA by UUID
    http.get('/api/v1/fas/:uuid/', ({ params }) => {
        const fa = mockFas.find((f) => f.uuid === params.uuid);
        if (!fa) {
            return new HttpResponse(null, { status: 404 });
        }
        return HttpResponse.json(fa);
    }),

    // Create FA
    http.post('/api/v1/fas/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const newFa = createMockFa(body);
        return HttpResponse.json(newFa, { status: 201 });
    }),

    // Update FA
    http.put('/api/v1/fas/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const updatedFa = createMockFa({ uuid: params.uuid, ...body });
        return HttpResponse.json(updatedFa);
    }),

    // Delete FA
    http.delete('/api/v1/fas/:uuid/', () => {
        return new HttpResponse(null, { status: 204 });
    }),

    // FA referential data
    http.get('/api/v1/fa-statuses/', () => HttpResponse.json(mockFaStatuses)),
    http.get('/api/v1/fa-types/', () => HttpResponse.json(mockFaTypes)),
    http.get('/api/v1/fa-criticalities/', () => HttpResponse.json(mockFaCriticalities)),

    // ========================================
    // STEPS HANDLERS
    // ========================================

    // Assembly steps
    http.get('/api/v1/assembly-steps/fsec/:fsecVersionId/', () => {
        return HttpResponse.json([createMockAssemblyStep()]);
    }),

    http.post('/api/v1/assembly-steps/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const newStep = createMockAssemblyStep(body);
        return HttpResponse.json(newStep, { status: 201 });
    }),

    http.put('/api/v1/assembly-steps/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const updatedStep = createMockAssemblyStep({ uuid: params.uuid, ...body });
        return HttpResponse.json(updatedStep);
    }),

    http.delete('/api/v1/assembly-steps/:uuid/', () => {
        return new HttpResponse(null, { status: 204 });
    }),

    // All gas steps (aggregated endpoint)
    http.get('/api/v1/all-gas-steps/fsec/:fsecVersionId/', () => {
        return HttpResponse.json({
            airtightnessTestLp: [createMockGasStep('airtightness')],
            gasFillingBp: [createMockGasStep('gas_filling_bp')],
            gasFillingHp: [createMockGasStep('gas_filling_hp')],
            permeation: [createMockGasStep('permeation')],
            depressurization: [createMockGasStep('depressurization')],
            repressurization: [createMockGasStep('repressurization')],
        });
    }),

    // All gas steps (alternative URL pattern used by query hook)
    http.get('/api/v1/all-gas-steps/:fsecVersionId/', () => {
        return HttpResponse.json({
            airtightnessTestLp: [createMockGasStep('airtightness')],
            gasFillingBp: [createMockGasStep('gas_filling_bp')],
            gasFillingHp: [createMockGasStep('gas_filling_hp')],
            permeation: [createMockGasStep('permeation')],
            depressurization: [createMockGasStep('depressurization')],
            repressurization: [createMockGasStep('repressurization')],
        });
    }),

    // Individual gas step endpoints
    http.post('/api/v1/airtightness-test-lp-steps/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockGasStep('airtightness', body), { status: 201 });
    }),

    http.post('/api/v1/gas-filling-bp-steps/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockGasStep('gas_filling_bp', body), { status: 201 });
    }),

    http.post('/api/v1/gas-filling-hp-steps/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockGasStep('gas_filling_hp', body), { status: 201 });
    }),

    http.delete('/api/v1/airtightness-test-lp-steps/:uuid/', () => new HttpResponse(null, { status: 204 })),
    http.delete('/api/v1/gas-filling-bp-steps/:uuid/', () => new HttpResponse(null, { status: 204 })),
    http.delete('/api/v1/gas-filling-hp-steps/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // CAMPAIGN TEAM HANDLERS
    // ========================================

    // List campaign team members by campaign
    http.get('/api/v1/campaign-teams/campaign/:campaignUuid/', () => {
        return HttpResponse.json(mockCampaignTeamMembers);
    }),

    // Get campaign team member by UUID
    http.get('/api/v1/campaign-teams/:uuid/', ({ params }) => {
        const member = mockCampaignTeamMembers.find((m) => m.uuid === params.uuid);
        if (!member) return new HttpResponse(null, { status: 404 });
        return HttpResponse.json(member);
    }),

    // Create campaign team member
    http.post('/api/v1/campaign-teams/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockCampaignTeamMember(body), { status: 201 });
    }),

    // Update campaign team member
    http.put('/api/v1/campaign-teams/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockCampaignTeamMember({ uuid: params.uuid, ...body }));
    }),

    // Delete campaign team member
    http.delete('/api/v1/campaign-teams/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // CAMPAIGN DOCUMENT HANDLERS
    // ========================================

    // List campaign documents by campaign
    http.get('/api/v1/campaign-documents/campaign/:campaignUuid/', () => {
        return HttpResponse.json(mockCampaignDocuments);
    }),

    // Get campaign document by UUID
    http.get('/api/v1/campaign-documents/:uuid/', ({ params }) => {
        const doc = mockCampaignDocuments.find((d) => d.uuid === params.uuid);
        if (!doc) return new HttpResponse(null, { status: 404 });
        return HttpResponse.json(doc);
    }),

    // Create campaign document
    http.post('/api/v1/campaign-documents/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockCampaignDocument(body), { status: 201 });
    }),

    // Update campaign document
    http.put('/api/v1/campaign-documents/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockCampaignDocument({ uuid: params.uuid, ...body }));
    }),

    // Delete campaign document
    http.delete('/api/v1/campaign-documents/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // FSEC TEAM HANDLERS
    // ========================================

    // List FSEC team members by FSEC
    http.get('/api/v1/fsec-teams/fsec/:fsecId/', () => {
        return HttpResponse.json(mockFsecTeamMembers);
    }),

    // Get FSEC team member by UUID
    http.get('/api/v1/fsec-teams/:uuid/', ({ params }) => {
        const member = mockFsecTeamMembers.find((m) => m.uuid === params.uuid);
        return HttpResponse.json(member ?? createMockFsecTeamMember({ uuid: params.uuid as string }));
    }),

    // Create FSEC team member
    http.post('/api/v1/fsec-teams/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockFsecTeamMember(body), { status: 201 });
    }),

    // Update FSEC team member
    http.put('/api/v1/fsec-teams/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockFsecTeamMember({ uuid: params.uuid, ...body }));
    }),

    // Delete FSEC team member
    http.delete('/api/v1/fsec-teams/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // FSEC DOCUMENT HANDLERS
    // ========================================

    // List FSEC documents by FSEC
    http.get('/api/v1/fsec-documents/fsec/:fsecId/', () => {
        return HttpResponse.json(mockFsecDocuments);
    }),

    // Get FSEC document by UUID
    http.get('/api/v1/fsec-documents/:uuid/', ({ params }) => {
        const doc = mockFsecDocuments.find((d) => d.uuid === params.uuid);
        return HttpResponse.json(doc ?? createMockFsecDocument({ uuid: params.uuid as string }));
    }),

    // Create FSEC document
    http.post('/api/v1/fsec-documents/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockFsecDocument(body), { status: 201 });
    }),

    // Delete FSEC document
    http.delete('/api/v1/fsec-documents/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // EMBASE HANDLERS
    // ========================================

    // List embases
    http.get('/api/v1/embases/', () => {
        return HttpResponse.json(mockEmbases);
    }),

    // Get embase by slug
    http.get('/api/v1/embases/by-slug/:slug/', ({ params }) => {
        const embase = mockEmbases.find((e) => e.slug === params.slug);
        return HttpResponse.json(embase ?? createMockEmbase({ slug: params.slug as string }));
    }),

    // Get embase by UUID
    http.get('/api/v1/embases/:uuid/', ({ params }) => {
        const embase = mockEmbases.find((e) => e.uuid === params.uuid);
        return HttpResponse.json(embase ?? createMockEmbase({ uuid: params.uuid as string }));
    }),

    // Get embase FSEC history
    http.get('/api/v1/embases/:uuid/fsec-history/', () => {
        return HttpResponse.json([]);
    }),

    // Create embase
    http.post('/api/v1/embases/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockEmbase(body), { status: 201 });
    }),

    // Update embase
    http.put('/api/v1/embases/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockEmbase({ uuid: params.uuid, ...body }));
    }),

    // Delete embase
    http.delete('/api/v1/embases/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // ETALONNAGE HANDLERS
    // ========================================

    // List etalonnages (with query params)
    http.get('/api/v1/etalonnages/', () => {
        return HttpResponse.json(mockEtalonnages);
    }),

    // Create etalonnage
    http.post('/api/v1/etalonnages/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockEtalonnage(body), { status: 201 });
    }),

    // Delete etalonnage
    http.delete('/api/v1/etalonnages/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // DASHBOARD HANDLERS
    // ========================================

    // Get dashboard summary
    http.get('/api/v1/dashboard/', () => {
        return HttpResponse.json(mockDashboardSummary);
    }),

    // ========================================
    // METROLOGY STEP HANDLERS
    // ========================================

    // List metrology steps by FSEC
    http.get('/api/v1/metrology-steps/fsec/:fsecVersionId/', () => {
        return HttpResponse.json([createMockMetrologyStep()]);
    }),

    // Get metrology step by UUID
    http.get('/api/v1/metrology-steps/:uuid/', ({ params }) => {
        return HttpResponse.json(createMockMetrologyStep({ uuid: params.uuid }));
    }),

    // Create metrology step
    http.post('/api/v1/metrology-steps/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockMetrologyStep(body), { status: 201 });
    }),

    // Update metrology step
    http.put('/api/v1/metrology-steps/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockMetrologyStep({ uuid: params.uuid, ...body }));
    }),

    // Delete metrology step
    http.delete('/api/v1/metrology-steps/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // SEALING STEP HANDLERS
    // ========================================

    // Get sealing step by metrology step
    http.get('/api/v1/sealing-steps/metrology/:metrologyStepId/', () => {
        return HttpResponse.json(createMockSealingStep());
    }),

    // Get sealing step by UUID
    http.get('/api/v1/sealing-steps/:uuid/', ({ params }) => {
        return HttpResponse.json(createMockSealingStep({ uuid: params.uuid }));
    }),

    // Create sealing step
    http.post('/api/v1/sealing-steps/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockSealingStep(body), { status: 201 });
    }),

    // Update sealing step
    http.put('/api/v1/sealing-steps/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockSealingStep({ uuid: params.uuid, ...body }));
    }),

    // Delete sealing step
    http.delete('/api/v1/sealing-steps/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // PICTURES STEP HANDLERS
    // ========================================

    // List pictures steps by FSEC
    http.get('/api/v1/pictures-steps/fsec/:fsecVersionId/', () => {
        return HttpResponse.json([createMockPicturesStep()]);
    }),

    // Get pictures step by UUID
    http.get('/api/v1/pictures-steps/:uuid/', ({ params }) => {
        return HttpResponse.json(createMockPicturesStep({ uuid: params.uuid }));
    }),

    // Create pictures step
    http.post('/api/v1/pictures-steps/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockPicturesStep(body), { status: 201 });
    }),

    // Update pictures step
    http.put('/api/v1/pictures-steps/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockPicturesStep({ uuid: params.uuid, ...body }));
    }),

    // Delete pictures step
    http.delete('/api/v1/pictures-steps/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // PHOTO VIEW HANDLERS
    // ========================================

    // List photo views by pictures step
    http.get('/api/v1/photo-views/pictures-step/:picturesStepId/', () => {
        return HttpResponse.json([createMockPhotoView()]);
    }),

    // Get photo view by UUID
    http.get('/api/v1/photo-views/:uuid/', ({ params }) => {
        return HttpResponse.json(createMockPhotoView({ uuid: params.uuid }));
    }),

    // Create photo view
    http.post('/api/v1/photo-views/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockPhotoView(body), { status: 201 });
    }),

    // Update photo view
    http.put('/api/v1/photo-views/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockPhotoView({ uuid: params.uuid, ...body }));
    }),

    // Delete photo view
    http.delete('/api/v1/photo-views/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // PERMEATION STEP HANDLERS
    // ========================================

    // List permeation steps by FSEC
    http.get('/api/v1/permeation-steps/fsec/:fsecVersionId/', () => {
        return HttpResponse.json([createMockPermeationStep()]);
    }),

    // Get permeation step by UUID
    http.get('/api/v1/permeation-steps/:uuid/', ({ params }) => {
        return HttpResponse.json(createMockPermeationStep({ uuid: params.uuid }));
    }),

    // Create permeation step
    http.post('/api/v1/permeation-steps/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockPermeationStep(body), { status: 201 });
    }),

    // Update permeation step
    http.put('/api/v1/permeation-steps/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockPermeationStep({ uuid: params.uuid, ...body }));
    }),

    // Delete permeation step
    http.delete('/api/v1/permeation-steps/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // DEPRESSURIZATION STEP HANDLERS
    // ========================================

    // List depressurization steps by FSEC
    http.get('/api/v1/depressurization-steps/fsec/:fsecVersionId/', () => {
        return HttpResponse.json([createMockDepressurizationStep()]);
    }),

    // Get depressurization step by UUID
    http.get('/api/v1/depressurization-steps/:uuid/', ({ params }) => {
        return HttpResponse.json(createMockDepressurizationStep({ uuid: params.uuid }));
    }),

    // Create depressurization step
    http.post('/api/v1/depressurization-steps/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockDepressurizationStep(body), { status: 201 });
    }),

    // Update depressurization step
    http.put('/api/v1/depressurization-steps/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockDepressurizationStep({ uuid: params.uuid, ...body }));
    }),

    // Delete depressurization step
    http.delete('/api/v1/depressurization-steps/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // REPRESSURIZATION STEP HANDLERS
    // ========================================

    // List repressurization steps by FSEC
    http.get('/api/v1/repressurization-steps/fsec/:fsecVersionId/', () => {
        return HttpResponse.json([createMockRepressurizationStep()]);
    }),

    // Get repressurization step by UUID
    http.get('/api/v1/repressurization-steps/:uuid/', ({ params }) => {
        return HttpResponse.json(createMockRepressurizationStep({ uuid: params.uuid }));
    }),

    // Create repressurization step
    http.post('/api/v1/repressurization-steps/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockRepressurizationStep(body), { status: 201 });
    }),

    // Update repressurization step
    http.put('/api/v1/repressurization-steps/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockRepressurizationStep({ uuid: params.uuid, ...body }));
    }),

    // Delete repressurization step
    http.delete('/api/v1/repressurization-steps/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // INDIVIDUAL GAS STEP GET HANDLERS (missing from original)
    // ========================================

    // Airtightness steps by FSEC
    http.get('/api/v1/airtightness-test-lp-steps/fsec/:fsecVersionId/', () => {
        return HttpResponse.json([createMockGasStep('airtightness')]);
    }),

    http.get('/api/v1/airtightness-test-lp-steps/:uuid/', ({ params }) => {
        return HttpResponse.json(createMockGasStep('airtightness', { uuid: params.uuid }));
    }),

    http.put('/api/v1/airtightness-test-lp-steps/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockGasStep('airtightness', { uuid: params.uuid, ...body }));
    }),

    // Gas filling BP steps by FSEC
    http.get('/api/v1/gas-filling-bp-steps/fsec/:fsecVersionId/', () => {
        return HttpResponse.json([createMockGasStep('gas_filling_bp')]);
    }),

    http.get('/api/v1/gas-filling-bp-steps/:uuid/', ({ params }) => {
        return HttpResponse.json(createMockGasStep('gas_filling_bp', { uuid: params.uuid }));
    }),

    http.put('/api/v1/gas-filling-bp-steps/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockGasStep('gas_filling_bp', { uuid: params.uuid, ...body }));
    }),

    // Gas filling HP steps by FSEC
    http.get('/api/v1/gas-filling-hp-steps/fsec/:fsecVersionId/', () => {
        return HttpResponse.json([createMockGasStep('gas_filling_hp')]);
    }),

    http.get('/api/v1/gas-filling-hp-steps/:uuid/', ({ params }) => {
        return HttpResponse.json(createMockGasStep('gas_filling_hp', { uuid: params.uuid }));
    }),

    http.put('/api/v1/gas-filling-hp-steps/:uuid/', async ({ params, request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockGasStep('gas_filling_hp', { uuid: params.uuid, ...body }));
    }),

    // ========================================
    // MATERIAL HANDLERS (salles + machines)
    // ========================================

    http.get('/api/v1/material/rooms/', () => {
        return HttpResponse.json([
            { id: 1, code: 'B1', label: 'Salle B1', color: '#1976D2', sort_order: 0 },
            { id: 2, code: 'B2', label: 'Salle B2', color: '#388E3C', sort_order: 1 },
            { id: 3, code: 'A13', label: 'Salle A13', color: '#F57C00', sort_order: 2 },
        ]);
    }),

    http.get('/api/v1/material/machines/', () => {
        return HttpResponse.json([]);
    }),

    // ========================================
    // LAB CONTACTS HANDLERS (annuaire des laboratoires — Équipe et Carte)
    // ========================================
    // Liste vide par défaut : aucun seed, la page part sur l'état vide (cf. R07).
    http.get('/api/v1/lab-contacts/', () => HttpResponse.json([])),

    http.post('/api/v1/lab-contacts/', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockLabContact(body), { status: 201 });
    }),

    http.put('/api/v1/lab-contacts/:uuid/', async ({ request, params }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(createMockLabContact({ ...body, uuid: params.uuid }));
    }),

    http.delete('/api/v1/lab-contacts/:uuid/', () => new HttpResponse(null, { status: 204 })),

    // ========================================
    // STOCK HANDLERS (cf. CDC §5)
    // ========================================
    ...stockHandlers,

    // ========================================
    // TASK LIST HANDLERS (listes partagées)
    // ========================================
    ...tasklistHandlers,

    // ========================================
    // MESSAGING HANDLERS (messagerie interne)
    // ========================================
    ...messagingHandlers,
];

// ============================================================================
// HANDLER OVERRIDES FOR SPECIFIC TEST SCENARIOS
// ============================================================================

export const errorHandlers = {
    // Return 500 error for campaigns
    campaignServerError: http.get('/api/v1/campaigns/', () => {
        return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }),

    // Return 404 for specific campaign
    campaignNotFound: http.get('/api/v1/campaigns/:uuid/', () => {
        return new HttpResponse(null, { status: 404 });
    }),

    // Return validation error on create
    campaignValidationError: http.post('/api/v1/campaigns/', () => {
        return HttpResponse.json({ error: 'Validation Error', details: { name: 'Name is required' } }, { status: 400 });
    }),

    // Network error simulation
    networkError: http.get('/api/v1/campaigns/', () => {
        return HttpResponse.error();
    }),
};

export const emptyHandlers = {
    // Return empty list for campaigns
    emptyCampaigns: http.get('/api/v1/campaigns/', () => {
        return HttpResponse.json([]);
    }),

    // Return empty list for FSECs
    emptyFsecs: http.get('/api/v1/fsecs/', () => {
        return HttpResponse.json([]);
    }),

    // Return empty list for FAs
    emptyFas: http.get('/api/v1/fas/', () => {
        return HttpResponse.json([]);
    }),
};
