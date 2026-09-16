/**
 * Tests du composant OverviewImageSection.
 *
 * On stubbe `compressImage` (zero dep mais canvas not supporté en JSDOM)
 * et on intercepte les requêtes PATCH/DELETE via MSW pour vérifier le flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { setup, server } from '@test/test-utils';
import { OverviewImageSection } from './OverviewImageSection';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// vi.mock est hoisté en tête de fichier ⇒ on déclare le mock via vi.hoisted()
// pour qu'il existe au moment où la factory s'exécute.
const { compressImageMock } = vi.hoisted(() => ({ compressImageMock: vi.fn() }));

vi.mock('@shared/lib', async (importActual) => {
    const actual = await importActual<typeof import('@shared/lib')>();
    return { ...actual, compressImage: compressImageMock };
});

const FSEC_VERSION_UUID = '11111111-1111-1111-1111-111111111111';
const FSEC_UUID = '22222222-2222-2222-2222-222222222222';

const baseApiResponse = (overrides: Record<string, unknown> = {}) => ({
    version_uuid: FSEC_VERSION_UUID,
    fsec_uuid: FSEC_UUID,
    campaign_id: null,
    status_id: 0,
    category_id: 0,
    rack_id: null,
    name: 'FSEC Photo Test',
    comments: null,
    last_updated: '2026-05-27T10:00:00Z',
    is_active: true,
    created_at: '2026-05-27T10:00:00Z',
    delivery_date: null,
    shooting_date: null,
    preshooting_pressure: null,
    experience_srxx: null,
    localisation: null,
    depressurization_failed: null,
    overview_image: null,
    ...overrides,
});

beforeEach(() => {
    compressImageMock.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OverviewImageSection — sans photo', () => {
    it("affiche la dropzone d'invitation à ajouter une photo", () => {
        setup(<OverviewImageSection versionUuid={FSEC_VERSION_UUID} fsecName="FSEC Test" imageUrl={null} />);

        expect(screen.getByRole('button', { name: 'Ajouter une photo de la FSEC' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Choisir un fichier/i })).toBeInTheDocument();
    });

    it("compresse l'image puis appelle l'endpoint PATCH overview-image", async () => {
        const compressed = new File([new Uint8Array(512)], 'photo.jpg', { type: 'image/jpeg' });
        compressImageMock.mockResolvedValue({
            file: compressed,
            compressedSize: 512,
            originalSize: 2048,
            width: 1000,
            height: 800,
        });

        let patchHit = false;
        let receivedContentType: string | null = null;
        server.use(
            http.patch(`/api/v1/fsecs/${FSEC_VERSION_UUID}/overview-image/`, ({ request }) => {
                patchHit = true;
                receivedContentType = request.headers.get('content-type');
                return HttpResponse.json(baseApiResponse({ overview_image: '/media/fsec/overview/uploaded.jpg' }));
            }),
        );

        const { user } = setup(
            <OverviewImageSection versionUuid={FSEC_VERSION_UUID} fsecName="FSEC Test" imageUrl={null} />,
        );

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        const source = new File([new Uint8Array(2048)], 'source.jpg', { type: 'image/jpeg' });
        await user.upload(input, source);

        await waitFor(() => {
            expect(compressImageMock).toHaveBeenCalledTimes(1);
        });
        // Vérifie que c'est bien le fichier d'origine qui est passé à compressImage.
        expect(compressImageMock.mock.calls[0][0]).toBe(source);

        await waitFor(() => {
            expect(patchHit).toBe(true);
        });
        // Le navigateur a posé un Content-Type multipart (avec boundary).
        expect(receivedContentType).toMatch(/^multipart\/form-data/);
    });

    it("refuse un fichier qui n'est pas une image (avant compression)", async () => {
        const { user } = setup(
            <OverviewImageSection versionUuid={FSEC_VERSION_UUID} fsecName="FSEC Test" imageUrl={null} />,
        );

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        const notImage = new File(['hi'], 'note.txt', { type: 'text/plain' });
        await user.upload(input, notImage);

        // compressImage ne doit jamais avoir été appelé.
        expect(compressImageMock).not.toHaveBeenCalled();
    });
});

describe('OverviewImageSection — avec photo existante', () => {
    it("affiche l'image et les actions Remplacer/Supprimer", () => {
        setup(
            <OverviewImageSection
                versionUuid={FSEC_VERSION_UUID}
                fsecName="FSEC Test"
                imageUrl="/media/fsec/overview/existing.jpg"
            />,
        );

        const img = screen.getByRole('img', { name: /Photo de la FSEC FSEC Test/i });
        expect(img).toHaveAttribute('src', '/media/fsec/overview/existing.jpg');
        expect(screen.getByRole('button', { name: /Remplacer/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Supprimer/i })).toBeInTheDocument();
    });

    it('appelle DELETE puis notifie le succès quand on clique sur Supprimer', async () => {
        let deleteCalled = false;
        server.use(
            http.delete(`/api/v1/fsecs/${FSEC_VERSION_UUID}/overview-image/`, () => {
                deleteCalled = true;
                return HttpResponse.json(baseApiResponse({ overview_image: null }));
            }),
        );

        const { user } = setup(
            <OverviewImageSection
                versionUuid={FSEC_VERSION_UUID}
                fsecName="FSEC Test"
                imageUrl="/media/fsec/overview/existing.jpg"
            />,
        );

        await user.click(screen.getByRole('button', { name: /Supprimer/i }));

        await waitFor(() => {
            expect(deleteCalled).toBe(true);
        });
    });
});
