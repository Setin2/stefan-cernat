import type * as BABYLON from "@babylonjs/core";

/**
 * A safety net for big screens: renders at a slightly lower resolution when the frame rate stays
 * low. Everything the GPU draws per pixel (the scene, shadows' lookups, the GUI) grows with the
 * screen size, so a 4K screen is four times the work of 1080p.
 *
 * - Screens with more pixels than MAX_PIXELS (beyond 2K) start scaled down to about that size.
 * - If the frame rate stays under LOW_FPS for a few seconds, the resolution steps down a little,
 *   at most to 1 / MAX_SCALE of the screen's. It's never raised again in the same visit, so it
 *   can't flicker between sizes.
 *
 * On machines that keep up, nothing changes.
 */

const MAX_PIXELS = 2560 * 1440;
const MAX_SCALE = 1.5;
const SCALE_STEP = 0.125;
const LOW_FPS = 45;
const SAMPLE_SECONDS = 3;
/** The first frames (shadow maps, physics settling) can be slow; don't judge those. */
const SETTLE_SECONDS = 4;
/** Only consecutive slow samples count, so one hiccup doesn't lower the resolution. */
const SLOW_SAMPLES_NEEDED = 2;

export function adaptResolution(scene: BABYLON.Scene): void {
    const engine = scene.getEngine();
    let scale = engine.getHardwareScalingLevel();

    const apply = (next: number) => {
        const clamped = Math.min(MAX_SCALE, Math.max(1, next));
        if (Math.abs(clamped - scale) > 0.001) {
            scale = clamped;
            engine.setHardwareScalingLevel(scale);
        }
    };
    const capPixels = () => {
        const canvas = engine.getRenderingCanvas();
        const pixels = (canvas?.clientWidth ?? 0) * (canvas?.clientHeight ?? 0);
        if (pixels > MAX_PIXELS) {
            apply(Math.max(scale, Math.sqrt(pixels / MAX_PIXELS)));
        }
    };
    capPixels();
    const onResize = engine.onResizeObservable.add(capPixels);

    let frames = 0;
    let sampleStart = -1;
    let slowSamples = 0;
    const observer = scene.onAfterRenderObservable.add(() => {
        const now = performance.now();
        if (sampleStart < 0) {
            // Counted from the first rendered frame, after loading.
            sampleStart = now + (SETTLE_SECONDS * 1000);
        }
        if (now < sampleStart) {
            return;
        }
        frames++;
        const elapsed = (now - sampleStart) / 1000;
        if (elapsed < SAMPLE_SECONDS) {
            return;
        }
        const fps = frames / elapsed;
        frames = 0;
        sampleStart = now;
        // A hidden tab or a stalled frame isn't the GPU struggling.
        if (document.hidden || elapsed > SAMPLE_SECONDS * 2) {
            return;
        }
        slowSamples = fps < LOW_FPS ? slowSamples + 1 : 0;
        if (slowSamples >= SLOW_SAMPLES_NEEDED && scale < MAX_SCALE) {
            slowSamples = 0;
            apply(scale + SCALE_STEP);
        }
    });

    scene.onDisposeObservable.addOnce(() => {
        scene.onAfterRenderObservable.remove(observer);
        engine.onResizeObservable.remove(onResize);
    });
}
