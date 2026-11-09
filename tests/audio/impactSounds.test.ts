import * as BABYLON from "@babylonjs/core";

import { createImpactSounds } from "../../src/scenes/audio/impactSounds";
import type { SoundBoard } from "../../src/scenes/audio/soundBoard";
import { enablePhysics } from "../../src/scenes/core/physics";
import { addGround, createTestScene, runPhysics } from "../helpers/scene";

function setup() {
    const { scene } = createTestScene({ physics: true });
    addGround(scene);
    enablePhysics(scene);
    const tank = BABYLON.MeshBuilder.CreateBox("tank_holder", { size: 2 }, scene);
    tank.position.set(100, 0.5, 100);
    tank.physicsImpostor = new BABYLON.PhysicsImpostor(tank, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene);
    const sounds = { impact: jest.fn() };
    return { scene, tank, sounds };
}

function dropBox(scene: BABYLON.Scene, name: string, height: number) {
    const box = BABYLON.MeshBuilder.CreateBox(name, { size: 1 }, scene);
    box.position.set(0, height, 0);
    box.physicsImpostor = new BABYLON.PhysicsImpostor(box, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1 }, scene);
    return box;
}

describe("createImpactSounds", () => {
    it("plays a brick hitting the ground once per hit, as hard as it hit", () => {
        const { scene, tank, sounds } = setup();
        dropBox(scene, "brick-0", 5);
        createImpactSounds(scene, sounds as unknown as SoundBoard, tank);
        runPhysics(scene, 0.8);

        expect(sounds.impact).toHaveBeenCalled();
        const [a, b, speed, position] = sounds.impact.mock.calls[0];
        expect([a, b].sort()).toEqual(["brick", "ground"]);
        // Fell 5 units under gravity 40: about 20 units/s (less the time already resting).
        expect(speed).toBeGreaterThan(10);
        expect(speed).toBeLessThan(25);
        expect(position.y).toBeLessThan(0);
        // It lands flat, touching down at four corners at once (four contacts, each reported to
        // both bodies): still one hit, played once.
        const firstHits = sounds.impact.mock.calls.filter((call) => call[2] === speed);
        expect(firstHits).toHaveLength(1);
    });

    it("knows cones, trophies and props by their names", () => {
        const { scene, tank, sounds } = setup();
        const cone = dropBox(scene, "cone-3", 3);
        cone.position.x = -20;
        const trophy = dropBox(scene, "ai-trophy-claude-collider", 3);
        trophy.position.x = 20;
        createImpactSounds(scene, sounds as unknown as SoundBoard, tank);
        runPhysics(scene, 0.8);
        const materials = sounds.impact.mock.calls.flatMap((call) => [call[0], call[1]]);
        expect(materials).toContain("cone");
        expect(materials).toContain("trophy");
    });

    it("plays bodies tracked later (like shots) with their material", () => {
        const { scene, tank, sounds } = setup();
        const impacts = createImpactSounds(scene, sounds as unknown as SoundBoard, tank);
        const ball = BABYLON.MeshBuilder.CreateSphere("shot", { diameter: 1 }, scene);
        ball.position.set(0, 4, 0);
        ball.physicsImpostor = new BABYLON.PhysicsImpostor(ball, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 0.3, restitution: 0.8 }, scene);
        impacts.track(ball.physicsImpostor, "ball");
        runPhysics(scene, 1);
        expect(sounds.impact.mock.calls.some((call) => call.includes("ball") && call.includes("ground"))).toBe(true);
    });
});
