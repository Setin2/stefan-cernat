import * as BABYLON from "@babylonjs/core";

import { createTankBody, enablePhysics } from "../../src/scenes/core/physics";
import type { TankContext } from "../../src/scenes/tank/context";
import { createTankInput } from "../../src/scenes/tank/input";
import { addGround, createTestScene } from "./scene";

/**
 * The tank as the game sets it up (holder box with its physics body, camera behind it, physics
 * tuned like the game), with sounds recorded instead of played. `advance` runs whole frames
 * (physics, driving, camera, shooting) and moves Jest's fake clock along with them, so shot
 * cooldowns and lifetimes pass too. Call `jest.useFakeTimers()` first.
 */
export function createTankTest(options: { x?: number; z?: number; yaw?: number } = {}) {
    const { scene, engine } = createTestScene({ physics: true });
    addGround(scene);
    enablePhysics(scene);
    const tank = BABYLON.MeshBuilder.CreateBox("tank_holder", { size: 12 }, scene);
    tank.position.set(options.x ?? 0, 5.6, options.z ?? 0);
    tank.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(options.yaw ?? 0, 0, 0);
    createTankBody(scene, tank);
    const camera = new BABYLON.FreeCamera("free_camera", tank.position.add(new BABYLON.Vector3(-40, 45, -40)), scene);
    scene.activeCamera = camera;

    const sounds = {
        shot: jest.fn(),
        chime: jest.fn(),
        land: jest.fn(),
        impact: jest.fn(),
        trade: jest.fn(),
        pickup: jest.fn(),
        whenReady: jest.fn(),
        getOutput: () => null,
    };
    const context = {
        scene,
        tank,
        camera,
        sounds,
        impacts: { track: jest.fn() },
        input: createTankInput(),
        onShoot: jest.fn(),
    } as unknown as TankContext & { sounds: typeof sounds; onShoot: jest.Mock };

    const frame = 1000 / 60;
    jest.spyOn(engine, "getDeltaTime").mockReturnValue(frame);
    const advance = (seconds: number) => {
        for (let i = 0; i < Math.round(seconds * 60); i++) {
            jest.advanceTimersByTime(frame);
            scene.render();
        }
    };
    /** Heading in radians (0 = +Z), from the tank's rotation. */
    const yaw = () => tank.rotationQuaternion!.toEulerAngles().y;
    /** Speed along the ground, from the physics body. */
    const speed = () => {
        const velocity = tank.physicsImpostor!.getLinearVelocity()!;
        return Math.hypot(velocity.x, velocity.z);
    };
    return { scene, engine, tank, camera, sounds, context, advance, yaw, speed };
}
