import * as BABYLON from "@babylonjs/core";

import { setSoundMaterial, type SurfaceMaterial } from "../audio/soundMaterials";

/**
 * Static collision shapes added straight to the cannon.js world, without a Babylon mesh or physics
 * impostor. Babylon syncs every impostor's transform with its body on every physics step, which
 * adds up with many colliders; static scenery (bushes, boulders, ramps, sign posts, tree trunks)
 * never moves, so it skips all of that.
 */

type CannonVec3 = { set: (x: number, y: number, z: number) => void };
type CannonBody = {
    position: CannonVec3;
    quaternion: { set: (x: number, y: number, z: number, w: number) => void };
    addShape: (shape: unknown) => void;
    collisionFilterGroup: number;
    collisionFilterMask: number;
};
type Cannon = {
    Body: new (options: { mass: number }) => CannonBody;
    Box: new (halfExtents: unknown) => unknown;
    Sphere: new (radius: number) => unknown;
    Vec3: new (x: number, y: number, z: number) => unknown;
};
type CannonWorld = { addBody: (body: CannonBody) => void; removeBody: (body: CannonBody) => void };

function getCannon(scene: BABYLON.Scene): { CANNON: Cannon; world: CannonWorld } | null {
    const plugin = scene.getPhysicsEngine()?.getPhysicsPlugin() as unknown as { BJSCANNON?: Cannon; world?: CannonWorld } | undefined;
    if (!plugin?.BJSCANNON || !plugin.world) {
        return null;
    }
    return { CANNON: plugin.BJSCANNON, world: plugin.world };
}

export type StaticBodyOptions = {
    rotation?: BABYLON.Quaternion;
    /** Collision filtering (cannon.js groups/masks); by default it collides with everything. */
    group?: number;
    mask?: number;
    /** What it sounds like when something hits it (see audio/soundMaterials.ts). */
    sound?: SurfaceMaterial;
};

function addBody(scene: BABYLON.Scene, shape: (CANNON: Cannon) => unknown, center: BABYLON.Vector3, options: StaticBodyOptions): boolean {
    const cannon = getCannon(scene);
    if (!cannon) {
        return false;
    }
    const body = new cannon.CANNON.Body({ mass: 0 });
    body.addShape(shape(cannon.CANNON));
    body.position.set(center.x, center.y, center.z);
    const rotation = options.rotation;
    if (rotation) {
        body.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
    if (options.group !== undefined) {
        body.collisionFilterGroup = options.group;
    }
    if (options.mask !== undefined) {
        body.collisionFilterMask = options.mask;
    }
    cannon.world.addBody(body);
    setSoundMaterial(body, options.sound ?? "static");
    scene.onDisposeObservable.addOnce(() => cannon.world.removeBody(body));
    return true;
}

/** A static box of the given full size, centred at `center`. */
export function addStaticBox(scene: BABYLON.Scene, center: BABYLON.Vector3, width: number, height: number, depth: number, options: StaticBodyOptions = {}): boolean {
    return addBody(scene, (CANNON) => new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)), center, options);
}

/** A static sphere. */
export function addStaticSphere(scene: BABYLON.Scene, center: BABYLON.Vector3, radius: number, options: StaticBodyOptions = {}): boolean {
    return addBody(scene, (CANNON) => new CANNON.Sphere(radius), center, options);
}
