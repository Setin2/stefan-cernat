import type { Engine } from "@babylonjs/core/Engines/engine";

import { avoidSizedFormatForImageUploads, configureEngine, keepCanvasesOnCpuInFirefox, projectConfiguration } from "../src/engine-config";

describe("configureEngine", () => {
    afterEach(() => {
        projectConfiguration.compressedTextures.supportedFormats.length = 0;
    });

    it("skips texture format configuration when no formats are available", () => {
        const setTextureFormatToUse = jest.fn();

        configureEngine({ setTextureFormatToUse } as unknown as Engine);

        expect(setTextureFormatToUse).not.toHaveBeenCalled();
    });

    it("applies configured texture formats", () => {
        const setTextureFormatToUse = jest.fn();
        projectConfiguration.compressedTextures.supportedFormats.push("etc1");

        configureEngine({ setTextureFormatToUse } as unknown as Engine);

        expect(setTextureFormatToUse).toHaveBeenCalledWith(["etc1"]);
    });
});

describe("avoidSizedFormatForImageUploads", () => {
    const GL = { RGBA: 0x1908, RGBA8: 0x8058, UNSIGNED_BYTE: 0x1401, TEXTURE_2D: 0x0de1 };
    let calls: unknown[][];

    beforeEach(() => {
        calls = [];
        // jsdom has no WebGL: a stand-in context class with the constants the workaround reads.
        class FakeWebGL2 {
            public readonly RGBA = GL.RGBA;
            public readonly RGBA8 = GL.RGBA8;
            public readonly UNSIGNED_BYTE = GL.UNSIGNED_BYTE;
            public texImage2D(...args: unknown[]): void {
                calls.push(args);
            }
        }
        (window as unknown as { WebGL2RenderingContext: unknown }).WebGL2RenderingContext = FakeWebGL2;
        avoidSizedFormatForImageUploads();
    });

    function context(): { texImage2D: (...args: unknown[]) => void } {
        const Context = (window as unknown as { WebGL2RenderingContext: new () => { texImage2D: (...args: unknown[]) => void } }).WebGL2RenderingContext;
        return new Context();
    }

    it("uploads images and canvases as plain RGBA instead of RGBA8", () => {
        const canvas = document.createElement("canvas");
        context().texImage2D(GL.TEXTURE_2D, 0, GL.RGBA8, GL.RGBA, GL.UNSIGNED_BYTE, canvas);
        expect(calls[0]).toEqual([GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, canvas]);
    });

    it("leaves raw pixel uploads and other formats alone", () => {
        const pixels = new Uint8Array(4);
        context().texImage2D(GL.TEXTURE_2D, 0, GL.RGBA8, 1, 1, 0, GL.RGBA, GL.UNSIGNED_BYTE, pixels);
        context().texImage2D(GL.TEXTURE_2D, 0, 0x881a, GL.RGBA, 0x140b, document.createElement("canvas"));
        expect(calls[0][2]).toBe(GL.RGBA8);
        expect(calls[1][2]).toBe(0x881a);
    });
});

describe("keepCanvasesOnCpuInFirefox", () => {
    const original = HTMLCanvasElement.prototype.getContext;
    let seen: unknown[][];

    beforeEach(() => {
        seen = [];
        HTMLCanvasElement.prototype.getContext = function (...args: unknown[]) {
            seen.push(args);
            return null;
        } as typeof HTMLCanvasElement.prototype.getContext;
    });
    afterEach(() => {
        HTMLCanvasElement.prototype.getContext = original;
        jest.restoreAllMocks();
    });

    function setBrowser(userAgent: string) {
        jest.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent);
    }

    it("asks Firefox to keep 2D canvases on the CPU, keeping other options", () => {
        setBrowser("Mozilla/5.0 (X11; Linux x86_64; rv:159.0) Gecko/20100101 Firefox/159.0");
        keepCanvasesOnCpuInFirefox();
        const canvas = document.createElement("canvas");
        canvas.getContext("2d");
        canvas.getContext("2d", { alpha: false });
        canvas.getContext("webgl2", { antialias: true });
        expect(seen[0]).toEqual(["2d", { willReadFrequently: true }]);
        expect(seen[1]).toEqual(["2d", { willReadFrequently: true, alpha: false }]);
        // WebGL contexts are left alone.
        expect(seen[2]).toEqual(["webgl2", { antialias: true }]);
    });

    it("leaves other browsers' canvases alone", () => {
        setBrowser("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36");
        keepCanvasesOnCpuInFirefox();
        document.createElement("canvas").getContext("2d");
        expect(seen[0]).toEqual(["2d", undefined]);
    });
});
