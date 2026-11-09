import * as BABYLON from "../babylon";

import { collideWithRamps } from "../world/playground";

/** cannon.js internals reached through Babylon's (legacy) cannon plugin. */
type FrictionEquation = { minForce: number; maxForce: number };
type CannonWorld = {
    allowSleep: boolean;
    broadphase: { dirty?: boolean };
    bodies: { aabbNeedsUpdate: boolean }[];
    dt: number;
    narrowphase: { createFrictionEquationsFromContact: (contact: unknown, out: FrictionEquation[]) => boolean };
};
type CannonPlugin = {
    world?: CannonWorld;
    BJSCANNON?: {
        SAPBroadphase?: new (world: unknown) => unknown;
        Material: new (name: string) => { friction: number; restitution: number };
        Box: new (halfExtents: unknown) => unknown;
        Vec3: new (x: number, y: number, z: number) => unknown;
    };
};

/**
 * Surface of the ground. cannon.js multiplies the two touching bodies' values, so with bricks
 * (0.8 friction) this gives ~0.7 grip, and shots (0.8 restitution) bounce a little off it.
 */
const GROUND_MATERIAL = { friction: 0.9, restitution: 0.4 };

const GRAVITY = new BABYLON.Vector3(0, -40, 0);
const MAX_SUB_STEP_SECONDS = 1 / 120;
/** cannon.js Body.SLEEPING */
const SLEEPING = 2;

/**
 * Turns on physics and tunes cannon.js for this scene:
 *
 * - Performance: resting bodies (bricks, trophies, spent shots) fall asleep and stop being
 *   simulated until something hits them, and the broadphase sorts bodies along an axis instead
 *   of testing every pair against every other. The tank never sleeps, since it's moved by
 *   setting its velocity.
 * - Stability: by default Babylon advances cannon.js with one step per frame, sized to the frame
 *   time. At 60 fps a shot (200 units/s) moves ~3.3 units per step, about the thickness of a
 *   brick, so it can pass straight through; at lower frame rates it gets worse. Splitting each
 *   frame into equal sub-steps of at most 1/120s keeps the simulation stable at any frame rate
 *   while still advancing exactly the frame's time, so motion stays smooth.
 */
/**
 * The scene's physics engine, typed as the "v1" engine the game uses (impostors and cannon.js).
 * Babylon's own type covers both its engines, without the v1-only methods.
 */
export function getPhysics(scene: BABYLON.Scene): BABYLON.PhysicsEngine | null {
    return scene.getPhysicsEngine() as BABYLON.PhysicsEngine | null;
}

export function enablePhysics(scene: BABYLON.Scene): void {
    scene.enablePhysics();
    scene.getPhysicsEngine()?.setGravity(GRAVITY);
    const plugin = scene.getPhysicsEngine()?.getPhysicsPlugin();
    if (!plugin) {
        return;
    }

    const cannonPlugin = plugin as unknown as CannonPlugin;
    const world = cannonPlugin.world;
    if (world) {
        world.allowSleep = true;
        const SAPBroadphase = cannonPlugin.BJSCANNON?.SAPBroadphase;
        if (SAPBroadphase) {
            world.broadphase = new SAPBroadphase(world) as CannonWorld["broadphase"];
        }
        fixFriction(world);
    }
    setGroundMaterial(scene, cannonPlugin);

    const executeStep = plugin.executeStep.bind(plugin);
    plugin.executeStep = (delta, impostors) => {
        const subSteps = Math.max(1, Math.ceil(delta / MAX_SUB_STEP_SECONDS - 1e-6));
        const subStepSeconds = delta / subSteps;
        for (let i = 0; i < subSteps; i++) {
            if (world) {
                refreshBroadphase(world);
            }
            executeStep(subStepSeconds, impostors);
        }
    };
}

/**
 * cannon.js 0.6.2's sweep-and-prune broadphase keeps its bodies sorted along an axis and stops
 * looking for pairs once the next body is out of reach, but it only re-sorts (and refreshes the
 * bodies' bounding boxes) when a body is added or removed. As things move, the order goes stale
 * and real overlaps are skipped. Bodies Babylon moves into place also keep the bounding box of
 * where they were created: the bricks' boxes stayed at their wall's local coordinates, near the
 * world origin. So the tank, and shots, drove straight through sleeping bricks.
 * Re-sorting every step is cheap (the list is nearly sorted already).
 */
function refreshBroadphase(world: CannonWorld): void {
    for (const body of world.bodies) {
        body.aabbNeedsUpdate = true;
    }
    world.broadphase.dirty = true;
}

/**
 * cannon.js 0.6.2 limits each friction *impulse* by the friction *force* (mu * g * mass) without
 * multiplying it by the step time, so friction comes out 1/dt times too strong: about 120x with
 * our 1/120s sub-steps. Nothing could slide: a pushed brick stopped dead in one step and flipped
 * over its front edge instead, and friction values made no difference. Scaling the limits by the
 * step time gives real Coulomb friction (later fixed the same way in cannon-es).
 */
function fixFriction(world: CannonWorld): void {
    const narrowphase = world.narrowphase;
    const createFrictionEquations = narrowphase.createFrictionEquationsFromContact;
    narrowphase.createFrictionEquationsFromContact = function (contact, out) {
        const created = createFrictionEquations.call(this, contact, out);
        if (created) {
            // It appends one pair of tangent equations per contact.
            for (let i = out.length - 2; i < out.length; i++) {
                out[i].minForce *= world.dt;
                out[i].maxForce *= world.dt;
            }
        }
        return created;
    };
}

