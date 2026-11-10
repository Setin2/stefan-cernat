import type { Engine } from "@babylonjs/core/Engines/engine";

export const projectConfiguration = {
    compressedTextures: {
        supportedFormats: [] as string[],
    },
};

/**
 * Configures the engine according to the current project configuration.
 */
export function configureEngine(engine: Engine): void {
    if (projectConfiguration.compressedTextures.supportedFormats.length) {
        engine.setTextureFormatToUse(projectConfiguration.compressedTextures.supportedFormats);
    }
}

/**
 * Babylon asks for the WEBGL_debug_renderer_info extension at startup to read the GPU's name,
 * which Firefox deprecates (with a console warning) because its standard RENDERER and VENDOR
 * parameters now give the same information. In Firefox the extension is hidden from the page, so
 * Babylon falls back to those parameters. Other browsers are left alone.
 */
export function hideDeprecatedRendererInfo(): void {
    if (!navigator.userAgent.includes("Firefox")) {
        return;
    }
    for (const context of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
        const prototype = context?.prototype;
        if (!prototype) {
            continue;
        }
        const getExtension = prototype.getExtension;
        prototype.getExtension = function (this: WebGLRenderingContext, name: string) {
            return name === "WEBGL_debug_renderer_info" ? null : getExtension.call(this, name);
        } as typeof prototype.getExtension;
    }
}

/**
 * Firefox 159 (seen with Mesa's radeonsi driver on an AMD Radeon 780M) can swap the red and blue
 * channels, or fail to show anything, when an image or canvas is uploaded to WebGL 2 with the sized
 * internal format RGBA8 (the desk monitor's screenshot showed a red and black checkerboard). The
 * same upload with the unsized format RGBA is fine, and stores the very same 8-bit RGBA texture,
 * so uploads from images, canvases and video use that instead. Uploads of raw pixel data (the
 * 9-argument form) are left alone.
 */
export function avoidSizedFormatForImageUploads(): void {
    const prototype = window.WebGL2RenderingContext?.prototype;
    if (!prototype) {
        return;
    }
    const texImage2D = prototype.texImage2D as (...args: unknown[]) => void;
    prototype.texImage2D = function (this: WebGL2RenderingContext, ...args: unknown[]) {
        // texImage2D(target, level, internalformat, format, type, source): the image/canvas form.
        if (args.length === 6 && args[2] === this.RGBA8 && args[3] === this.RGBA && args[4] === this.UNSIGNED_BYTE) {
            args[2] = this.RGBA;
        }
        return texImage2D.apply(this, args);
    } as typeof prototype.texImage2D;
}

/**
 * Firefox 159 (same setup as above) swaps the red and blue channels when a 2D canvas that Firefox
 * has moved onto the GPU (it does that once a canvas has been drawn on a fair bit) is copied into
 * a WebGL texture: the blue play mat turned yellow, red fruit blue and the HUD cards pale blue. A
 * canvas kept on the CPU uploads correctly, and `willReadFrequently` is how a page asks Firefox to
 * keep it there. So in Firefox, 2D canvases default to it. Drawing the game's labels, screens and
 * HUD on the CPU is cheap; other browsers keep their GPU canvases.
 */
export function keepCanvasesOnCpuInFirefox(): void {
    if (!navigator.userAgent.includes("Firefox")) {
        return;
    }
    const prototype = window.HTMLCanvasElement?.prototype;
    if (!prototype) {
        return;
    }
    const getContext = prototype.getContext as (this: HTMLCanvasElement, type: string, options?: object) => RenderingContext | null;
    prototype.getContext = function (this: HTMLCanvasElement, type: string, options?: object) {
        if (type === "2d") {
            return getContext.call(this, type, { willReadFrequently: true, ...options });
        }
        return getContext.call(this, type, options);
    } as typeof prototype.getContext;
}
