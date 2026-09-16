/**
 * Tests unitaires pour `compressImage`.
 *
 * JSDOM ne fournit ni Canvas ni createImageBitmap → on stub manuellement
 * juste ce qu'il faut pour vérifier l'orchestration (resize, encodage, nommage).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compressImage } from './imageCompression';

interface CapturedDraw {
    width: number;
    height: number;
}

function installCanvasStubs({ srcW, srcH, blobSize = 1024 }: { srcW: number; srcH: number; blobSize?: number }) {
    const captured: { canvasSize?: CapturedDraw; toBlobType?: string; toBlobQuality?: number } = {};

    // createImageBitmap → renvoie un faux bitmap avec les dimensions voulues.
    const fakeBitmap = {
        width: srcW,
        height: srcH,
        close: vi.fn(),
    };
    vi.stubGlobal(
        'createImageBitmap',
        vi.fn(async () => fakeBitmap),
    );

    // Stub des méthodes canvas que compressImage utilise.
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    const origToBlob = HTMLCanvasElement.prototype.toBlob;

    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string) {
        if (kind !== '2d') return null;
        captured.canvasSize = { width: this.width, height: this.height };
        return {
            imageSmoothingEnabled: false,
            imageSmoothingQuality: 'low',
            drawImage: vi.fn(),
        } as unknown as CanvasRenderingContext2D;
    } as typeof HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.toBlob = function (
        this: HTMLCanvasElement,
        cb: BlobCallback,
        type?: string,
        quality?: number,
    ) {
        captured.toBlobType = type;
        captured.toBlobQuality = quality;
        cb(new Blob([new Uint8Array(blobSize)], { type: type ?? 'image/jpeg' }));
    } as typeof HTMLCanvasElement.prototype.toBlob;

    return {
        captured,
        restore: () => {
            HTMLCanvasElement.prototype.getContext = origGetContext;
            HTMLCanvasElement.prototype.toBlob = origToBlob;
            vi.unstubAllGlobals();
        },
        bitmapClose: fakeBitmap.close,
    };
}

describe('compressImage', () => {
    let cleanup: (() => void) | null = null;

    beforeEach(() => {
        // ImageBitmap n'existe pas dans JSDOM par défaut : on l'expose comme
        // une classe vide juste pour que `instanceof` dans imageCompression
        // ne soit pas systématiquement false.
        (globalThis as unknown as { ImageBitmap: unknown }).ImageBitmap = function () {};
    });

    afterEach(() => {
        cleanup?.();
        cleanup = null;
    });

    it('refuse un fichier qui n’est pas une image', async () => {
        const notImage = new File(['hello'], 'note.txt', { type: 'text/plain' });
        await expect(compressImage(notImage)).rejects.toThrow(/n'est pas une image/);
    });

    it('réduit la dimension la plus longue à maxDimension en gardant le ratio', async () => {
        const stubs = installCanvasStubs({ srcW: 4000, srcH: 2000 });
        cleanup = stubs.restore;

        const source = new File([new Uint8Array(2048)], 'photo.jpg', { type: 'image/jpeg' });
        const result = await compressImage(source, { maxDimension: 1000, quality: 0.8 });

        // Largeur cible : 1000 (longest = 4000 ⇒ ratio 0.25), hauteur 500.
        expect(result.width).toBe(1000);
        expect(result.height).toBe(500);
        expect(stubs.captured.canvasSize).toEqual({ width: 1000, height: 500 });
        expect(stubs.captured.toBlobQuality).toBe(0.8);
        expect(stubs.captured.toBlobType).toBe('image/jpeg');
    });

    it("ne fait pas d'upscale si l'image est déjà plus petite", async () => {
        const stubs = installCanvasStubs({ srcW: 800, srcH: 600 });
        cleanup = stubs.restore;

        const source = new File([new Uint8Array(1024)], 'small.jpg', { type: 'image/jpeg' });
        const result = await compressImage(source, { maxDimension: 1920 });

        expect(result.width).toBe(800);
        expect(result.height).toBe(600);
    });

    it("renomme le fichier de sortie avec l'extension du format choisi", async () => {
        const stubs = installCanvasStubs({ srcW: 100, srcH: 100 });
        cleanup = stubs.restore;

        const source = new File([new Uint8Array(512)], 'mon.image.HEIC', { type: 'image/jpeg' });
        const jpeg = await compressImage(source, { outputType: 'image/jpeg' });
        expect(jpeg.file.name).toBe('mon.image.jpg');
        expect(jpeg.file.type).toBe('image/jpeg');

        const webp = await compressImage(source, { outputType: 'image/webp' });
        expect(webp.file.name).toBe('mon.image.webp');
        expect(webp.file.type).toBe('image/webp');
    });

    it('reporte les tailles avant et après compression', async () => {
        const stubs = installCanvasStubs({ srcW: 200, srcH: 200, blobSize: 300 });
        cleanup = stubs.restore;

        const source = new File([new Uint8Array(8192)], 'pic.jpg', { type: 'image/jpeg' });
        const result = await compressImage(source);

        expect(result.originalSize).toBe(8192);
        expect(result.compressedSize).toBe(300);
    });
});
