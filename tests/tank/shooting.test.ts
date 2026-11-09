import * as BABYLON from "@babylonjs/core";
import type { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui/2D";

import { initializeShooting } from "../../src/scenes/tank/shooting";
import { createToyTank } from "../../src/scenes/tank/toyTank";
import { createTankTest } from "../helpers/tank";

const GITHUB = "https://github.com/Setin2";

/** Sets up shooting with the GitHub target `distance` units straight ahead (+Z) of the tank. */
async function setup(distance = 40) {
    const test = createTankTest();
    // The game's target comes from the scene file; a ball of the same size and name stands in.
    const target = BABYLON.MeshBuilder.CreateSphere("target_github", { diameter: 6 }, test.scene);
    target.material = new BABYLON.StandardMaterial("target", test.scene);
    target.position.set(0, 8, distance);
    test.scene.actionManager = new BABYLON.ActionManager(test.scene);
    // The real toy tank, so shots leave from its muzzle as in the game.
    const toyTank = createToyTank(test.scene, test.tank);
    test.context.shotOrigin = toyTank.muzzle;
    await initializeShooting(test.context, new BABYLON.Vector3(0, 0, 1));
    const shots = () => test.scene.meshes.filter((mesh) => mesh.name === "ball" && mesh instanceof BABYLON.InstancedMesh && !mesh.isDisposed());
    const fireWithE = () => test.scene.actionManager.processTrigger(
        BABYLON.ActionManager.OnKeyDownTrigger,
        BABYLON.ActionEvent.CreateNewFromScene(test.scene, new KeyboardEvent("keydown", { key: "e" })),
    );
    const hud = test.scene.textures.find((texture) => texture.name === "target-hints") as unknown as AdvancedDynamicTexture;
    const objective = () => (hud.getControlByName("objective-hint-text") as TextBlock).text;
    return { ...test, target, shots, fireWithE, objective };
}

describe("shooting", () => {
    let open: jest.SpyInstance;

    beforeEach(() => {
        jest.useFakeTimers();
        open = jest.spyOn(window, "open").mockReturnValue({} as Window);
    });
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it("fires a ball forwards with E, with a sound and the barrel's recoil", async () => {
        const { fireWithE, shots, sounds, context, advance } = await setup(200);
        fireWithE();
        expect(sounds.shot).toHaveBeenCalledTimes(1);
        expect(context.onShoot).toHaveBeenCalledTimes(1);
        expect(shots()).toHaveLength(1);
        const start = shots()[0].position.z;
        advance(0.1);
        // About 200 units/s straight ahead.
        expect(shots()[0].position.z - start).toBeGreaterThan(15);
        expect(Math.abs(shots()[0].position.x)).toBeLessThan(0.5);
    });

    it("fires with the touch FIRE button too", async () => {
        const { context, shots } = await setup(200);
        context.input.onFire.notifyObservers();
        expect(shots()).toHaveLength(1);
    });

    it("can't fire again until the cooldown has passed", async () => {
        const { fireWithE, shots, advance } = await setup(200);
        fireWithE();
        fireWithE();
        expect(shots()).toHaveLength(1);
        advance(0.45);
        fireWithE();
        expect(shots()).toHaveLength(2);
    });

    it("opens the target's link when a shot hits it, with a chime", async () => {
        const { fireWithE, sounds, advance } = await setup(40);
        fireWithE();
        advance(0.5);
        expect(open).toHaveBeenCalledWith(GITHUB, "_blank");
        expect(open).toHaveBeenCalledTimes(1);
        expect(sounds.chime).toHaveBeenCalled();
    });

    it("doesn't open anything when the shot misses", async () => {
        const { fireWithE, tank, advance } = await setup(40);
        // Turned away from the target.
        tank.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(Math.PI / 2, 0, 0);
        advance(0.05);
        fireWithE();
        advance(1);
        expect(open).not.toHaveBeenCalled();
    });

    it("clears shots away after a couple of seconds", async () => {
        const { fireWithE, shots, advance } = await setup(400);
        fireWithE();
        advance(1);
        expect(shots()).toHaveLength(1);
        advance(1.5);
        expect(shots()).toHaveLength(0);
    });

    it("tells the player when a target is locked on, and what to press", async () => {
        const { objective, tank, advance } = await setup(40);
        // First it announces the find ("You found GitHub!") for a couple of seconds.
        advance(2.6);
        expect(objective()).toContain("GitHub is locked on");
        expect(objective()).toContain("Press E to fire!");
        // Facing away, it's only nearby.
        tank.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(Math.PI, 0, 0);
        advance(0.1);
        expect(objective()).toContain("Turn toward it");
    });
});
