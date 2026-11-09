import * as BABYLON from "@babylonjs/core";

import { createTankBody, enablePhysics } from "../../src/scenes/core/physics";
import { addGround, createTestScene, getCannonWorld, runPhysics } from "../helpers/scene";

function createBrick(scene: BABYLON.Scene, x: number) {
    const brick = BABYLON.MeshBuilder.CreateBox(`brick-${x}`, { width: 4, height: 2, depth: 2 }, scene);
    brick.position.set(x, 0.5, 0);
    brick.physicsImpostor = new BABYLON.PhysicsImpostor(brick, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 2, friction: 0.8, restitution: 0.1 }, scene);
    return brick;
}

describe("enablePhysics", () => {
    it("uses the game's gravity and lets resting bodies sleep", () => {
        const { scene } = createTestScene({ physics: true });
        enablePhysics(scene);
        expect(scene.getPhysicsEngine()?.gravity.y).toBe(-40);
        expect(getCannonWorld(scene).allowSleep).toBe(true);
    });

    it("splits long frames into sub-steps of at most 1/120 s", () => {
        const { scene } = createTestScene({ physics: true });
        const plugin = scene.getPhysicsEngine()!.getPhysicsPlugin() as unknown as { executeStep: (delta: number, impostors: unknown[]) => void };
        const inner = jest.fn();
        plugin.executeStep = inner;
        enablePhysics(scene);
        plugin.executeStep(1 / 30, []);
        expect(inner).toHaveBeenCalledTimes(4);
        for (const [delta] of inner.mock.calls) {
            expect(delta).toBeCloseTo(1 / 120);
        }
        inner.mockClear();
        plugin.executeStep(1 / 144, []);
        expect(inner).toHaveBeenCalledTimes(1);
    });

    it("gives the ground grippy, slightly bouncy material of its own", () => {
        const { scene } = createTestScene({ physics: true });
        const ground = addGround(scene);
        enablePhysics(scene);
        const material = (ground.physicsImpostor!.physicsBody as { material: { friction: number; restitution: number } }).material;
        expect(material.friction).toBe(0.9);
        expect(material.restitution).toBe(0.4);
    });

    it("lets a pushed brick slide to a stop instead of stopping dead (fixed friction)", () => {
        const { scene } = createTestScene({ physics: true });
        addGround(scene);
        enablePhysics(scene);
        const brick = createBrick(scene, 0);
        runPhysics(scene, 0.5);
        const start = brick.position.clone();
        brick.physicsImpostor!.setLinearVelocity(new BABYLON.Vector3(10, 0, 0));
        runPhysics(scene, 2);

        // Textbook Coulomb friction would slide it v^2 / (2 mu g), mu = 0.8 * 0.9 and g = 40.
        // cannon.js applies friction at each contact point (up to four for a box lying flat), so
        // it grips a few times harder; without the friction fix it stopped within one step.
        const textbook = (10 * 10) / (2 * 0.72 * 40);
        const slid = brick.position.x - start.x;
        expect(slid).toBeGreaterThan(0.3);
        expect(slid).toBeLessThan(textbook * 1.2);
        // It came to rest, still lying flat.
        expect(brick.physicsImpostor!.getLinearVelocity()!.length()).toBeLessThan(0.1);
        expect(brick.position.y).toBeCloseTo(start.y, 1);
    });
});

describe("createTankBody", () => {
    function setup() {
        const { scene } = createTestScene({ physics: true });
        addGround(scene);
        enablePhysics(scene);
        const tank = BABYLON.MeshBuilder.CreateBox("tank_holder", { size: 12 }, scene);
        tank.position.set(0, 5.6, 0);
        tank.rotationQuaternion = BABYLON.Quaternion.Identity();
        createTankBody(scene, tank);
        return { scene, tank, body: tank.physicsImpostor!.physicsBody as { shapes: { halfExtents: BABYLON.Vector3 }[]; shapeOffsets: BABYLON.Vector3[]; mass: number; allowSleep: boolean } };
    }

    it("is a heavy box around the hull that never falls asleep", () => {
        const { body } = setup();
        expect(body.mass).toBe(1000);
        expect(body.allowSleep).toBe(false);
        const hull = body.shapes[0].halfExtents;
        expect([hull.x, hull.y, hull.z]).toEqual([6.2, 4.65, 6.9]);
        expect(body.shapeOffsets[0].y).toBeCloseTo(-1.35);
    });

    it("has a second box along the gun barrel, so the barrel doesn't poke through things", () => {
        const { body } = setup();
        expect(body.shapes).toHaveLength(2);
        const barrel = body.shapes[1].halfExtents;
        expect([barrel.x, barrel.y, barrel.z]).toEqual([0.7, 0.7, 2.35]);
        expect(body.shapeOffsets[1].z).toBeCloseTo(8.85);
    });

    it("knocks a brick at barrel height that the hull doesn't reach", () => {
        const { scene, tank } = setup();
        // A brick on a thin post, at the height of the barrel's axis (0.9 above the holder's
        // centre). The tank drives 3 units forwards: the hull's front goes from z = 6.9 to 9.9,
        // the barrel's tip from 11.2 to 14.2.
        const post = BABYLON.MeshBuilder.CreateBox("post", { width: 0.4, height: 6.4, depth: 0.4 }, scene);
        post.position.set(0, 2.7, 13.3);
        post.physicsImpostor = new BABYLON.PhysicsImpostor(post, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene);
        const brick = BABYLON.MeshBuilder.CreateBox("brick-target", { width: 2, height: 1, depth: 1 }, scene);
        brick.position.set(0, 6.4, 13);
        brick.physicsImpostor = new BABYLON.PhysicsImpostor(brick, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 2 }, scene);

        const engine = scene.getPhysicsEngine() as unknown as { _step: (delta: number) => void };
        for (let i = 0; i < 18; i++) {
            // Like the game's movement: the velocity is set before every physics step.
            tank.physicsImpostor!.setLinearVelocity(new BABYLON.Vector3(0, 0, 10));
            engine._step(1 / 60);
        }
        expect(tank.position.z + 6.9).toBeLessThan(12.5);
        // The barrel knocked the brick off its post.
        expect(brick.position.z).toBeGreaterThan(13.5);
    });
});
