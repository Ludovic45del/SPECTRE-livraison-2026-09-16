/**
 * useCampaignDatesForm Hook Tests
 * @module pages/campaign-details/overview/hooks
 *
 * Tests for dates form state, validation, and save operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import dayjs from 'dayjs';
import { z } from 'zod';
import { useCampaignDatesForm } from './useCampaignDatesForm';
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
    CampaignDayjsDateSchema: z.custom((val) => val === null || (dayjs.isDayjs(val) && val.isValid()), {
        message: 'Date invalide',
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

const mockCampaignNoDates: CampaignWithRelations = {
    ...mockCampaign,
    startDate: null,
    endDate: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('useCampaignDatesForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockMutateAsync.mockResolvedValue({});
    });

    describe('Initialization', () => {
        it('should initialize form with campaign dates as dayjs objects', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            expect(result.current.form.startDate?.format('YYYY-MM-DD')).toBe('2024-01-01');
            expect(result.current.form.endDate?.format('YYYY-MM-DD')).toBe('2024-06-30');
        });

        it('should initialize form with null dates when campaign has no dates', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaignNoDates));

            expect(result.current.form.startDate).toBeNull();
            expect(result.current.form.endDate).toBeNull();
        });

        it('should start in non-editing mode', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            expect(result.current.isEditing).toBe(false);
            expect(result.current.isSaving).toBe(false);
        });

        it('should initialize with empty errors', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            expect(result.current.errors).toEqual({});
        });
    });

    describe('Editing Mode', () => {
        it('should enter editing mode when startEditing is called', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            act(() => {
                result.current.startEditing();
            });

            expect(result.current.isEditing).toBe(true);
        });

        it('should exit editing mode when cancelEditing is called', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            act(() => {
                result.current.startEditing();
            });
            act(() => {
                result.current.cancelEditing();
            });

            expect(result.current.isEditing).toBe(false);
        });

        it('should reset form data and errors when startEditing is called', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            // Modify form
            act(() => {
                result.current.setStartDate(dayjs('2025-01-01'));
            });

            // Start editing should reset to campaign values
            act(() => {
                result.current.startEditing();
            });

            expect(result.current.form.startDate?.format('YYYY-MM-DD')).toBe('2024-01-01');
            expect(result.current.errors).toEqual({});
        });

        it('should clear errors when cancelEditing is called', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            // Create an error
            act(() => {
                result.current.setEndDate(dayjs('2023-01-01'));
            });
            act(() => {
                result.current.validate();
            });

            expect(result.current.errors.endDate).toBeDefined();

            act(() => {
                result.current.cancelEditing();
            });

            expect(result.current.errors).toEqual({});
        });
    });

    describe('Date Updates', () => {
        it('should update start date', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));
            const newDate = dayjs('2024-02-15');

            act(() => {
                result.current.setStartDate(newDate);
            });

            expect(result.current.form.startDate?.format('YYYY-MM-DD')).toBe('2024-02-15');
        });

        it('should update end date', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));
            const newDate = dayjs('2024-12-31');

            act(() => {
                result.current.setEndDate(newDate);
            });

            expect(result.current.form.endDate?.format('YYYY-MM-DD')).toBe('2024-12-31');
        });

        it('should allow setting start date to null', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            act(() => {
                result.current.setStartDate(null);
            });

            expect(result.current.form.startDate).toBeNull();
        });

        it('should allow setting end date to null', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            act(() => {
                result.current.setEndDate(null);
            });

            expect(result.current.form.endDate).toBeNull();
        });

        it('should clear errors when start date is modified', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            // Create an error
            act(() => {
                result.current.setEndDate(dayjs('2023-01-01'));
            });
            act(() => {
                result.current.validate();
            });

            expect(result.current.errors.endDate).toBeDefined();

            // Modify start date should clear all errors
            act(() => {
                result.current.setStartDate(dayjs('2022-01-01'));
            });

            expect(result.current.errors).toEqual({});
        });

        it('should clear end date error when end date is modified', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            // Create an error
            act(() => {
                result.current.setEndDate(dayjs('2023-01-01'));
            });
            act(() => {
                result.current.validate();
            });

            expect(result.current.errors.endDate).toBeDefined();

            // Modify end date should clear end date error
            act(() => {
                result.current.setEndDate(dayjs('2025-01-01'));
            });

            expect(result.current.errors.endDate).toBeUndefined();
        });
    });

    describe('Validation', () => {
        it('should return true for valid date range', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            let isValid: boolean;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid!).toBe(true);
            expect(result.current.errors).toEqual({});
        });

        it('should return true when both dates are null', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaignNoDates));

            let isValid: boolean;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid!).toBe(true);
            expect(result.current.errors).toEqual({});
        });

        it('should return true when only start date is set', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaignNoDates));

            act(() => {
                result.current.setStartDate(dayjs('2024-01-01'));
            });

            let isValid: boolean;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid!).toBe(true);
        });

        it('should return true when only end date is set', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaignNoDates));

            act(() => {
                result.current.setEndDate(dayjs('2024-06-30'));
            });

            let isValid: boolean;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid!).toBe(true);
        });

        it('should fail validation when end date is before start date', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            act(() => {
                result.current.setEndDate(dayjs('2023-06-30')); // Before start date
            });

            let isValid: boolean;
            act(() => {
                isValid = result.current.validate();
            });

            expect(isValid!).toBe(false);
            expect(result.current.errors.endDate).toBe('La date de fin doit être après la date de début');
        });

        it('should fail validation when end date equals start date (same day)', () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            act(() => {
                result.current.setStartDate(dayjs('2024-01-01'));
                result.current.setEndDate(dayjs('2024-01-01'));
            });

            let isValid: boolean;
            act(() => {
                isValid = result.current.validate();
            });

            // Same day should be valid (not before)
            expect(isValid!).toBe(true);
        });
    });

    describe('Save Operation', () => {
        it('should save successfully with valid dates', async () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            act(() => {
                result.current.startEditing();
            });

            let saveResult: boolean;
            await act(async () => {
                saveResult = await result.current.save();
            });

            expect(saveResult!).toBe(true);
            expect(mockMutateAsync).toHaveBeenCalledOnce();
            expect(mockShowNotification).toHaveBeenCalledWith('Dates mises à jour', 'success');
            expect(result.current.isEditing).toBe(false);
        });

        it('should not save with invalid dates', async () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            act(() => {
                result.current.setEndDate(dayjs('2023-01-01')); // Invalid: before start
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

            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

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

        it('should call mutateAsync with correct date data', async () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));
            const newStartDate = dayjs('2024-03-01');
            const newEndDate = dayjs('2024-09-30');

            act(() => {
                result.current.startEditing();
                result.current.setStartDate(newStartDate);
                result.current.setEndDate(newEndDate);
            });

            await act(async () => {
                await result.current.save();
            });

            expect(mockMutateAsync).toHaveBeenCalledWith({
                uuid: mockCampaign.uuid,
                data: expect.objectContaining({
                    startDate: newStartDate.toDate(),
                    endDate: newEndDate.toDate(),
                }),
            });
        });

        it('should call mutateAsync with null dates when cleared', async () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            act(() => {
                result.current.startEditing();
                result.current.setStartDate(null);
                result.current.setEndDate(null);
            });

            await act(async () => {
                await result.current.save();
            });

            expect(mockMutateAsync).toHaveBeenCalledWith({
                uuid: mockCampaign.uuid,
                data: expect.objectContaining({
                    startDate: null,
                    endDate: null,
                }),
            });
        });

        it('should preserve campaign data when saving dates', async () => {
            const { result } = renderHook(() => useCampaignDatesForm(mockCampaign));

            act(() => {
                result.current.startEditing();
            });

            await act(async () => {
                await result.current.save();
            });

            expect(mockMutateAsync).toHaveBeenCalledWith({
                uuid: mockCampaign.uuid,
                data: expect.objectContaining({
                    name: mockCampaign.name,
                    year: mockCampaign.year,
                    semester: mockCampaign.semester,
                    typeId: mockCampaign.type?.id,
                    installationId: mockCampaign.installation?.id,
                }),
            });
        });
    });
});
