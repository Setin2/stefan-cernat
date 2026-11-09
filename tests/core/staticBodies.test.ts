import * as BABYLON from "@babylonjs/core";

import { getSoundMaterial } from "../../src/scenes/audio/soundMaterials";
import { addStaticBox, addStaticSphere } from "../../src/scenes/core/staticBodies";
import { CANNON, createTestScene, getCannonWorld, runPhysics } from "../helpers/scene";

function dropBall(scene: BABYLON.Scene, x: number, y: number, z: number): CANNON.Body {
    const body = new CANNON.Body({ mass: 1 });
    body.addShape(new CANNON.Sphere(0.5));
    body.position.set(x, y, z);
    getCannonWorld(scene).addBody(body);
    return body;
}

describe("static bodies", () => {
    it("adds solid scenery straight to the physics world, with its sound", () => {
        const { scene } = createTestScene({ physics: true });
        const world = getCannonWorld(scene);
        const before = world.bodies.length;
        expect(addStaticBox(scene, new BABYLON.Vector3(0, 0, 0), 4, 2, 4, { sound: "rock" })).toBe(true);
        expect(addStaticSphere(scene, new BABYLON.Vector3(10, 0, 0), 2)).toBe(true);
        expect(world.bodies.length).toBe(before + 2);
        const [box, sphere] = world.bodies.slice(before);
        expect(box.mass).toBe(0);
        expect(getSoundMaterial(box)).toBe("rock");
        expect(getSoundMaterial(sphere)).toBe("static");
    });

    it("stops things falling onto it", () => {
        const { scene } = createTestScene({ physics: true });
        addStaticBox(scene, new BABYLON.Vector3(0, 0, 0), 10, 2, 10);
        const ball = dropBall(scene, 0, 5, 0);
        runPhysics(scene, 2);
        expect(ball.position.y).toBeGreaterThan(1.3);
        expect(ball.position.y).toBeLessThan(1.7);
    });

    it("can report what hits it", () => {
        const { scene } = createTestScene({ physics: true });
        const onHit = jest.fn();
        addStaticBox(scene, new BABYLON.Vector3(0, 0, 0), 10, 2, 10, { onHit });
        const ball = dropBall(scene, 0, 5, 0);
        runPhysics(scene, 1);
        expect(onHit).toHaveBeenCalledWith(ball);
    });

    it("can be rotated", () => {
        const { scene } = createTestScene({ physics: true });
        const rotation = BABYLON.Quaternion.RotationYawPitchRoll(Math.PI / 4, 0, 0);
        addStaticBox(scene, new BABYLON.Vector3(0, 0, 0), 10, 1, 1, { rotation });
        const body = getCannonWorld(scene).bodies[getCannonWorld(scene).bodies.length - 1];
        expect(body.quaternion.y).toBeCloseTo(rotation.y);
        expect(body.quaternion.w).toBeCloseTo(rotation.w);
    });

    it("does nothing without physics", () => {
        const { scene } = createTestScene();
        expect(addStaticBox(scene, BABYLON.Vector3.Zero(), 1, 1, 1)).toBe(false);
    });

    it("leaves the physics world when the scene is disposed", () => {
        const { scene } = createTestScene({ physics: true });
        const world = getCannonWorld(scene);
        addStaticBox(scene, BABYLON.Vector3.Zero(), 1, 1, 1);
        const body = world.bodies[world.bodies.length - 1];
        scene.dispose();
        expect(world.bodies).not.toContain(body);
    });
});