/**
 * The imported scene gives the ground 0.2 friction and 0.9 restitution, which made everything
 * slide on it like ice once friction worked. It gets its own material (Babylon shares materials
 * between bodies with equal values, so the existing one isn't edited in place).
 */
function setGroundMaterial(scene: BABYLON.Scene, plugin: CannonPlugin): void {
    const ground = scene.getMeshByName("ground");
    const engine = getPhysics(scene);
    const impostor = ground && (ground.physicsImpostor ?? engine?.getImpostorForPhysicsObject(ground));
    const body = impostor?.physicsBody as { material: unknown } | undefined;
    if (!body || !plugin.BJSCANNON) {
        return;
    }
    const material = new plugin.BJSCANNON.Material("ground");
    material.friction = GROUND_MATERIAL.friction;
    material.restitution = GROUND_MATERIAL.restitution;
    body.material = material;
}

/**
 * The tank's collision box, relative to the holder's centre: the hull and tracks of the toy model
 * (the thin barrel sticks out of it). The imported holder is a 12-unit cube reaching ~2.7 units
 * above the turret, so bricks used to land on an invisible roof above the tank.
 */
const TANK_HALF_EXTENTS = { x: 6.2, y: 4.65, z: 6.9 };
const TANK_BOX_OFFSET_Y = -1.35;
/**
 * A second, thin box around the gun barrel (see toyTank.ts: axis 0.9 above the holder's centre,
 * from the turret out to the muzzle brake at z ~11.2), so it can't poke through walls and bricks.
 */
const BARREL_HALF_EXTENTS = { x: 0.7, y: 0.7, z: 2.35 };
const BARREL_OFFSET = { y: 0.9, z: 8.85 };

type CannonBoxBody = {
    angularDamping: number;
    allowSleep: boolean;
    addShape: (shape: unknown, offset: unknown) => void;
    shapes: { halfExtents?: { set: (x: number, y: number, z: number) => void }; updateConvexPolyhedronRepresentation?: () => void; updateBoundingSphereRadius: () => void }[];
    shapeOffsets: { set: (x: number, y: number, z: number) => void }[];
    updateBoundingRadius: () => void;
    updateMassProperties: () => void;
    aabbNeedsUpdate: boolean;
};

/**
 * Gives the tank holder its physics body. Movement sets the tank's velocity every frame, so
 * linear damping isn't needed; strong angular damping keeps knocks from bricks from spinning it
 * between frames.
 */
export function createTankBody(scene: BABYLON.Scene, tank: BABYLON.AbstractMesh): void {
    const CANNON = (scene.getPhysicsEngine()?.getPhysicsPlugin() as unknown as CannonPlugin | undefined)?.BJSCANNON;
    tank.physicsImpostor = new BABYLON.PhysicsImpostor(tank, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1000, restitution: 0 }, scene);
    const body = tank.physicsImpostor.physicsBody as CannonBoxBody | null;
    if (!body) {
        return;
    }
    body.angularDamping = 0.98;
    body.allowSleep = false;

    const box = body.shapes[0];
    if (box?.halfExtents && box.updateConvexPolyhedronRepresentation) {
        box.halfExtents.set(TANK_HALF_EXTENTS.x, TANK_HALF_EXTENTS.y, TANK_HALF_EXTENTS.z);
        box.updateConvexPolyhedronRepresentation();
        box.updateBoundingSphereRadius();
        body.shapeOffsets[0].set(0, TANK_BOX_OFFSET_Y, 0);
        if (CANNON) {
            const barrel = new CANNON.Box(new CANNON.Vec3(BARREL_HALF_EXTENTS.x, BARREL_HALF_EXTENTS.y, BARREL_HALF_EXTENTS.z));
            body.addShape(barrel, new CANNON.Vec3(0, BARREL_OFFSET.y, BARREL_OFFSET.z));
        }
        body.updateBoundingRadius();
        body.updateMassProperties();
        body.aabbNeedsUpdate = true;
    }
}

/**
 * Run once every loose object exists. Babylon copies every physics body's transform to its mesh
 * (and back) on every physics step. Bodies that cannon.js has put to sleep (settled bricks,
 * cones, trophies) don't move, so that work is skipped for them until something wakes them up.
 * Loose objects also land on and bump into the ramps here (the tank rides them instead).
 */
export function prepareLooseBodies(scene: BABYLON.Scene, tank: BABYLON.AbstractMesh): void {
    for (const impostor of getPhysics(scene)?.getImpostors() ?? []) {
        const body = impostor.physicsBody as { sleepState?: number } | null;
        if (!body || impostor.mass === 0 || impostor.object === tank) {
            continue;
        }
        collideWithRamps(impostor);
        const beforeStep = impostor.beforeStep;
        const afterStep = impostor.afterStep;
        // The two always run as a pair (a body can fall asleep during the step).
        let synced = false;
        impostor.beforeStep = () => {
            synced = body.sleepState !== SLEEPING;
            if (synced) {
                beforeStep();
            }
        };
        impostor.afterStep = () => {
            if (synced) {
                afterStep();
            }
        };
    }
}
