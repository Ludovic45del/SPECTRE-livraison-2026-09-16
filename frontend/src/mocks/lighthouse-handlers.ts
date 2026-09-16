/**
 * Lighthouse-only MSW handlers.
 *
 * Returns the minimum payload shapes needed for the audited pages to render
 * without 4xx/5xx errors. Not exhaustive — Lighthouse measures DOM/asset
 * performance, not data fidelity. Anything not matched falls through to the
 * `bypass` strategy in src/mocks/browser.ts.
 */
import { http, HttpResponse } from 'msw';

const FAKE_USER = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'lighthouse@spectre.test',
    first_name: 'Lighthouse',
    last_name: 'Bot',
    roles: ['chef_labo'],
    must_change_password: false,
};

const FAKE_TOKENS = {
    access: 'lighthouse-access-token',
    refresh: 'lighthouse-refresh-token',
};

export const lighthouseHandlers = [
    http.post('*/auth/token/', () =>
        HttpResponse.json({
            ...FAKE_TOKENS,
            roles: FAKE_USER.roles,
            force_password_change: FAKE_USER.must_change_password,
            first_name: FAKE_USER.first_name,
        }),
    ),
    http.post('*/auth/token/refresh/', () => HttpResponse.json({ access: FAKE_TOKENS.access })),
    http.get('*/auth/me/', () => HttpResponse.json(FAKE_USER)),
    http.get('*/auth/dashboard-preferences/', () => HttpResponse.json({})),

    // Catch-all: every other GET returns an empty collection so list pages
    // render their empty-state without errors. Adjust if a page needs more.
    http.get('*/api/v1/*', () => HttpResponse.json({ results: [], count: 0 })),
];
