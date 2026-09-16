/**
 * Tests de la fabrique de thème, focalisés sur le mode « crème ».
 */
import { describe, it, expect } from 'vitest';

import { createAppTheme, getGlassEffect } from './theme';

describe('createAppTheme', () => {
    it('le mode crème est exposé à MUI comme une variante claire', () => {
        // Les composants branchent sur `palette.mode === "dark"` : crème doit
        // donc se présenter comme 'light' pour être traité comme un thème clair.
        expect(createAppTheme('cream').palette.mode).toBe('light');
        expect(createAppTheme('light').palette.mode).toBe('light');
        expect(createAppTheme('dark').palette.mode).toBe('dark');
    });

    it('le mode crème utilise des surfaces parchemin chaudes', () => {
        const cream = createAppTheme('cream');
        expect(cream.palette.background.default).toBe('#ECE0C4');
        // paper habille sidebar/tableaux/cartes : doit être franchement crème.
        expect(cream.palette.background.paper).toBe('#F6EDD8');
        expect(cream.palette.text.primary).toBe('#2A2218');
    });

    it('le paper crème est nettement distinct du blanc pur', () => {
        // Garde-fou anti-régression : éviter de revenir à un paper quasi-blanc
        // (#FFFDF9) qui faisait paraître sidebar/tableaux blancs.
        expect(createAppTheme('cream').palette.background.paper).not.toBe('#FFFFFF');
        expect(createAppTheme('cream').palette.background.paper).not.toBe('#FFFDF9');
    });

    it('crème et clair restent visuellement distincts', () => {
        expect(createAppTheme('cream').palette.background.default).not.toBe(
            createAppTheme('light').palette.background.default,
        );
    });
});

describe('getGlassEffect', () => {
    it('utilise une base chaude pour le mode crème', () => {
        // #F6EDD8 = rgb(246, 237, 216)
        expect(getGlassEffect('cream').background).toContain('246, 237, 216');
        expect(getGlassEffect('dark').background).toContain('26, 29, 39');
    });
});
