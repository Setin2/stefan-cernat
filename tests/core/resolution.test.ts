import { Observable } from "@babylonjs/core/Misc/observable";

import { adaptResolution } from "../../src/scenes/core/resolution";

/** Just enough of an engine and a scene for adaptResolution. */
function createFakeScene(width: number, height: number) {
    let scaling = 1;
    const engine = {
        getHardwareScalingLevel: () => scaling,
        setHardwareScalingLevel: jest.fn((level: number) => {
            scaling = level;
        }),
        getRenderingCanvas: () => ({ clientWidth: width, clientHeight: height }),
        onResizeObservable: new Observable<unknown>(),
    };
    const scene = {
        getEngine: () => engine,
        onAfterRenderObservable: new Observable<unknown>(),
        onDisposeObservable: new Observable<unknown>(),
    };
    return { engine, scene, scaling: () => scaling };
}

/** Renders frames at `fps` for `seconds`, moving the clock along. */
function renderFrames(scene: ReturnType<typeof createFakeScene>["scene"], clock: { now: number }, fps: number, seconds: number) {
    for (let i = 0; i < fps * seconds; i++) {
        clock.now += 1000 / fps;
        scene.onAfterRenderObservable.notifyObservers({});
    }
}

describe("adaptResolution", () => {
    const clock = { now: 0 };
    beforeEach(() => {
        clock.now = 0;
        jest.spyOn(performance, "now").mockImplementation(() => clock.now);
        Object.defineProperty(document, "hidden", { configurable: true, value: false });
    });
    afterEach(() => jest.restoreAllMocks());

    it("leaves a 1080p screen alone when the game keeps up", () => {
        const { scene, engine } = createFakeScene(1920, 1080);
        adaptResolution(scene as never);
        renderFrames(scene, clock, 60, 30);
        expect(engine.setHardwareScalingLevel).not.toHaveBeenCalled();
    });

    it("renders a 4K screen at about 2K", () => {
        const { scene, scaling } = createFakeScene(3840, 2160);
        adaptResolution(scene as never);
        expect(scaling()).toBeCloseTo(1.5);
    });

    it("steps the resolution down when the frame rate stays low, up to a limit", () => {
        const { scene, scaling } = createFakeScene(1920, 1080);
        adaptResolution(scene as never);
        // 4 s to settle in, then two 3 s samples.
        renderFrames(scene, clock, 30, 11);
        expect(scaling()).toBeGreaterThan(1);
        renderFrames(scene, clock, 30, 120);
        expect(scaling()).toBeCloseTo(1.5);
    });

    it("doesn't judge the first seconds after loading, or a single slow moment", () => {
        const { scene, engine } = createFakeScene(1920, 1080);
        adaptResolution(scene as never);
        // Slow while settling in, then one slow sample between fast ones.
        renderFrames(scene, clock, 20, 4);
        renderFrames(scene, clock, 60, 6);
        renderFrames(scene, clock, 30, 3);
        renderFrames(scene, clock, 60, 6);
        expect(engine.setHardwareScalingLevel).not.toHaveBeenCalled();
    });

    it("ignores a hidden tab", () => {
        const { scene, engine } = createFakeScene(1920, 1080);
        adaptResolution(scene as never);
        Object.defineProperty(document, "hidden", { configurable: true, value: true });
        renderFrames(scene, clock, 10, 20);
        expect(engine.setHardwareScalingLevel).not.toHaveBeenCalled();
    });

    it("stops watching when the scene is disposed", () => {
        const { scene, engine } = createFakeScene(1920, 1080);
        adaptResolution(scene as never);
        scene.onDisposeObservable.notifyObservers({});
        renderFrames(scene, clock, 10, 30);
        expect(engine.setHardwareScalingLevel).not.toHaveBeenCalled();
    });
});
