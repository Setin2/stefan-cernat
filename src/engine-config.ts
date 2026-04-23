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
