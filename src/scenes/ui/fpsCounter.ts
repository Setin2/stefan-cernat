import type * as BABYLON from "@babylonjs/core";

const UPDATE_INTERVAL_MS = 250;

/** Updates the FPS pill from index.html (#fps) a few times a second. Hidden on touch devices. */
export function attachFpsCounter(scene: BABYLON.Scene): void {
    const element = document.getElementById("fps");
    if (!element) {
        return;
    }

    element.hidden = window.matchMedia("(pointer: coarse)").matches;
    if (element.hidden) {
        return;
    }

    const engine = scene.getEngine();
    let lastUpdate = 0;
    const observer = scene.onBeforeRenderObservable.add(() => {
        const now = performance.now();
        if (now - lastUpdate >= UPDATE_INTERVAL_MS) {
            element.textContent = `${engine.getFps().toFixed()} fps`;
            lastUpdate = now;
        }
    });
    scene.onDisposeObservable.addOnce(() => scene.onBeforeRenderObservable.remove(observer));
}
