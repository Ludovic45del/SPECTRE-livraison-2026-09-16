/**
 * Polyfill des méthodes de lecture de Blob/File sous jsdom (tests).
 *
 * jsdom 24 ne fournit ni `Blob.arrayBuffer()`, ni `text()`, ni `stream()` :
 * sans elles, undici (fetch de Node) ne peut sérialiser un corps multipart et
 * `request.formData()` côté MSW reste bloqué. On les complète ici, à partir du
 * `FileReader` de jsdom (API publique), pour que les envois de fichiers
 * (pièces jointes de la messagerie, avatars…) soient testables. Idempotent,
 * chargé une fois par `setup.ts`.
 */

export function ensureBlobReadMethods(): void {
    const proto = Blob.prototype as unknown as Record<string, unknown>;
    if (typeof proto.arrayBuffer !== 'function') {
        proto.arrayBuffer = function arrayBuffer(this: Blob): Promise<ArrayBuffer> {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as ArrayBuffer);
                reader.onerror = () => reject(reader.error);
                reader.readAsArrayBuffer(this);
            });
        };
    }
    if (typeof proto.text !== 'function') {
        proto.text = async function text(this: Blob): Promise<string> {
            return new TextDecoder().decode(await this.arrayBuffer());
        };
    }
    if (typeof proto.stream !== 'function') {
        proto.stream = function stream(this: Blob): ReadableStream<Uint8Array> {
            const readAll = () => this.arrayBuffer();
            return new ReadableStream<Uint8Array>({
                async start(controller) {
                    controller.enqueue(new Uint8Array(await readAll()));
                    controller.close();
                },
            });
        };
    }
}

ensureBlobReadMethods();
