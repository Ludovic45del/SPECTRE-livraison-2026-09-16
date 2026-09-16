/**
 * Tests du helper de copie presse-papiers.
 * @module shared/lib
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { copyToClipboard } from './clipboard';

/** Remplace navigator.clipboard (jsdom ne le définit pas par défaut). */
function stubClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
    Object.defineProperty(navigator, 'clipboard', {
        value: writeText ? { writeText } : undefined,
        configurable: true,
        writable: true,
    });
}

describe('copyToClipboard', () => {
    const originalExecCommand = document.execCommand;

    beforeEach(() => {
        stubClipboard(undefined);
    });

    afterEach(() => {
        // jsdom n'implémente pas execCommand : on restaure l'état d'origine.
        document.execCommand = originalExecCommand;
        stubClipboard(undefined);
    });

    it("utilise navigator.clipboard.writeText quand l'API est disponible", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        stubClipboard(writeText);
        const execCommand = vi.fn();
        document.execCommand = execCommand;

        await expect(copyToClipboard('\\\\serveur\\partage')).resolves.toBe(true);

        expect(writeText).toHaveBeenCalledWith('\\\\serveur\\partage');
        expect(execCommand).not.toHaveBeenCalled();
    });

    it("retombe sur execCommand quand l'API est absente (contexte http)", async () => {
        const execCommand = vi.fn().mockReturnValue(true);
        document.execCommand = execCommand;

        await expect(copyToClipboard('texte à copier')).resolves.toBe(true);

        expect(execCommand).toHaveBeenCalledWith('copy');
        // Le textarea temporaire ne doit pas rester dans le DOM.
        expect(document.querySelector('textarea')).toBeNull();
    });

    it('retombe sur execCommand quand writeText rejette (permission refusée)', async () => {
        stubClipboard(vi.fn().mockRejectedValue(new Error('NotAllowedError')));
        const execCommand = vi.fn().mockReturnValue(true);
        document.execCommand = execCommand;

        await expect(copyToClipboard('abc')).resolves.toBe(true);

        expect(execCommand).toHaveBeenCalledWith('copy');
    });

    it('retourne false quand execCommand échoue', async () => {
        document.execCommand = vi.fn().mockReturnValue(false);

        await expect(copyToClipboard('abc')).resolves.toBe(false);
    });

    it('retourne false (sans throw) quand execCommand lève une exception', async () => {
        document.execCommand = vi.fn().mockImplementation(() => {
            throw new Error('Not implemented');
        });

        await expect(copyToClipboard('abc')).resolves.toBe(false);
        expect(document.querySelector('textarea')).toBeNull();
    });
});
