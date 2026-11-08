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
