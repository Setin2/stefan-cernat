import * as BABYLON from "@babylonjs/core";

import { optimizeScene } from "../../src/scenes/core/performance";
import { createTankBody, enablePhysics, getPhysics, prepareLooseBodies } from "../../src/scenes/core/physics";
import { createBrickBuilds } from "../../src/scenes/world/bricks";
import { addGround, createTestScene } from "../helpers/scene";

/** The game's setup, in the same order as Play.onInitialize: physics, tank, bricks, optimisation. */
function setup() {
    const { scene } = createTestScene({ physics: true });
    addGround(scene);
    enablePhysics(scene);
    const tank = BABYLON.MeshBuilder.CreateBox("tank_holder", { size: 12 }, scene);
    // In line with the first wall (centred near (-5, -30)), 45 units south of it.
    tank.position.set(-5, 5.6, -75);
    tank.rotationQuaternion = BABYLON.Quaternion.Identity();
    createTankBody(scene, tank);
    createBrickBuilds({ scene, tank });
    optimizeScene(scene, tank);
    prepareLooseBodies(scene, tank);
    const bricks = getPhysics(scene)!.getImpostors()
        .filter((impostor) => (impostor.object as BABYLON.AbstractMesh).name.startsWith("brick"))
        .map((impostor) => {
            const body = impostor.physicsBody as { position: { x: number; y: number; z: number } };
            return { mesh: impostor.object as BABYLON.AbstractMesh, position: () => new BABYLON.Vector3(body.position.x, body.position.y, body.position.z) };
        });
    // The first step moves the bodies into place (that happens while the game is loading).
    (scene.getPhysicsEngine() as unknown as { _step: (delta: number) => void })._step(1 / 60);
    return { scene, tank, bricks };
}

/** Drives the tank like the game does (velocity before each physics step, height forced after). */
function drive(scene: BABYLON.Scene, tank: BABYLON.AbstractMesh, seconds: number, speedZ: number, each: () => void) {
    const engine = scene.getPhysicsEngine() as unknown as { _step: (delta: number) => void };
    for (let i = 0; i < seconds * 60; i++) {
        tank.physicsImpostor!.setLinearVelocity(new BABYLON.Vector3(0, 0, speedZ));
        tank.physicsImpostor!.setAngularVelocity(BABYLON.Vector3.Zero());
        scene.onBeforePhysicsObservable.notifyObservers(scene);
        engine._step(1 / 60);
        tank.position.y = 5.6;
        tank.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(speedZ > 0 ? 0 : Math.PI, 0, 0);
        each();
    }
}

/** Whether a point is inside the tank's hull box (see core/physics.ts). */
function insideTank(tank: BABYLON.AbstractMesh, point: BABYLON.Vector3): boolean {
    const x = point.x - tank.position.x;
    const y = point.y - tank.position.y;
    const z = point.z - tank.position.z;
    return Math.abs(x) < 6.2 && y > -6 && y < 3.3 && Math.abs(z) < 6.9;
}

describe("brick walls", () => {
    it("builds every wall, pyramid and tower, resting on the ground", () => {
        const { bricks } = setup();
        expect(bricks).toHaveLength(16 + 22 + 15 + 6);
        for (const { position } of bricks) {
            expect(position().y).toBeGreaterThan(0);
        }
    });

    it("keeps knocked bricks drawn where they are (they used to vanish off screen)", () => {
        // Regression: the bricks weren't linked to their physics bodies, so the startup
        // optimisation froze them and their bounding boxes stayed where each brick was built
        // (near the world origin); bricks were culled whenever that spot was off screen.
        const { scene, tank, bricks } = setup();
        for (const { mesh } of bricks) {
            expect(mesh.isWorldMatrixFrozen).toBe(false);
            expect(mesh.doNotSyncBoundingInfo).toBe(false);
        }
        drive(scene, tank, 2.5, 38, () => undefined);
        let moved = 0;
        for (const { mesh, position } of bricks) {
            mesh.computeWorldMatrix();
            const box = mesh.getBoundingInfo().boundingBox.centerWorld;
            expect(BABYLON.Vector3.Distance(box, position())).toBeLessThan(0.1);
            moved += BABYLON.Vector3.Distance(mesh.getAbsolutePosition(), position()) < 0.1 ? 1 : 0;
        }
        expect(moved).toBe(bricks.length);
    });

    it("is pushed aside by the tank, never driven through", () => {
        // Regression: the physics broadphase lost track of the bricks, so the tank (and shots)
        // went straight through some of them.
        const { scene, tank, bricks } = setup();
        let inside = 0;
        let knocked = 0;
        const start = bricks.map(({ position }) => position());
        const check = () => {
            inside += bricks.filter(({ position }) => insideTank(tank, position())).length;
        };
        // Through the wall, then back and forth over the rubble.
        drive(scene, tank, 2.5, 38, check);
        drive(scene, tank, 2.5, -38, check);
        drive(scene, tank, 2.5, 38, check);
        bricks.forEach(({ position }, i) => {
            knocked += BABYLON.Vector3.Distance(position(), start[i]) > 2 ? 1 : 0;
        });
        expect(inside).toBe(0);
        expect(knocked).toBeGreaterThan(5);
        // And nothing got pushed into the ground.
        for (const { position } of bricks) {
            expect(position().y).toBeGreaterThan(0.5);
        }
    });
});
