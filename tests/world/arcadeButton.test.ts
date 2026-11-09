import * as BABYLON from "@babylonjs/core";

import { setSoundMaterial } from "../../src/scenes/audio/soundMaterials";
import { createArcadeButton } from "../../src/scenes/world/arcadeButton";
import { CANNON, createTestScene, getCannonWorld, runPhysics } from "../helpers/scene";

/** Fires a body of the given sound material straight at the button's face, from 10 units in front. */
function fireAt(scene: BABYLON.Scene, target: BABYLON.Vector3, material: "ball" | "brick"): CANNON.Body {
    const body = new CANNON.Body({ mass: 0.3 });
    body.addShape(new CANNON.Sphere(0.75));
    // The button faces -Z (yaw 0), so come in from there.
    body.position.set(target.x, target.y, target.z - 10);
    body.velocity.set(0, 0, 60);
    setSoundMaterial(body, material);
    getCannonWorld(scene).addBody(body);
    return body;
}

describe("createArcadeButton", () => {
    const options = { id: "test-button", x: 0, z: 0, yaw: 0, color: "#7CC9A0", symbol: "▲", label: "BUY" };

    it("builds a button facing the camera, with its face up on a post", () => {
        const { scene } = createTestScene({ physics: true });
        const button = createArcadeButton(scene, options);
        expect(scene.getTransformNodeByName("test-button")).not.toBeNull();
        expect(scene.getMeshByName("test-button-face")).not.toBeNull();
        expect(scene.getMeshByName("test-button-label")).not.toBeNull();
        expect(button.position.y).toBeGreaterThan(5);
        // The face is in front of (towards the camera from) its post.
        expect(button.position.z).toBeLessThan(0);
    });

    it("is pressed by a shot", () => {
        const { scene } = createTestScene({ physics: true });
        const button = createArcadeButton(scene, options);
        const onHit = jest.fn();
        button.onHit.add(onHit);
        fireAt(scene, button.position, "ball");
        runPhysics(scene, 0.5);
        expect(onHit).toHaveBeenCalledTimes(1);
    });

    it("isn't pressed by other things bumping into it", () => {
        const { scene } = createTestScene({ physics: true });
        const button = createArcadeButton(scene, options);
        const onHit = jest.fn();
        button.onHit.add(onHit);
        fireAt(scene, button.position, "brick");
        runPhysics(scene, 0.5);
        expect(onHit).not.toHaveBeenCalled();
    });

    it("sinks in when pressed and comes back out", () => {
        const { scene, engine } = createTestScene({ physics: true });
        const button = createArcadeButton(scene, options);
        const cap = scene.getTransformNodeByName("test-button-cap")!;
        jest.spyOn(engine, "getDeltaTime").mockReturnValue(1000 / 60);
        button.press();
        scene.onBeforeRenderObservable.notifyObservers(scene);
        scene.onBeforeRenderObservable.notifyObservers(scene);
        expect(cap.position.y).toBeLessThan(-0.2);
        for (let i = 0; i < 60; i++) {
            scene.onBeforeRenderObservable.notifyObservers(scene);
        }
        expect(cap.position.y).toBeCloseTo(0);
    });

    it("shares materials between buttons of the same colour", () => {
        const { scene } = createTestScene({ physics: true });
        createArcadeButton(scene, options);
        createArcadeButton(scene, { ...options, id: "second", x: 20 });
        expect(scene.getMeshByName("test-button-face")!.material).toBe(scene.getMeshByName("second-face")!.material);
    });
});
