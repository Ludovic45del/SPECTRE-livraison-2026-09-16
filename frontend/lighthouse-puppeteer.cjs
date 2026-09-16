/**
 * Puppeteer pre-audit script for Lighthouse CI.
 *
 * Seeds sessionStorage with a fake authenticated Zustand state (the same
 * shape produced by frontend/src/features/auth/model/auth.store.ts) so
 * protected routes render during the audit. Combined with MSW handlers in
 * src/mocks/lighthouse-handlers.ts, no real backend is required.
 */
module.exports = async (browser, context) => {
    const page = await browser.newPage();

    const url = new URL(context.url);
    await page.goto(`${url.origin}/login`, { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
        sessionStorage.setItem(
            'auth-storage',
            JSON.stringify({
                state: {
                    tokens: {
                        access: 'lighthouse-access-token',
                        refresh: 'lighthouse-refresh-token',
                    },
                    isAuthenticated: true,
                    role: 'admin',
                    forcePasswordChange: false,
                },
                version: 0,
            }),
        );
    });

    await page.close();
};
