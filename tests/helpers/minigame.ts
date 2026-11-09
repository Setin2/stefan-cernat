import * as BABYLON from "@babylonjs/core";

import type { TankContext } from "../../src/scenes/tank/context";
import { createTestScene } from "./scene";

/**
 * A scene with physics and a stand-in tank for playing the minigames in tests: the sounds are
 * recorded, and `advance` moves time along by running the scene's per-frame code (nothing is
 * drawn).
 */
export function createMinigameTest() {
    const { scene, engine } = createTestScene({ physics: true });
    const tank = BABYLON.MeshBuilder.CreateBox("tank_holder", { size: 12 }, scene);
    const sounds = { trade: jest.fn(), pickup: jest.fn(), chime: jest.fn() };
    const context = {
        scene,
        tank,
        camera: new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 50, -50), scene),
        sounds,
        impacts: { track: jest.fn() },
    } as unknown as TankContext;

    let frame = 1000 / 30;
    jest.spyOn(engine, "getDeltaTime").mockImplementation(() => frame);
    const advance = (seconds: number, fps = 30) => {
        frame = 1000 / fps;
        for (let i = 0; i < Math.round(seconds * fps); i++) {
            scene.onBeforeRenderObservable.notifyObservers(scene);
        }
    };
    const soundsPlayed = () => sounds.trade.mock.calls.map((call) => call[0] as string);
    return { scene, engine, tank, sounds, context, advance, soundsPlayed };
}
