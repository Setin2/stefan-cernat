import { configureEngine, projectConfiguration } from "../src/engine-config";

describe("configureEngine", () => {
    afterEach(() => {
        projectConfiguration.compressedTextures.supportedFormats.length = 0;
    });

    it("skips texture format configuration when no formats are available", () => {
        const setTextureFormatToUse = jest.fn();

        configureEngine({ setTextureFormatToUse } as any);

        expect(setTextureFormatToUse).not.toHaveBeenCalled();
    });

    it("applies configured texture formats", () => {
        const setTextureFormatToUse = jest.fn();
        projectConfiguration.compressedTextures.supportedFormats.push("etc1");

        configureEngine({ setTextureFormatToUse } as any);

        expect(setTextureFormatToUse).toHaveBeenCalledWith(["etc1"]);
    });
});
