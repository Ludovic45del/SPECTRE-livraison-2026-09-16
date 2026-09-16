/**
 * Tests for GenerateRecapSheetModal (campaign recap, save + generate).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, server } from '@test/test-utils';
import { GenerateRecapSheetModal } from './GenerateRecapSheetModal';
import type { CampaignWithRelations } from '@entities/campaign';

const mockShowNotification = vi.fn();
vi.mock('@shared/ui', async () => {
    const actual = await vi.importActual('@shared/ui');
    return {
        ...actual,
        useNotification: () => ({ showNotification: mockShowNotification }),
    };
});

const sampleCampaign: CampaignWithRelations = {
    slug: '2026-fciai',
    uuid: '00000000-0000-0000-0000-000000000001',
    name: 'FCIAI',
    year: 2026,
    semester: 'S1',
    lastUpdated: null,
    startDate: null,
    endDate: null,
    dtriNumber: null,
    description: null,
    type: { id: 0, label: 'Type', color: '#000' },
    status: { id: 0, label: 'Status', color: '#000' },
    installation: { id: 0, label: 'LMJ', color: '#000' },
};

const mockRecapTargets = [
    {
        version_uuid: '00000000-0000-0000-0000-000000000010',
        name: '2026-LMJ_FCIAI_1',
        delivery_date: '2026-04-24',
        num_interface_io: null,
        has_sealing_step: true,
        delivery_validation: null,
        delivery_remarques: null,
        delivery_validated_by_username: null,
        delivery_validated_at: null,
    },
    {
        version_uuid: '00000000-0000-0000-0000-000000000020',
        name: '2026-LMJ_FCIAI_2',
        delivery_date: null,
        num_interface_io: null,
        has_sealing_step: false,
        delivery_validation: null,
        delivery_remarques: null,
        delivery_validated_by_username: null,
        delivery_validated_at: null,
    },
];

describe('GenerateRecapSheetModal', () => {
    beforeEach(() => {
        mockShowNotification.mockReset();
        server.use(
            http.get('/api/v1/campaigns/:uuid/delivery-recap/', () => HttpResponse.json({ targets: mockRecapTargets })),
        );
    });

    it('renders one row per FSEC with prefilled values', async () => {
        renderWithProviders(<GenerateRecapSheetModal open onClose={() => {}} campaign={sampleCampaign} />);
        expect(await screen.findByText('2026-LMJ_FCIAI_1')).toBeInTheDocument();
        expect(screen.getByText('2026-LMJ_FCIAI_2')).toBeInTheDocument();
        // L'I0 de la ligne 2 (sans sealing step) doit être disabled.
        const i0Row2 = screen.getByLabelText('N° Interface 2026-LMJ_FCIAI_2');
        expect(i0Row2).toBeDisabled();
    });

    it('saves batch via PATCH /delivery-recap/', async () => {
        let receivedBody: any = null;
        server.use(
            http.patch('/api/v1/campaigns/:uuid/delivery-recap/', async ({ request }) => {
                receivedBody = await request.json();
                return HttpResponse.json({ targets: mockRecapTargets });
            }),
        );
        const user = userEvent.setup();
        renderWithProviders(<GenerateRecapSheetModal open onClose={() => {}} campaign={sampleCampaign} />);
        await screen.findByText('2026-LMJ_FCIAI_1');
        const i0Row1 = screen.getByLabelText('N° Interface 2026-LMJ_FCIAI_1');
        await user.type(i0Row1, '785');
        await user.click(screen.getByRole('button', { name: /Enregistrer$/i }));
        await waitFor(() => expect(receivedBody).not.toBeNull());
        expect(receivedBody.targets).toHaveLength(2);
        expect(receivedBody.targets[0].num_interface_io).toBe('785');
        expect(receivedBody.targets[1].num_interface_io).toBeNull();
    });

    it('triggers PDF download on "Générer le PDF"', async () => {
        const createUrl = vi.fn(() => 'blob:test');
        global.URL.createObjectURL = createUrl as unknown as typeof URL.createObjectURL;
        global.URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;
        server.use(
            http.post(
                '/api/v1/campaigns/:uuid/delivery-sheet/',
                () =>
                    new HttpResponse(new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])]), {
                        headers: { 'Content-Type': 'application/pdf' },
                    }),
            ),
        );
        const user = userEvent.setup();
        renderWithProviders(<GenerateRecapSheetModal open onClose={() => {}} campaign={sampleCampaign} />);
        await screen.findByText('2026-LMJ_FCIAI_1');
        await user.click(screen.getByRole('button', { name: /Générer le PDF/i }));
        await waitFor(() => expect(createUrl).toHaveBeenCalled());
    });

    it('shows empty state when no FSEC linked', async () => {
        server.use(http.get('/api/v1/campaigns/:uuid/delivery-recap/', () => HttpResponse.json({ targets: [] })));
        renderWithProviders(<GenerateRecapSheetModal open onClose={() => {}} campaign={sampleCampaign} />);
        expect(await screen.findByText(/Aucune cible/i)).toBeInTheDocument();
    });
});
