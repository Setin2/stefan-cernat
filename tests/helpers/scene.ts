import * as BABYLON from "@babylonjs/core";
import * as CANNON from "cannon";

/**
 * A headless Babylon scene (NullEngine: no WebGL, nothing is drawn) for tests. With `physics`, it
 * gets cannon.js the same way the game does (the scene loader injects it), with the game's gravity.
 */
export function createTestScene(options: { physics?: boolean } = {}): { engine: BABYLON.NullEngine; scene: BABYLON.Scene } {
    const engine = new BABYLON.NullEngine();
    // The NullEngine can't make raw cube textures (the toy materials' reflections, see
    // toyStyle.ts); an empty one is enough when nothing is drawn.
    const fake = engine as unknown as Record<string, unknown>;
    fake.createRawCubeTexture = () => new BABYLON.InternalTexture(engine, BABYLON.InternalTextureSource.CubeRaw);
    fake.updateRawCubeTexture = () => undefined;
    const scene = new BABYLON.Scene(engine);
    if (options.physics) {
        scene.enablePhysics(new BABYLON.Vector3(0, -40, 0), new BABYLON.CannonJSPlugin(true, 10, CANNON));
    }
    return { engine, scene };
}

/** A big static ground box named "ground" (as in the game's scene), its top at y = -0.5. */
export function addGround(scene: BABYLON.Scene): BABYLON.Mesh {
    const ground = BABYLON.MeshBuilder.CreateBox("ground", { width: 400, height: 1, depth: 400 }, scene);
    ground.position.y = -1;
    ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.2, restitution: 0.9 }, scene);
    return ground;
}

/** Runs the physics for `seconds`, in frames of `frame` seconds (like the render loop does). */
export function runPhysics(scene: BABYLON.Scene, seconds: number, frame = 1 / 60): void {
    const engine = scene.getPhysicsEngine() as unknown as { _step: (delta: number) => void };
    for (let time = 0; time < seconds - 1e-9; time += frame) {
        engine._step(frame);
    }
}

/** The cannon.js world behind the scene's physics. */
export function getCannonWorld(scene: BABYLON.Scene): CANNON.World {
    return (scene.getPhysicsEngine()?.getPhysicsPlugin() as unknown as { world: CANNON.World }).world;
}

export { CANNON };
