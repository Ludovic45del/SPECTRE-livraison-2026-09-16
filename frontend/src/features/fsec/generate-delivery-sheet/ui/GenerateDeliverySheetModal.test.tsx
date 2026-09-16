/**
 * Tests for GenerateDeliverySheetModal (2 phases workflow).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { GenerateDeliverySheetModal } from './GenerateDeliverySheetModal';
import type { Fsec } from '@entities/fsec';

const mockShowNotification = vi.fn();
vi.mock('@shared/ui', async () => {
    const actual = await vi.importActual('@shared/ui');
    return {
        ...actual,
        useNotification: () => ({ showNotification: mockShowNotification }),
    };
});

const sampleFsec: Fsec = {
    slug: '2026-lmj-fciai-1',
    campaignSlug: null,
    versionUuid: '00000000-0000-0000-0000-000000000010',
    fsecUuid: '00000000-0000-0000-0000-000000000011',
    name: '2026-LMJ_FCIAI_1',
    displayName: '2026-LMJ_FCIAI_1',
    campaignId: '00000000-0000-0000-0000-000000000001',
    categoryId: 0,
    statusId: 0,
    rackId: null,
    comments: null,
    isActive: true,
    createdAt: null,
    lastUpdated: null,
    deliveryDate: new Date('2026-04-24'),
    shootingDate: null,
    preshootingPressure: null,
    experienceSrxx: null,
    localisation: null,
    depressurizationFailed: null,
    overviewImage: null,
    assemblyPlanImage: null,
    assemblyPlanAnnotations: [],
    alignmentFileLink: null,
    fdieLink: null,
    deliveryValidation: null,
    deliveryRemarques: null,
    deliveryValidatedByUsername: null,
    deliveryValidatedAt: null,
    requestedViews: null,
};

function mockSnapshotResponse(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        version_uuid: sampleFsec.versionUuid,
        delivery_date: '2026-04-24',
        num_interface_io: null,
        has_sealing_step: true,
        delivery_validation: null,
        delivery_remarques: null,
        delivery_validated_by_username: null,
        delivery_validated_at: null,
        ...overrides,
    };
}

describe('GenerateDeliverySheetModal', () => {
    beforeEach(() => {
        mockShowNotification.mockReset();
        server.use(http.get('/api/v1/fsecs/:uuid/delivery-info/', () => HttpResponse.json(mockSnapshotResponse())));
    });

    it('renders both phases with status chip', async () => {
        renderWithProviders(<GenerateDeliverySheetModal open onClose={() => {}} fsec={sampleFsec} />);
        expect(await screen.findByText(/Phase 1 — Livraison/i)).toBeInTheDocument();
        expect(screen.getByText(/Phase 2 — Validation TCI/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/N° Interface I0/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Validation intégrité LIE LCI/i)).toBeInTheDocument();
    });

    it('persists phase 1 (PATCH /delivery-info/) with I0 + delivery date', async () => {
        let receivedBody: any = null;
        server.use(
            http.patch('/api/v1/fsecs/:uuid/delivery-info/', async ({ request }) => {
                receivedBody = await request.json();
                return HttpResponse.json(
                    mockSnapshotResponse({
                        num_interface_io: receivedBody.num_interface_io,
                        delivery_date: receivedBody.delivery_date,
                    }),
                );
            }),
        );
        const user = userEvent.setup();
        renderWithProviders(<GenerateDeliverySheetModal open onClose={() => {}} fsec={sampleFsec} />);
        await screen.findByText(/Phase 1 — Livraison/i);
        await user.type(screen.getByLabelText(/N° Interface I0/i), '785');
        await user.click(screen.getByRole('button', { name: /Enregistrer phase 1/i }));
        await waitFor(() => expect(receivedBody).not.toBeNull());
        expect(receivedBody.num_interface_io).toBe('785');
        expect(receivedBody.delivery_date).toBe('2026-04-24');
        expect(mockShowNotification).toHaveBeenCalledWith(expect.stringMatching(/Phase 1/i), 'success');
    });

    it('disables I0 input when no sealing step exists', async () => {
        server.use(
            http.get('/api/v1/fsecs/:uuid/delivery-info/', () =>
                HttpResponse.json(mockSnapshotResponse({ has_sealing_step: false })),
            ),
        );
        renderWithProviders(<GenerateDeliverySheetModal open onClose={() => {}} fsec={sampleFsec} />);
        const i0 = await screen.findByLabelText(/N° Interface I0/i);
        expect(i0).toBeDisabled();
    });

    it('triggers PDF download on "Générer le PDF"', async () => {
        const createUrl = vi.fn(() => 'blob:test');
        global.URL.createObjectURL = createUrl as unknown as typeof URL.createObjectURL;
        global.URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;
        server.use(
            http.post(
                '/api/v1/fsecs/:uuid/delivery-sheet/',
                () =>
                    new HttpResponse(new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])]), {
                        headers: { 'Content-Type': 'application/pdf' },
                    }),
            ),
        );
        const user = userEvent.setup();
        renderWithProviders(<GenerateDeliverySheetModal open onClose={() => {}} fsec={sampleFsec} />);
        await screen.findByText(/Phase 1 — Livraison/i);
        await user.click(screen.getByRole('button', { name: /Générer le PDF/i }));
        await waitFor(() => expect(createUrl).toHaveBeenCalled());
        expect(mockShowNotification).toHaveBeenCalledWith(expect.stringMatching(/PDF généré/i), 'success');
    });
});
