/**
 * Tests de la page Planning — source des membres de la section « Équipe ».
 *
 * Régression : la page lisait `/users/` (réservé aux admins), si bien que la
 * section Équipe restait vide pour tout utilisateur non chef de labo. Elle doit
 * passer par la projection annuaire `/users/lookup/`, ouverte à tout
 * utilisateur authentifié.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import { renderWithProviders, server } from '@test/test-utils';
import { planningHandlers } from '@test/mocks/planning-handlers';
import PlanningPage from './PlanningPage';

/** Simule un compte non-admin : `/users/` est interdit, `/users/lookup/` non. */
const forbidAdminUserList = http.get('/api/v1/users/', () =>
    HttpResponse.json({ detail: 'Vous n’avez pas la permission.' }, { status: 403 }),
);

beforeEach(() => {
    server.use(...planningHandlers, forbidAdminUserList);
});

describe('PlanningPage', () => {
    it('affiche les membres pour un utilisateur non chef de labo', async () => {
        renderWithProviders(<PlanningPage />);

        // Issus de mockUserLookup (handler /users/lookup/), pas de /users/.
        expect(await screen.findByText('Dupont Pierre')).toBeInTheDocument();
        expect(screen.getByText('Martin Alice')).toBeInTheDocument();
    });

    it('affiche la fonction du membre à partir de ses rôles', async () => {
        renderWithProviders(<PlanningPage />);

        expect(await screen.findByText('Chef de laboratoire')).toBeInTheDocument();
        expect(screen.getByText('Métrologue')).toBeInTheDocument();
    });
});
