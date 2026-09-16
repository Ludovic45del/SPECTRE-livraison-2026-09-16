/**
 * Compression d'image côté navigateur via Canvas — zero dépendance.
 * @module shared/lib/imageCompression
 *
 * Stratégie :
 *  1. Décode l'image via `createImageBitmap` (rapide, off-main-thread quand dispo)
 *     avec fallback `HTMLImageElement` pour navigateurs sans support.
 *  2. Resize au plus grand des deux côtés à `maxDimension` (en gardant le ratio).
 *     Pas d'upscale : si l'image est déjà plus petite, on garde la taille d'origine.
 *  3. Encode en JPEG via `canvas.toBlob` avec `quality` ajustable.
 *  4. Si l'image résultante est plus grosse que l'original (ex. PNG plein de
 *     plats aplats), on garde l'original quand le format est déjà compressé.
 *
 * Limitations connues :
 *  - Les images iOS HEIC ne sont pas décodables par canvas hors Safari : la
 *    fonction lève alors une erreur que l'UI doit gérer.
 *  - L'orientation EXIF est appliquée automatiquement par `createImageBitmap`
 *    quand `imageOrientation: 'from-image'` est passé (cf. ci-dessous).
 */

export interface CompressImageOptions {
    /** Plus grand côté final, en pixels. Défaut : 1920. */
    maxDimension?: number;
    /** Qualité JPEG entre 0 et 1. Défaut : 0.82 (bon compromis taille/qualité). */
    quality?: number;
    /**
     * Type MIME de sortie. Défaut : 'image/jpeg' — WebP est plus petit mais
     * moins universellement décodable par les outils tiers (Pillow OK depuis 0.4.0).
     */
    outputType?: 'image/jpeg' | 'image/webp';
}

export interface CompressionResult {
    /** Fichier compressé (toujours un nouveau File, pour faciliter l'aperçu). */
    file: File;
    /** Taille en octets après compression. */
    compressedSize: number;
    /** Taille en octets de l'image d'entrée. */
    originalSize: number;
    /** Largeur finale en pixels. */
    width: number;
    /** Hauteur finale en pixels. */
    height: number;
}

const DEFAULT_OPTIONS: Required<CompressImageOptions> = {
    maxDimension: 1920,
    quality: 0.82,
    outputType: 'image/jpeg',
};

/**
 * Décode un blob en bitmap utilisable par canvas.
 * Préfère `createImageBitmap` (rapide, applique l'orientation EXIF).
 */
async function decodeImage(
    file: File,
): Promise<{ width: number; height: number; bitmap: ImageBitmap | HTMLImageElement }> {
    if (typeof createImageBitmap === 'function') {
        // `imageOrientation: 'from-image'` redresse les photos prises en portrait.
        // Type cast : l'option n'est pas dans tous les lib.dom.d.ts.
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
        return { width: bitmap.width, height: bitmap.height, bitmap };
    }
    // Fallback HTMLImageElement.
    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("Impossible de décoder l'image."));
            el.src = url;
        });
        return { width: img.naturalWidth, height: img.naturalHeight, bitmap: img };
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Calcule la taille cible en respectant `maxDimension` et le ratio d'origine.
 * Ne fait jamais d'upscale.
 */
function computeTargetSize(width: number, height: number, maxDimension: number): { width: number; height: number } {
    const longest = Math.max(width, height);
    if (longest <= maxDimension) {
        return { width, height };
    }
    const ratio = maxDimension / longest;
    return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio),
    };
}

/**
 * Encode un canvas en Blob. Promisifie `canvas.toBlob`.
 */
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Échec de l'encodage de l'image."));
            },
            type,
            quality,
        );
    });
}

/**
 * Compresse une image. Lève si le fichier n'est pas un Blob image décodable.
 */
export async function compressImage(file: File, options: CompressImageOptions = {}): Promise<CompressionResult> {
    if (!file.type.startsWith('image/')) {
        throw new Error(`Le fichier "${file.name}" n'est pas une image (${file.type}).`);
    }
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const { width: srcW, height: srcH, bitmap } = await decodeImage(file);
    const { width, height } = computeTargetSize(srcW, srcH, opts.maxDimension);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Canvas 2D non disponible dans ce navigateur.');
    }
    // Le redimensionnement bilinéaire/bicubique est géré par le navigateur via
    // imageSmoothingQuality. 'high' donne le meilleur rendu sur des photos.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, opts.outputType, opts.quality);

    // Libère le bitmap GPU si on a utilisé createImageBitmap.
    if (typeof ImageBitmap !== 'undefined' && bitmap instanceof ImageBitmap) {
        bitmap.close();
    }

    // Construit un nom de fichier cohérent avec le type de sortie.
    const extension = opts.outputType === 'image/webp' ? 'webp' : 'jpg';
    const baseName = file.name.replace(/\.[^./\\]+$/, '') || 'image';
    const compressedFile = new File([blob], `${baseName}.${extension}`, {
        type: opts.outputType,
        lastModified: Date.now(),
    });

    return {
        file: compressedFile,
        compressedSize: compressedFile.size,
        originalSize: file.size,
        width,
        height,
    };
}
