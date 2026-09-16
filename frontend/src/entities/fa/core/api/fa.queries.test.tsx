/**
 * FA API Hooks Tests - Workflow Integration
 * @module entities/fa/api
 *
 * Tests TanStack Query hooks for FA CRUD operations and workflow transitions.
 * Simulates the complete FA lifecycle: Create → Validate Open → Validate Progress → Close
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';

import { api } from '@shared/api';
import {
    useFas,
    useFa,
    useFasByFsec,
    useCreateFa,
    useUpdateFa,
    useDeleteFa,
    useValidateOpenFa,
    useValidateProgressFa,
    useCloseFa,
} from './fa.queries';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@shared/api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@shared/api')>();
    return {
        ...actual,
        api: {
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
        },
    };
});

// ============================================================================
// Test Data Factories
// ============================================================================

const createMockApiFA = (overrides = {}) => ({
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    fsec_version_id: '223e4567-e89b-12d3-a456-426614174001',
    status_id: 0,
    type_id: null,
    criticality_id: null,
    identifier: 'FA-2024-001',
    fsec_step_id: 1,
    fsec_step_other: null,
    discoverer: 'Jean Dupont',
    discoverer_user_uuid: '11111111-1111-1111-1111-111111111111',
    event_date: '2024-01-15',
    observation: 'Anomalie détectée',
    location_equipment: 'Zone A',
    quick_analysis: 'Analyse rapide',
    immediate_measures: 'Mesures immédiates',
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
    created_at: '2024-01-15T10:00:00Z',
    last_updated: '2024-01-15T10:00:00Z',
    ...overrides,
});

// ============================================================================
// Test Wrapper
// ============================================================================

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    });

    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

// ============================================================================
// Tests
// ============================================================================

describe('FA Query Hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    // ========================================================================
    // useFas (List)
    // ========================================================================

    describe('useFas', () => {
        it('should fetch all FAs successfully', async () => {
            const mockFas = [
                createMockApiFA({ uuid: '11111111-1111-1111-1111-111111111111', identifier: 'FA-001' }),
                createMockApiFA({ uuid: '22222222-2222-2222-2222-222222222222', identifier: 'FA-002' }),
            ];
            vi.mocked(api.get).mockResolvedValueOnce(mockFas);

            const { result } = renderHook(() => useFas(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(api.get).toHaveBeenCalledWith('/fas/', undefined, expect.anything());
            expect(result.current.data).toHaveLength(2);
            expect(result.current.data?.[0].identifier).toBe('FA-001');
        });

        it('should handle empty list', async () => {
            vi.mocked(api.get).mockResolvedValueOnce([]);

            const { result } = renderHook(() => useFas(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toEqual([]);
        });

        it('should handle fetch error', async () => {
            vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() => useFas(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => expect(result.current.isError).toBe(true));

            expect(result.current.error).toBeDefined();
        });
    });

    // ========================================================================
    // useFa (Detail)
    // ========================================================================

    describe('useFa', () => {
        it('should fetch single FA by UUID', async () => {
            const mockFa = createMockApiFA();
            vi.mocked(api.get).mockResolvedValueOnce(mockFa);

            const { result } = renderHook(() => useFa('123e4567-e89b-12d3-a456-426614174000'), {
                wrapper: createWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(api.get).toHaveBeenCalledWith(
                '/fas/123e4567-e89b-12d3-a456-426614174000/',
                undefined,
                expect.anything(),
            );
            expect(result.current.data?.uuid).toBe('123e4567-e89b-12d3-a456-426614174000');
            expect(result.current.data?.discoverer).toBe('Jean Dupont');
        });

        it('should transform snake_case to camelCase', async () => {
            const mockFa = createMockApiFA({
                fsec_version_id: 'test-fsec-id',
                status_id: 1,
                iec_validation_open: true,
                iec_validation_open_date: '2024-01-20',
                iec_validation_open_name: 'Validator',
            });
            vi.mocked(api.get).mockResolvedValueOnce(mockFa);

            const { result } = renderHook(() => useFa('test-uuid'), {
                wrapper: createWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data?.fsecVersionId).toBe('test-fsec-id');
            expect(result.current.data?.statusId).toBe(1);
            expect(result.current.data?.iecValidationOpen).toBe(true);
            expect(result.current.data?.iecValidationOpenDate).toBeInstanceOf(Date);
            expect(result.current.data?.iecValidationOpenName).toBe('Validator');
        });

        it('should not fetch when uuid is empty', async () => {
            const { result } = renderHook(() => useFa(''), {
                wrapper: createWrapper(),
            });

            expect(result.current.isLoading).toBe(false);
            expect(result.current.fetchStatus).toBe('idle');
            expect(api.get).not.toHaveBeenCalled();
        });
    });

    // ========================================================================
    // useFasByFsec
    // ========================================================================

    describe('useFasByFsec', () => {
        it('should fetch all FAs for a FSEC version ID', async () => {
            const mockFa = createMockApiFA();
            vi.mocked(api.get).mockResolvedValueOnce([mockFa]);

            const { result } = renderHook(() => useFasByFsec('223e4567-e89b-12d3-a456-426614174001'), {
                wrapper: createWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(api.get).toHaveBeenCalledWith(
                '/fas/fsec/223e4567-e89b-12d3-a456-426614174001/',
                undefined,
                expect.anything(),
            );
            expect(result.current.data).toHaveLength(1);
            expect(result.current.data?.[0]?.fsecVersionId).toBe('223e4567-e89b-12d3-a456-426614174001');
        });

        it('should return empty array when no FA exists for FSEC', async () => {
            vi.mocked(api.get).mockResolvedValueOnce([]);

            const { result } = renderHook(() => useFasByFsec('no-fa-fsec-id'), {
                wrapper: createWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toEqual([]);
        });
    });

    // ========================================================================
    // useCreateFa
    // ========================================================================

    describe('useCreateFa', () => {
        it('should create a new FA', async () => {
            const mockCreatedFa = createMockApiFA({ identifier: 'FA-NEW' });
            vi.mocked(api.post).mockResolvedValueOnce(mockCreatedFa);

            const { result } = renderHook(() => useCreateFa(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({
                    fsecVersionId: '223e4567-e89b-12d3-a456-426614174001',
                    discovererUserUuid: '11111111-1111-1111-1111-111111111111',
                    eventDate: new Date('2024-01-15'),
                    observation: 'Anomalie détectée',
                    quickAnalysis: 'Analyse rapide',
                });
            });

            expect(api.post).toHaveBeenCalledWith(
                '/fas/',
                expect.objectContaining({
                    fsec_version_id: '223e4567-e89b-12d3-a456-426614174001',
                    discoverer_user_uuid: '11111111-1111-1111-1111-111111111111',
                    event_date: '2024-01-15',
                    observation: 'Anomalie détectée',
                    quick_analysis: 'Analyse rapide',
                }),
            );
        });

        it('should transform camelCase to snake_case for API', async () => {
            const mockCreatedFa = createMockApiFA();
            vi.mocked(api.post).mockResolvedValueOnce(mockCreatedFa);

            const { result } = renderHook(() => useCreateFa(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({
                    fsecVersionId: 'test-id',
                    fsecStepId: 5,
                    fsecStepOther: 'Other',
                    discovererUserUuid: '11111111-1111-1111-1111-111111111111',
                    eventDate: new Date('2024-01-15'),
                    observation: 'Test',
                    locationEquipment: 'Zone B',
                    quickAnalysis: 'Test',
                    immediateMeasures: 'Measures',
                });
            });

            expect(api.post).toHaveBeenCalledWith(
                '/fas/',
                expect.objectContaining({
                    fsec_version_id: 'test-id',
                    fsec_step_id: 5,
                    fsec_step_other: 'Other',
                    location_equipment: 'Zone B',
                    immediate_measures: 'Measures',
                }),
            );
        });
    });

    // ========================================================================
    // useUpdateFa
    // ========================================================================

    describe('useUpdateFa', () => {
        it('should update an existing FA', async () => {
            const mockUpdatedFa = createMockApiFA({ observation: 'Updated observation' });
            vi.mocked(api.put).mockResolvedValueOnce(mockUpdatedFa);

            const { result } = renderHook(() => useUpdateFa(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({
                    uuid: '123e4567-e89b-12d3-a456-426614174000',
                    observation: 'Updated observation',
                });
            });

            expect(api.put).toHaveBeenCalledWith(
                '/fas/123e4567-e89b-12d3-a456-426614174000/',
                expect.objectContaining({
                    uuid: '123e4567-e89b-12d3-a456-426614174000',
                    observation: 'Updated observation',
                }),
            );
        });

        it('should update Phase En cours fields', async () => {
            const mockUpdatedFa = createMockApiFA({
                status_id: 1,
                cause: 'Cause identifiée',
                type_id: 2,
                experience_impact: 'Impact mesuré',
                criticality_id: 1,
            });
            vi.mocked(api.put).mockResolvedValueOnce(mockUpdatedFa);

            const { result } = renderHook(() => useUpdateFa(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({
                    uuid: 'test-uuid',
                    cause: 'Cause identifiée',
                    typeId: 2,
                    experienceImpact: 'Impact mesuré',
                    criticalityId: 1,
                });
            });

            expect(api.put).toHaveBeenCalledWith(
                '/fas/test-uuid/',
                expect.objectContaining({
                    cause: 'Cause identifiée',
                    type_id: 2,
                    experience_impact: 'Impact mesuré',
                    criticality_id: 1,
                }),
            );
        });
    });

    // ========================================================================
    // useDeleteFa
    // ========================================================================

    describe('useDeleteFa', () => {
        it('should delete a FA', async () => {
            vi.mocked(api.delete).mockResolvedValueOnce(undefined);

            const { result } = renderHook(() => useDeleteFa(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync('123e4567-e89b-12d3-a456-426614174000');
            });

            expect(api.delete).toHaveBeenCalledWith('/fas/123e4567-e89b-12d3-a456-426614174000/');
        });
    });

    // ========================================================================
    // Workflow Validation Hooks
    // ========================================================================

    describe('useValidateOpenFa', () => {
        it('should validate Phase Ouvert', async () => {
            const mockValidatedFa = createMockApiFA({
                status_id: 1,
                iec_validation_open: true,
                iec_validation_open_date: '2024-01-20',
                iec_validation_open_name: 'IEC Validator',
            });
            vi.mocked(api.post).mockResolvedValueOnce(mockValidatedFa);

            const { result } = renderHook(() => useValidateOpenFa(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({
                    uuid: 'test-uuid',
                    validatorName: 'IEC Validator',
                    validationDate: new Date('2024-01-20'),
                });
            });

            expect(api.post).toHaveBeenCalledWith(
                '/fas/test-uuid/validate-open/',
                expect.objectContaining({
                    validator_name: 'IEC Validator',
                    validation_date: '2024-01-20',
                }),
            );
        });

        it('should handle validation without date', async () => {
            const mockValidatedFa = createMockApiFA({ status_id: 1 });
            vi.mocked(api.post).mockResolvedValueOnce(mockValidatedFa);

            const { result } = renderHook(() => useValidateOpenFa(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({
                    uuid: 'test-uuid',
                    validatorName: 'Validator',
                });
            });

            expect(api.post).toHaveBeenCalledWith(
                '/fas/test-uuid/validate-open/',
                expect.objectContaining({
                    validator_name: 'Validator',
                    validation_date: null,
                }),
            );
        });
    });

    describe('useValidateProgressFa', () => {
        it('should validate Phase En cours', async () => {
            const mockValidatedFa = createMockApiFA({
                status_id: 1,
                iec_validation_progress: true,
                iec_validation_progress_name: 'IEC Validator 2',
            });
            vi.mocked(api.post).mockResolvedValueOnce(mockValidatedFa);

            const { result } = renderHook(() => useValidateProgressFa(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({
                    uuid: 'test-uuid',
                    validatorName: 'IEC Validator 2',
                    validationDate: new Date('2024-02-01'),
                });
            });

            expect(api.post).toHaveBeenCalledWith(
                '/fas/test-uuid/validate-progress/',
                expect.objectContaining({
                    validator_name: 'IEC Validator 2',
                    validation_date: '2024-02-01',
                }),
            );
        });
    });

    describe('useCloseFa', () => {
        it('should close a FA', async () => {
            const mockClosedFa = createMockApiFA({
                status_id: 2,
                closure_validation: 'Anomalie corrigée',
                closure_date: '2024-02-15',
                closure_validator_name: 'Chef Labo + IEC',
            });
            vi.mocked(api.post).mockResolvedValueOnce(mockClosedFa);

            const { result } = renderHook(() => useCloseFa(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({
                    uuid: 'test-uuid',
                    validatorName: 'Chef Labo + IEC',
                    closureValidation: 'Anomalie corrigée',
                    closureDate: new Date('2024-02-15'),
                });
            });

            expect(api.post).toHaveBeenCalledWith(
                '/fas/test-uuid/close/',
                expect.objectContaining({
                    validator_name: 'Chef Labo + IEC',
                    closure_validation: 'Anomalie corrigée',
                    closure_date: '2024-02-15',
                }),
            );
        });
    });
});

// ============================================================================
// Complete Workflow Integration Test
// ============================================================================

describe('FA Complete Workflow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle complete FA lifecycle: Create → Validate Open → Update → Validate Progress → Close', async () => {
        const WORKFLOW_FA_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
        const WORKFLOW_FSEC_UUID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

        // Step 1: Create FA (Status: Ouvert)
        const createdFa = createMockApiFA({
            uuid: WORKFLOW_FA_UUID,
            fsec_version_id: WORKFLOW_FSEC_UUID,
            status_id: 0,
        });
        vi.mocked(api.post).mockResolvedValueOnce(createdFa);

        const createTestWrapper = () => {
            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: { retry: false },
                    mutations: { retry: false },
                },
            });
            return ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );
        };

        // Create
        const { result: createResult } = renderHook(() => useCreateFa(), {
            wrapper: createTestWrapper(),
        });

        let fa: Awaited<ReturnType<typeof createResult.current.mutateAsync>>;
        await act(async () => {
            fa = await createResult.current.mutateAsync({
                fsecVersionId: WORKFLOW_FSEC_UUID,
                discovererUserUuid: '11111111-1111-1111-1111-111111111111',
                eventDate: new Date('2024-01-15'),
                observation: 'Anomalie détectée',
                quickAnalysis: 'Fuite probable',
            });
        });

        expect(fa!.statusId).toBe(0);
        expect(fa!.uuid).toBe(WORKFLOW_FA_UUID);

        // Step 2: Validate Open (Status: En cours)
        const validatedOpenFa = createMockApiFA({
            uuid: WORKFLOW_FA_UUID,
            status_id: 1,
            iec_validation_open: true,
            iec_validation_open_date: '2024-01-20',
            iec_validation_open_name: 'IEC Validator',
        });
        vi.mocked(api.post).mockResolvedValueOnce(validatedOpenFa);

        const { result: validateOpenResult } = renderHook(() => useValidateOpenFa(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            fa = await validateOpenResult.current.mutateAsync({
                uuid: fa!.uuid,
                validatorName: 'IEC Validator',
                validationDate: new Date('2024-01-20'),
            });
        });

        expect(fa!.statusId).toBe(1);
        expect(fa!.iecValidationOpen).toBe(true);

        // Step 3: Update Phase En cours
        const updatedFa = createMockApiFA({
            uuid: WORKFLOW_FA_UUID,
            status_id: 1,
            cause: 'Défaut de soudure',
            type_id: 1,
            experience_impact: 'Retard de 2 jours',
            criticality_id: 2,
        });
        vi.mocked(api.put).mockResolvedValueOnce(updatedFa);

        const { result: updateResult } = renderHook(() => useUpdateFa(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            fa = await updateResult.current.mutateAsync({
                uuid: fa!.uuid,
                cause: 'Défaut de soudure',
                typeId: 1,
                experienceImpact: 'Retard de 2 jours',
                criticalityId: 2,
            });
        });

        expect(fa!.cause).toBe('Défaut de soudure');
        expect(fa!.typeId).toBe(1);

        // Step 4: Validate Progress
        const validatedProgressFa = createMockApiFA({
            uuid: WORKFLOW_FA_UUID,
            status_id: 1,
            iec_validation_progress: true,
            iec_validation_progress_name: 'IEC Validator 2',
        });
        vi.mocked(api.post).mockResolvedValueOnce(validatedProgressFa);

        const { result: validateProgressResult } = renderHook(() => useValidateProgressFa(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            fa = await validateProgressResult.current.mutateAsync({
                uuid: fa!.uuid,
                validatorName: 'IEC Validator 2',
                validationDate: new Date('2024-02-01'),
            });
        });

        expect(fa!.iecValidationProgress).toBe(true);

        // Step 5: Close FA (Status: Clos)
        const closedFa = createMockApiFA({
            uuid: WORKFLOW_FA_UUID,
            status_id: 2,
            closure_validation: 'Anomalie corrigée et vérifiée',
            closure_date: '2024-02-15',
            closure_validator_name: 'Chef Labo + IEC',
        });
        vi.mocked(api.post).mockResolvedValueOnce(closedFa);

        const { result: closeResult } = renderHook(() => useCloseFa(), {
            wrapper: createWrapper(),
        });

        await act(async () => {
            fa = await closeResult.current.mutateAsync({
                uuid: fa!.uuid,
                validatorName: 'Chef Labo + IEC',
                closureValidation: 'Anomalie corrigée et vérifiée',
                closureDate: new Date('2024-02-15'),
            });
        });

        expect(fa!.statusId).toBe(2);
        expect(fa!.closureValidation).toBe('Anomalie corrigée et vérifiée');
        expect(fa!.closureValidatorName).toBe('Chef Labo + IEC');
    });
});
