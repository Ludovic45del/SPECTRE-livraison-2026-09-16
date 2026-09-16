/**
 * Tests for FaHeader Component
 *
 * Tests FA header rendering, breadcrumb links, delete flow, and conditional display.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { FaHeader } from './FaHeader';
import type { Fa } from '@entities/fa';

// Valid UUIDs
const MOCK_FA_UUID = '00000000-0000-0000-0000-000000000001';
const MOCK_FSEC_UUID = '00000000-0000-0000-0000-000000000002';
const MOCK_CAMPAIGN_UUID = '00000000-0000-0000-0000-000000000003';

const createMockFa = (overrides: Partial<Fa> = {}): Fa => ({
    slug: 'fa-2025-fsec01',
    fsecSlug: null,
    campaignSlug: null,
    uuid: MOCK_FA_UUID,
    fsecVersionId: MOCK_FSEC_UUID,
    identifier: 'FA_2025_FSEC01',
    statusId: 0,
    typeId: null,
    criticalityId: null,
    fsecStepId: null,
    fsecStepOther: null,
    discoverer: 'Jean Dupont',
    discovererUserUuid: null,
    eventDate: new Date('2025-02-15'),
    observation: 'Test observation',
    locationEquipment: null,
    quickAnalysis: 'Analyse rapide',
    immediateMeasures: null,
    iecValidationOpen: false,
    iecValidationOpenDate: null,
    iecValidationOpenName: null,
    iecValidationOpenUserUuid: null,
    cause: null,
    experienceImpact: null,
    iecValidationProgress: false,
    iecValidationProgressName: null,
    iecValidationProgressUserUuid: null,
    closureValidation: null,
    closureDate: null,
    closureValidatorName: null,
    closureValidatorUserUuid: null,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    lastUpdated: new Date('2025-02-20T14:30:00Z'),
    fsecName: null,
    fsecDisplayName: null,
    installation: null,
    ...overrides,
});

const mockFsecApiResponse = {
    version_uuid: MOCK_FSEC_UUID,
    fsec_uuid: '00000000-0000-0000-0000-000000000099',
    slug: 'fsec-test-01',
    campaign_slug: 'campagne-alpha',
    campaign_id: MOCK_CAMPAIGN_UUID,
    name: 'FSEC-TEST-01',
    status_id: 0,
    category_id: 0,
    rack_id: null,
    comments: null,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    last_updated: '2025-01-01T00:00:00Z',
    delivery_date: null,
    shooting_date: null,
    preshooting_pressure: null,
    experience_srxx: null,
    localisation: null,
    depressurization_failed: null,
};

const mockCampaignApiResponse = {
    uuid: MOCK_CAMPAIGN_UUID,
    slug: 'campagne-alpha',
    name: 'Campagne Alpha',
    year: 2025,
    semester: 'S1',
    type_id: 0,
    status_id: 0,
    installation_id: 0,
    start_date: null,
    end_date: null,
    dtri_number: null,
    description: null,
    last_updated: '2025-01-01T00:00:00Z',
};

// Mock notification hook
const mockShowNotification = vi.fn();
vi.mock('@shared/ui', () => ({
    useNotification: () => ({
        showNotification: mockShowNotification,
    }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('FaHeader', () => {
    beforeEach(() => {
        mockShowNotification.mockClear();
        mockNavigate.mockClear();

        server.use(
            http.get('/api/v1/fsecs/:uuid/', () => {
                return HttpResponse.json(mockFsecApiResponse);
            }),
            http.get('/api/v1/campaigns/:uuid/', () => {
                return HttpResponse.json(mockCampaignApiResponse);
            }),
            http.delete('/api/v1/fas/:uuid/', () => {
                return new HttpResponse(null, { status: 204 });
            }),
        );
    });

    // ========================================================================
    // RENDERING
    // ========================================================================

    describe('Rendering', () => {
        it('should render FA identifier as heading', () => {
            renderWithProviders(<FaHeader fa={createMockFa()} />);
            expect(screen.getByRole('heading', { name: /FA_2025_FSEC01/ })).toBeInTheDocument();
        });

        it('should render banner with aria-label containing identifier', () => {
            renderWithProviders(<FaHeader fa={createMockFa()} />);
            expect(screen.getByRole('banner', { name: /FA_2025_FSEC01/ })).toBeInTheDocument();
        });

        it('should render FA circle icon', () => {
            renderWithProviders(<FaHeader fa={createMockFa()} />);
            expect(screen.getByText('FA')).toBeInTheDocument();
        });

        it('should render last updated date when present', () => {
            renderWithProviders(<FaHeader fa={createMockFa()} />);
            expect(screen.getByText(/Dernière modification/)).toBeInTheDocument();
            expect(screen.getByText(/20\/02\/2025/)).toBeInTheDocument();
        });

        it('should not render last updated when null', () => {
            renderWithProviders(<FaHeader fa={createMockFa({ lastUpdated: null })} />);
            expect(screen.queryByText(/Dernière modification/)).not.toBeInTheDocument();
        });

        it('should render delete button', () => {
            renderWithProviders(<FaHeader fa={createMockFa()} />);
            expect(screen.getByRole('button', { name: /Supprimer la FA/ })).toBeInTheDocument();
        });

        it('should render workflow stepper navigation', () => {
            renderWithProviders(<FaHeader fa={createMockFa()} />);
            expect(screen.getByRole('navigation', { name: /Workflow/ })).toBeInTheDocument();
        });
    });

    // ========================================================================
    // BREADCRUMB LINKS
    // ========================================================================

    describe('Breadcrumb links', () => {
        it('should display FSEC breadcrumb link after loading', async () => {
            renderWithProviders(<FaHeader fa={createMockFa()} />);
            await waitFor(() => {
                expect(screen.getByText(/FSEC : FSEC-TEST-01/)).toBeInTheDocument();
            });
        });

        it('should link FSEC breadcrumb to fsec-details page', async () => {
            renderWithProviders(<FaHeader fa={createMockFa()} />);
            await waitFor(() => {
                const link = screen.getByText(/FSEC : FSEC-TEST-01/);
                expect(link.closest('a')).toHaveAttribute('href', '/fsec-details/fsec-test-01/overview');
            });
        });

        it('should display campaign breadcrumb after loading', async () => {
            renderWithProviders(<FaHeader fa={createMockFa()} />);
            await waitFor(() => {
                expect(screen.getByText(/Campagne : 2025-LMJ_Campagne Alpha/)).toBeInTheDocument();
            });
        });

        it('should link campaign breadcrumb to campagne-details page', async () => {
            renderWithProviders(<FaHeader fa={createMockFa()} />);
            await waitFor(() => {
                const link = screen.getByText(/Campagne : 2025-LMJ_Campagne Alpha/);
                expect(link.closest('a')).toHaveAttribute('href', '/campagne-details/campagne-alpha/overview');
            });
        });

        it('should display campaign type and installation chips', async () => {
            renderWithProviders(<FaHeader fa={createMockFa()} />);
            await waitFor(() => {
                expect(screen.getByText('Campagne DAM')).toBeInTheDocument();
                expect(screen.getByText('LMJ')).toBeInTheDocument();
            });
        });
    });

    // ========================================================================
    // DELETE FLOW
    // ========================================================================

    describe('Delete flow', () => {
        it('should open delete confirmation dialog on button click', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FaHeader fa={createMockFa()} />);

            await user.click(screen.getByRole('button', { name: /Supprimer la FA/ }));

            const dialog = screen.getByRole('dialog');
            expect(within(dialog).getByText(/Êtes-vous sûr de vouloir supprimer/)).toBeInTheDocument();
            expect(within(dialog).getByText('FA_2025_FSEC01')).toBeInTheDocument();
        });

        it('should close dialog on cancel click', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FaHeader fa={createMockFa()} />);

            await user.click(screen.getByRole('button', { name: /Supprimer la FA/ }));
            const dialog = screen.getByRole('dialog');
            await user.click(within(dialog).getByRole('button', { name: /Annuler/ }));

            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        });

        it('should delete FA and navigate to /fas on confirm', async () => {
            const user = userEvent.setup();
            renderWithProviders(<FaHeader fa={createMockFa()} />);

            await user.click(screen.getByRole('button', { name: /Supprimer la FA/ }));
            const dialog = screen.getByRole('dialog');
            await user.click(within(dialog).getByRole('button', { name: /^Supprimer$/ }));

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith("Fiche d'Anomalie supprimée", 'success');
                expect(mockNavigate).toHaveBeenCalledWith('/fas');
            });
        });

        it('should show error notification on delete failure', async () => {
            server.use(
                http.delete('/api/v1/fas/:uuid/', () => {
                    return HttpResponse.json({ error: 'Server error' }, { status: 500 });
                }),
            );

            const user = userEvent.setup();
            renderWithProviders(<FaHeader fa={createMockFa()} />);

            await user.click(screen.getByRole('button', { name: /Supprimer la FA/ }));
            const dialog = screen.getByRole('dialog');
            await user.click(within(dialog).getByRole('button', { name: /^Supprimer$/ }));

            await waitFor(() => {
                expect(mockShowNotification).toHaveBeenCalledWith('Erreur lors de la suppression', 'error');
            });
        });
    });
});
