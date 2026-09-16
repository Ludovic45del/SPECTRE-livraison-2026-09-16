/**
 * Tests du ControleTab — vérification scellement (R15b/R23-B) et liens métrologie (R15).
 *
 * On surcharge via MSW les endpoints metrology-steps/sealing-steps pour piloter
 * l'état de la carte « Contrôle Métrologique » : chip Vérification OK/NOK,
 * remarque de vérification, mini-stepper 3 étapes et sémantique du chip « Complet ».
 */
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { setup, server } from '@test/test-utils';
import { createMockMetrologyStep, createMockSealingStep } from '@test/mocks/handlers';
import { ControleTab } from './ControleTab';

const FSEC_VERSION_UUID = '11111111-1111-1111-1111-111111111111';
const METROLOGY_UUID = '22222222-2222-2222-2222-222222222222';
const SEALING_UUID = '33333333-3333-3333-3333-333333333333';

/** Surcharge les endpoints avec une métrologie et son scellement (1:1). */
const mockControle = (sealingOverrides: Record<string, unknown> | null = {}) => {
    server.use(
        http.get('/api/v1/metrology-steps/fsec/:fsecVersionId/', () =>
            HttpResponse.json([
                createMockMetrologyStep({
                    uuid: METROLOGY_UUID,
                    fsec_version_id: FSEC_VERSION_UUID,
                    metro_file_link: '\\\\serveur\\metro\\fsec.txt',
                    visrad_link: 'https://intranet/visrad/fsec',
                }),
            ]),
        ),
        http.get('/api/v1/sealing-steps/metrology/:metrologyStepId/', () => {
            if (sealingOverrides === null) {
                return new HttpResponse(null, { status: 404 });
            }
            return HttpResponse.json(
                createMockSealingStep({
                    uuid: SEALING_UUID,
                    metrology_step_id: METROLOGY_UUID,
                    ...sealingOverrides,
                }),
            );
        }),
    );
};

describe('ControleTab — vérification scellement', () => {
    it('affiche le chip « Vérification NOK » (rouge) et la remarque quand le statut est NOK', async () => {
        mockControle({
            verification_status: 'NOK',
            verification_remark: 'Fuite détectée sur l’interface I0',
        });

        setup(<ControleTab fsecVersionId={FSEC_VERSION_UUID} />);

        const chipLabel = await screen.findByText('Vérification NOK');
        expect(chipLabel.closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
        expect(screen.getByText('Remarque de vérification')).toBeInTheDocument();
        expect(screen.getByText('Fuite détectée sur l’interface I0')).toBeInTheDocument();
    });

    it('affiche le chip « Vérification OK » (vert) quand le statut est OK', async () => {
        mockControle({ verification_status: 'OK', verification_remark: null });

        setup(<ControleTab fsecVersionId={FSEC_VERSION_UUID} />);

        const chipLabel = await screen.findByText('Vérification OK');
        expect(chipLabel.closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
        expect(screen.queryByText('Remarque de vérification')).not.toBeInTheDocument();
    });

    it("n'affiche aucun chip de vérification quand le statut est null (non vérifié)", async () => {
        mockControle({ verification_status: null, verification_remark: null });

        setup(<ControleTab fsecVersionId={FSEC_VERSION_UUID} />);

        // Le chip « Complet » garde sa sémantique actuelle : date de scellement renseignée.
        await screen.findByText('Complet');
        expect(screen.queryByText('Vérification OK')).not.toBeInTheDocument();
        expect(screen.queryByText('Vérification NOK')).not.toBeInTheDocument();
    });

    it('affiche le mini-stepper 3 étapes avec « Vérif. scellement »', async () => {
        mockControle({ verification_status: 'OK' });

        setup(<ControleTab fsecVersionId={FSEC_VERSION_UUID} />);

        await screen.findByText('Contrôle Métrologique n°1');
        expect(screen.getByText('Vérif. scellement')).toBeInTheDocument();
        // « Scellement » apparaît dans le stepper ET comme titre de section.
        expect(screen.getAllByText('Scellement').length).toBeGreaterThanOrEqual(1);
    });
});

describe('ControleTab — liens de métrologie (R15)', () => {
    it('affiche les liens fichier métro et Visrad depuis la métrologie', async () => {
        mockControle(null);

        setup(<ControleTab fsecVersionId={FSEC_VERSION_UUID} />);

        await screen.findByText('Contrôle Métrologique n°1');
        expect(screen.getByText('Fichier métro .txt')).toBeInTheDocument();
        expect(screen.getByText('Visrad réalisé')).toBeInTheDocument();
        await waitFor(() => {
            // Les liens sont dans le Collapse (fermé) : on interroge par texte,
            // pas par rôle (le rôle serait filtré comme inaccessible).
            const link = screen.getByText('\\\\serveur\\metro\\fsec.txt').closest('a');
            expect(link).toHaveAttribute('href', '\\\\serveur\\metro\\fsec.txt');
        });
    });
});
