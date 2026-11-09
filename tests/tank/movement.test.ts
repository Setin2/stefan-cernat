import * as BABYLON from "@babylonjs/core";

import { initializeTankMovement } from "../../src/scenes/tank/movement";
import { RAMPS } from "../../src/scenes/world/playground";
import { createTankTest } from "../helpers/tank";

/** Presses or releases a key the way Babylon's action manager reports it. */
function key(scene: BABYLON.Scene, name: string, down: boolean): void {
    const trigger = down ? BABYLON.ActionManager.OnKeyDownTrigger : BABYLON.ActionManager.OnKeyUpTrigger;
    const event = new KeyboardEvent(down ? "keydown" : "keyup", { key: name });
    scene.actionManager.processTrigger(trigger, BABYLON.ActionEvent.CreateNewFromScene(scene, event));
}

function setup(options: Parameters<typeof createTankTest>[0] = {}) {
    const test = createTankTest(options);
    initializeTankMovement(test.context, 0.07);
    return test;
}

describe("driving", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it("drives forwards with W up to full speed, then coasts to a stop", () => {
        const { scene, tank, advance, speed } = setup();
        key(scene, "w", true);
        advance(0.25);
        const accelerating = speed();
        advance(1.5);
        // Speeds up (48 units/s²) to the top speed of 38.
        expect(accelerating).toBeGreaterThan(5);
        expect(accelerating).toBeLessThan(20);
        expect(speed()).toBeCloseTo(38, 0);
        // Heading 0 is +Z.
        expect(tank.position.z).toBeGreaterThan(30);
        expect(Math.abs(tank.position.x)).toBeLessThan(0.5);

        key(scene, "w", false);
        advance(1.5);
        expect(speed()).toBeLessThan(0.5);
    });

    it("reverses with S, slower than it drives forwards", () => {
        const { scene, tank, advance, speed } = setup();
        key(scene, "s", true);
        advance(2);
        expect(tank.position.z).toBeLessThan(-10);
        expect(speed()).toBeCloseTo(20, 0);
    });

    it("turns with A and D, left and right", () => {
        const right = setup();
        key(right.scene, "d", true);
        right.advance(0.5);
        expect(right.yaw()).toBeGreaterThan(0.3);

        const left = setup();
        key(left.scene, "a", true);
        left.advance(0.5);
        expect(left.yaw()).toBeLessThan(-0.3);
    });

    it("drives with the touch joystick, slower with a smaller push", () => {
        const full = setup();
        full.context.input.move = 1;
        full.advance(2);
        const half = setup();
        half.context.input.move = 0.5;
        half.advance(2);
        expect(full.speed()).toBeCloseTo(38, 0);
        expect(half.speed()).toBeCloseTo(19, 0);
    });

    it("stays upright on the ground", () => {
        const { context, tank, advance } = setup();
        context.input.move = 1;
        context.input.turn = 1;
        advance(2);
        const euler = tank.rotationQuaternion!.toEulerAngles();
        expect(Math.abs(euler.x)).toBeLessThan(1e-6);
        expect(Math.abs(euler.z)).toBeLessThan(1e-6);
        expect(tank.position.y).toBeCloseTo(5.6, 1);
    });

    it("keeps the camera following the tank", () => {
        const { context, camera, tank, advance } = setup();
        const offset = camera.position.subtract(tank.position);
        context.input.move = 1;
        advance(3);
        const now = camera.position.subtract(tank.position);
        // Same view of the tank, a few units of lag at most.
        expect(BABYLON.Vector3.Distance(now, offset)).toBeLessThan(8);
    });

    it("stops at a tree trunk with a knock, instead of driving through it", () => {
        const test = createTankTest();
        // Movement finds the trunks when it starts, so the trunk comes first.
        const trunk = BABYLON.MeshBuilder.CreateCylinder("tree-trunk-0", { diameter: 3, height: 10 }, test.scene);
        trunk.position.set(0, 4.5, 30);
        initializeTankMovement(test.context, 0.07);
        test.context.input.move = 1;
        test.advance(3);
        // It stopped short of the trunk (its edge is at z = 28.5) and stays there.
        expect(test.tank.position.z).toBeGreaterThan(20);
        expect(test.tank.position.z).toBeLessThan(28.5);
        expect(test.speed()).toBeLessThan(0.5);
        expect(test.sounds.impact).toHaveBeenCalledWith("tank", "trunk", expect.any(Number), expect.anything());
    });

    it("stops at the high back of a ramp, like at a wall", () => {
        const landing = RAMPS.find((ramp) => ramp.name === "stunt-landing")!;
        const backX = landing.x - (landing.length / 2);
        // Heading +X (yaw PI/2), 20 units before the wall.
        const { context, tank, sounds, advance } = setup({ x: backX - 20, z: landing.z, yaw: Math.PI / 2 });
        context.input.move = 1;
        advance(3);
        expect(tank.position.x).toBeLessThan(backX);
        expect(sounds.impact).toHaveBeenCalledWith("tank", "ramp", expect.any(Number), expect.anything());
    });

    it("drives up a ramp and jumps off it at full speed", () => {
        const kicker = RAMPS.find((ramp) => ramp.name === "stunt-kicker")!;
        const { context, tank, sounds, advance } = setup({ x: kicker.x - 40, z: kicker.z, yaw: Math.PI / 2 });
        context.input.move = 1;
        let highest = 0;
        for (let i = 0; i < 40; i++) {
            advance(0.1);
            highest = Math.max(highest, tank.position.y - 5.6);
        }
        // Higher than the ramp itself (5): it flew.
        expect(highest).toBeGreaterThan(5);
        expect(sounds.land).toHaveBeenCalled();
    });
});
