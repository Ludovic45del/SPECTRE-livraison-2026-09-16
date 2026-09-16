/**
 * useCampaignGeneralForm Hook Tests
 * @module pages/campaign-details/overview/hooks
 *
 * Tests for form state, validation, and save operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useCampaignGeneralForm } from './useCampaignGeneralForm';
import { CampaignWithRelations } from '@entities/campaign';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockShowNotification = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock('@shared/ui', () => ({
    useNotification: () => ({ showNotification: mockShowNotification }),
}));

vi.mock('@entities/campaign', () => ({
    useUpdateCampaign: () => ({
        mutateAsync: mockMutateAsync,
        isPending: false,
    }),
    CampaignGeneralFormSchema: z.object({
        name: z
            .string()
            .min(1, 'Le nom est requis')
            .min(2, 'Le nom doit contenir au moins 2 caractères')
            .max(200, 'Nom trop long (max 200 caractères)'),
        year: z.number().int().min(2000, 'Année invalide (2000-2100)').max(2100, 'Année invalide (2000-2100)'),
        typeId: z.number({ required_error: 'Le type est requis' }),
        installationId: z.number({ required_error: "L'installation est requise" }),
        description: z.string().max(4000, 'Description trop longue (max 4000 caractères)'),
    }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Test Data
// ─────────────────────────────────────────────────────────────────────────────

const mockCampaign: CampaignWithRelations = {
    slug: 'campagne-test',
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Campagne Test',
    year: 2024,
    semester: 'S1',
    dtriNumber: 42,
    description: 'Description test',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    lastUpdated: new Date(),
    type: { id: 1, label: 'Type A', color: '#FF0000' },
    status: { id: 2, label: 'En cours', color: '#00FF00' },
    installation: { id: 3, label: 'Installation X', color: '#0000FF' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('useCampaignGeneralForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockMutateAsync.mockResolvedValue({});
    });

    describe('Initialization', () => {
        it('should initialize form with campaign data', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            expect(result.current.form).toEqual({
                name: 'Campagne Test',
                year: 2024,
                semester: 'S1',
                typeId: 1,
                installationId: 3,
                dtriNumber: 42,
                description: 'Description test',
            });
        });

        it('should start in non-editing mode', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            expect(result.current.isEditing).toBe(false);
            expect(result.current.isSaving).toBe(false);
        });

        it('should initialize with empty errors', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            expect(result.current.errors).toEqual({});
        });
    });

    describe('Editing Mode', () => {
        it('should enter editing mode when startEditing is called', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            act(() => {
                result.current.startEditing();
            });

            expect(result.current.isEditing).toBe(true);
        });

        it('should exit editing mode when cancelEditing is called', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            act(() => {
                result.current.startEditing();
            });
            act(() => {
                result.current.cancelEditing();
            });

            expect(result.current.isEditing).toBe(false);
        });

        it('should reset form data when startEditing is called', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            // Modify form
            act(() => {
                result.current.setField('name', 'Modified Name');
            });

            // Start editing should reset to campaign values
            act(() => {
                result.current.startEditing();
            });

            expect(result.current.form.name).toBe('Campagne Test');
        });
    });

    describe('Field Updates', () => {
        it('should update name field', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            act(() => {
                result.current.setField('name', 'New Name');
            });

            expect(result.current.form.name).toBe('New Name');
        });

        it('should update year field', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            act(() => {
                result.current.setField('year', 2025);
            });

            expect(result.current.form.year).toBe(2025);
        });

        it('should update semester field', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            act(() => {
                result.current.setField('semester', 'S2');
            });

            expect(result.current.form.semester).toBe('S2');
        });

        it('should clear field error when field is modified', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            // Create an error by validating empty name
            act(() => {
                result.current.setField('name', '');
            });
            act(() => {
                result.current.validate();
            });

            expect(result.current.errors.name).toBeDefined();

            // Fix the field
            act(() => {
                result.current.setField('name', 'Valid Name');
            });

            expect(result.current.errors.name).toBeUndefined();
        });
    });

    describe('Validation', () => {
        it('should return true for valid form data', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            let isValid: boolean;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid!).toBe(true);
            expect(result.current.errors).toEqual({});
        });

        it('should validate empty name', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            act(() => {
                result.current.setField('name', '');
            });

            let isValid: boolean;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid!).toBe(false);
            expect(result.current.errors.name).toBe('Le nom est requis');
        });

        it('should validate name minimum length', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            act(() => {
                result.current.setField('name', 'A');
            });

            let isValid: boolean;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid!).toBe(false);
            expect(result.current.errors.name).toBe('Le nom doit contenir au moins 2 caractères');
        });

        it('should validate invalid year (too low)', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            act(() => {
                result.current.setField('year', 1999);
            });

            let isValid: boolean;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid!).toBe(false);
            expect(result.current.errors.year).toBe('Année invalide (2000-2100)');
        });

        it('should validate invalid year (too high)', () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            act(() => {
                result.current.setField('year', 2101);
            });

            let isValid: boolean;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid!).toBe(false);
            expect(result.current.errors.year).toBe('Année invalide (2000-2100)');
        });

        it('should validate missing typeId', () => {
            const campaignWithoutType: CampaignWithRelations = {
                ...mockCampaign,
                type: null,
            };

            const { result } = renderHook(() => useCampaignGeneralForm(campaignWithoutType));

            let isValid: boolean;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid!).toBe(false);
            expect(result.current.errors.typeId).toBe('Le type est requis');
        });

        it('should validate missing installationId', () => {
            const campaignWithoutInstallation: CampaignWithRelations = {
                ...mockCampaign,
                installation: null,
            };

            const { result } = renderHook(() => useCampaignGeneralForm(campaignWithoutInstallation));

            let isValid: boolean;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid!).toBe(false);
            expect(result.current.errors.installationId).toBe("L'installation est requise");
        });

        it('should collect multiple errors', () => {
            const invalidCampaign: CampaignWithRelations = {
                ...mockCampaign,
                name: '',
                year: 1900,
                type: null,
                installation: null,
            };

            const { result } = renderHook(() => useCampaignGeneralForm(invalidCampaign));

            let isValid: boolean;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid!).toBe(false);
            expect(Object.keys(result.current.errors).length).toBe(4);
        });
    });

    describe('Save Operation', () => {
        it('should save successfully with valid data', async () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            act(() => {
                result.current.startEditing();
            });

            let saveResult: boolean;
            await act(async () => {
                saveResult = await result.current.save();
            });

            expect(saveResult!).toBe(true);
            expect(mockMutateAsync).toHaveBeenCalledOnce();
            expect(mockShowNotification).toHaveBeenCalledWith('Informations générales mises à jour', 'success');
            expect(result.current.isEditing).toBe(false);
        });

        it('should not save with invalid data', async () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            act(() => {
                result.current.setField('name', '');
            });

            let saveResult: boolean;
            await act(async () => {
                saveResult = await result.current.save();
            });

            expect(saveResult!).toBe(false);
            expect(mockMutateAsync).not.toHaveBeenCalled();
            expect(mockShowNotification).toHaveBeenCalledWith('Veuillez corriger les erreurs', 'warning');
        });

        it('should handle save error', async () => {
            mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            act(() => {
                result.current.startEditing();
            });

            let saveResult: boolean;
            await act(async () => {
                saveResult = await result.current.save();
            });

            expect(saveResult!).toBe(false);
            expect(mockShowNotification).toHaveBeenCalledWith('Network error', 'error');
        });

        it('should call mutateAsync with correct data', async () => {
            const { result } = renderHook(() => useCampaignGeneralForm(mockCampaign));

            act(() => {
                result.current.startEditing();
                result.current.setField('name', 'Updated Name');
                result.current.setField('description', 'New description');
            });

            await act(async () => {
                await result.current.save();
            });

            expect(mockMutateAsync).toHaveBeenCalledWith({
                uuid: mockCampaign.uuid,
                data: expect.objectContaining({
                    name: 'Updated Name',
                    description: 'New description',
                    year: 2024,
                    semester: 'S1',
                }),
            });
        });
    });
});
